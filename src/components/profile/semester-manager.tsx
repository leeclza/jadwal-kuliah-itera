"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, DelayedButton, Dialog, Field, Input } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/client-api";
import { cn } from "@/lib/cn";

interface Sem { id: string; number: number; isShort: boolean; name: string; spsUrl: string | null }

export function SemesterManager({ semesters, activeId, shortBase }: { semesters: Sem[]; activeId: string | null; shortBase: number | null }) {
  const router = useRouter();
  const [newUrl, setNewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Sem | null>(null);
  const [draft, setDraft] = useState("");
  const [deleting, setDeleting] = useState<Sem | null>(null);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try { await fn(); toast.success(ok); router.refresh(); return true; }
    catch (e) { toast.error((e as Error).message); return false; }
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
        {[...semesters].sort((a, b) => b.number - a.number || Number(b.isShort) - Number(a.isShort)).map((s) => (
          <li key={s.id} className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-medium">{s.name}</span>
              {s.isShort && <Badge tone="amber">SP</Badge>}
              {s.id === activeId ? <Badge tone="blue">Aktif</Badge> : (
                <Button size="sm" variant="ghost" disabled={busy}
                  onClick={() => run(() => apiFetch(`/api/semesters/${s.id}`, { method: "PATCH", body: { spsUrl: s.spsUrl, setActive: true } }), `${s.name} jadi aktif.`)}>
                  Jadikan aktif
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className={cn("min-w-0 flex-1 truncate rounded-lg bg-slate-50 px-3 py-2 text-sm", s.spsUrl ? "text-slate-600" : "italic text-slate-400")} title={s.spsUrl ?? undefined}>
                {s.spsUrl ?? "Belum ada link SPS"}
              </p>
              <Button variant="outline" disabled={busy} onClick={() => { setDraft(s.spsUrl ?? ""); setEditing(s); }}>
                <Pencil className="size-4" aria-hidden /> <span className="max-sm:sr-only">{s.spsUrl ? "Ubah" : "Tambah"}</span>
              </Button>
              {s.spsUrl && (
                <a href={s.spsUrl} target="_blank" rel="noreferrer" aria-label="Buka SPS di tab baru"
                  className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
                  <ExternalLink className="size-4" />
                </a>
              )}
              {s.isShort && (
                <Button variant="ghost" disabled={busy} aria-label={`Hapus ${s.name}`} onClick={() => setDeleting(s)}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600">
        Semester reguler dibuat otomatis dari angkatan di NIM dan tidak bisa diubah.
      </p>
      {shortBase !== null && (
        <form className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => apiFetch("/api/semesters", { method: "POST", body: { spsUrl: newUrl || null } }), "Semester pendek ditambahkan & jadi aktif.")
              .then((ok) => { if (ok) setNewUrl(""); });
          }}>
          <Field label={`Ambil semester pendek setelah Semester ${shortBase}? Link SPS (opsional)`} htmlFor="new-url"
            hint="Lewati saja kalau tidak ambil SP.">
            <Input id="new-url" type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
          </Field>
          <Button type="submit" disabled={busy}><Plus className="size-4" aria-hidden /> Tambah Semester Pendek</Button>
        </form>
      )}
      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={`Link SPS ${editing?.name ?? ""}`}>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const sem = editing!;
          const ok = await run(() => apiFetch(`/api/semesters/${sem.id}`, { method: "PATCH", body: { spsUrl: draft.trim() || null } }), "Link SPS berhasil disimpan.");
          if (ok) setEditing(null);
        }}>
          <Field label="Link Google Sheets SPS" htmlFor="sps-url" hint="Kosongkan untuk menghapus link.">
            <Input id="sps-url" type="url" autoFocus placeholder="https://docs.google.com/spreadsheets/d/..."
              value={draft} onChange={(e) => setDraft(e.target.value)} />
          </Field>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            <Button type="submit" disabled={busy || draft.trim() === (editing?.spsUrl ?? "")}>Simpan</Button>
          </div>
        </form>
      </Dialog>
      <Dialog open={deleting !== null} onClose={() => setDeleting(null)} title="Hapus semester?">
        <p className="text-sm text-slate-700">
          <strong>{deleting?.name}</strong> beserta semua jadwalnya akan dihapus. Tindakan ini tidak bisa dibatalkan.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
          <DelayedButton key={deleting?.id ?? "none"} variant="danger" disabled={busy} onClick={() => {
            const d = deleting!; setDeleting(null);
            run(() => apiFetch(`/api/semesters?id=${d.id}`, { method: "DELETE" }), `${d.name} dihapus.`);
          }}>
            Hapus
          </DelayedButton>
        </div>
      </Dialog>
    </Card>
  );
}
