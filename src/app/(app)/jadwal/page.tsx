import { Download } from "lucide-react";
import { SchedulePreview } from "@/components/schedule/schedule-preview";
import { requireUserPage } from "@/lib/auth/session";
import { loadActiveSchedule } from "@/lib/schedule/page-data";
import { exportFileName } from "@/lib/export/xlsx";

export default async function JadwalPage() {
  const user = await requireUserPage();
  const { items, semesterLabel } = await loadActiveSchedule(user);
  const unscheduled = items.filter((i) => !i.day);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Preview Jadwal</h1>
          <p className="text-sm text-slate-600">Tampilan ini sama dengan file Excel yang akan di-download.</p>
        </div>
        <a
          href="/api/export"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Download className="size-4" aria-hidden /> Download XLSX
        </a>
      </div>
      {unscheduled.length > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {unscheduled.length} jadwal belum punya hari/jam dan tidak ikut di-export:{" "}
          {unscheduled.map((i) => i.title).join(", ")}.
        </p>
      )}
      <SchedulePreview items={items} semesterLabel={semesterLabel} />
      <p className="text-xs text-slate-500">Nama file: {exportFileName(user.nim)}</p>
    </div>
  );
}
