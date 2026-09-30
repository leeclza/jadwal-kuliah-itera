import type { SiakadCourse } from "@/lib/schedule/types";

/** Kode MK ITERA, contoh: IF25-21010, WI25-00005, WU25-00003 */
const CODE_RE = /\b([A-Z]{2}\d{2}-\d{5})\b/;
const CLASS_RE = /^(R[A-Z]{0,2}\d{0,2}|[A-Z]\d{2}|R)$/;
const SKS_RE = /^\d(\+\d)?$/;
const TITLE_RE = /\b(S\.|M\.|Dr\.|Ir\.|Ph\.D|Prof\.)/;

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Parse teks yang di-copy dari halaman KRS / Jadwal SIAKAD.
 * Menerima baris yang dipisah TAB (hasil copy tabel dari browser)
 * atau beberapa spasi. Hanya baris yang mengandung kode MK yang diambil.
 * Tidak menebak: kolom yang tidak dikenali diabaikan.
 */
export function parseSiakadText(text: string): SiakadCourse[] {
  const byKey = new Map<string, SiakadCourse>();
  for (const line of text.split(/\r?\n/)) {
    const codeMatch = line.match(CODE_RE);
    if (!codeMatch) continue;
    const cells = line
      .split(/\t|\s{2,}|\|/)
      .map(clean)
      .filter(Boolean);
    const code = codeMatch[1];

    let className: string | undefined;
    let sks: string | undefined;
    let name: string | undefined;
    const lecturers: string[] = [];

    const codeIdx = cells.findIndex((c) => c.includes(code));
    // Kolom sebelum kode (No., dll.) diabaikan agar nomor urut tidak terbaca sebagai SKS.
    for (const c of cells.slice(codeIdx)) {
      if (c.includes(code)) {
        // Kadang kode & nama ada di satu sel: "IF25-21010 Probabilitas dan Statistika"
        const rest = clean(c.replace(code, "").replace(/^[-–:]/, ""));
        if (rest && !name && /[a-z]/i.test(rest)) name = rest;
        continue;
      }
      if (!className && CLASS_RE.test(c)) { className = c; continue; }
      if (!sks && SKS_RE.test(c)) { sks = c; continue; }
      if (TITLE_RE.test(c)) {
        lecturers.push(...c.split(/;|\s\/\s/).map(clean).filter(Boolean));
        continue;
      }
      if (!name && /[a-z]{3,}/i.test(c) && !/^\d+$/.test(c)) name = c;
    }

    const key = `${code}|${className ?? ""}`;
    if (byKey.has(key)) continue;
    byKey.set(key, {
      courseCode: code,
      courseName: name ?? code,
      className,
      sks,
      lecturers,
      rawData: line.slice(0, 500),
    });
  }
  return [...byKey.values()];
}
