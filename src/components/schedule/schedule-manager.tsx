"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Copy, Download, MoreVertical, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { Button, Card, Dialog, Input, Select } from "@/components/ui";
import { apiFetch } from "@/lib/client-api";
import { DAY_COLORS, DAY_LABEL, DAYS, formatTimeRange } from "@/lib/schedule/constants";
import { detectScheduleConflict } from "@/lib/schedule/conflict";
import { groupByDay } from "@/lib/schedule/grouping";
import type { ScheduleDTO } from "@/lib/schedule/repo";
import { MatchBadge, SourceBadge } from "./source-badge";
import { ScheduleFormDialog } from "./schedule-form-dialog";
import { SyncDialog } from "./sync-dialog";
import { ResolveDialog } from "./resolve-dialog";

type Filter = "ALL" | "SIAKAD" | "MANUAL" | "PRACTICUM" | "ASSISTANT";

export function ScheduleManager({
  items,
  spsUrlSet,
  siakadMock,
}: {
  items: ScheduleDTO[];
  spsUrlSet: boolean;
  siakadMock: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [day, setDay] = useState<string>("ALL");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [editing, setEditing] = useState<ScheduleDTO | "new" | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [resolving, setResolving] = useState<ScheduleDTO | null>(null);
  const [deleting, setDeleting] = useState<ScheduleDTO | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const conflicts = useMemo(() => detectScheduleConflict(items), [items]);
  const nameOf = (id: string) => items.find((i) => i.id === id)?.title ?? "";

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((i) => {
      if (day !== "ALL" && String(i.day) !== day) return false;
      if (filter === "SIAKAD" && i.source !== "SIAKAD") return false;
      if (filter === "MANUAL" && i.source !== "MANUAL") return false;
      if (filter === "PRACTICUM" && i.type !== "PRACTICUM") return false;
      if (filter === "ASSISTANT" && i.type !== "ASSISTANT") return false;
      if (!s) return true;
      return [i.title, i.courseCode, ...i.lecturers].some((v) => v?.toLowerCase().includes(s));
    });
  }, [items, q, day, filter]);

  const unscheduled = filtered.filter((i) => !i.day);
  const groups = groupByDay(filtered).filter((g) => day === "ALL" || String(g.day) === day);
  const isFiltering = q.trim() !== "" || filter !== "ALL";

  async function act(fn: () => Promise<unknown>, ok: string) {
    setMenuFor(null);
    try {
      await fn();
      setNotice({ tone: "ok", text: ok });
      router.refresh();
    } catch (e) {
      setNotice({ tone: "err", text: (e as Error).message });
    }
  }

  const actions = (i: ScheduleDTO) => (
    <>
      {i.matchStatus === "AMBIGUOUS" && (
        <Button size="sm" variant="outline" onClick={() => { setMenuFor(null); setResolving(i); }}>Pilih kelas</Button>
      )}
      <Button size="sm" variant="ghost" onClick={() => { setMenuFor(null); setEditing(i); }} aria-label={`Edit ${i.title}`}>
        <Pencil className="size-4" /> <span className="md:sr-only">Edit</span>
      </Button>
      {i.source === "SIAKAD" && (
        <Button size="sm" variant="ghost" aria-label={`Salin ${i.title} menjadi jadwal manual`}
          onClick={() => act(() => apiFetch(`/api/schedule/${i.id}/copy`, { method: "POST" }), "Disalin menjadi jadwal manual.")}>
          <Copy className="size-4" /> <span className="md:sr-only">Salin jadi manual</span>
        </Button>
      )}
      <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => { setMenuFor(null); setDeleting(i); }} aria-label={`Hapus ${i.title}`}>
        <Trash2 className="size-4" /> <span className="md:sr-only">Hapus</span>
      </Button>
    </>
  );

  const conflictNote = (i: ScheduleDTO) =>
    conflicts.has(i.id) ? (
      <p className="mt-1 flex items-start gap-1 text-xs font-medium text-red-700">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Jadwal bentrok dengan {conflicts.get(i.id)!.map(nameOf).join(", ")}
      </p>
    ) : null;

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Jadwal Kuliah Saya</h2>
            <p className="text-sm text-slate-600">Kelola jadwal kuliah dari SIAKAD dan jadwal tambahan secara otomatis.</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <Button onClick={() => setSyncOpen(true)}><RefreshCw className="size-4" aria-hidden /> Update dari SIAKAD</Button>
            <Button variant="outline" onClick={() => setEditing("new")}><Plus className="size-4" aria-hidden /> Tambah Jadwal</Button>
            <a href="/api/export" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600">
              <Download className="size-4" aria-hidden /> Download XLSX
            </a>
          </div>
        </div>
        {!spsUrlSet && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Link SPS semester ini belum diisi, jadi hari &amp; jam belum bisa dicocokkan.{" "}
            <a className="font-medium underline" href="/profile">Isi link SPS di Profile</a>.
          </p>
        )}
        {notice && (
          <p role="status" className={`mt-4 rounded-lg px-3 py-2 text-sm ${notice.tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
            {notice.text}
          </p>
        )}
      </Card>

      <Card className="p-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <Input aria-label="Cari mata kuliah, kode, atau dosen" placeholder="Cari matkul, kode, dosen..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select aria-label="Filter hari" value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="ALL">Semua hari</option>
            {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </Select>
          <Select aria-label="Filter sumber / jenis" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
            <option value="ALL">Semua</option>
            <option value="SIAKAD">SIAKAD</option>
            <option value="MANUAL">Manual</option>
            <option value="PRACTICUM">Praktikum</option>
            <option value="ASSISTANT">Asisten</option>
          </Select>
        </div>
      </Card>

      {items.length === 0 ? (
        <Card className="px-4 py-12 text-center">
          <p className="font-medium">Belum ada jadwal</p>
          <p className="mt-1 text-sm text-slate-600">Ambil mata kuliah dari SIAKAD atau tambahkan jadwal manual.</p>
          <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
            <Button onClick={() => setSyncOpen(true)}>Ambil dari SIAKAD</Button>
            <Button variant="outline" onClick={() => setEditing("new")}>Tambah Jadwal Manual</Button>
          </div>
        </Card>
      ) : (
        <>
          {unscheduled.length > 0 && (
            <Card className="border-amber-200 p-4">
              <h3 className="text-sm font-semibold text-amber-900">Belum punya hari &amp; jam ({unscheduled.length})</h3>
              <p className="mb-3 text-xs text-slate-600">
                Mata kuliah ini belum cocok dengan SPS. Pilih kelas, isi manual, atau update lagi setelah SPS rilis.
              </p>
              <ul className="divide-y divide-slate-100">
                {unscheduled.map((i) => (
                  <li key={i.id} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{i.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        {i.courseCode} {i.className && `• ${i.className}`} <SourceBadge item={i} /> <MatchBadge status={i.matchStatus} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">{actions(i)}</div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Desktop / tablet: tabel */}
          <Card className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
                  {["Hari", "Jam", "Matkul", "Ruang", "SKS", "Dosen", "Kode Matkul", "Sumber", "Aksi"].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  if (g.items.length === 0) {
                    if (isFiltering) return null;
                    return (
                      <tr key={g.day} className="border-b border-slate-100">
                        <th scope="row" className="px-3 py-3 text-left font-semibold" style={{ borderLeft: `4px solid #${DAY_COLORS[g.day]}` }}>{g.label}</th>
                        <td colSpan={8} className="px-3 py-3 text-slate-400">Tidak ada jadwal</td>
                      </tr>
                    );
                  }
                  return g.items.map((i, idx) => (
                    <tr key={i.id} className={`border-b border-slate-100 align-top ${conflicts.has(i.id) ? "bg-red-50/60" : ""}`}>
                      {idx === 0 && (
                        <th scope="rowgroup" rowSpan={g.items.length} className="px-3 py-3 text-left align-top font-semibold" style={{ borderLeft: `4px solid #${DAY_COLORS[g.day]}` }}>
                          {g.label}
                        </th>
                      )}
                      <td className="whitespace-nowrap px-3 py-3 tabular-nums">{formatTimeRange(i.startTime, i.endTime)}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium">{i.title}</p>
                        {i.className && <p className="text-xs text-slate-500">Kelas {i.className}</p>}
                        {conflictNote(i)}
                      </td>
                      <td className="px-3 py-3">{i.room}</td>
                      <td className="px-3 py-3">{i.sks}</td>
                      <td className="px-3 py-3 text-xs">{i.lecturers.map((l) => <p key={l}>{l}</p>)}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{i.courseCode}</td>
                      <td className="px-3 py-3"><SourceBadge item={i} /></td>
                      <td className="px-3 py-2"><div className="flex">{actions(i)}</div></td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </Card>

          {/* Mobile: kartu per hari */}
          <div className="space-y-3 md:hidden">
            {groups.map((g) =>
              g.items.length === 0 && isFiltering ? null : (
                <Card key={g.day} className="overflow-hidden">
                  <h3 className="px-4 py-2 text-sm font-semibold" style={{ background: `#${DAY_COLORS[g.day]}` }}>{g.label}</h3>
                  {g.items.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-400">Tidak ada jadwal</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {g.items.map((i) => (
                        <li key={i.id} className={`relative px-4 py-3 ${conflicts.has(i.id) ? "bg-red-50/60" : ""}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold tabular-nums text-slate-700">{formatTimeRange(i.startTime, i.endTime)}</p>
                              <p className="font-medium">{i.title}</p>
                              <p className="text-xs text-slate-600">
                                {[i.room, i.className && `Kelas ${i.className}`, i.sks && `${i.sks} SKS`, i.courseCode].filter(Boolean).join(" • ")}
                              </p>
                              {i.lecturers.length > 0 && <p className="mt-0.5 text-xs text-slate-500">{i.lecturers.join("; ")}</p>}
                              <div className="mt-1.5"><SourceBadge item={i} /></div>
                              {conflictNote(i)}
                            </div>
                            <button
                              aria-label={`Aksi untuk ${i.title}`}
                              aria-expanded={menuFor === i.id}
                              onClick={() => setMenuFor(menuFor === i.id ? null : i.id)}
                              className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
                            >
                              <MoreVertical className="size-4" />
                            </button>
                          </div>
                          {menuFor === i.id && <div className="mt-2 flex flex-wrap gap-1 border-t border-slate-100 pt-2">{actions(i)}</div>}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              ),
            )}
          </div>
        </>
      )}

      {editing !== null && (
      <ScheduleFormDialog
        item={editing === "new" ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onSaved={(msg) => { setEditing(null); setNotice({ tone: "ok", text: msg }); router.refresh(); }}
      />
      )}
      {syncOpen && (
      <SyncDialog
        open={syncOpen}
        siakadMock={siakadMock}
        currentItems={items}
        onClose={() => setSyncOpen(false)}
        onDone={() => router.refresh()}
      />
      )}
      <ResolveDialog item={resolving} onClose={() => setResolving(null)} onDone={(msg) => { setResolving(null); setNotice({ tone: "ok", text: msg }); router.refresh(); }} />
      <Dialog open={deleting !== null} onClose={() => setDeleting(null)} title="Hapus jadwal?">
        <p className="text-sm text-slate-700">
          <strong>{deleting?.title}</strong>{deleting?.day ? ` (${DAY_LABEL[deleting.day]}, ${formatTimeRange(deleting.startTime, deleting.endTime)})` : ""} akan dihapus.
        </p>
        {deleting?.source === "SIAKAD" && (
          <p className="mt-2 text-xs text-slate-500">Jadwal SIAKAD akan muncul lagi jika masih ada saat Update dari SIAKAD berikutnya.</p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => setDeleting(null)}>Batal</Button>
          <Button variant="danger" onClick={() => { const d = deleting!; setDeleting(null); act(() => apiFetch(`/api/schedule/${d.id}`, { method: "DELETE" }), "Jadwal dihapus."); }}>
            Hapus
          </Button>
        </div>
      </Dialog>
      {conflicts.size > 0 && (
        <p className="sr-only" role="status">Ada {conflicts.size} jadwal bentrok.</p>
      )}
    </div>
  );
}
