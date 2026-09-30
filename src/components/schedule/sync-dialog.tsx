"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, CheckCircle2, Loader2 } from "lucide-react";
import { Button, Dialog, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/client-api";
import type { SyncSummary } from "@/lib/schedule/sync-service";
import { cn } from "@/lib/cn";
import { buildBookmarklet } from "@/lib/siakad/bookmarklet";

/** Link bookmarklet; href di-set lewat DOM karena React memblokir URL javascript:. */
function BookmarkletLink() {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => { ref.current?.setAttribute("href", buildBookmarklet(window.location.origin)); }, []);
  return (
    <a ref={ref} onClick={(e) => { e.preventDefault(); alert("Seret tombol ini ke bookmark bar, jangan diklik di sini."); }}
      className="inline-flex min-h-10 cursor-grab items-center gap-2 rounded-lg bg-blue-600 px-4 font-medium text-white shadow-sm hover:bg-blue-700">
      <Bookmark className="size-4" aria-hidden /> Kirim ke Jadwalin
    </a>
  );
}

type Tab = "auto" | "siakad" | "refresh";
const STEPS = ["Mengambil data dari SIAKAD...", "Mencocokkan jadwal...", "Memperbarui jadwal..."];

export function SyncDialog({ open, onClose, onDone, siakadMock }: {
  open: boolean; onClose: () => void; onDone: () => void; siakadMock: boolean;
}) {
  const [tab, setTab] = useState<Tab>("auto");
  const [text, setText] = useState("");
  const [step, setStep] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SyncSummary | null>(null);

  async function run() {
    setError(null); setSummary(null); setStep(0);
    const t1 = setTimeout(() => setStep(1), 700);
    const t2 = setTimeout(() => setStep(2), 1500);
    try {
      const body = tab === "siakad" ? { mode: "siakad", text } : { mode: "refresh" };
      const res = await apiFetch<{ summary: SyncSummary }>("/api/schedule/sync", { method: "POST", body });
      setSummary(res.summary);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      clearTimeout(t1); clearTimeout(t2); setStep(null);
    }
  }

  const busy = step !== null;

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} title="Update dari SIAKAD" wide>
      {summary ? (
        <div className="space-y-4">
          <p className="flex items-center gap-2 font-medium text-emerald-700"><CheckCircle2 className="size-5" aria-hidden /> Jadwal berhasil diperbarui</p>
          <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {[
              [summary.added, "jadwal ditambahkan"],
              [summary.updated, "jadwal diperbarui"],
              [summary.removed, "jadwal dihapus"],
              [summary.manualKept, "jadwal manual dipertahankan"],
              [summary.needsConfirmation, "membutuhkan konfirmasi"],
            ].map(([n, l]) => (
              <li key={l} className="rounded-lg border border-slate-200 p-3"><span className="block text-xl font-semibold tabular-nums">{n}</span>{l}</li>
            ))}
          </ul>
          <div className="flex justify-end"><Button onClick={onClose}>Selesai</Button></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div role="tablist" aria-label="Sumber mata kuliah" className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 text-sm">
            {([["auto", "Otomatis"], ["siakad", "Tempel manual"], ["refresh", "Refresh jam"]] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} disabled={busy}
                className={cn("min-h-9 rounded-md px-2 font-medium", tab === k ? "bg-white shadow-sm" : "text-slate-600 hover:text-slate-900")}>
                {l}
              </button>
            ))}
          </div>

          {tab !== "refresh" && (
            <p className="text-xs text-slate-500">Pilih <strong>salah satu</strong> cara saja: Otomatis (disarankan) atau Tempel manual.</p>
          )}

          {tab === "auto" && (
            <div className="space-y-3 text-sm">
              <div className="space-y-2">
                <p className="font-medium text-slate-800">Setup sekali, lalu cukup 1 klik dari SIAKAD</p>
                <ol className="list-decimal space-y-1 pl-5 text-slate-700">
                  <li>Seret tombol di bawah ke bookmark bar browser (Ctrl+Shift+B kalau bar belum muncul).</li>
                  <li>Login <a href="https://siakad.itera.ac.id" target="_blank" rel="noreferrer" className="font-medium text-blue-700 underline">SIAKAD</a>, lalu klik bookmark itu di halaman SIAKAD mana saja.</li>
                  <li>Jadwal langsung terbaca dan diperbarui di tab baru. Selanjutnya cukup langkah 2.</li>
                </ol>
                <BookmarkletLink />
                <p className="text-xs text-slate-500">Hanya untuk browser laptop/PC. Di HP, pakai tab <strong>Tempel manual</strong>.</p>
              </div>
            </div>
          )}

          {tab === "siakad" && (
            <div className="space-y-2 text-sm">
              <p className="text-slate-600">
                SIAKAD membutuhkan login, jadi aplikasi ini <strong>tidak</strong> menyimpan password kamu. Buka{" "}
                <a href="https://siakad.itera.ac.id/mahasiswa/jadwal" target="_blank" rel="noreferrer" className="font-medium text-blue-700 underline">SIAKAD &gt; KRS/Jadwal</a>,
                login dengan <strong>akun yang sama</strong> dengan akun Google di web ini, lalu Ctrl+A (seluruh halaman), copy,
                dan tempel di sini. Nama/NIM di bagian atas halaman harus ikut tercopy — data milik orang lain akan ditolak. Yang dibaca: kode MK,
                nama, kelas, SKS, dosen. Hari &amp; jam diambil dari SPS.
              </p>
              <Textarea aria-label="Teks tabel dari SIAKAD" rows={8} value={text} onChange={(e) => setText(e.target.value)}
                placeholder={"IF25-21010\tProbabilitas dan Statistika\tRB\t3\tMiranti Verdiana, M.Si.\n..."} className="font-mono text-xs" />
              {siakadMock && !text.trim() && (
                <p className="text-xs text-amber-700">Mode development (SIAKAD_PROVIDER=mock): kosongkan untuk memakai data contoh.</p>
              )}
            </div>
          )}

          {tab === "refresh" && (
            <p className="text-sm text-slate-600">
              Pakai daftar mata kuliah SIAKAD yang sudah ada, lalu baca ulang hari, jam, dan ruangan dari SPS. Cocok saat SPS
              baru dirilis atau direvisi.
            </p>
          )}

          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Jadwal <strong>manual</strong> (praktikum, asisten, dll.) tidak akan diubah atau dihapus. Mata kuliah SIAKAD yang tidak
            ada lagi di daftar baru akan dihapus.
          </p>

          {busy && <p role="status" className="flex items-center gap-2 text-sm text-blue-800"><Loader2 className="size-4 animate-spin" aria-hidden /> {STEPS[step!]}</p>}
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error} Jadwal kamu tidak berubah.</p>}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={onClose} disabled={busy}>{tab === "auto" ? "Tutup" : "Batal"}</Button>
            {tab !== "auto" && (
              <Button onClick={run} disabled={busy}>
                {busy ? "Memproses..." : "Update"}
              </Button>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
