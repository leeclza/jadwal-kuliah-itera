import { timeToMinutes } from "./constants";
import type { ScheduleLike } from "./types";

/** true jika dua jadwal di hari yang sama saling overlap. */
export function isOverlap(a: ScheduleLike, b: ScheduleLike): boolean {
  if (!a.day || a.day !== b.day) return false;
  const as = timeToMinutes(a.startTime);
  const ae = timeToMinutes(a.endTime);
  const bs = timeToMinutes(b.startTime);
  const be = timeToMinutes(b.endTime);
  if (as === null || ae === null || bs === null || be === null) return false;
  return as < be && bs < ae;
}

/** Map id -> daftar id jadwal lain yang bentrok. */
export function detectScheduleConflict(items: ScheduleLike[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (isOverlap(items[i], items[j])) {
        out.set(items[i].id, [...(out.get(items[i].id) ?? []), items[j].id]);
        out.set(items[j].id, [...(out.get(items[j].id) ?? []), items[i].id]);
      }
    }
  }
  return out;
}
