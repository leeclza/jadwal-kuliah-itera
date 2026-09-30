import Papa from "papaparse";
import { normalizeTime, parseDay } from "@/lib/schedule/constants";
import type { SpsRow } from "@/lib/schedule/types";

export class SpsFormatError extends Error {}

type ColKey =
  | "day" | "start" | "end" | "code" | "name" | "sks" | "class" | "semester" | "room" | "notes";

const HEADER_PATTERNS: Record<ColKey, RegExp> = {
  day: /^hari$/,
  start: /^jam mulai/,
  end: /^jam (berakhir|selesai)/,
  code: /^kode( mata kuliah| mk| matkul)?$/,
  name: /^nama( mata kuliah| mk| matkul)?$|^mata kuliah$/,
  sks: /^sks$/,
  class: /^kelas$/,
  semester: /^semester$/,
  room: /^ruang(an)?/,
  notes: /^catatan/,
};

const clean = (s: unknown) =>
  String(s ?? "").replace(/\s+/g, " ").trim();

/**
 * Parse CSV SPS. Mencari baris header (yang punya kolom Hari, Jam Mulai, Kode)
 * lalu membaca semua baris di bawahnya. Tidak bergantung pada posisi kolom.
 */
export function parseSpsCsv(csv: string): SpsRow[] {
  const { data } = Papa.parse<string[]>(csv, { skipEmptyLines: false });
  let headerIdx = -1;
  let cols: Partial<Record<ColKey, number>> = {};

  for (let i = 0; i < Math.min(data.length, 60); i++) {
    const found: Partial<Record<ColKey, number>> = {};
    data[i].forEach((cell, j) => {
      const h = clean(cell).toLowerCase();
      for (const [key, re] of Object.entries(HEADER_PATTERNS) as [ColKey, RegExp][]) {
        if (found[key] === undefined && re.test(h)) found[key] = j;
      }
    });
    if (found.day !== undefined && found.start !== undefined && found.code !== undefined) {
      headerIdx = i;
      cols = found;
      break;
    }
  }
  if (headerIdx < 0 || cols.name === undefined || cols.end === undefined) {
    throw new SpsFormatError(
      "Format SPS tidak dikenali: kolom Hari / Jam Mulai / Jam Berakhir / Kode / Nama Mata Kuliah tidak ditemukan.",
    );
  }

  const get = (row: string[], k: ColKey) =>
    cols[k] === undefined ? "" : clean(row[cols[k]!]);

  const rows: SpsRow[] = [];
  for (const row of data.slice(headerIdx + 1)) {
    const day = parseDay(get(row, "day"));
    const startTime = normalizeTime(get(row, "start"));
    const endTime = normalizeTime(get(row, "end"));
    const courseCode = get(row, "code").toUpperCase();
    if (!day || !startTime || !endTime || !courseCode) continue;
    rows.push({
      day,
      startTime,
      endTime,
      courseCode,
      courseName: get(row, "name"),
      className: get(row, "class").toUpperCase(),
      sks: get(row, "sks") || undefined,
      room: get(row, "room") || undefined,
      semester: get(row, "semester") || undefined,
      notes: get(row, "notes") || undefined,
    });
  }
  return rows;
}

/**
 * Ambil spreadsheetId + gid dari link Google Sheets.
 * Hanya menerima host docs.google.com (mencegah SSRF).
 */
export function parseSheetUrl(url: string): { sheetId: string; gid: string } | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" || u.hostname !== "docs.google.com") return null;
  const m = u.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return null;
  const gid =
    u.searchParams.get("gid") ?? u.hash.match(/gid=(\d+)/)?.[1] ?? "0";
  if (!/^\d+$/.test(gid)) return null;
  return { sheetId: m[1], gid };
}

export function csvExportUrl(sheetId: string, gid: string) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}
