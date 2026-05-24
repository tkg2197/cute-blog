import type { APIRoute } from "astro";
import { createServiceClient } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user;
  if (!user) return redirect("/auth/login", 303);

  const form = await request.formData();
  const id = String(form.get("id") || "");
  if (!id) {
    return redirect("/admin?error=缺少文章 ID", 303);
  }

  const supabase = createServiceClient();
  const { data: post, error: readError } = await supabase
    .from("blog_posts")
    .select("id,storage_path")
    .eq("id", id)
    .eq("author_id", user.id)
    .maybeSingle();

  if (readError) {
    return redirect(`/admin?error=${encodeURIComponent(readError.message)}`, 303);
  }

  if (!post) {
    return redirect("/admin?error=没有找到这篇文章，或它不属于当前账号", 303);
  }

  if (post.storage_path) {
    const { error: storageError } = await supabase.storage.from("blog-markdown").remove([post.storage_path]);
    if (storageError && !/not found/i.test(storageError.message)) {
      return redirect(`/admin?error=${encodeURIComponent(storageError.message)}`, 303);
    }
  }

  const { error: deleteError } = await supabase
    .from("blog_posts")
    .delete()
    .eq("id", id)
    .eq("author_id", user.id);

  if (deleteError) {
    return redirect(`/admin?error=${encodeURIComponent(deleteError.message)}`, 303);
  }

  return redirect("/admin?deleted=post", 303);
};
