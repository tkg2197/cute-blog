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
  const authorKey = String(form.get("author_key") || "") === "brown" ? "brown" : "white";

  if (!email || !password || !displayName) {
    return redirect(registerUrl("请填写完整注册信息。"), 303);
  }

  const allowed = getAllowedSignupEmails();
  if (allowed.length && !allowed.includes(email)) {
    return redirect(registerUrl("这个邮箱不在允许注册列表里。"), 303);
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
    return redirect(registerUrl(error?.message || "注册失败。"), 303);
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
    return redirect("/admin", 303);
  }

  return redirect("/auth/login?registered=1", 303);
};
