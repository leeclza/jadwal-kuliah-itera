"use client";

import { useSyncExternalStore } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "ok" | "err";
interface ToastItem { id: number; tone: Tone; text: string }

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

function push(tone: Tone, text: string) {
  const id = nextId++;
  items = [...items.slice(-3), { id, tone, text }];
  emit();
  setTimeout(() => dismiss(id), tone === "err" ? 6000 : 3500);
}

/** Notifikasi singkat di pojok kanan bawah. */
export const toast = {
  success: (text: string) => push("ok", text),
  error: (text: string) => push("err", text),
};

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const EMPTY: ToastItem[] = [];

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items, () => EMPTY);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-100 flex flex-col items-end gap-2 sm:left-auto sm:right-6 sm:bottom-6">
      {list.map((t) => (
        <div key={t.id} role={t.tone === "err" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg",
            t.tone === "ok" ? "border-emerald-200 text-emerald-800" : "border-red-200 text-red-700",
          )}>
          {t.tone === "ok" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> : <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden />}
          <span className="flex-1">{t.text}</span>
          <button onClick={() => dismiss(t.id)} aria-label="Tutup notifikasi" className="text-slate-400 hover:text-slate-600">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
