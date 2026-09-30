"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/client-api";
import type { AppRole } from "@/lib/auth/admin";

export function RoleToggle({ userId, name, role }: { userId: string; name: string; role: AppRole }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const next: AppRole = role === "ADMIN" ? "MAHASISWA" : "ADMIN";

  async function change() {
    const msg = next === "ADMIN" ? `Jadikan ${name} admin?` : `Jadikan ${name} mahasiswa (cabut admin)?`;
    if (!window.confirm(msg)) return;
    setError(null);
    try {
      await apiFetch(`/api/admin/users/${userId}/role`, { method: "PATCH", body: { role: next } });
      toast.success(next === "ADMIN" ? `${name} sekarang admin.` : `${name} sekarang mahasiswa.`);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengubah role.");
    }
  }

  return (
    <div>
      <Button size="sm" variant={next === "ADMIN" ? "outline" : "ghost"} disabled={pending} onClick={change}>
        {next === "ADMIN" ? "Set admin" : "Set mahasiswa"}
      </Button>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
