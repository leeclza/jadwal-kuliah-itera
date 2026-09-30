import { BookOpen, GraduationCap, NotebookPen } from "lucide-react";
import { ScheduleManager } from "@/components/schedule/schedule-manager";
import { requireUserPage } from "@/lib/auth/session";
import { loadActiveSchedule } from "@/lib/schedule/page-data";
import { MAX_SKS, totalSks } from "@/lib/schedule/sks";

export default async function DashboardPage() {
  const user = await requireUserPage();
  const { items, semesterLabel, spsUrlSet, semester } = await loadActiveSchedule(user);

  const { count: courseCount, sks: sksTotal } = totalSks(items);
  const manual = items.filter((i) => i.source === "MANUAL").length;

  const stats = [
    { label: "Total Mata Kuliah", value: courseCount, icon: BookOpen },
    { label: `Total SKS (maks ${MAX_SKS})`, value: sksTotal, icon: GraduationCap },
    { label: "Jadwal Manual", value: manual, icon: NotebookPen },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Jadwal Kuliah</h1>
          <p className="text-sm text-slate-600">
            {user.name} • {user.nim} • {user.prodi}
          </p>
        </div>
        <p className="text-sm text-slate-600">
          {semesterLabel}
          {semester?.lastSyncAt && (
            <> • Update terakhir {semester.lastSyncAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}</>
          )}
        </p>
      </div>


      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <li key={s.label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <s.icon className="size-5 shrink-0 text-blue-700" aria-hidden />
            <div>
              <p className="text-xl font-semibold tabular-nums">{s.value}</p>
              <p className="text-xs text-slate-600">{s.label}</p>
            </div>
          </li>
        ))}
      </ul>

      <ScheduleManager items={items} spsUrlSet={spsUrlSet} siakadMock={process.env.SIAKAD_PROVIDER === "mock"} />
    </div>
  );
}
