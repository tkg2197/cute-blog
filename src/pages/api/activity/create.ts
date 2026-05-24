import type { APIRoute } from "astro";
import { ACTIVITY_CATEGORIES, ACTIVITY_PERIODS } from "../../../lib/types";
import { createServiceClient } from "../../../lib/supabase";

const periodKeys = new Set(ACTIVITY_PERIODS.map((period) => period.key));
const categories = new Set<string>(ACTIVITY_CATEGORIES);

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user;
  if (!user) return redirect("/auth/login", 303);

  const form = await request.formData();
  const activityOn = String(form.get("activity_on") || "").trim();
  const period = String(form.get("period") || "").trim();
  const category = String(form.get("category") || "").trim();
  const minutes = Number(form.get("minutes") || 0);
  const body = String(form.get("body") || "").trim();
  const returnTo = String(form.get("return_to") || "/admin");
  const failTo = returnTo.startsWith("/") ? returnTo : "/admin";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(activityOn)) {
    return redirect(`${failTo}${failTo.includes("?") ? "&" : "?"}error=${encodeURIComponent("请选择活动日期")}`, 303);
  }

  if (!periodKeys.has(period as (typeof ACTIVITY_PERIODS)[number]["key"])) {
    return redirect(`${failTo}${failTo.includes("?") ? "&" : "?"}error=${encodeURIComponent("请选择有效时段")}`, 303);
  }

  if (!categories.has(category)) {
    return redirect(`${failTo}${failTo.includes("?") ? "&" : "?"}error=${encodeURIComponent("请选择有效分类")}`, 303);
  }

  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 720) {
    return redirect(`${failTo}${failTo.includes("?") ? "&" : "?"}error=${encodeURIComponent("分钟数必须是 1 到 720 的整数")}`, 303);
  }

  if (!body) {
    return redirect(`${failTo}${failTo.includes("?") ? "&" : "?"}error=${encodeURIComponent("请填写活动内容")}`, 303);
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("activity_entries").insert({
    owner_id: user.id,
    activity_on: activityOn,
    period,
    category,
    minutes,
    body,
  });

  if (error) {
    return redirect(`${failTo}${failTo.includes("?") ? "&" : "?"}error=${encodeURIComponent(error.message)}`, 303);
  }

  return redirect(`${failTo}${failTo.includes("?") ? "&" : "?"}created=activity`, 303);
};
