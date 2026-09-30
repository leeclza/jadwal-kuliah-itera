/**
 * Pengikat identitas: akun Google (OAuth) <-> NIM <-> data SIAKAD yang ditempel.
 *
 * Web ini tidak bisa membaca session SIAKAD (beda domain, dan kita tidak menyimpan
 * password/cookie). Jadi "akun SIAKAD harus sama dengan akun OAuth" ditegakkan lewat NIM:
 * 1. NIM di profil harus sama dengan NIM yang ada di email ITERA (jika email memuat NIM).
 * 2. Teks yang ditempel dari SIAKAD harus memuat NIM tersebut, dan tidak boleh memuat NIM lain.
 */

/** NIM ITERA: 9 digit (mis. 124140097). */
const NIM_RE = /(?<!\d)(\d{9})(?!\d)/g;

/** Ambil NIM dari bagian lokal email, mis. "nama.124140097@student.itera.ac.id". */
export function nimFromEmail(email: string | null | undefined): string | null {
  const local = (email ?? "").split("@")[0] ?? "";
  const found = [...local.matchAll(NIM_RE)].map((m) => m[1]);
  return found.length === 1 ? found[0] : null;
}

/**
 * Angkatan dari NIM ITERA: digit ke-2 & ke-3 = tahun masuk.
 * 124140097 -> 2024. Null jika tidak masuk akal.
 */
export function angkatanFromNim(nim: string | null | undefined, now = new Date()): number | null {
  if (!nim || !/^\d{9}$/.test(nim)) return null;
  const year = 2000 + Number(nim.slice(1, 3));
  if (year < 2014 || year > now.getFullYear()) return null;
  return year;
}

export type OwnerCheck =
  | { ok: true }
  | { ok: false; reason: "NO_NIM" | "NIM_NOT_FOUND" | "OTHER_NIM"; otherNim?: string };

const normName = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Pastikan teks SIAKAD milik akun yang login. Halaman KRS memuat NIM; halaman Jadwal Kuliah
 * hanya memuat nama di header, jadi jika tidak ada NIM sama sekali, nama lengkap yang dicocokkan.
 */
export function checkSiakadOwner(text: string, nim: string, name?: string | null): OwnerCheck {
  if (!nim) return { ok: false, reason: "NO_NIM" };
  const nims = new Set([...text.matchAll(NIM_RE)].map((m) => m[1]));
  const other = [...nims].find((n) => n !== nim);
  if (other) return { ok: false, reason: "OTHER_NIM", otherNim: other };
  if (!nims.has(nim)) {
    const n = name ? normName(name) : "";
    if (n.length >= 3 && text.split(/\r?\n/).some((line) => normName(line) === n)) return { ok: true };
    return { ok: false, reason: "NIM_NOT_FOUND" };
  }
  return { ok: true };
}
