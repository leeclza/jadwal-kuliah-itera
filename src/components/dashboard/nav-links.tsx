"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/jadwal", label: "Jadwal" },
  { href: "/profile", label: "Profile" },
];

export function NavLinks({ mobile }: { mobile?: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Menu utama" className={cn(mobile ? "flex px-2" : "ml-4 hidden gap-1 sm:flex")}>
      {LINKS.map((l) => {
        const active = path === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium",
              mobile && "flex-1 text-center",
              active ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
