import type { APIRoute } from "astro";
import { createServiceClient } from "../../../lib/supabase";
import {
  TODO_ACTIVITY_CATEGORY,
  durationMinutes,
  json,
  normalizeDate,
  normalizeTime,
  periodForTime,
} from "../../../lib/todo-utils";

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return json({ error: "Please log in first." }, 401);

  const form = await request.formData();
  const id = String(form.get("id") || "").trim();
  const completedOn = normalizeDate(form.get("completed_on"));
  const startTime = normalizeTime(form.get("start_time"));
  const endTime = normalizeTime(form.get("end_time"));
  if (!id) return json({ error: "Missing task id." }, 400);
  if (!completedOn || !startTime || !endTime) return json({ error: "Please enter a valid completion date and time range." }, 400);

  const minutes = durationMinutes(startTime, endTime);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
    return json({ error: "Completion time must be between 1 minute and 24 hours." }, 400);
  }

  const supabase = createServiceClient();
  const { data: todo, error: readError } = await supabase
    .from("todos")
    .select("id,title,activity_entry_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (readError) return json({ error: readError.message }, 500);
  if (!todo) return json({ error: "Task not found." }, 404);

  let activityEntryId = todo.activity_entry_id as string | null;
  const activityPayload = {
    owner_id: user.id,
    activity_on: completedOn,
    period: periodForTime(startTime),
    category: TODO_ACTIVITY_CATEGORY,
    minutes,
    body: todo.title,
    start_time: startTime,
    end_time: endTime,
  };

  if (activityEntryId) {
    const { error: activityError } = await supabase
      .from("activity_entries")
      .update(activityPayload)
      .eq("id", activityEntryId)
      .eq("owner_id", user.id);
    if (activityError) return json({ error: activityError.message }, 500);
  } else {
    const { data: activity, error: activityError } = await supabase
      .from("activity_entries")
      .insert(activityPayload)
      .select("id")
      .single();
    if (activityError) return json({ error: activityError.message }, 500);
    activityEntryId = activity.id;
  }

  const { data, error } = await supabase
    .from("todos")
    .update({
      completed: true,
      completed_on: completedOn,
      completed_start_time: startTime,
      completed_end_time: endTime,
      completed_minutes: minutes,
      activity_entry_id: activityEntryId,
    })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id,owner_id,title,completed,completed_on,completed_start_time,completed_end_time,completed_minutes,activity_entry_id,created_at,updated_at,profiles(display_name,author_key)")
    .maybeSingle();

  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "Task not found." }, 404);
  return json({ todo: data });
};
