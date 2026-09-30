import { describe, expect, it } from "vitest";
import { MAX_SKS, totalSks } from "@/lib/schedule/sks";
import { scheduleInputSchema } from "@/lib/validation";

const course = (code: string, sks: string, cls = "RA") => ({ type: "COURSE", title: code, courseCode: code, className: cls, sks });

describe("total SKS", () => {
  it("praktikum/asisten/lainnya tidak menambah SKS", () => {
    const items = [
      course("IF25-21008", "3"),
      { type: "PRACTICUM", title: "Prak Jarkom", courseCode: "IF25-21008", className: "RA", sks: "1" },
      { type: "ASSISTANT", title: "Asprak", courseCode: null, className: null, sks: "2" },
    ];
    expect(totalSks(items)).toEqual({ count: 1, sks: 3 });
  });
  it("matkul yang sama (2 pertemuan/minggu) dihitung sekali", () => {
    expect(totalSks([course("A", "3"), course("A", "3"), course("B", "2+1")]).sks).toBe(6);
  });
  it("batas 24", () => expect(MAX_SKS).toBe(24));
});

describe("validasi tambah jadwal", () => {
  const base = { type: "PRACTICUM", title: "Prak Jarkom", day: 4, startTime: "13:00", endTime: "15:00" };
  it("hari & jam wajib", () => {
    expect(scheduleInputSchema.safeParse({ ...base, day: null }).success).toBe(false);
    expect(scheduleInputSchema.safeParse({ ...base, startTime: "" }).success).toBe(false);
    expect(scheduleInputSchema.safeParse({ ...base, endTime: "" }).success).toBe(false);
  });
  it("praktikum: SKS dibuang", () => {
    expect(scheduleInputSchema.parse({ ...base, sks: "1" }).sks).toBeNull();
  });
  it("mata kuliah: SKS wajib angka", () => {
    expect(scheduleInputSchema.safeParse({ ...base, type: "COURSE" }).success).toBe(false);
    expect(scheduleInputSchema.parse({ ...base, type: "COURSE", sks: "3" }).sks).toBe("3");
  });
});
