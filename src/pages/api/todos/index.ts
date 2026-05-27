import type { APIRoute } from "astro";
import { createServiceClient } from "../../../lib/supabase";
import { json } from "../../../lib/todo-utils";
import type { AuthorKey, TodoItem } from "../../../lib/types";

export const GET: APIRoute = async ({ url, locals }) => {
  const view = (url.searchParams.get("view") === "brown" ? "brown" : "white") as AuthorKey;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("todos")
    .select("id,owner_id,title,completed,completed_on,completed_start_time,completed_end_time,completed_minutes,activity_entry_id,archived_at,created_at,updated_at,profiles(display_name,author_key)")
    .order("created_at", { ascending: true });

  if (error) return json({ error: error.message }, 500);

  const todos = ((data || []) as TodoItem[]).filter((todo) => (todo.profiles?.author_key || "white") === view);
  return json({
    todos,
    userId: locals.user?.id || null,
    profile: locals.profile || null,
    canEdit: Boolean(locals.user && locals.profile?.author_key === view),
  });
};
