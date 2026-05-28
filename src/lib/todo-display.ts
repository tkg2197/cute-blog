import type { TodoItem } from "./types";

function shortTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : "";
}

export function todoCompletionTimeLabels(todo: Pick<TodoItem, "completed_start_time" | "completed_end_time" | "completion_ranges">) {
  const linkedRanges = (todo.completion_ranges || [])
    .filter((range) => range.start_time && range.end_time)
    .map((range) => `${shortTime(range.start_time)}-${shortTime(range.end_time)}`);

  if (linkedRanges.length) return linkedRanges;

  if (todo.completed_start_time && todo.completed_end_time) {
    return [`${shortTime(todo.completed_start_time)}-${shortTime(todo.completed_end_time)}`];
  }

  return [];
}
