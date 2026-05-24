import type { APIRoute } from "astro";
import { setSessionCookies } from "../../../lib/auth";
import { getAllowedSignupEmails } from "../../../lib/env";
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
    return redirect(backToLogin("请输入邮箱和密码。", redirectTo), 303);
  }

  // 白名单校验：只允许指定邮箱登录（哪怕账号已经在 Supabase 上注册过也不放行）
  const allowed = getAllowedSignupEmails();
  if (allowed.length && !allowed.includes(email)) {
    return redirect(backToLogin("这个小窝只为白狗和棕狗准备，其他邮箱无法登录。", redirectTo), 303);
  }

  const supabase = createAnonClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return redirect(backToLogin(error?.message || "登录失败，请检查邮箱和密码。", redirectTo), 303);
  }

  setSessionCookies(cookies, data.session);
  return redirect(redirectTo || "/?skipCover=1#home", 303);
};
