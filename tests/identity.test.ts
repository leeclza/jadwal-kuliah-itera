import { describe, expect, it } from "vitest";
import { checkSiakadOwner, nimFromEmail } from "@/lib/auth/identity";

describe("nimFromEmail", () => {
  it("ambil NIM 9 digit dari email mahasiswa", () => {
    expect(nimFromEmail("christopher.124140097@student.itera.ac.id")).toBe("124140097");
    expect(nimFromEmail("124140097@student.itera.ac.id")).toBe("124140097");
  });
  it("null untuk email tanpa NIM (dosen/staf)", () => {
    expect(nimFromEmail("angga.wijaya@if.itera.ac.id")).toBeNull();
  });
});

describe("checkSiakadOwner: akun SIAKAD harus sama dengan akun login", () => {
  const page = "NIM : 124140097\nNama : Christopher\n1\tIF25-21010\tProbabilitas dan Statistika\tRB\t3";
  it("lolos jika NIM sendiri ada di teks", () => {
    expect(checkSiakadOwner(page, "124140097")).toEqual({ ok: true });
  });
  it("tolak data milik NIM lain", () => {
    expect(checkSiakadOwner(page, "124140001")).toMatchObject({ ok: false, reason: "OTHER_NIM" });
  });
  it("tolak jika NIM tidak ikut tercopy", () => {
    expect(checkSiakadOwner("IF25-21010\tProbstat\tRB\t3", "124140097")).toMatchObject({ ok: false, reason: "NIM_NOT_FOUND" });
  });
  it("NIP dosen (18 digit) & kode MK tidak dianggap NIM", () => {
    expect(checkSiakadOwner(page + "\tNIP 199001012020121001", "124140097")).toEqual({ ok: true });
  });
});
