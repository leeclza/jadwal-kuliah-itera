"use client";

import { useState } from "react";
import {
  Download, Eye, FilePlus2, LogIn, LogOut, Pencil, RefreshCw, ShieldAlert, Sparkles, Trash2, type LucideIcon,
} from "lucide-react";
import { Dialog } from "@/components/ui";
import { cn } from "@/lib/cn";
import { AUDIT_ACTIONS, CATEGORY_LABEL, KIND_LABEL, ROLE_LABEL, isAuditAction, isAuditCategory, kindOf, type AuditKind } from "@/lib/audit/actions";
import { diffRows, displayValue, fieldLabel, shortId } from "@/lib/audit/format";
import type { AuditRow } from "@/lib/audit/query";

export type AuditItem = Omit<AuditRow, "createdAt"> & { createdAt: string };

const TZ = "Asia/Jakarta";
const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const hm = new Intl.DateTimeFormat("id-ID", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const longDate = new Intl.DateTimeFormat("id-ID", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });
const full = new Intl.DateTimeFormat("id-ID", { timeZone: TZ, dateStyle: "long", timeStyle: "medium" });

const KIND_STYLE: Record<AuditKind, { icon: LucideIcon; badge: string; dot: string }> = {
  create: { icon: FilePlus2, badge: "border-emerald-200 bg-emerald-50 text-emerald-800", dot: "bg-emerald-50 text-emerald-600" },
  update: { icon: Pencil, badge: "border-amber-200 bg-amber-50 text-amber-800", dot: "bg-amber-50 text-amber-600" },
  delete: { icon: Trash2, badge: "border-red-200 bg-red-50 text-red-800", dot: "bg-red-50 text-red-600" },
  generate: { icon: Sparkles, badge: "border-violet-200 bg-violet-50 text-violet-800", dot: "bg-violet-50 text-violet-600" },
  sync: { icon: RefreshCw, badge: "border-sky-200 bg-sky-50 text-sky-800", dot: "bg-sky-50 text-sky-600" },
  export: { icon: Download, badge: "border-indigo-200 bg-indigo-50 text-indigo-800", dot: "bg-indigo-50 text-indigo-600" },
  login: { icon: LogIn, badge: "border-teal-200 bg-teal-50 text-teal-800", dot: "bg-teal-50 text-teal-600" },
  logout: { icon: LogOut, badge: "border-slate-200 bg-slate-50 text-slate-700", dot: "bg-slate-100 text-slate-600" },
  security: { icon: ShieldAlert, badge: "border-rose-200 bg-rose-50 text-rose-800", dot: "bg-rose-50 text-rose-600" },
  view: { icon: Eye, badge: "border-slate-200 bg-slate-50 text-slate-700", dot: "bg-slate-100 text-slate-600" },
};

function ago(iso: string, now: number) {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "baru saja";
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
}

function groupLabel(day: string, today: string) {
  const yesterday = ymd.format(new Date(new Date(`${today}T12:00:00+07:00`).getTime() - 86400000));
  if (day === today) return "Hari Ini";
  if (day === yesterday) return "Kemarin";
  return longDate.format(new Date(`${day}T12:00:00+07:00`));
}

