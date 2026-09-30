"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" onClick={() => start(() => router.refresh())} disabled={pending}>
      <RefreshCw className={cn("size-4", pending && "animate-spin")} aria-hidden />
      Refresh
    </Button>
  );
}
