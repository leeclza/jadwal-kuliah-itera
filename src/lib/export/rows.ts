import { formatTimeRange } from "@/lib/schedule/constants";
import { groupByDay } from "@/lib/schedule/grouping";
import type { ScheduleLike } from "@/lib/schedule/types";

export const EXPORT_HEADERS = ["Hari", "Jam", "Matkul", "Ruang", "SKS", "Dosen", "Kode Matkul"] as const;
export const COL_WIDTHS = [15, 18, 30, 22, 8, 30, 18];

export interface ExportRow {
  day: number;
  dayLabel: string;
  /** Baris pertama di grup hari (tempat label hari ditulis & merge dimulai). */
  isFirstOfDay: boolean;
  /** Jumlah baris untuk hari ini (untuk merge). Hanya bermakna di baris pertama. */
  daySpan: number;
  cells: [string, string, string, string, string, string, string];
}

/** Bangun baris export. Hari kosong tetap menghasilkan 1 baris kosong. */
export function buildExportRows(items: ScheduleLike[]): ExportRow[] {
  const rows: ExportRow[] = [];
  for (const group of groupByDay(items)) {
    const label = group.label.toUpperCase();
    if (group.items.length === 0) {
      rows.push({
        day: group.day, dayLabel: label, isFirstOfDay: true, daySpan: 1,
        cells: [label, "", "", "", "", "", ""],
      });
      continue;
    }
    group.items.forEach((it, i) => {
      rows.push({
        day: group.day,
        dayLabel: label,
        isFirstOfDay: i === 0,
        daySpan: group.items.length,
        cells: [
          i === 0 ? label : "",
          formatTimeRange(it.startTime, it.endTime),
          it.title,
          it.room ?? "",
          it.sks ?? "",
          (it.lecturers ?? []).join("\n"),
          it.courseCode ?? "",
        ],
      });
    });
  }
  return rows;
}
