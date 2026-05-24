import type { APIRoute } from "astro";
import { extensionFromFile } from "../../../lib/files";
import { ensureStorageBuckets } from "../../../lib/storage";
import { createServiceClient } from "../../../lib/supabase";

const validMoods = new Set(["happy", "loved", "calm", "tired", "down", "moody"]);

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user;
  if (!user) return redirect("/auth/login", 303);

  const form = await request.formData();
  const recordOn = String(form.get("record_on") || "").trim();
  const mood = String(form.get("mood") || "happy").trim();
  const body = String(form.get("body") || "").trim();
  const rawReturn = String(form.get("return_to") || "").trim();
  const safeReturn = rawReturn.startsWith("/") ? rawReturn : "/admin";
  const sep = safeReturn.includes("?") ? "&" : "?";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(recordOn)) {
    return redirect(`${safeReturn}${sep}error=${encodeURIComponent("Please choose a life record date.")}`, 303);
  }

  if (!body) {
    return redirect(`${safeReturn}${sep}error=${encodeURIComponent("Please write the life record body.")}`, 303);
  }

  if (!validMoods.has(mood)) {
    return redirect(`${safeReturn}${sep}error=${encodeURIComponent("Please choose a valid mood.")}`, 303);
  }

  const supabase = createServiceClient();
  const { error: insertError } = await supabase.from("life_records").insert({
    owner_id: user.id,
    record_on: recordOn,
    mood,
    body,
  });

  if (insertError) {
    return redirect(`${safeReturn}${sep}error=${encodeURIComponent(insertError.message)}`, 303);
  }

  const files = form
    .getAll("photos")
    .filter((item): item is File => item instanceof File && item.size > 0);

  if (files.length) {
    try {
      await ensureStorageBuckets();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Storage initialization failed";
      return redirect(`${safeReturn}${sep}error=${encodeURIComponent(message)}`, 303);
    }

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;

      const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extensionFromFile(file)}`;
      const { error: uploadError } = await supabase.storage.from("photos").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

      if (uploadError) {
        return redirect(`${safeReturn}${sep}error=${encodeURIComponent(uploadError.message)}`, 303);
      }

      const { error: photoError } = await supabase.from("photos").insert({
        owner_id: user.id,
        title: null,
        caption: body.slice(0, 120),
        taken_on: recordOn,
        storage_path: path,
        mime_type: file.type,
      });

      if (photoError) {
        return redirect(`${safeReturn}${sep}error=${encodeURIComponent(photoError.message)}`, 303);
      }
    }
  }

  return redirect(`${safeReturn}${sep}created=record`, 303);
};
