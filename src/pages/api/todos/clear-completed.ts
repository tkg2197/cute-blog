import type { APIRoute } from "astro";
import { createServiceClient } from "../../../lib/supabase";
import { json } from "../../../lib/todo-utils";

export const POST: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user) return json({ error: "Please log in first." }, 401);

  const supabase = createServiceClient();
  const { data: todos, error: readError } = await supabase
    .from("todos")
    .select("id,activity_entry_id")
    .eq("owner_id", user.id)
    .eq("completed", true);

  if (readError) return json({ error: readError.message }, 500);

  const activityIds = (todos || []).map((todo) => todo.activity_entry_id).filter(Boolean);
  if (activityIds.length) {
    const { error: activityError } = await supabase
      .from("activity_entries")
      .delete()
      .in("id", activityIds)
      .eq("owner_id", user.id);
    if (activityError) return json({ error: activityError.message }, 500);
  }

  const { error } = await supabase.from("todos").delete().eq("owner_id", user.id).eq("completed", true);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
};
