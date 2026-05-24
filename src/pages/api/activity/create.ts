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
    return redirect(`${failTo}${failTo.includes("?") ? "&" : "?"}error=${encodeURIComponent("Please choose an activity date.")}`, 303);
  }

  if (!periodKeys.has(period as (typeof ACTIVITY_PERIODS)[number]["key"])) {
    return redirect(`${failTo}${failTo.includes("?") ? "&" : "?"}error=${encodeURIComponent("Please choose a valid time period.")}`, 303);
  }

  if (!categories.has(category)) {
    return redirect(`${failTo}${failTo.includes("?") ? "&" : "?"}error=${encodeURIComponent("Please choose a valid category.")}`, 303);
  }

  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 720) {
    return redirect(`${failTo}${failTo.includes("?") ? "&" : "?"}error=${encodeURIComponent("Minutes must be an integer from 1 to 720.")}`, 303);
  }

  if (!body) {
    return redirect(`${failTo}${failTo.includes("?") ? "&" : "?"}error=${encodeURIComponent("Please describe the activity.")}`, 303);
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
