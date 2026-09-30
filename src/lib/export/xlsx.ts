import ExcelJS from "exceljs";
import { DAY_COLORS } from "@/lib/schedule/constants";
import { buildExportRows, COL_WIDTHS, EXPORT_HEADERS } from "./rows";
export { buildExportRows, EXPORT_HEADERS } from "./rows";
import type { ScheduleLike } from "@/lib/schedule/types";

export async function buildScheduleWorkbook(
  items: ScheduleLike[],
  opts: { semesterLabel: string },
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SPS Jadwal Kuliah ITERA";
  const ws = wb.addWorksheet("Jadwal Kuliah");
  ws.columns = COL_WIDTHS.map((width) => ({ width }));

  const thin = { style: "thin" as const, color: { argb: "FF000000" } };
  const border = { top: thin, left: thin, bottom: thin, right: thin };
  const center = { horizontal: "center" as const, vertical: "middle" as const, wrapText: true };
  const font = { name: "Calibri", size: 11 };

  // Judul
  ws.mergeCells(1, 1, 1, 7);
  const title = ws.getCell(1, 1);
  title.value = `JADWAL KULIAH ${opts.semesterLabel.toUpperCase()}`;
  title.font = { ...font, bold: true, size: 12 };
  title.alignment = center;
  ws.getRow(1).height = 22;
  for (let c = 1; c <= 7; c++) ws.getCell(1, c).border = border;

  // Header
  const header = ws.getRow(2);
  EXPORT_HEADERS.forEach((h, i) => {
    const cell = header.getCell(i + 1);
    cell.value = h;
    cell.font = { ...font, bold: true };
    cell.alignment = center;
    cell.border = border;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
  });
  header.height = 20;

  const rows = buildExportRows(items);
  let r = 3;
  for (const row of rows) {
    const excelRow = ws.getRow(r);
    const fill = {
      type: "pattern" as const,
      pattern: "solid" as const,
      fgColor: { argb: `FF${DAY_COLORS[row.day]}` },
    };
    row.cells.forEach((v, i) => {
      const cell = excelRow.getCell(i + 1);
      // SKS numerik ditulis sebagai angka agar bisa dijumlah di Excel
      cell.value = i === 4 && /^\d+$/.test(v) ? Number(v) : v;
      cell.font = font;
      cell.alignment = center;
      cell.border = border;
      cell.fill = fill;
    });
    const lines = Math.max(
      1,
      ...row.cells.map((v, i) => v.split("\n").reduce((n, l) => n + Math.ceil((l.length || 1) / (COL_WIDTHS[i] - 2)), 0)),
    );
    excelRow.height = Math.max(30, lines * 15 + 6);
    if (row.isFirstOfDay && row.daySpan > 1) ws.mergeCells(r, 1, r + row.daySpan - 1, 1);
    r++;
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export function exportFileName(nim?: string | null) {
  const safe = (nim ?? "").replace(/[^0-9A-Za-z]/g, "");
  return safe ? `Jadwal_Kuliah_${safe}.xlsx` : "Jadwal_Kuliah.xlsx";
}
