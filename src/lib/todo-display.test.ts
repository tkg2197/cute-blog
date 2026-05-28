import assert from "node:assert/strict";
import test from "node:test";
import { todoCompletionTimeLabels } from "./todo-display.ts";
import type { TodoItem } from "./types";

function todo(overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id: "todo-1",
    owner_id: "user-1",
    title: "Practice",
    completed: true,
    completed_on: "2026-05-28",
    completed_start_time: "09:00",
    completed_end_time: "20:00",
    completed_minutes: 180,
    activity_entry_id: "activity-1",
    archived_at: null,
    created_at: "2026-05-28T00:00:00Z",
    updated_at: "2026-05-28T00:00:00Z",
    ...overrides,
  };
}

test("formats every completion time range when a todo has multiple linked activity entries", () => {
  assert.deepEqual(
    todoCompletionTimeLabels(todo({
      completion_ranges: [
        { start_time: "09:00", end_time: "10:00", minutes: 60 },
        { start_time: "19:30", end_time: "21:00", minutes: 90 },
      ],
    })),
    ["09:00-10:00", "19:30-21:00"],
  );
});

test("falls back to the legacy summary range when linked ranges are not available", () => {
  assert.deepEqual(todoCompletionTimeLabels(todo()), ["09:00-20:00"]);
});
