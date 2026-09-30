export const DAYS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu", weekend: true },
  { value: 7, label: "Minggu", weekend: true },
] as const;

export type DayValue = (typeof DAYS)[number]["value"];

export const DAY_LABEL: Record<number, string> = Object.fromEntries(
  DAYS.map((d) => [d.value, d.label]),
);

/** Warna pastel per hari (mengikuti referensi jadwal ITERA). Hex tanpa '#'. */
export const DAY_COLORS: Record<number, string> = {
  1: "FFB7B7", // Senin - pink
  2: "B4C6E7", // Selasa - biru
  3: "FFE699", // Rabu - kuning
  4: "C6E0B4", // Kamis - hijau
  5: "F8CBAD", // Jumat - peach
  6: "D9C3E9", // Sabtu - lavender
  7: "B4E0DC", // Minggu - tosca
};

export function parseDay(input: string | null | undefined): number | null {
  if (!input) return null;
  const s = input.trim().toLowerCase().replace(/'/g, "");
  const map: Record<string, number> = {
    senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, jum: 5, "jum at": 5, sabtu: 6, minggu: 7, ahad: 7,
  };
  return map[s] ?? null;
}

/** Normalisasi "7.30", "07:30", "7:30" -> "07:30". Null jika tidak valid. */
export function normalizeTime(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = input.trim().match(/^(\d{1,2})[.:](\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function timeToMinutes(t: string | null | undefined): number | null {
  const n = normalizeTime(t);
  if (!n) return null;
  const [h, m] = n.split(":").map(Number);
  return h * 60 + m;
}

export function formatTimeRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "";
  return `${start ?? "?"} - ${end ?? "?"}`;
}
