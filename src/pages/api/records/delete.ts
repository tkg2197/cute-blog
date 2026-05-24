import type { APIRoute } from "astro";
import { createServiceClient } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user;
  if (!user) return redirect("/auth/login", 303);

  const form = await request.formData();
  const id = String(form.get("id") || "");
  if (!id) {
    return redirect("/admin?error=Missing%20life%20record%20ID", 303);
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("life_records")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    return redirect(`/admin?error=${encodeURIComponent(error.message)}`, 303);
  }

  return redirect("/admin?deleted=record", 303);
};
