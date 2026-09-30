import type { SiakadCourse, SpsRow } from "./types";

export function normalizeCourseName(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " dan ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const normalizeCode = (s: string | null | undefined) =>
  (s ?? "").toUpperCase().replace(/\s+/g, "");

export const normalizeClass = (s: string | null | undefined) =>
  (s ?? "").toUpperCase().replace(/\s+/g, "");

export type MatchResult =
  | { status: "MATCHED"; rows: SpsRow[] }
  | { status: "AMBIGUOUS"; candidates: SpsRow[] }
  | { status: "UNMATCHED" };

const byTime = (a: SpsRow, b: SpsRow) =>
  a.day - b.day || a.startTime.localeCompare(b.startTime);

/**
 * Cocokkan satu mata kuliah SIAKAD dengan baris SPS.
 * 1. Kode MK (jika ada), fallback nama ter-normalisasi (exact, bukan fuzzy).
 * 2. Kelas: jika ada, harus sama persis. Jika tidak ada dan kelas di SPS > 1 -> AMBIGUOUS.
 * Satu kelas boleh punya beberapa sesi (mis. 2 pertemuan/minggu) -> semua dikembalikan.
 */
export function matchCourseWithSchedule(course: SiakadCourse, rows: SpsRow[]): MatchResult {
  const code = normalizeCode(course.courseCode);
  let pool = code ? rows.filter((r) => normalizeCode(r.courseCode) === code) : [];
  if (pool.length === 0) {
    const name = normalizeCourseName(course.courseName);
    pool = name ? rows.filter((r) => normalizeCourseName(r.courseName) === name) : [];
  }
  if (pool.length === 0) return { status: "UNMATCHED" };

  const cls = normalizeClass(course.className);
  if (cls) {
    const exact = pool.filter((r) => normalizeClass(r.className) === cls);
    if (exact.length > 0) return { status: "MATCHED", rows: exact.sort(byTime) };
    return { status: "AMBIGUOUS", candidates: pool.sort(byTime) };
  }

  const classes = new Set(pool.map((r) => normalizeClass(r.className)));
  if (classes.size === 1) return { status: "MATCHED", rows: pool.sort(byTime) };
  return { status: "AMBIGUOUS", candidates: pool.sort(byTime) };
}
