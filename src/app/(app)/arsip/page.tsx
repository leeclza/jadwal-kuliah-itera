import { Archive } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { requireUserPage } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { DAY_LABEL, formatTimeRange } from "@/lib/schedule/constants";
import { sortSchedule } from "@/lib/schedule/grouping";
import { semesterName } from "@/lib/schedule/semester";
import { systemSemesterNumber } from "@/lib/schedule/semester-server";

/** Arsip: semester yang sudah berakhir (bukan semester aktif), terbaru di atas, terlama paling bawah. */
export default async function ArsipPage() {
  const user = await requireUserPage();
  const current = systemSemesterNumber(user.nim);
  const semesters = await prisma.semester.findMany({
    where: { userId: user.id, number: { lte: current }, NOT: user.activeSemesterId ? { id: user.activeSemesterId } : undefined },
    include: { scheduleItems: true },
  });
  // Semester pendek setelah Smt N terjadi sesudah Smt N -> urutan: angka desc, SP di atas reguler.
  semesters.sort((a, b) => b.number - a.number || Number(b.isShort) - Number(a.isShort));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Archive className="size-6 text-slate-500" aria-hidden /> Arsip Semester
          </h1>
          <p className="text-sm text-slate-600">Mata kuliah dari semester yang sudah berakhir. Terbaru di atas, terlama paling bawah.</p>
        </div>
              </div>

      {semesters.length === 0 && (
        <Card className="px-4 py-12 text-center text-sm text-slate-600">Belum ada semester yang diarsipkan.</Card>
      )}

      {semesters.map((s, idx) => {
        const items = sortSchedule(s.scheduleItems);
        const courses = items.filter((i) => i.type === "COURSE");
        return (
          <Card key={s.id} className="overflow-hidden">
            <details open={idx === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50">
                <span className="flex items-center gap-2 font-semibold">
                  {semesterName(s)} {s.isShort && <Badge tone="amber">SP</Badge>}
                </span>
                <span className="text-sm text-slate-500">{courses.length} matkul • {items.length} jadwal</span>
              </summary>
              {items.length === 0 ? (
                <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">Tidak ada jadwal.</p>
              ) : (
                <div className="overflow-x-auto border-t border-slate-100">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
                        {["Hari", "Jam", "Matkul", "Kelas", "SKS", "Dosen"].map((h) => (
                          <th key={h} scope="col" className="px-3 py-2 font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((i) => (
                        <tr key={i.id} className="border-t border-slate-100 align-top">
                          <td className="px-3 py-2">{i.day ? DAY_LABEL[i.day] : "-"}</td>
                          <td className="px-3 py-2 tabular-nums">{i.day ? formatTimeRange(i.startTime, i.endTime) : "-"}</td>
                          <td className="px-3 py-2">
                            <span className="font-medium">{i.title}</span>
                            {i.courseCode && <span className="block text-xs text-slate-500">{i.courseCode}</span>}
                          </td>
                          <td className="px-3 py-2">{i.className ?? "-"}</td>
                          <td className="px-3 py-2">{i.sks ?? "-"}</td>
                          <td className="px-3 py-2">{i.lecturers.join(", ") || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </details>
          </Card>
        );
      })}
    </div>
  );
}
