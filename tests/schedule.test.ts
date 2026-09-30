import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { matchCourseWithSchedule, normalizeCourseName } from "@/lib/schedule/matcher";
import { detectScheduleConflict } from "@/lib/schedule/conflict";
import { planSiakadSync, type ExistingSiakadItem } from "@/lib/schedule/sync";
import { groupByDay, sortSchedule } from "@/lib/schedule/grouping";
import { buildExportRows, buildScheduleWorkbook, exportFileName } from "@/lib/export/xlsx";
import { parseSheetUrl, parseSpsCsv } from "@/lib/google-sheets/parser";
import { parseSiakadText } from "@/lib/siakad/parser";
import { isAllowedEmail } from "@/lib/auth/domain";
import type { ScheduleLike, SpsRow } from "@/lib/schedule/types";

const fixture = readFileSync(path.join(__dirname, "../src/lib/google-sheets/fixtures/sps-sample.csv"), "utf8");
const spsRows = parseSpsCsv(fixture);

const row = (p: Partial<SpsRow>): SpsRow => ({
  day: 1, startTime: "07:30", endTime: "10:10", courseCode: "IF25-21012", courseName: "Basis Data", className: "RA", ...p,
});

describe("normalizeCourseName", () => {
  it("menyamakan variasi penulisan", () => {
    const a = normalizeCourseName("Probabilitas dan Statistika");
    expect(normalizeCourseName("Probabilitas & Statistika")).toBe(a);
    expect(normalizeCourseName("  probabilitas   DAN statistika ")).toBe(a);
  });
  it("tidak menyamakan matkul berbeda", () => {
    expect(normalizeCourseName("Basis Data")).not.toBe(normalizeCourseName("Basis Data Lanjut"));
  });
});

describe("parseSpsCsv (Google Sheets SPS asli)", () => {
  it("membaca baris jadwal dari fixture SPS", () => {
    expect(spsRows.length).toBeGreaterThan(50);
    const probstatRB = spsRows.find((r) => r.courseCode === "IF25-21010" && r.className === "RB");
    expect(probstatRB).toMatchObject({ day: 1, startTime: "09:20", endTime: "12:00", room: "GK2 123" });
  });
  it("parseSheetUrl hanya menerima docs.google.com", () => {
    expect(parseSheetUrl("https://docs.google.com/spreadsheets/d/abc_123/edit?gid=828295819#gid=828295819"))
      .toEqual({ sheetId: "abc_123", gid: "828295819" });
    expect(parseSheetUrl("https://evil.com/spreadsheets/d/abc/edit")).toBeNull();
    expect(parseSheetUrl("http://docs.google.com/spreadsheets/d/abc")).toBeNull();
  });
});

describe("matchCourseWithSchedule", () => {
  it("Test B: match kode + kelas memberi hari & jam", () => {
    const r = matchCourseWithSchedule({ courseCode: "IF25-21010", courseName: "Probstat", className: "RB" }, spsRows);
    expect(r.status).toBe("MATCHED");
    if (r.status === "MATCHED") expect(r.rows[0]).toMatchObject({ day: 1, startTime: "09:20" });
  });
  it("fallback ke nama ter-normalisasi jika kode tidak ada", () => {
    const r = matchCourseWithSchedule({ courseCode: "", courseName: "Basis Data", className: "RA" }, [row({})]);
    expect(r.status).toBe("MATCHED");
  });
  it("ambigu jika kelas tidak diketahui dan ada beberapa kelas", () => {
    const r = matchCourseWithSchedule({ courseCode: "IF25-21012", courseName: "Basis Data" }, [row({}), row({ className: "RB" })]);
    expect(r.status).toBe("AMBIGUOUS");
  });
  it("unmatched jika tidak ada di SPS", () => {
    expect(matchCourseWithSchedule({ courseCode: "XX00-00000", courseName: "Tidak Ada" }, spsRows).status).toBe("UNMATCHED");
  });
  it("mengembalikan semua sesi satu kelas", () => {
    const r = matchCourseWithSchedule({ courseCode: "IF25-21012", courseName: "Basis Data", className: "RA" },
      [row({ day: 3 }), row({ day: 1 })]);
    expect(r.status === "MATCHED" && r.rows.map((x) => x.day)).toEqual([1, 3]);
  });
});

