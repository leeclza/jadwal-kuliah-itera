"use client";

import { usePathname, useRouter } from "next/navigation";
import { Select } from "@/components/ui";

export const ROLE_FILTERS = [
  { value: "", label: "Semua role" },
  { value: "owner", label: "Dev" },
  { value: "admin", label: "Admin" },
  { value: "mahasiswa", label: "Mahasiswa" },
] as const;

export function RoleFilter({ value, counts }: { value: string; counts: Record<string, number> }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Select
      aria-label="Filter role"
      className="w-auto"
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        router.replace(v ? `${pathname}?role=${v}` : pathname);
      }}
    >
      {ROLE_FILTERS.map((f) => (
        <option key={f.value} value={f.value}>
          {f.label} ({counts[f.value] ?? 0})
        </option>
      ))}
    </Select>
  );
}
