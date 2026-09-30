import Link from "next/link";
import { Activity, CalendarCheck2, History, ShieldAlert, Users } from "lucide-react";
import { Card } from "@/components/ui";
import { AuditFiltersForm } from "@/components/audit/audit-filters";
import { AuditList, type AuditItem } from "@/components/audit/audit-list";
import { RefreshButton } from "@/components/audit/refresh-button";
import { isAdmin } from "@/lib/auth/admin";
import { requireUserPage } from "@/lib/auth/session";
import { AuditAction, AuditTargetType } from "@/lib/audit/actions";
import { actorName, logSafe } from "@/lib/audit/audit.service";
import { getAuditStats, listAuditLogs, parseAuditFilters, todayWib } from "@/lib/audit/query";

export const metadata = { title: "Audit Log" };

const num = new Intl.NumberFormat("id-ID");

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUserPage();
  // Otorisasi di server: data audit tidak pernah dikirim sebelum cek admin.
  if (!isAdmin(user)) {
    await logSafe({
      actor: user,
      action: AuditAction.SECURITY_ACCESS_DENIED,
      description: `${actorName(user)} mencoba membuka Audit Log tanpa izin`,
      targetType: AuditTargetType.AUDIT_LOG,
    });
    return (
      <Card className="mx-auto mt-10 max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto size-10 text-red-600" aria-hidden />
        <h1 className="mt-3 text-lg font-semibold">403 · Akses Ditolak</h1>
        <p className="mt-1 text-sm text-slate-600">Halaman ini khusus admin.</p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-blue-700 hover:underline">Kembali ke Dashboard</Link>
      </Card>
    );
  }

  const params = await searchParams;
  const filters = parseAuditFilters(params);
  const [list, stats] = await Promise.all([listAuditLogs(filters), getAuditStats()]);
  // eslint-disable-next-line react-hooks/purity -- server component, dirender per request
  const now = Date.now();

  const items: AuditItem[] = list.rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  const first = list.total === 0 ? 0 : (list.page - 1) * list.pageSize + 1;
  const last = Math.min(list.page * list.pageSize, list.total);

  const pageHref = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (typeof v === "string" && v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/admin/audit-log${qs ? `?${qs}` : ""}`;
  };

  const statCards = [
    { label: "Total Aktivitas", value: stats.total, icon: History },
    { label: "Aktivitas Hari Ini", value: stats.today, icon: Activity },
    { label: "User Aktif Hari Ini", value: stats.activeUsers, icon: Users },
    { label: "Perubahan Data Hari Ini", value: stats.changesToday, icon: CalendarCheck2 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
          <p className="text-sm text-slate-500">Riwayat aktivitas pengguna dan perubahan data sistem</p>
        </div>
        <RefreshButton />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="flex items-center gap-3 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
              <Icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-semibold tabular-nums">{num.format(value)}</p>
              <p className="truncate text-xs text-slate-500">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 sm:p-5">
        <AuditFiltersForm filters={filters} />
        <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-500">
          Menampilkan <b className="text-slate-800">{num.format(first)}–{num.format(last)}</b> dari{" "}
          <b className="text-slate-800">{num.format(list.total)}</b> aktivitas
        </p>
      </Card>

      <AuditList items={items} now={now} today={todayWib(new Date(now))} />

      {list.pages > 1 && (
        <nav aria-label="Halaman" className="flex flex-wrap items-center justify-center gap-1">
          <PageLink href={pageHref(list.page - 1)} disabled={list.page <= 1}>Sebelumnya</PageLink>
          {pageNumbers(list.page, list.pages).map((p, i) =>
            p === null ? (
              <span key={`gap-${i}`} className="px-2 text-slate-400">…</span>
            ) : (
              <PageLink key={p} href={pageHref(p)} active={p === list.page}>{p}</PageLink>
            ),
          )}
          <PageLink href={pageHref(list.page + 1)} disabled={list.page >= list.pages}>Berikutnya</PageLink>
        </nav>
      )}
    </div>
  );
}

function pageNumbers(cur: number, total: number): (number | null)[] {
  const set = new Set([1, total, cur - 1, cur, cur + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
}

function PageLink({ href, children, active, disabled }: { href: string; children: React.ReactNode; active?: boolean; disabled?: boolean }) {
  const cls = "grid min-h-10 min-w-10 place-items-center rounded-lg px-3 text-sm font-medium";
  if (disabled) return <span className={`${cls} text-slate-300`}>{children}</span>;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${cls} ${active ? "bg-blue-700 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
    >
      {children}
    </Link>
  );
}
