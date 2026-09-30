import { DAYS } from "./constants";
import type { ScheduleLike } from "./types";

export function sortSchedule<T extends ScheduleLike>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      (a.day ?? 99) - (b.day ?? 99) ||
      (a.startTime ?? "99").localeCompare(b.startTime ?? "99") ||
      a.title.localeCompare(b.title),
  );
}

/** Senin-Jumat selalu ada, walaupun kosong. Item tanpa hari tidak masuk. */
export function groupByDay<T extends ScheduleLike>(items: T[]) {
  const sorted = sortSchedule(items);
  return DAYS.map((d) => ({
    day: d.value,
    label: d.label,
    items: sorted.filter((i) => i.day === d.value),
  }));
}
