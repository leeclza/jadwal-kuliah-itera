import { describe, expect, it } from "vitest";
import { angkatanFromNim, nimFromEmail } from "@/lib/auth/identity";
import { currentSemesterNumber, semesterName, shortSemesterBase } from "@/lib/schedule/semester";

const at = (iso: string) => new Date(`${iso}T12:00:00+07:00`);

describe("angkatan & semester otomatis", () => {
  it("NIM dari email nama.nim@student.itera.ac.id", () => {
    expect(nimFromEmail("christopher.124140097@student.itera.ac.id")).toBe("124140097");
  });

  it("angkatan dari NIM", () => {
    expect(angkatanFromNim("124140097", at("2026-09-30"))).toBe(2024);
    expect(angkatanFromNim("12345", at("2026-09-30"))).toBeNull();
    expect(angkatanFromNim("199140097", at("2026-09-30"))).toBeNull(); // 2099: masa depan
  });

  it("semester mengikuti kalender gasal (Agu–Jan) & genap (Feb–Jul)", () => {
    expect(currentSemesterNumber(2024, at("2024-08-15"))).toBe(1);
    expect(currentSemesterNumber(2024, at("2025-01-20"))).toBe(1);
    expect(currentSemesterNumber(2024, at("2025-02-10"))).toBe(2);
    expect(currentSemesterNumber(2024, at("2025-09-01"))).toBe(3);
    expect(currentSemesterNumber(2024, at("2026-09-30"))).toBe(5);
  });

  it("pergantian bulan memakai WIB (31 Jul 23:30 WIB masih genap)", () => {
    expect(currentSemesterNumber(2024, new Date("2026-07-31T16:30:00Z"))).toBe(4);
    expect(currentSemesterNumber(2024, new Date("2026-07-31T17:30:00Z"))).toBe(5);
  });

  it("dibatasi 1..14", () => {
    expect(currentSemesterNumber(2026, at("2025-09-01"))).toBe(1);
    expect(currentSemesterNumber(2010, at("2026-09-01"))).toBe(14);
  });

  it("semester pendek hanya setelah semester genap yang sudah berjalan", () => {
    expect(shortSemesterBase([1, 2, 3, 4], 4)).toBe(4);
    expect(shortSemesterBase([1, 2, 3, 4, 5], 5)).toBe(4);
    expect(shortSemesterBase([1], 1)).toBeNull();
    expect(shortSemesterBase([2, 6], 4)).toBe(2);
  });

  it("nama semester pendek", () => {
    expect(semesterName({ number: 4, isShort: true })).toBe("Semester Pendek (setelah Semester 4)");
    expect(semesterName({ number: 5 })).toBe("Semester 5");
  });
});