describe("detectScheduleConflict", () => {
  const base = { type: "COURSE", source: "SIAKAD" } as const;
  it("mendeteksi overlap di hari yang sama", () => {
    const c = detectScheduleConflict([
      { ...base, id: "a", title: "A", day: 1, startTime: "09:00", endTime: "11:00" },
      { ...base, id: "b", title: "B", day: 1, startTime: "10:00", endTime: "12:00" },
      { ...base, id: "c", title: "C", day: 2, startTime: "10:00", endTime: "12:00" },
      { ...base, id: "d", title: "D", day: 1, startTime: "11:00", endTime: "12:00" },
    ]);
    expect(c.get("a")).toEqual(["b"]);
    expect(c.get("b")).toEqual(["a", "d"]);
    expect(c.has("c")).toBe(false);
  });
});

describe("planSiakadSync", () => {
  const rows = [row({ courseCode: "IF25-A", courseName: "Matkul A" }), row({ courseCode: "IF25-B", courseName: "Matkul B", day: 2 })];

  it("Test A: data SIAKAD masuk sebagai create", () => {
    const plan = planSiakadSync([{ courseCode: "IF25-A", courseName: "Matkul A", className: "RA" }], rows, []);
    expect(plan.create).toHaveLength(1);
    expect(plan.create[0]).toMatchObject({ day: 1, startTime: "07:30", matchStatus: "MATCHED" });
  });

  it("Test C: sync hanya menyentuh item SIAKAD yang diberikan; manual tidak pernah ada di plan", () => {
    const existing: ExistingSiakadItem[] = [
      { id: "siakad-a", sourceId: "IF25-A|RA|0", courseCode: "IF25-A", className: "RA", lecturers: ["X"], matchStatus: "MATCHED" },
    ];
    // Matkul A hilang dari SIAKAD, Matkul B baru
    const plan = planSiakadSync([{ courseCode: "IF25-B", courseName: "Matkul B", className: "RA" }], rows, existing);
    expect(plan.delete).toEqual(["siakad-a"]);
    expect(plan.create.map((c) => c.courseCode)).toEqual(["IF25-B"]);
    const manualIds = ["manual-praktikum-a"];
    const touched = [...plan.delete, ...plan.update.map((u) => u.id)];
    expect(touched.some((id) => manualIds.includes(id))).toBe(false);
  });

  it("update item yang sudah ada (bukan duplikat) & mempertahankan dosen", () => {
    const existing: ExistingSiakadItem[] = [
      { id: "x", sourceId: "IF25-A|RA|0", courseCode: "IF25-A", className: "RA", lecturers: ["Dosen Lama"], matchStatus: "MATCHED" },
    ];
    const plan = planSiakadSync([{ courseCode: "IF25-A", courseName: "Matkul A", className: "RA" }], rows, existing);
    expect(plan.create).toHaveLength(0);
    expect(plan.update[0]).toMatchObject({ id: "x", data: { lecturers: ["Dosen Lama"] } });
  });

  it("memakai kelas yang sudah dipilih user saat SIAKAD tidak menyertakan kelas", () => {
    const rows2 = [row({ className: "RA" }), row({ className: "RB", day: 4 })];
    const existing: ExistingSiakadItem[] = [
      { id: "x", sourceId: "IF25-21012|RB|0", courseCode: "IF25-21012", className: "RB", lecturers: [], matchStatus: "MATCHED" },
    ];
    const plan = planSiakadSync([{ courseCode: "IF25-21012", courseName: "Basis Data" }], rows2, existing);
    expect(plan.update[0].data).toMatchObject({ className: "RB", day: 4 });
    expect(plan.stats.needsConfirmation).toBe(0);
  });

  it("menandai perlu konfirmasi jika ambigu", () => {
    const plan = planSiakadSync([{ courseCode: "IF25-21012", courseName: "Basis Data" }], [row({}), row({ className: "RB" })], []);
    expect(plan.create[0]).toMatchObject({ matchStatus: "AMBIGUOUS", day: null });
    expect(plan.stats.needsConfirmation).toBe(1);
  });
});

