import type { APIRoute } from "astro";
import { parseMarkdown, slugify } from "../../../lib/markdown";
import { ensureStorageBuckets } from "../../../lib/storage";
import { createServiceClient } from "../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies, locals, redirect }) => {
  const user = locals.user;
  if (!user) return redirect("/auth/login", 303);

  const form = await request.formData();
  const file = form.get("markdown");
  const manualSlug = String(form.get("slug") || "").trim();
  const rawReturn = String(form.get("return_to") || "").trim();
  const safeReturn = rawReturn.startsWith("/") ? rawReturn : "/admin";
  const sep = safeReturn.includes("?") ? "&" : "?";

  if (!(file instanceof File) || file.size === 0) {
    return redirect(`${safeReturn}${sep}error=${encodeURIComponent("Please choose a Markdown file to upload.")}`, 303);
  }

  if (!file.name.toLowerCase().endsWith(".md")) {
    return redirect(`${safeReturn}${sep}error=${encodeURIComponent("Blog uploads only accept .md files.")}`, 303);
  }

  const content = await file.text();
  const parsed = parseMarkdown(content, file.name.replace(/\.md$/i, ""));
  const slug = slugify(manualSlug || parsed.title);
  const supabase = createServiceClient();
  const storagePath = `${user.id}/${slug}-${Date.now()}-${crypto.randomUUID()}.md`;

  try {
    await ensureStorageBuckets();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Storage initialization failed";
    return redirect(`${safeReturn}${sep}error=${encodeURIComponent(message)}`, 303);
  }

  const { error: uploadError } = await supabase.storage.from("blog-markdown").upload(storagePath, file, {
    contentType: "text/markdown; charset=utf-8",
    upsert: false,
  });

  if (uploadError) {
    return redirect(`${safeReturn}${sep}error=${encodeURIComponent(uploadError.message)}`, 303);
  }

  const { error: upsertError } = await supabase.from("blog_posts").upsert(
    {
      slug,
      title: parsed.title,
      excerpt: parsed.excerpt.slice(0, 320),
      content_markdown: content,
      storage_path: storagePath,
      author_id: user.id,
      tags: parsed.tags,
      published_at: new Date().toISOString(),
    },
    { onConflict: "slug" },
  );

  if (upsertError) {
    return redirect(`${safeReturn}${sep}error=${encodeURIComponent(upsertError.message)}`, 303);
  }

  return redirect(`/blog/${slug}`, 303);
};
