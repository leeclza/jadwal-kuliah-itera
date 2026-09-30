/** Helper murni (tanpa DB) untuk audit: sanitasi, snapshot, diff. Aman dipakai di client. */

const SENSITIVE_KEY = /pass(word)?|token|secret|cookie|session|authorization|api[_-]?key|credential/i;
const MAX_STRING = 2000;
const MAX_DEPTH = 6;

/** Buang field sensitif (password/token/cookie/secret) dan potong string panjang. */
export function sanitize(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (depth >= MAX_DEPTH) return "[…]";
  if (Array.isArray(value)) return value.slice(0, 100).map((v) => sanitize(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEY.test(k) || v === undefined || typeof v === "function") continue;
      out[k] = sanitize(v, depth + 1);
    }
    return out;
  }
  return null;
}

const DAYS = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export function dayName(day: number | null | undefined) {
  return day ? (DAYS[day] ?? String(day)) : null;
}

type ScheduleLike = {
  title: string; type?: string; source?: string; courseCode?: string | null; className?: string | null;
  room?: string | null; lecturers?: string[]; sks?: string | null; day?: number | null;
  startTime?: string | null; endTime?: string | null; notes?: string | null;
};

/** Field jadwal yang relevan untuk audit (tanpa id internal / kandidat mentah). */
export function scheduleSnapshot(s: ScheduleLike) {
  return {
    title: s.title,
    type: s.type ?? null,
    source: s.source ?? null,
    courseCode: s.courseCode ?? null,
    className: s.className ?? null,
    day: dayName(s.day),
    startTime: s.startTime ?? null,
    endTime: s.endTime ?? null,
    room: s.room ?? null,
    lecturers: s.lecturers ?? [],
    sks: s.sks ?? null,
    notes: s.notes ?? null,
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Ambil hanya field yang berubah -> { before, after }. */
export function changedFields<T extends Record<string, unknown>>(before: T, after: T) {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (!same(before[k], after[k])) {
      b[k] = before[k] ?? null;
      a[k] = after[k] ?? null;
    }
  }
  return { before: b, after: a, changed: Object.keys(a).length > 0 };
}

export const FIELD_LABEL: Record<string, string> = {
  title: "Nama", courseName: "Mata Kuliah", courseCode: "Kode MK", className: "Kelas", type: "Jenis",
  source: "Sumber", day: "Hari", startTime: "Jam Mulai", endTime: "Jam Selesai", room: "Ruangan",
  lecturers: "Dosen", sks: "SKS", notes: "Catatan", name: "Nama", nim: "NIM", prodi: "Prodi",
  role: "Role", number: "Semester", label: "Label", spsUrl: "Link SPS", records: "Presensi",
};

export const fieldLabel = (k: string) => FIELD_LABEL[k] ?? k;

export function displayValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.map(displayValue).join(", ") : "—";
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "boolean") return v ? "Ya" : "Tidak";
  return String(v);
}

export interface DiffRow { field: string; label: string; before: string; after: string }

/** Baris diff untuk UI: UPDATE -> hanya yang berubah; CREATE -> after; DELETE -> before. */
export function diffRows(before: unknown, after: unknown): DiffRow[] {
  const b = (before && typeof before === "object" ? before : {}) as Record<string, unknown>;
  const a = (after && typeof after === "object" ? after : {}) as Record<string, unknown>;
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  const rows: DiffRow[] = [];
  const both = before != null && after != null;
  for (const k of keys) {
    if (both && same(b[k], a[k])) continue;
    rows.push({ field: k, label: fieldLabel(k), before: displayValue(before == null ? undefined : b[k]), after: displayValue(after == null ? undefined : a[k]) });
  }
  return rows;
}

/** "Schedule #clx12ab…" -> jangan tampilkan id panjang ke user. */
export function shortId(id: string | null | undefined) {
  if (!id) return "";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}
