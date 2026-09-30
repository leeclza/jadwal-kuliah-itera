import { Badge, Card } from "@/components/ui";
import { LiveStats } from "@/components/admin/live-stats";
import { RoleToggle } from "@/components/admin/role-toggle";
import { RoleFilter } from "@/components/admin/role-filter";
import { isAdmin, isOwner } from "@/lib/auth/admin";
import { requireAdminPage } from "@/lib/auth/session";
import { getAdminStats } from "@/lib/admin/stats";
import { prisma } from "@/lib/db/prisma";
import { DAYS } from "@/lib/schedule/constants";

export const metadata = { title: "Admin" };

const fmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

function ago(date: Date | null, now: number) {
  if (!date) return "—";
  const m = Math.floor((now - date.getTime()) / 60000);
  if (m < 5) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  if (m < 60 * 24) return `${Math.floor(m / 60)} jam lalu`;
  return `${Math.floor(m / 60 / 24)} hari lalu`;
}

function roleCategory(u: { email: string; role: string }) {
  return isOwner(u) ? "owner" : isAdmin(u) ? "admin" : "mahasiswa";
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const { role: roleParam = "" } = await searchParams;
  const roleFilter = ["owner", "admin", "mahasiswa"].includes(roleParam) ? roleParam : "";
  const me = await requireAdminPage();
  const canManage = isOwner(me);
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, email: true, name: true, nim: true, prodi: true, image: true, role: true,
      createdAt: true, lastSeenAt: true,
      _count: { select: { semesters: true, scheduleItems: true } },
    },
  });
  // eslint-disable-next-line react-hooks/purity -- server component, dirender per request
  const now = Date.now();
  const initialStats = await getAdminStats();
  const others = await prisma.scheduleItem.findMany({
    where: { type: "OTHER" },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, title: true, notes: true, day: true, startTime: true, endTime: true, createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  const counts: Record<string, number> = { "": users.length, owner: 0, admin: 0, mahasiswa: 0 };
  for (const u of users) counts[roleCategory(u)]++;
  const shown = roleFilter ? users.filter((u) => roleCategory(u) === roleFilter) : users;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <LiveStats initial={initialStats} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-slate-500">{shown.length} pengguna</span>
        <RoleFilter value={roleFilter} counts={counts} />
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Pengguna</th>
              <th className="px-4 py-2 font-medium">NIM / Prodi</th>
              <th className="px-4 py-2 font-medium">Jadwal</th>
              <th className="px-4 py-2 font-medium">Daftar</th>
              <th className="px-4 py-2 font-medium">Terakhir aktif</th>
              {canManage && <th className="px-4 py-2 font-medium">Role</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.length === 0 && (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="px-4 py-6 text-center text-slate-500">
                  Tidak ada pengguna dengan role ini.
                </td>
              </tr>
            )}
            {shown.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2 font-medium text-slate-900">
                    {u.name ?? "—"}
                    {isOwner(u) ? <Badge tone="purple">Dev</Badge> : isAdmin(u) && <Badge tone="purple">Admin</Badge>}
                  </div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </td>
                <td className="px-4 py-2">
                  <div>{u.nim ?? "—"}</div>
                  <div className="text-xs text-slate-500">{u.prodi ?? "belum diisi"}</div>
                </td>
                <td className="px-4 py-2 tabular-nums">
                  {u._count.scheduleItems} item
                  <div className="text-xs text-slate-500">{u._count.semesters} semester</div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">{fmt.format(u.createdAt)}</td>
                <td className="px-4 py-2 whitespace-nowrap" title={u.lastSeenAt ? fmt.format(u.lastSeenAt) : undefined}>
                  {ago(u.lastSeenAt, now)}
                </td>
                {canManage && (
                  <td className="px-4 py-2">
                    {isOwner(u) ? <span title="Role Dev tetap dan tidak bisa diubah"><Badge tone="purple">Dev</Badge></span> : <RoleToggle userId={u.id} name={u.name ?? u.email} role={u.role} />}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <h2 className="pt-2 text-lg font-semibold">Jadwal &quot;Lainnya&quot;</h2>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-180 text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Pengguna</th>
              <th className="px-4 py-2 font-medium">Nama</th>
              <th className="px-4 py-2 font-medium">Waktu</th>
              <th className="px-4 py-2 font-medium">Catatan</th>
              <th className="px-4 py-2 font-medium">Dibuat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {others.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">Belum ada jadwal Lainnya.</td>
              </tr>
            )}
            {others.map((s) => (
              <tr key={s.id} className="align-top">
                <td className="px-4 py-2">
                  <div className="font-medium text-slate-900">{s.user.name ?? "—"}</div>
                  <div className="text-xs text-slate-500">{s.user.email}</div>
                </td>
                <td className="px-4 py-2">{s.title}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {DAYS.find((d) => d.value === s.day)?.label ?? "—"}
                  {s.startTime && <div className="text-xs text-slate-500">{s.startTime}–{s.endTime ?? "?"}</div>}
                </td>
                <td className="px-4 py-2 whitespace-pre-line">{s.notes || <span className="text-slate-400">(kosong)</span>}</td>
                <td className="px-4 py-2 whitespace-nowrap">{fmt.format(s.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
