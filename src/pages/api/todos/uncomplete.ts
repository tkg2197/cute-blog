import type { APIRoute } from "astro";
import { createServiceClient } from "../../../lib/supabase";
import { json } from "../../../lib/todo-utils";

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return json({ error: "Please log in first." }, 401);

  const form = await request.formData();
  const id = String(form.get("id") || "").trim();
  if (!id) return json({ error: "Missing task id." }, 400);

  const supabase = createServiceClient();
  const { data: todo, error: readError } = await supabase
    .from("todos")
    .select("id,activity_entry_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (readError) return json({ error: readError.message }, 500);
  if (!todo) return json({ error: "Task not found." }, 404);

  if (todo.activity_entry_id) {
    const { error: activityError } = await supabase
      .from("activity_entries")
      .delete()
      .eq("id", todo.activity_entry_id)
      .eq("owner_id", user.id);
    if (activityError) return json({ error: activityError.message }, 500);
  }

  const { data, error } = await supabase
    .from("todos")
    .update({
      completed: false,
      completed_on: null,
      completed_start_time: null,
      completed_end_time: null,
      completed_minutes: 0,
      activity_entry_id: null,
    })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id,owner_id,title,completed,completed_on,completed_start_time,completed_end_time,completed_minutes,activity_entry_id,created_at,updated_at,profiles(display_name,author_key)")
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "Task not found." }, 404);
  return json({ todo: data });
};
