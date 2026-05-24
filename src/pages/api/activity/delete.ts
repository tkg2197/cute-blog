import type { APIRoute } from "astro";
import { createServiceClient } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user;
  if (!user) return redirect("/auth/login", 303);

  const form = await request.formData();
  const id = String(form.get("id") || "");
  const returnTo = String(form.get("return_to") || "/admin");
  const failTo = returnTo.startsWith("/") ? returnTo : "/admin";
  if (!id) {
    return redirect(`${failTo}${failTo.includes("?") ? "&" : "?"}error=${encodeURIComponent("缺少活动记录 ID")}`, 303);
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("activity_entries")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    return redirect(`${failTo}${failTo.includes("?") ? "&" : "?"}error=${encodeURIComponent(error.message)}`, 303);
  }

  return redirect(`${failTo}${failTo.includes("?") ? "&" : "?"}deleted=activity`, 303);
};
