import type { APIRoute } from "astro";
import { setSessionCookies } from "../../../lib/auth";
import { createAnonClient } from "../../../lib/supabase";

function backToLogin(message: string, redirectTo = "/?skipCover=1#home") {
  const params = new URLSearchParams({ error: message, redirect: redirectTo });
  return `/auth/login?${params.toString()}`;
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const redirectTo = String(form.get("redirect") || "/?skipCover=1#home");

  if (!email || !password) {
    return redirect(backToLogin("请填写邮箱和密码。", redirectTo), 303);
  }

  const supabase = createAnonClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return redirect(backToLogin(error?.message || "登录失败，请检查邮箱和密码。", redirectTo), 303);
  }

  setSessionCookies(cookies, data.session);
  return redirect(redirectTo || "/?skipCover=1#home", 303);
};
