"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus } from "lucide-react";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { apiFetch } from "@/lib/client-api";

interface Sem { id: string; number: number; label: string | null; spsUrl: string | null }

export function SemesterManager({ semesters, activeId }: { semesters: Sem[]; activeId: string | null }) {
  const router = useRouter();
  const [urls, setUrls] = useState<Record<string, string>>(Object.fromEntries(semesters.map((s) => [s.id, s.spsUrl ?? ""])));
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [newNum, setNewNum] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true); setMsg(null);
    try { await fn(); setMsg({ tone: "ok", text: ok }); router.refresh(); return true; }
    catch (e) { setMsg({ tone: "err", text: (e as Error).message }); return false; }
    finally { setBusy(false); }
  }

  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold">Semester &amp; Link SPS</h2>
      <p className="mt-1 text-sm text-slate-600">
        SPS (Google Sheets jadwal prodi) biasanya rilis beberapa hari setelah KRS dibuka. Tempel linknya di sini — aplikasi
        membaca semua baris jadwal dari sheet tersebut. Pastikan link membuka tab (gid) yang berisi tabel jadwal dan
        spreadsheet dibagikan &quot;Siapa saja yang memiliki link&quot;.
      </p>

      <ul className="mt-4 space-y-3">
        {semesters.sort((a, b) => b.number - a.number).map((s) => (
          <li key={s.id} className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-medium">{s.label || `Semester ${s.number}`}</span>
              {s.id === activeId ? <Badge tone="blue">Aktif</Badge> : (
                <Button size="sm" variant="ghost" disabled={busy}
                  onClick={() => run(() => apiFetch(`/api/semesters/${s.id}`, { method: "PATCH", body: { spsUrl: urls[s.id] || null, setActive: true } }), `Semester ${s.number} jadi aktif.`)}>
                  Jadikan aktif
                </Button>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input aria-label={`Link SPS semester ${s.number}`} type="url" placeholder="https://docs.google.com/spreadsheets/d/..."
                value={urls[s.id] ?? ""} onChange={(e) => setUrls({ ...urls, [s.id]: e.target.value })} />
              <div className="flex gap-2">
                <Button variant="outline" disabled={busy}
                  onClick={() => run(() => apiFetch(`/api/semesters/${s.id}`, { method: "PATCH", body: { spsUrl: urls[s.id] || null } }), "Link SPS disimpan.")}>
                  Simpan
                </Button>
                {s.spsUrl && (
                  <a href={s.spsUrl} target="_blank" rel="noreferrer" aria-label="Buka SPS di tab baru"
                    className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
                    <ExternalLink className="size-4" />
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <form className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[120px_1fr_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => apiFetch("/api/semesters", { method: "POST", body: { number: newNum, spsUrl: newUrl || null } }), `Semester ${newNum} ditambahkan & jadi aktif.`)
            .then((ok) => { if (ok) { setNewNum(""); setNewUrl(""); } });
        }}>
        <Field label="Semester baru" htmlFor="new-sem"><Input id="new-sem" type="number" min={1} max={14} required value={newNum} onChange={(e) => setNewNum(e.target.value)} /></Field>
        <Field label="Link SPS (opsional)" htmlFor="new-url"><Input id="new-url" type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} /></Field>
        <Button type="submit" disabled={busy}><Plus className="size-4" aria-hidden /> Tambah</Button>
      </form>
      {msg && <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
    </Card>
  );
}
