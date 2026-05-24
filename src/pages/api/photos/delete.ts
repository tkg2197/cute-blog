import type { APIRoute } from "astro";
import { createServiceClient } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user;
  if (!user) return redirect("/auth/login", 303);

  const form = await request.formData();
  const id = String(form.get("id") || "");
  if (!id) {
    return redirect("/admin?error=缺少照片 ID", 303);
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
    return redirect("/admin?error=没有找到这张照片，或它不属于当前账号", 303);
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
