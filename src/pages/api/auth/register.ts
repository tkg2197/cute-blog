import type { APIRoute } from "astro";
import { getAllowedSignupEmails } from "../../../lib/env";
import { setSessionCookies } from "../../../lib/auth";
import { createAnonClient, createServiceClient } from "../../../lib/supabase";

function registerUrl(message: string) {
  return `/auth/register?error=${encodeURIComponent(message)}`;
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const displayName = String(form.get("display_name") || "").trim();

  // 邮箱 → 身份固定映射（双人博客只有两个作者）
  const EMAIL_TO_AUTHOR: Record<string, "white" | "brown"> = {
    "wjydyx0224@qq.com": "white",
    "2197322347@qq.com": "brown",
  };
  const authorKey = EMAIL_TO_AUTHOR[email];
  if (!authorKey) {
    return redirect(registerUrl("This email is not authorized to register."), 303);
  }

  if (!email || !password || !displayName) {
    return redirect(registerUrl("Please complete the registration form."), 303);
  }

  const allowed = getAllowedSignupEmails();
  if (allowed.length && !allowed.includes(email)) {
    return redirect(registerUrl("This email is not on the allowed registration list."), 303);
  }

  const supabase = createAnonClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        author_key: authorKey,
        display_name: displayName,
      },
    },
  });

  if (error || !data.user) {
    return redirect(registerUrl(error?.message || "Registration failed."), 303);
  }

  const service = createServiceClient();
  const { error: profileError } = await service.from("profiles").upsert({
    id: data.user.id,
    email,
    author_key: authorKey,
    display_name: displayName,
  });

  if (profileError) {
    return redirect(registerUrl(profileError.message), 303);
  }

  if (data.session) {
    setSessionCookies(cookies, data.session);
    return redirect("/?skipCover=1#home", 303);
  }

  return redirect("/auth/login?registered=1", 303);
};
