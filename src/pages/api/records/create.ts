import type { APIRoute } from "astro";
import { createServiceClient } from "../../../lib/supabase";

const validMoods = new Set(["happy", "loved", "calm", "tired", "down", "moody"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

// 生活记录创建。照片已由浏览器直传到 Storage，这里只接收文本字段和
// 已上传照片的路径列表（JSON），不再接收文件字节，避免触发 Vercel 4.5MB 限制。
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return json({ error: "Please log in." }, 401);

  const payload = await request.json().catch(() => null);
  const recordOn = String(payload?.record_on || "").trim();
  const mood = String(payload?.mood || "happy").trim();
  const body = String(payload?.body || "").trim();
  const photos = Array.isArray(payload?.photos) ? payload.photos : [];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(recordOn)) {
    return json({ error: "Please choose a life record date." }, 400);
  }
  if (!body) {
    return json({ error: "Please write the life record body." }, 400);
  }
  if (!validMoods.has(mood)) {
    return json({ error: "Please choose a valid mood." }, 400);
  }

  const supabase = createServiceClient();
  const { error: insertError } = await supabase.from("life_records").insert({
    owner_id: user.id,
    record_on: recordOn,
    mood,
    body,
  });

  if (insertError) {
    return json({ error: insertError.message }, 500);
  }

  for (const item of photos) {
    const path = String(item?.path || "").trim();
    const mimeType = String(item?.mime_type || "").trim();
    // 只接受属于当前用户目录的路径。
    if (!path || !path.startsWith(`${user.id}/`)) continue;

    const { error: photoError } = await supabase.from("photos").insert({
      owner_id: user.id,
      title: null,
      caption: body.slice(0, 120),
      taken_on: recordOn,
      storage_path: path,
      mime_type: mimeType || null,
    });

    if (photoError) {
      return json({ error: photoError.message }, 500);
    }
  }

  return json({ ok: true });
};
