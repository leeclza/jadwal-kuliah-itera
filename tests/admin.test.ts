import { describe, expect, it } from "vitest";
import { isAdmin, isOwner, OWNER_EMAIL } from "@/lib/auth/admin";

describe("role admin", () => {
  it("pemilik selalu admin, apa pun role di DB", () => {
    expect(isOwner({ email: OWNER_EMAIL.toUpperCase() })).toBe(true);
    expect(isAdmin({ email: OWNER_EMAIL, role: "MAHASISWA" })).toBe(true);
  });
  it("selain pemilik, admin hanya jika role ADMIN", () => {
    expect(isAdmin({ email: "a@student.itera.ac.id", role: "MAHASISWA" })).toBe(false);
    expect(isAdmin({ email: "a@student.itera.ac.id", role: "ADMIN" })).toBe(true);
    expect(isOwner({ email: "a@student.itera.ac.id" })).toBe(false);
  });
});
