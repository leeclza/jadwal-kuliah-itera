# SPS Jadwal Kuliah ITERA

Gabungkan **mata kuliah dari SIAKAD** dengan **hari + jam dari SPS (Google Sheets prodi)**, tambah jadwal manual
(praktikum, asisten, organisasi), lalu download jadwal `.xlsx` berwarna per hari ala tabel ITERA.

### Tech stack

| Bagian | Teknologi |
| --- | --- |
| Framework | **Next.js 16** (App Router) + **React 19** |
| Bahasa | **TypeScript** |
| Styling | **Tailwind CSS v4** + `clsx` / `tailwind-merge`, ikon `lucide-react` |
| Database | **PostgreSQL** (Neon) lewat **Prisma 6** (ORM) |
| Login | **Auth.js v5** (`next-auth`), Google OAuth khusus `@itera.ac.id` |
| Form & validasi | `react-hook-form` + **Zod** |
| Data | `papaparse` (baca CSV SPS dari Google Sheets), `exceljs` (export XLSX) |
| Testing & lint | **Vitest**, ESLint |
| Deploy | **Vercel** (`npm run vercel-build`) |

- [1. SKPL](#1-skpl--spesifikasi-kebutuhan-perangkat-lunak)
- [2. Setup lokal](#2-setup-lokal)
- [3. Membuat Google OAuth Client](#3-membuat-google-oauth-client)
- [4. Deploy ke Vercel](#4-deploy-ke-vercel)
- [5. Arsitektur & struktur folder](#5-arsitektur--struktur-folder)

---

## 1. SKPL — Spesifikasi Kebutuhan Perangkat Lunak

### 1.1 Pendahuluan

**Tujuan.** Dokumen ini menjelaskan kebutuhan aplikasi web *SPS Jadwal Kuliah ITERA*, yang membantu mahasiswa ITERA
menyusun jadwal kuliah pribadi secara otomatis dari dua sumber resmi, lalu mengekspornya ke Excel.

**Latar belakang.** Saat pengisian KRS, SIAKAD hanya berisi daftar mata kuliah yang diambil (kode, kelas, SKS, dosen),
belum berisi hari & jam. Jadwal lengkap dirilis prodi dalam bentuk Google Sheets (SPS), biasanya beberapa hari setelah
KRS dibuka. Mahasiswa selama ini menyalin satu per satu secara manual.

**Ruang lingkup.**
- Termasuk: login akun ITERA, profil, pengelolaan semester & link SPS, impor mata kuliah dari SIAKAD, pencocokan dengan
  SPS, CRUD jadwal manual, deteksi bentrok, preview, export XLSX.
- Tidak termasuk (untuk versi ini): export PDF, Google Calendar, pengingat/notifikasi, berbagi jadwal publik, impor Excel.

**Definisi.**

| Istilah | Arti |
| --- | --- |
| SIAKAD | Sistem Informasi Akademik ITERA (`siakad.itera.ac.id`), sumber mata kuliah yang diambil (KRS). |
| SPS | Spreadsheet jadwal perkuliahan prodi di Google Sheets, sumber hari, jam, dan ruangan. |
| Jadwal SIAKAD | Item jadwal hasil sinkronisasi (`source = SIAKAD`). Bisa berubah/terhapus saat sync. |
| Jadwal manual | Item jadwal yang dibuat user (`source = MANUAL`): praktikum, asisten, lainnya. Tidak pernah disentuh sync. |
| Perlu Konfirmasi | Mata kuliah yang cocok dengan lebih dari satu kelas di SPS sehingga user harus memilih. |

### 1.2 Deskripsi umum

**Pengguna.** Mahasiswa ITERA yang punya akun Google `@itera.ac.id` / `@student.itera.ac.id`.

**Lingkungan operasi.** Browser modern (desktop, tablet, ponsel). Server Next.js di Vercel (Node.js), PostgreSQL.

**Batasan.**
- SIAKAD tidak menyediakan API publik dan halaman jadwalnya membutuhkan login. Aplikasi **tidak menyimpan password
  atau cookie SIAKAD** dan tidak mem-bypass login. Data diambil dari teks yang user salin dari halaman SIAKAD miliknya.
- SPS harus dibagikan dengan akses "Siapa saja yang memiliki link" agar bisa dibaca server.
- Format SPS bisa berubah antar semester; parser mencari kolom berdasarkan nama header, bukan posisi.

**Asumsi.** NIM ITERA berupa 9 digit dan tercantum di email mahasiswa serta di halaman KRS/Jadwal SIAKAD.

### 1.3 Kebutuhan fungsional

| Kode | Kebutuhan | Keterangan |
| --- | --- | --- |
| F-01 | Login dengan Google | Hanya email berdomain `itera.ac.id` (termasuk subdomain) yang terverifikasi. Divalidasi di server. |
| F-02 | Onboarding profil | Nama, NIM, prodi, semester aktif, link SPS (opsional). Email read-only dari Google. |
| F-03 | Penguncian identitas | NIM profil wajib sama dengan NIM di email Google (jika email memuat NIM). |
| F-04 | Kelola profil | Lihat & edit nama, NIM, prodi; tampilkan foto Google. |
| F-05 | Kelola semester | Tambah semester (1–14), pilih semester aktif, isi/ubah link SPS per semester. Jadwal tiap semester terpisah. |
| F-06 | Impor dari SIAKAD (tempel) | User menempel teks halaman KRS/Jadwal SIAKAD. Sistem membaca kode MK, nama, kelas, SKS, dosen. |
| F-07 | Validasi pemilik data SIAKAD | Teks SIAKAD harus memuat NIM user dan tidak boleh memuat NIM lain, sehingga akun SIAKAD = akun yang login. |
| F-08 | Pilih dari SPS | Alternatif impor: user mencentang mata kuliah + kelas langsung dari daftar SPS. |
| F-09 | Refresh jam | Membaca ulang SPS untuk mata kuliah yang sudah ada (saat SPS baru rilis/direvisi). |
| F-10 | Pencocokan SIAKAD–SPS | Berdasarkan kode MK (fallback: nama ter-normalisasi) + kelas persis. Tanpa fuzzy matching. |
| F-11 | Perlu Konfirmasi | Jika kelas ambigu, item ditandai dan user memilih kelas dari kandidat. |
| F-12 | Sinkronisasi aman | Sync hanya menambah/memperbarui/menghapus item `SIAKAD` pada semester aktif. Item `MANUAL` selalu dipertahankan. Ringkasan hasil ditampilkan. |
| F-13 | CRUD jadwal | Tambah, lihat, edit, hapus jadwal. Jenis: Mata Kuliah, Praktikum, Asisten, Lainnya. |
| F-14 | Salin jadi manual | Item SIAKAD bisa disalin menjadi item manual yang permanen. |
| F-15 | Tampilan jadwal | Dikelompokkan Senin–Jumat (hari kosong tetap tampil), urut hari lalu jam. Tabel di desktop, kartu di ponsel. |
| F-16 | Cari & filter | Cari nama/kode/dosen; filter hari, sumber (SIAKAD/Manual), jenis (Praktikum/Asisten). |
| F-17 | Deteksi bentrok | Tandai jadwal yang overlap di hari yang sama, tanpa mengubah data. |
| F-18 | Statistik | Total mata kuliah, total SKS, jumlah jadwal manual, jumlah hari aktif. |
| F-19 | Preview | Preview tabel yang identik dengan hasil export. |
| F-20 | Export XLSX | Kolom Hari, Jam, Matkul, Ruang, SKS, Dosen, Kode Matkul; warna pastel per hari; border tipis; merge cell hari; baris kosong untuk hari tanpa jadwal. Nama file `Jadwal_Kuliah_{NIM}.xlsx`. |

### 1.4 Kebutuhan non-fungsional

| Kode | Kategori | Kebutuhan |
| --- | --- | --- |
| NF-01 | Keamanan | Session server-side (tabel `Session`). Semua query dibatasi `userId` dari session, bukan dari input client. |
| NF-02 | Keamanan | Tidak menyimpan password/cookie SIAKAD. Secret hanya di environment variable server. |
| NF-03 | Keamanan | Link SPS hanya diterima dari `https://docs.google.com` (mencegah SSRF). |
| NF-04 | Integritas | Proses sync atomik (transaksi). Jika SIAKAD/SPS gagal diambil, data user tidak berubah. |
| NF-05 | Keandalan | Pesan error manusiawi, tanpa stack trace. Log server tidak memuat token/cookie. |
| NF-06 | Usabilitas | Responsif: ponsel (<768px), tablet (768–1023px), desktop (≥1024px). Tidak ada horizontal overflow halaman. |
| NF-07 | Aksesibilitas | HTML semantik, label pada input, navigasi keyboard, focus ring, dialog dapat ditutup dengan Esc, aria-label pada tombol ikon. |
| NF-08 | Maintainability | Sumber data di balik interface (`SiakadProvider`, `ScheduleTimeProvider`) sehingga perubahan SIAKAD/SPS cukup diubah di adapter. |
| NF-09 | Portabilitas | Database dari `DATABASE_URL` (tidak di-hardcode); migrasi Prisma untuk deploy. |

### 1.5 Model data (ringkas)

- `User` (email, nama, NIM, prodi, foto, semester aktif) — 1:N `Semester`, 1:N `ScheduleItem`.
- `Semester` (nomor, label, `spsUrl`, waktu sync terakhir). Unik per `userId + number`.
- `ScheduleItem` (source `SIAKAD|MANUAL`, type `COURSE|PRACTICUM|ASSISTANT|OTHER`, judul, kode, kelas, ruang, dosen[], SKS,
  hari 1–5, jam mulai/selesai, catatan, `sourceId`, `matchStatus`, kandidat). Unik per `userId + semesterId + source + sourceId`.
- `Account`, `Session`, `VerificationToken` — tabel standar Auth.js.

### 1.6 Kriteria penerimaan (sudah tercakup test otomatis)

- Data SIAKAD masuk dan hari/jam terisi dari SPS.
- Jadwal manual tidak terhapus saat sync; item SIAKAD yang hilang dari SIAKAD terhapus.
- Hari kosong tetap muncul; urutan hari → jam benar.
- XLSX terbentuk dengan warna, border, merge cell.
- User A tidak bisa mengakses/menghapus jadwal user B.
- Email non-ITERA ditolak; data SIAKAD milik NIM lain ditolak.

---

## 2. Setup lokal

**Prasyarat:** Node.js 20+ (disarankan 22/24), npm, dan satu database PostgreSQL.

Pilihan database termudah (gratis):
- **Neon** — https://neon.tech → buat project → salin *connection string* (pooled & direct).
- **Supabase** — Project Settings → Database → *Connection string* (Transaction pooler & Direct).
- Lokal — PostgreSQL terpasang di komputer, mis. `postgresql://postgres:password@localhost:5432/jadwal_kuliah`.

Langkah:

```bash
# 1. Install dependency (otomatis menjalankan prisma generate)
npm install

# 2. Siapkan environment
cp .env.example .env
#    isi DATABASE_URL, DATABASE_URL_UNPOOLED, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET (lihat bagian 3)
npx auth secret          # mengisi AUTH_SECRET ke .env.local — atau: openssl rand -base64 32

# 3. Buat tabel di database
npm run db:migrate       # development (prisma migrate dev)

# 4. Jalankan
npm run dev              # http://localhost:3000
```

> **`npm run dev` gagal di Windows?** Jika muncul `An Application Control policy has blocked this file`
> (`next-swc.win32-x64-msvc.node`) lalu `Turbopack is not supported on this platform`, berarti Windows
> (biasanya **Smart App Control**) memblokir binary native Next.js. Turbopack (bundler default `next dev`)
> butuh binary itu, Webpack tidak. Solusi:
> - Cepat: jalankan `npx next dev --webpack` (lebih lambat, tapi jalan).
> - Permanen: Windows Security → App & browser control → **Smart App Control: Off**, lalu hapus `node_modules`
>   dan jalankan `npm install` ulang. Catatan: Smart App Control tidak bisa dinyalakan lagi tanpa install ulang Windows.

Mode development tanpa sumber asli (opsional), di `.env`:

```
SIAKAD_PROVIDER=mock           # textarea kosong = pakai data contoh
SCHEDULE_TIME_PROVIDER=mock    # baca src/lib/google-sheets/fixtures/sps-sample.csv
```

Perintah lain:

| Perintah | Fungsi |
| --- | --- |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit & acceptance test (Vitest) |
| `npm run build` | Production build |
| `npm run db:deploy` | Terapkan migrasi di production |

### Cara pakai (alur user)

1. **Masuk dengan Google** memakai akun ITERA.
2. Onboarding: isi nama, NIM (harus sama dengan NIM di email), prodi, semester, link SPS (boleh nanti).
3. Setelah SPS rilis: Profile → *Semester & Link SPS* → tempel link Google Sheets SPS prodi (pastikan tab jadwal yang terbuka).
4. Dashboard → **Update dari SIAKAD**:
   - buka SIAKAD di tab lain, **login dengan akun yang sama**, buka halaman KRS/Jadwal,
   - Ctrl+A → Ctrl+C seluruh halaman, tempel di dialog → **Update**.
   - Atau pakai tab **Pilih dari SPS** jika tidak ingin menyalin dari SIAKAD.
5. Selesaikan item *Perlu Konfirmasi* (pilih kelas), tambah praktikum/asisten lewat **+ Tambah Jadwal**.
6. Menu **Jadwal** → cek preview → **Download XLSX**.

---

## 3. Membuat Google OAuth Client

> Disarankan membuat project Google Cloud memakai **akun ITERA** kamu. Jika Workspace ITERA memblokir pembuatan project,
> pakai akun Gmail pribadi dan pilih *External* — validasi domain `@itera.ac.id` tetap dilakukan server.

1. Buka https://console.cloud.google.com/ → pilih/buat project baru, mis. `sps-jadwal-itera`.
2. **APIs & Services → OAuth consent screen** (di UI baru: *Google Auth Platform → Branding*):
   - *User type*: **Internal** (jika project di bawah organisasi ITERA — otomatis hanya akun ITERA)
     atau **External** (akun pribadi).
   - App name: `SPS Jadwal Kuliah ITERA`, support email: email kamu.
   - *Authorized domains*: domain deploy kamu (mis. `vercel.app` tidak bisa; pakai domain custom jika ada, atau lewati saat masih *Testing*).
   - Scopes: cukup `openid`, `email`, `profile` (default).
   - Jika **External** dan status *Testing*: tambahkan email teman yang mau mencoba di **Test users** (maks. 100),
     atau klik **Publish app** agar semua akun bisa login (scope dasar tidak butuh verifikasi Google).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**, nama: `SPS Jadwal Web`.
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `https://<nama-app>.vercel.app`
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://<nama-app>.vercel.app/api/auth/callback/google`
4. Klik **Create** → salin *Client ID* dan *Client secret* ke `.env`:

   ```
   AUTH_GOOGLE_ID=xxxxxxxx.apps.googleusercontent.com
   AUTH_GOOGLE_SECRET=GOCSPX-xxxxxxxx
   ```

5. Jalankan `npm run dev`, buka http://localhost:3000, klik **Masuk dengan Google**.

Troubleshooting:
- `redirect_uri_mismatch` → URI di langkah 3 harus persis sama (http vs https, tanpa `/` di akhir, port benar).
- `Error 403: org_internal` → consent screen *Internal* tapi akun di luar organisasi; pakai akun ITERA atau ubah ke *External*.
- `access_denied` saat *Testing* → akun belum ada di *Test users*.
- Kembali ke halaman login dengan pesan "Hanya email ITERA" → akun bukan `@itera.ac.id` (sesuai desain).

---

## 4. Deploy ke Vercel

1. Push repo ke GitHub, lalu **Import Project** di https://vercel.com.
2. Buat database (Neon/Supabase atau *Storage → Postgres* di Vercel).
3. Isi **Environment Variables** (Production):

   | Nama | Nilai |
   | --- | --- |
   | `DATABASE_URL` | connection string **pooled** |
   | `DATABASE_URL_UNPOOLED` | connection string **direct** (untuk migrasi) |
   | `AUTH_SECRET` | hasil `npx auth secret` / `openssl rand -base64 32` |
   | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | dari bagian 3 |
   | `ALLOWED_EMAIL_DOMAIN` | `itera.ac.id` |
   | `SIAKAD_PROVIDER` | `real` |
   | `SCHEDULE_TIME_PROVIDER` | `google` |
   | `GOOGLE_SHEET_ID`, `GOOGLE_SHEET_GID` | (opsional) SPS default jika user belum mengisi link |

4. **Settings → Build & Development → Build Command**: `npm run vercel-build`
   (generate Prisma client + `prisma migrate deploy` + `next build`).
5. Deploy, lalu tambahkan URL Vercel ke *Authorized JavaScript origins* & *redirect URIs* di Google Cloud (bagian 3).

---

## 5. Arsitektur & struktur folder

```
SIAKAD (teks KRS milik NIM user) ─► kode MK, nama, kelas, SKS, dosen ─┐
                                                                     ├─► matcher ─► ScheduleItem (source=SIAKAD)
Link SPS per semester (Google Sheets CSV) ─► hari, jam, ruang ────────┘
Form "+ Tambah Jadwal" ─────────────────────────────────────────────────► ScheduleItem (source=MANUAL)
```

Aturan sync:
- Semua fetch eksternal dilakukan **sebelum** transaksi. Gagal → data tidak berubah.
- Satu `prisma.$transaction`; setiap query difilter `source = "SIAKAD"` + `userId` + `semesterId`.
- `sourceId = KODE|KELAS|sesi` → item yang sama diperbarui, bukan diduplikasi.

Soal login SIAKAD: web ini tidak bisa membaca session SIAKAD (beda domain, dan kita tidak menyimpan kredensial). Kesamaan
akun dijamin lewat NIM: NIM profil dikunci ke NIM di email Google, dan teks SIAKAD yang ditempel wajib memuat NIM itu
(dan tidak memuat NIM lain). Jika nanti ITERA menyediakan SSO/API resmi, tambahkan provider baru di `src/lib/siakad/service.ts`.

```
prisma/schema.prisma, migrations/
src/auth.ts                      Auth.js + validasi domain
src/app/(app)/                   dashboard (/), /jadwal (preview), /profile
src/app/login, onboarding
src/app/api/                     schedule, schedule/[id], schedule/[id]/copy|resolve, schedule/sync, sps,
                                 profile, onboarding, semesters, export
src/lib/auth/                    domain (email ITERA), identity (NIM ↔ email ↔ SIAKAD), session
src/lib/siakad/                  client, parser, service (Mock/Real provider)
src/lib/google-sheets/           client, parser, service (GoogleSheets/Mock provider)
src/lib/schedule/                matcher, sync (planner murni), sync-service (transaksi), conflict, grouping
src/lib/export/                  rows (dipakai preview & xlsx), xlsx (ExcelJS)
tests/                           unit + acceptance tests
```
