import { ACTIVITY_CATEGORIES } from "./types";

export const TODO_ACTIVITY_CATEGORY = ACTIVITY_CATEGORIES[ACTIVITY_CATEGORIES.length - 1];

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function normalizeDate(value: FormDataEntryValue | string | null) {
  const raw = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

export function normalizeTime(value: FormDataEntryValue | string | null) {
  const raw = String(value || "").trim();
  const hit = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!hit) return null;
  const hours = Number(hit[1]);
  const minutes = Number(hit[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function minutesOfClock(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function durationMinutes(startTime: string, endTime: string) {
  const start = minutesOfClock(startTime);
  const end = minutesOfClock(endTime);
  return end > start ? end - start : end + 1440 - start;
}

export function periodForTime(startTime: string) {
  const minutes = minutesOfClock(startTime);
  if (minutes >= 5 * 60 && minutes < 8 * 60) return "morning";
  if (minutes >= 8 * 60 && minutes < 11 * 60) return "forenoon";
  if (minutes >= 11 * 60 && minutes < 14 * 60) return "noon";
  if (minutes >= 14 * 60 && minutes < 17 * 60) return "afternoon";
  if (minutes >= 17 * 60 && minutes < 19 * 60) return "dusk";
  if (minutes >= 19 * 60 && minutes < 23 * 60) return "evening";
  return "midnight";
}
