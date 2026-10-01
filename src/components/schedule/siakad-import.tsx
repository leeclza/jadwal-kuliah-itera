"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui";
import { apiFetch } from "@/lib/client-api";
import { IMPORT_MESSAGE, IMPORT_READY, SIAKAD_ORIGIN, type ImportData, type ImportReady } from "@/lib/siakad/bookmarklet";
import type { SyncSummary } from "@/lib/schedule/sync-service";

type State = { s: "waiting" } | { s: "busy" } | { s: "done"; summary: SyncSummary } | { s: "error"; msg: string };

/** Menerima teks jadwal dari bookmarklet di tab SIAKAD lalu menjalankan sync otomatis. */
export function SiakadImport({ semester, semesterLabel }: { semester: number | null; semesterLabel: string }) {
  const [state, setState] = useState<State>({ s: "waiting" });
  const started = useRef(false);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== SIAKAD_ORIGIN || started.current) return;
      const data = e.data as Partial<ImportData>;
      if (data?.type !== IMPORT_MESSAGE || typeof data.text !== "string") return;
      started.current = true;
      // Tolak kalau tingkat semester yang terbaca di SIAKAD tidak sama dengan semester aktif.
      if (data.semester === undefined) {
        setState({ s: "error", msg: "Bookmark \"Kirim ke Jadwalin\" kamu versi lama. Hapus bookmark-nya, lalu seret ulang dari dialog Update SIAKAD." });
        return;
      }
      if (semester !== null && data.semester !== String(semester)) {
        setState({ s: "error", msg: `Tingkat Semester di SIAKAD (${data.semester ?? "tidak terbaca"}) tidak sesuai dengan semester aktif kamu (${semesterLabel}).` });
        return;
      }
      setState({ s: "busy" });
      apiFetch<{ summary: SyncSummary }>("/api/schedule/sync", { method: "POST", body: { mode: "siakad", text: data.text } })
        .then((r) => setState({ s: "done", summary: r.summary }))
        .catch((err: Error) => setState({ s: "error", msg: err.message }));
    }
    window.addEventListener("message", onMessage);
    // Kirim READY berulang sampai data datang (antisipasi listener di tab SIAKAD belum siap).
    // String lama tetap dikirim agar bookmark versi lama mengirim data & dapat pesan untuk update.
    const ping = () => {
      if (started.current) return;
      window.opener?.postMessage({ type: IMPORT_READY, semester } satisfies ImportReady, SIAKAD_ORIGIN);
      window.opener?.postMessage(IMPORT_READY, SIAKAD_ORIGIN);
    };
    ping();
    const timer = setInterval(ping, 1000);
    return () => { window.removeEventListener("message", onMessage); clearInterval(timer); };
  }, [semester, semesterLabel]);

  return (
    <Card className="p-6">
      <h1 className="text-lg font-semibold">Import dari SIAKAD</h1>
      {state.s === "waiting" && (
        <p className="mt-2 text-sm text-slate-600">
          Menunggu data dari tab SIAKAD… Halaman ini dibuka otomatis oleh tombol bookmark &quot;Kirim ke Jadwalin&quot;.
          Kalau tidak terjadi apa-apa, klik lagi bookmark-nya di tab SIAKAD.
        </p>
      )}
      {state.s === "busy" && (
        <p role="status" className="mt-3 flex items-center gap-2 text-sm text-blue-800">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Membaca &amp; memperbarui jadwal…
        </p>
      )}
      {state.s === "error" && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.msg} Jadwal kamu tidak berubah.</p>
      )}
      {state.s === "done" && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="flex items-center gap-2 font-medium text-emerald-700"><CheckCircle2 className="size-5" aria-hidden /> Jadwal berhasil diperbarui</p>
          <p className="text-slate-600">
            {state.summary.added} ditambahkan · {state.summary.updated} diperbarui · {state.summary.removed} dihapus
            {state.summary.needsConfirmation > 0 && ` · ${state.summary.needsConfirmation} perlu konfirmasi`}
          </p>
        </div>
      )}
      {(state.s === "done" || state.s === "error") && (
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-blue-700 underline">Lihat jadwal</Link>
      )}
    </Card>
  );
}
