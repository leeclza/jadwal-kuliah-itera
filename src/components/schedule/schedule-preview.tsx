import { DAY_COLORS } from "@/lib/schedule/constants";
import { buildExportRows, EXPORT_HEADERS } from "@/lib/export/rows";
import type { ScheduleLike } from "@/lib/schedule/types";

/** Preview HTML yang memakai builder baris yang sama dengan export XLSX. */
export function SchedulePreview({ items, semesterLabel }: { items: ScheduleLike[]; semesterLabel: string }) {
  const rows = buildExportRows(items);
  const cell = "border border-black px-2 py-1.5 text-center align-middle";
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-3">
      <table className="w-full min-w-[820px] border-collapse text-[13px] text-black" style={{ fontFamily: "Calibri, Carlito, Arial, sans-serif" }}>
        <colgroup>
          {[15, 18, 30, 22, 8, 30, 18].map((w, i) => <col key={i} style={{ width: `${(w / 141) * 100}%` }} />)}
        </colgroup>
        <thead>
          <tr><th colSpan={7} className={`${cell} font-bold`}>JADWAL KULIAH {semesterLabel.toUpperCase()}</th></tr>
          <tr>{EXPORT_HEADERS.map((h) => <th key={h} scope="col" className={`${cell} bg-white font-bold`}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} style={{ background: `#${DAY_COLORS[r.day]}` }}>
              {r.isFirstOfDay && <th scope="rowgroup" rowSpan={r.daySpan} className={`${cell} font-normal`}>{r.cells[0]}</th>}
              {r.cells.slice(1).map((c, i) => (
                <td key={i} className={`${cell} whitespace-pre-line`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
