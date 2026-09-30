import { beforeEach, describe, expect, it, vi } from "vitest";

// Fake DB: item milik user B
const db = [{ id: "item-b", userId: "user-b", source: "MANUAL", semesterId: "s" }];
let currentUser = { id: "user-a" };

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    scheduleItem: {
      findFirst: vi.fn(async ({ where }: { where: { id: string; userId: string } }) =>
        db.find((i) => i.id === where.id && i.userId === where.userId) ?? null),
      delete: vi.fn(async () => ({})),
    },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  UnauthorizedError: class extends Error {},
  requireUserApi: vi.fn(async () => currentUser),
}));

describe("Test F: user A tidak bisa mengakses data user B", () => {
  beforeEach(() => vi.clearAllMocks());

  it("DELETE jadwal milik user lain -> 404 dan tidak menghapus", async () => {
    currentUser = { id: "user-a" };
    const { DELETE } = await import("@/app/api/schedule/[id]/route");
    const { prisma } = await import("@/lib/db/prisma");
    const res = await DELETE(new Request("http://x"), { params: Promise.resolve({ id: "item-b" }) });
    expect(res.status).toBe(404);
    expect(prisma.scheduleItem.delete).not.toHaveBeenCalled();
  });

  it("pemilik bisa menghapus jadwalnya sendiri", async () => {
    currentUser = { id: "user-b" };
    const { DELETE } = await import("@/app/api/schedule/[id]/route");
    const { prisma } = await import("@/lib/db/prisma");
    const res = await DELETE(new Request("http://x"), { params: Promise.resolve({ id: "item-b" }) });
    expect(res.status).toBe(200);
    expect(prisma.scheduleItem.delete).toHaveBeenCalledOnce();
  });
});
