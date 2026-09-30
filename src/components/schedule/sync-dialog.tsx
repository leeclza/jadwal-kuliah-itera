"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button, Dialog, Input, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/client-api";
import { DAY_LABEL } from "@/lib/schedule/constants";
import type { ScheduleDTO } from "@/lib/schedule/repo";
import type { SpsRow } from "@/lib/schedule/types";
import type { SyncSummary } from "@/lib/schedule/sync-service";
import { cn } from "@/lib/cn";

type Tab = "siakad" | "pick" | "refresh";
const STEPS = ["Mengambil data dari SIAKAD...", "Mencocokkan jadwal...", "Memperbarui jadwal..."];

export function SyncDialog({ open, onClose, onDone, siakadMock, currentItems }: {
  open: boolean; onClose: () => void; onDone: () => void; siakadMock: boolean; currentItems: ScheduleDTO[];
}) {
  const [tab, setTab] = useState<Tab>("siakad");
  const [text, setText] = useState("");
  const [step, setStep] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SyncSummary | null>(null);

  // Pilih dari SPS
  const [rows, setRows] = useState<SpsRow[] | null>(null);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  // Komponen di-mount ulang setiap dialog dibuka, jadi state awal cukup dari props.
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(currentItems.filter((i) => i.source === "SIAKAD" && i.courseCode && i.className).map((i) => `${i.courseCode}|${i.className}`)),
  );

  useEffect(() => {
    if (!open || tab !== "pick" || rows) return;
    let cancelled = false;
    apiFetch<{ rows: SpsRow[] }>("/api/sps")
      .then((r) => { if (!cancelled) setRows(r.rows); })
      .catch((e) => { if (!cancelled) setRowsError(e.message); });
    return () => { cancelled = true; };
  }, [open, tab, rows]);

  const courseOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string; cls: string; sks?: string; sessions: SpsRow[] }>();
    for (const r of rows ?? []) {
      const key = `${r.courseCode}|${r.className}`;
      const e = map.get(key) ?? { code: r.courseCode, name: r.courseName, cls: r.className, sks: r.sks, sessions: [] };
      e.sessions.push(r);
      map.set(key, e);
    }
    const s = search.trim().toLowerCase();
    return [...map.entries()]
      .filter(([, v]) => !s || `${v.code} ${v.name} ${v.cls}`.toLowerCase().includes(s))
      .sort(([, a], [, b]) => a.name.localeCompare(b.name) || a.cls.localeCompare(b.cls));
  }, [rows, search]);

  async function run() {
    setError(null); setSummary(null); setStep(0);
    const t1 = setTimeout(() => setStep(1), 700);
    const t2 = setTimeout(() => setStep(2), 1500);
    try {
      let body: unknown;
      if (tab === "siakad") body = { mode: "siakad", text };
      else if (tab === "refresh") body = { mode: "refresh" };
      else {
        const all = new Map((rows ?? []).map((r) => [`${r.courseCode}|${r.className}`, r]));
        body = {
          mode: "pick",
          courses: [...picked].map((k) => all.get(k)).filter(Boolean).map((r) => ({
            courseCode: r!.courseCode, courseName: r!.courseName, className: r!.className, sks: r!.sks,
          })),
        };
      }
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
            {([["siakad", "Tempel dari SIAKAD"], ["pick", "Pilih dari SPS"], ["refresh", "Refresh jam"]] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} disabled={busy}
                className={cn("min-h-9 rounded-md px-2 font-medium", tab === k ? "bg-white shadow-sm" : "text-slate-600 hover:text-slate-900")}>
                {l}
              </button>
            ))}
          </div>

          {tab === "siakad" && (
            <div className="space-y-2 text-sm">
              <p className="text-slate-600">
                SIAKAD membutuhkan login, jadi aplikasi ini <strong>tidak</strong> menyimpan password kamu. Buka{" "}
                <a href="https://siakad.itera.ac.id/mahasiswa/jadwal" target="_blank" rel="noreferrer" className="font-medium text-blue-700 underline">SIAKAD &gt; KRS/Jadwal</a>,
                login dengan <strong>akun yang sama</strong> dengan akun Google di web ini, lalu Ctrl+A (seluruh halaman), copy,
                dan tempel di sini. NIM di halaman harus ikut tercopy — data milik NIM lain akan ditolak. Yang dibaca: kode MK,
                nama, kelas, SKS, dosen. Hari &amp; jam diambil dari SPS.
              </p>
              <Textarea aria-label="Teks tabel dari SIAKAD" rows={8} value={text} onChange={(e) => setText(e.target.value)}
                placeholder={"IF25-21010\tProbabilitas dan Statistika\tRB\t3\tMiranti Verdiana, M.Si.\n..."} className="font-mono text-xs" />
              {siakadMock && !text.trim() && (
                <p className="text-xs text-amber-700">Mode development (SIAKAD_PROVIDER=mock): kosongkan untuk memakai data contoh.</p>
              )}
            </div>
          )}

          {tab === "pick" && (
            <div className="space-y-2 text-sm">
              <p className="text-slate-600">Centang mata kuliah + kelas yang kamu ambil. Daftar dibaca langsung dari link SPS semester aktif.</p>
              {rowsError ? (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{rowsError}</p>
              ) : !rows ? (
                <p className="flex items-center gap-2 text-slate-500"><Loader2 className="size-4 animate-spin" aria-hidden /> Membaca SPS...</p>
              ) : (
                <>
                  <Input aria-label="Cari mata kuliah di SPS" placeholder="Cari nama / kode / kelas..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  <p className="text-xs text-slate-500">{picked.size} dipilih</p>
                  <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                    {courseOptions.map(([key, c]) => (
                      <li key={key}>
                        <label className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-slate-50">
                          <input type="checkbox" className="mt-1 size-4" checked={picked.has(key)}
                            onChange={(e) => {
                              const next = new Set(picked);
                              if (e.target.checked) next.add(key); else next.delete(key);
                              setPicked(next);
                            }} />
                          <span className="min-w-0">
                            <span className="block font-medium">{c.name} <span className="text-slate-500">• {c.cls}</span></span>
                            <span className="block text-xs text-slate-500">
                              {c.code} • {c.sessions.map((s) => `${DAY_LABEL[s.day]} ${s.startTime}-${s.endTime}${s.room ? ` (${s.room})` : ""}`).join("; ")}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </>
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
            <Button variant="outline" onClick={onClose} disabled={busy}>Batal</Button>
            <Button onClick={run} disabled={busy || (tab === "pick" && !rows)}>
              {busy ? "Memproses..." : "Update"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
