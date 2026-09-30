"use client";

import { useState } from "react";
import { Button, Dialog } from "@/components/ui";
import { apiFetch } from "@/lib/client-api";
import { DAY_LABEL } from "@/lib/schedule/constants";
import type { ScheduleDTO } from "@/lib/schedule/repo";

/** Pilih kelas yang benar untuk mata kuliah yang matching-nya ambigu. */
export function ResolveDialog({ item, onClose, onDone }: {
  item: ScheduleDTO | null; onClose: () => void; onDone: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const byClass = new Map<string, NonNullable<ScheduleDTO["candidates"]>>();
  for (const c of item?.candidates ?? []) byClass.set(c.className, [...(byClass.get(c.className) ?? []), c]);

  async function choose(className: string) {
    if (!item) return;
    setBusy(true); setError(null);
    try {
      await apiFetch(`/api/schedule/${item.id}/resolve`, { method: "POST", body: { className } });
      onDone(`Kelas ${className} dipilih untuk ${item.title}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={item !== null} onClose={onClose} title="Perlu Konfirmasi">
      <p className="mb-3 text-sm text-slate-600">
        <strong>{item?.title}</strong> ada di beberapa kelas di SPS. Pilih kelas kamu:
      </p>
      <ul className="space-y-2">
        {[...byClass.entries()].map(([cls, sessions]) => (
          <li key={cls}>
            <button disabled={busy} onClick={() => choose(cls)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50">
              <span className="font-semibold">Kelas {cls}</span>
              {sessions.map((s, i) => (
                <span key={i} className="block text-xs text-slate-600">{DAY_LABEL[s.day]} {s.startTime}-{s.endTime}{s.room ? ` • ${s.room}` : ""}</span>
              ))}
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex justify-end"><Button variant="outline" onClick={onClose}>Batal</Button></div>
    </Dialog>
  );
}
