/**
 * Hitung semester berjalan dari angkatan (NIM) dan tanggal, mengikuti kalender ITERA:
 * - Gasal: Agustus – Januari
 * - Genap: Februari – Juli
 * Contoh: angkatan 2024 -> Sep 2024 = 1, Mar 2025 = 2, Sep 2025 = 3, Sep 2026 = 5.
 */
export function currentSemesterNumber(angkatan: number, now = new Date()): number {
  // Pakai waktu WIB supaya pergantian bulan tidak meleset di server UTC.
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const year = wib.getUTCFullYear();
  const month = wib.getUTCMonth() + 1;
  const academicYearStart = month >= 8 ? year : year - 1;
  const isGasal = month >= 8 || month === 1;
  const n = (academicYearStart - angkatan) * 2 + (isGasal ? 1 : 2);
  return Math.min(14, Math.max(1, n));
}

export const DEFAULT_PRODI = process.env.DEFAULT_PRODI ?? "Teknik Informatika";

/** Nama tampilan semester. Label kustom lama tetap dihormati. */
export function semesterName(s: { number: number; isShort?: boolean; label?: string | null }): string {
  if (s.label) return s.label;
  return s.isShort ? `Semester Pendek (setelah Semester ${s.number})` : `Semester ${s.number}`;
}

/**
 * Semester genap yang boleh diikuti semester pendek: semester genap reguler terbaru
 * milik user yang sudah berjalan (<= semester sekarang). Null jika tidak ada.
 */
export function shortSemesterBase(regularNumbers: number[], current: number): number | null {
  const evens = regularNumbers.filter((n) => n % 2 === 0 && n <= current);
  return evens.length ? Math.max(...evens) : null;
}
