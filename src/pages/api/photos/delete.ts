import type { APIRoute } from "astro";
import { createServiceClient } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user;
  if (!user) return redirect("/auth/login", 303);

  const form = await request.formData();
  const id = String(form.get("id") || "");
  if (!id) {
    return redirect("/admin?error=Missing%20photo%20ID", 303);
  }

  const supabase = createServiceClient();
  const { data: photo, error: readError } = await supabase
    .from("photos")
    .select("id,storage_path")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (readError) {
    return redirect(`/admin?error=${encodeURIComponent(readError.message)}`, 303);
  }

  if (!photo) {
    return redirect("/admin?error=Photo%20not%20found%2C%20or%20it%20does%20not%20belong%20to%20the%20current%20account", 303);
  }

  const { error: storageError } = await supabase.storage.from("photos").remove([photo.storage_path]);
  if (storageError && !/not found/i.test(storageError.message)) {
    return redirect(`/admin?error=${encodeURIComponent(storageError.message)}`, 303);
  }

  const { error: deleteError } = await supabase
    .from("photos")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (deleteError) {
    return redirect(`/admin?error=${encodeURIComponent(deleteError.message)}`, 303);
  }

  return redirect("/admin?deleted=photo", 303);
};