const initials = (name: string | null) =>
  (name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

const roleLabel = (r: string | null) => (r ? (ROLE_LABEL[r] ?? r) : "Sistem");

const targetText = (i: AuditItem) => i.targetName || (i.targetType ? `${i.targetType}${i.targetId ? ` #${shortId(i.targetId)}` : ""}` : null);

export function AuditList({ items, now, today }: { items: AuditItem[]; now: number; today: string }) {
  const [open, setOpen] = useState<AuditItem | null>(null);

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        Belum ada aktivitas yang cocok dengan filter.
      </div>
    );
  }

  const groups: { day: string; items: AuditItem[] }[] = [];
  for (const it of items) {
    const day = ymd.format(new Date(it.createdAt));
    const g = groups.at(-1);
    if (g?.day === day) g.items.push(it);
    else groups.push({ day, items: [it] });
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {groups.map((g) => (
          <section key={g.day} aria-label={groupLabel(g.day, today)}>
            <h2 className="border-y border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 first:border-t-0 sm:px-5">
              {groupLabel(g.day, today)}
            </h2>
            <ul className="divide-y divide-slate-100">
              {g.items.map((it) => {
                const kind = kindOf(it.action);
                const st = KIND_STYLE[kind];
                const Icon = st.icon;
                const target = targetText(it);
                const status = (it.metadata as Record<string, unknown> | null)?.status;
                return (
                  <li key={it.id}>
                    <button
                      onClick={() => setOpen(it)}
                      className="flex w-full gap-3 px-4 py-4 text-left hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 sm:gap-4 sm:px-5"
                    >
                      <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", st.dot)}>
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <p className="break-words text-sm text-slate-800">
                            <span className="font-semibold text-slate-900">{it.actorName ?? "Sistem"}</span>{" "}
                            {it.actorName && it.description.startsWith(it.actorName)
                              ? it.description.slice(it.actorName.length).trim()
                              : it.description}
                          </p>
                          <time dateTime={it.createdAt} title={full.format(new Date(it.createdAt))} className="shrink-0 text-xs text-slate-400">
                            {hm.format(new Date(it.createdAt))} · {ago(it.createdAt, now)}
                          </time>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span className={cn("rounded-full border px-2 py-0.5 font-medium", st.badge)}>{KIND_LABEL[kind]}</span>
                          {status === "FAILED" && (
                            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-medium text-red-700">Gagal</span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <span className="grid size-5 place-items-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-600" aria-hidden>
                              {initials(it.actorName)}
                            </span>
                            {roleLabel(it.actorRole)}
                          </span>
                          {target && <span className="truncate">Target: <span className="text-slate-800">{target}</span></span>}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <Dialog open={open !== null} onClose={() => setOpen(null)} title="Detail Aktivitas" wide>
        {open && <AuditDetail item={open} />}
      </Dialog>
    </>
  );
}

function AuditDetail({ item }: { item: AuditItem }) {
  const rows = diffRows(item.beforeData, item.afterData);
  const isUpdate = item.beforeData != null && item.afterData != null;
  const meta = item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) ? Object.entries(item.metadata) : [];
  const info: [string, string][] = [
    ["Aktor", item.actorName ?? "Sistem"],
    ["Email", item.actorEmail ?? "—"],
    ["Role", roleLabel(item.actorRole)],
    ["Aksi", `${isAuditAction(item.action) ? AUDIT_ACTIONS[item.action].label : item.action} (${item.action})`],
    ["Kategori", isAuditCategory(item.category) ? CATEGORY_LABEL[item.category] : item.category],
    ["Target", targetText(item) ?? "—"],
    ["ID Target", item.targetId ?? "—"],
    ["Waktu", full.format(new Date(item.createdAt))],
    ["IP", item.ipAddress ?? "—"],
    ["User Agent", item.userAgent ?? "—"],
  ];

  return (
    <div className="space-y-5 text-sm">
      <p className="text-slate-800">{item.description}</p>
      <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[8rem_1fr]">
        {info.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-xs font-medium text-slate-500 sm:text-sm">{k}</dt>
            <dd className="break-all text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>

      {rows.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-slate-900">
            {isUpdate ? "Perubahan" : item.afterData != null ? "Data Dibuat" : "Data Sebelum Dihapus"}
          </h3>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Field</th>
                  {isUpdate || item.afterData == null ? <th className="px-3 py-2 font-medium">Sebelum</th> : null}
                  {isUpdate || item.afterData != null ? <th className="px-3 py-2 font-medium">Sesudah</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.field}>
                    <td className="px-3 py-2 font-medium text-slate-700">{r.label}</td>
                    {isUpdate || item.afterData == null ? <td className="break-all px-3 py-2 text-red-700">{r.before}</td> : null}
                    {isUpdate || item.afterData != null ? <td className="break-all px-3 py-2 text-emerald-700">{r.after}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {meta.length > 0 && (
        <div>
          <h3 className="mb-2 font-semibold text-slate-900">Metadata</h3>
          <dl className="grid gap-x-4 gap-y-1 rounded-lg bg-slate-50 p-3 sm:grid-cols-[10rem_1fr]">
            {meta.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-xs text-slate-500 sm:text-sm">{fieldLabel(k)}</dt>
                <dd className="break-all text-slate-800">{displayValue(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
