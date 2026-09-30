"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import type { AdminStats } from "@/lib/admin/stats";

const POLL_MS = 5000;

/** Statistik admin yang di-refresh otomatis; berhenti polling saat tab tidak terlihat. */
export function LiveStats({ initial }: { initial: AdminStats }) {
  const [stats, setStats] = useState(initial);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const tick = async () => {
      try {
        const res = await fetch("/api/admin/stats", { cache: "no-store" });
        if (res.ok) setStats(await res.json());
      } catch {}
    };
    const sync = () => {
      clearInterval(timer);
      if (document.visibilityState === "visible") {
        tick();
        timer = setInterval(tick, POLL_MS);
      }
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const items = [
    { label: "Total akun", value: stats.total },
    { label: "Total mahasiswa", value: stats.mahasiswa },
    { label: "Total admin", value: stats.admin },
    { label: "Online sekarang", value: stats.aktif },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((s) => (
        <Card key={s.label} className="p-4">
          <div className="text-xs text-slate-500">{s.label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</div>
        </Card>
      ))}
    </div>
  );
}