const items: ScheduleLike[] = [
  { id: "3", title: "Praktikum Basdat", type: "PRACTICUM", source: "MANUAL", day: 1, startTime: "15:00", endTime: "17:00", room: "LABTEK 1 LT 3" },
  { id: "1", title: "Pola Hidup Sehat", type: "COURSE", source: "SIAKAD", day: 1, startTime: "07:00", endTime: "08:40", sks: "2", courseCode: "WI25-00005" },
  { id: "2", title: "Probabilitas dan Statistika", type: "COURSE", source: "SIAKAD", day: 1, startTime: "09:20", endTime: "12:00", sks: "3", lecturers: ["Miranti Verdiana, M.Si."] },
  { id: "4", title: "Strategi Algoritma", type: "COURSE", source: "SIAKAD", day: 2, startTime: "15:00", endTime: "17:40" },
];

describe("sorting & hari kosong", () => {
  it("urut hari lalu jam", () => {
    expect(sortSchedule(items).map((i) => i.id)).toEqual(["1", "2", "3", "4"]);
  });
  it("Test D: Senin-Jumat selalu ada walau kosong", () => {
    const g = groupByDay(items);
    expect(g.map((x) => x.label)).toEqual(["Senin", "Selasa", "Rabu", "Kamis", "Jumat"]);
    expect(g[2].items).toHaveLength(0);
  });
});

describe("export XLSX", () => {
  it("row generation: merge span per hari & baris kosong untuk hari kosong", () => {
    const rows = buildExportRows(items);
    expect(rows).toHaveLength(3 + 1 + 3); // Senin 3, Selasa 1, Rabu/Kamis/Jumat kosong
    expect(rows[0]).toMatchObject({ isFirstOfDay: true, daySpan: 3 });
    expect(rows[0].cells.slice(0, 3)).toEqual(["SENIN", "07:00 - 08:40", "Pola Hidup Sehat"]);
    expect(rows[1].cells[0]).toBe("");
    expect(rows[4].cells).toEqual(["RABU", "", "", "", "", "", ""]);
  });

  it("Test E: workbook dibuat dengan warna, border, merge", async () => {
    const buf = await buildScheduleWorkbook(items, { semesterLabel: "Semester 3" });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.getWorksheet("Jadwal Kuliah")!;
    expect(ws.getCell("A1").value).toBe("JADWAL KULIAH SEMESTER 3");
    expect(ws.getRow(2).values).toEqual([undefined, "Hari", "Jam", "Matkul", "Ruang", "SKS", "Dosen", "Kode Matkul"]);
    expect(ws.getCell("A3").isMerged && ws.getCell("A5").master.address).toBe("A3");
    expect((ws.getCell("C3").fill as ExcelJS.FillPattern).fgColor?.argb).toBe("FFFFB7B7");
    expect(ws.getCell("C6").border.top?.style).toBe("thin");
    expect(ws.getCell("A7").value).toBe("RABU");
    expect(ws.getCell("E3").value).toBe(2);
  });

  it("nama file", () => {
    expect(exportFileName("124140097")).toBe("Jadwal_Kuliah_124140097.xlsx");
    expect(exportFileName(null)).toBe("Jadwal_Kuliah.xlsx");
  });
});

describe("parseSiakadText", () => {
  it("membaca tabel yang di-copy dari SIAKAD (tab separated)", () => {
    const text = [
      "No\tKode\tMata Kuliah\tKelas\tSKS\tDosen",
      "1\tIF25-21010\tProbabilitas dan Statistika\tRB\t3\tMiranti Verdiana, M.Si.",
      "2\tIF25-21008\tJaringan Komputer\tRG\t2+1\tI Wayan Wiprayoga Wisesa, S.Kom., M.Kom",
    ].join("\n");
    expect(parseSiakadText(text)).toEqual([
      expect.objectContaining({ courseCode: "IF25-21010", courseName: "Probabilitas dan Statistika", className: "RB", sks: "3", lecturers: ["Miranti Verdiana, M.Si."] }),
      expect.objectContaining({ courseCode: "IF25-21008", className: "RG", sks: "2+1" }),
    ]);
  });
});

describe("Test G: domain email", () => {
  it("hanya @itera.ac.id dan subdomainnya", () => {
    expect(isAllowedEmail("a@itera.ac.id")).toBe(true);
    expect(isAllowedEmail("124140097@student.itera.ac.id")).toBe(true);
    expect(isAllowedEmail("x@gmail.com")).toBe(false);
    expect(isAllowedEmail("x@fakeitera.ac.id")).toBe(false);
    expect(isAllowedEmail("x@itera.ac.id.evil.com")).toBe(false);
    expect(isAllowedEmail("a@itera.ac.id", false)).toBe(false);
    expect(isAllowedEmail(null)).toBe(false);
  });
});
