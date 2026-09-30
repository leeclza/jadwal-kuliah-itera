import { matchCourseWithSchedule, normalizeClass, normalizeCode } from "./matcher";
import type { MatchStatusT, SiakadCourse, SpsRow } from "./types";

/** Data item SIAKAD yang akan ditulis ke DB (tanpa userId/semesterId). */
export interface SyncItemData {
  sourceId: string;
  title: string;
  courseCode: string;
  courseName: string;
  className: string | null;
  room: string | null;
  lecturers: string[];
  sks: string | null;
  day: number | null;
  startTime: string | null;
  endTime: string | null;
  matchStatus: MatchStatusT;
  candidates: SpsRow[] | null;
}

export interface ExistingSiakadItem {
  id: string;
  sourceId: string | null;
  courseCode: string | null;
  className: string | null;
  lecturers: string[];
  matchStatus: MatchStatusT;
}

export interface SyncPlan {
  create: SyncItemData[];
  update: { id: string; data: SyncItemData }[];
  delete: string[];
  stats: { added: number; updated: number; removed: number; needsConfirmation: number };
}

export function sourceIdFor(
  code: string,
  className: string | null | undefined,
  session: number | "pending",
) {
  return `${normalizeCode(code)}|${normalizeClass(className)}|${session}`;
}

/**
 * Hitung rencana sync. Fungsi murni yang HANYA menerima item source=SIAKAD
 * (argumen `existing`). Item MANUAL tidak pernah masuk ke rencana ini,
 * jadi tidak mungkin terhapus atau berubah.
 */
export function planSiakadSync(
  courses: SiakadCourse[],
  rows: SpsRow[],
  existing: ExistingSiakadItem[],
): SyncPlan {
  const desired: SyncItemData[] = [];

  for (const course of courses) {
    let effective = course;
    // SIAKAD tidak menyertakan kelas, tapi user sudah pernah memilih kelas -> pakai itu.
    if (!normalizeClass(course.className)) {
      const resolved = existing.find(
        (e) =>
          normalizeCode(e.courseCode) === normalizeCode(course.courseCode) &&
          e.matchStatus === "MATCHED" &&
          e.className,
      );
      if (resolved) effective = { ...course, className: resolved.className! };
    }

    const base = {
      title: effective.courseName,
      courseCode: normalizeCode(effective.courseCode),
      courseName: effective.courseName,
      lecturers: effective.lecturers ?? [],
    };
    const result = matchCourseWithSchedule(effective, rows);

    if (result.status === "MATCHED") {
      result.rows.forEach((row, i) => {
        desired.push({
          ...base,
          sourceId: sourceIdFor(effective.courseCode, row.className, i),
          className: row.className || effective.className || null,
          room: row.room ?? effective.room ?? null,
          sks: effective.sks ?? row.sks ?? null,
          day: row.day,
          startTime: row.startTime,
          endTime: row.endTime,
          matchStatus: "MATCHED",
          candidates: null,
        });
      });
    } else {
      desired.push({
        ...base,
        sourceId: sourceIdFor(effective.courseCode, effective.className, "pending"),
        className: effective.className ?? null,
        room: effective.room ?? null,
        sks: effective.sks ?? null,
        day: null,
        startTime: null,
        endTime: null,
        matchStatus: result.status,
        candidates: result.status === "AMBIGUOUS" ? result.candidates : null,
      });
    }
  }

  const existingBySource = new Map(
    existing.filter((e) => e.sourceId).map((e) => [e.sourceId!, e]),
  );
  const seen = new Set<string>();
  const plan: SyncPlan = {
    create: [],
    update: [],
    delete: [],
    stats: { added: 0, updated: 0, removed: 0, needsConfirmation: 0 },
  };

  for (const d of desired) {
    if (seen.has(d.sourceId)) continue;
    seen.add(d.sourceId);
    if (d.matchStatus !== "MATCHED") plan.stats.needsConfirmation++;
    const prev = existingBySource.get(d.sourceId);
    if (prev) {
      // Jangan buang dosen yang sudah ada kalau sumber baru tidak menyertakan dosen.
      const data = d.lecturers.length ? d : { ...d, lecturers: prev.lecturers };
      plan.update.push({ id: prev.id, data });
    } else {
      plan.create.push(d);
    }
  }
  for (const e of existing) {
    if (!e.sourceId || !seen.has(e.sourceId)) plan.delete.push(e.id);
  }
  plan.stats.added = plan.create.length;
  plan.stats.updated = plan.update.length;
  plan.stats.removed = plan.delete.length;
  return plan;
}
