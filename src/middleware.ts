import { defineMiddleware } from "astro:middleware";
import { getAccessToken, readSession } from "./lib/auth";
import { createServiceClient, createUserClient } from "./lib/supabase";
import type { Profile } from "./lib/types";

const protectedPrefixes = ["/admin", "/api/blog", "/api/photos", "/api/records", "/api/activity"];
const authPages = ["/auth/login", "/auth/register"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, url } = context;
  const sessionState = await readSession(cookies);
  const accessToken = sessionState.accessToken || getAccessToken(cookies);

  context.locals.user = sessionState.user;
  context.locals.session = sessionState.session;
  context.locals.profile = null;

  if (sessionState.user) {
    const userClient = createUserClient(accessToken);
    const { data } = await userClient
      .from("profiles")
      .select("id,email,author_key,display_name,created_at")
      .eq("id", sessionState.user.id)
      .maybeSingle();

    context.locals.profile = (data || null) as Profile | null;

    if (!context.locals.profile) {
      const service = createServiceClient();
      const metadata = sessionState.user.user_metadata || {};
      const { data: created } = await service
        .from("profiles")
        .upsert({
          id: sessionState.user.id,
          email: sessionState.user.email || "",
          author_key: metadata.author_key === "brown" ? "brown" : "white",
          display_name: metadata.display_name || (metadata.author_key === "brown" ? "棕狗" : "白狗"),
        })
        .select("id,email,author_key,display_name,created_at")
        .maybeSingle();
      context.locals.profile = (created || null) as Profile | null;
    }
  }

  const pathname = url.pathname.replace(/\/$/, "") || "/";
  const needsAuth = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (needsAuth && !sessionState.user) {
    if (pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "请先登录" }), {
        status: 401,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }
    return context.redirect(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
  }

  if (sessionState.user && authPages.includes(pathname)) {
    return context.redirect("/?skipCover=1#home");
  }

  return next();
});
