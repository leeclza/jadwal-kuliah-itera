/**
 * Status integrasi SIAKAD:
 * https://siakad.itera.ac.id/mahasiswa/jadwal membalas 303 (redirect ke login)
 * tanpa session. Tidak ada API publik, dan kita TIDAK menyimpan password/cookie
 * SIAKAD user. Karena itu data diambil lewat teks yang user copy dari halaman
 * KRS/Jadwal SIAKAD miliknya sendiri, lalu diparse di server (lihat parser.ts).
 *
 * Jika nanti ITERA menyediakan API resmi (OAuth/SSO), implementasikan di sini
 * dan buat provider baru di service.ts — bagian aplikasi lain tidak berubah.
 */
export const SIAKAD_SCHEDULE_URL =
  process.env.SIAKAD_SCHEDULE_URL ?? "https://siakad.itera.ac.id/mahasiswa/jadwal";
