import type { APIRoute } from "astro";
import { createServiceClient } from "../../../lib/supabase";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

// 图片已经直传到 Storage 后，由这里把对应的 photos 行写入数据库。
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return json({ error: "Please log in." }, 401);

  const payload = await request.json().catch(() => null);
  const path = String(payload?.path || "").trim();
  const mimeType = String(payload?.mime_type || "").trim();
  const title = String(payload?.title || "").trim();
  const caption = String(payload?.caption || "").trim();
  const takenOn = String(payload?.taken_on || "").trim() || null;

  // 只允许写入自己目录下、且确实由本次会话上传的路径。
  if (!path || !path.startsWith(`${user.id}/`)) {
    return json({ error: "Invalid upload path." }, 400);
  }

  const supabase = createServiceClient();
  const { error: insertError } = await supabase.from("photos").insert({
    owner_id: user.id,
    title: title || null,
    caption: caption || null,
    taken_on: takenOn,
    storage_path: path,
    mime_type: mimeType || null,
  });

  if (insertError) {
    return json({ error: insertError.message }, 500);
  }

  return json({ ok: true });
};
