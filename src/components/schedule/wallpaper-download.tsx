"use client";

import { Smartphone } from "lucide-react";
import { DAY_COLORS, formatTimeRange } from "@/lib/schedule/constants";
import { groupByDay } from "@/lib/schedule/grouping";
import type { ScheduleLike } from "@/lib/schedule/types";

const W = 1080;
const H = 1920; // 9:16
const PAD = 64;
/** Area atas dikosongkan untuk jam & tanggal lockscreen, bawah untuk shortcut/indikator. */
const TOP = 560;
const BOTTOM = 200;

/** Gambar wallpaper lockscreen 9:16 berisi jadwal per hari (warna hari sama dengan XLSX). */
function drawWallpaper(items: ScheduleLike[], semesterLabel: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const font = (px: number, weight = 400) => `${weight} ${px}px Inter, "Segoe UI", Roboto, Arial, sans-serif`;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0f172a");
  bg.addColorStop(1, "#1e293b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const groups = groupByDay(items).filter((g) => g.items.length > 0);
  const itemCount = groups.reduce((n, g) => n + g.items.length, 0);

  // Skala otomatis agar semua jadwal muat di area yang tersedia.
  const avail = H - TOP - BOTTOM - 70;
  const natural = groups.length * 58 + itemCount * 96 + (groups.length - 1) * 22;
  const s = Math.min(1, avail / Math.max(natural, 1));
  const dayH = 58 * s, rowH = 96 * s, gap = 22 * s;

  ctx.textBaseline = "middle";
  ctx.fillStyle = "#e2e8f0";
  ctx.font = font(34, 700);
  ctx.fillText(`JADWAL KULIAH ${semesterLabel.toUpperCase()}`, PAD, TOP);

  let y = TOP + 50;
  const cardW = W - PAD * 2;
  const fit = (text: string, max: number) => {
    if (ctx.measureText(text).width <= max) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
    return t + "…";
  };

  for (const g of groups) {
    const blockH = dayH + g.items.length * rowH;
    const color = `#${DAY_COLORS[g.day]}`;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(PAD, y, cardW, blockH, 22 * s);
    ctx.clip();
    ctx.fillStyle = color;
    ctx.fillRect(PAD, y, cardW, blockH);
    // Badan kartu sedikit lebih terang dari header hari
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillRect(PAD, y + dayH, cardW, blockH - dayH);
    ctx.restore();

    ctx.fillStyle = "#0f172a";
    ctx.font = font(30 * s, 800);
    ctx.fillText(g.label.toUpperCase(), PAD + 28, y + dayH / 2);

    let ry = y + dayH;
    g.items.forEach((it, i) => {
      if (i > 0) {
        ctx.fillStyle = "rgba(15,23,42,0.12)";
        ctx.fillRect(PAD + 24, ry, cardW - 48, 2);
      }
      const timeW = 230 * s;
      ctx.fillStyle = "#1e293b";
      ctx.font = font(28 * s, 700);
      ctx.fillText(it.startTime ?? "", PAD + 28, ry + rowH * 0.36);
      ctx.font = font(22 * s, 500);
      ctx.fillStyle = "#475569";
      ctx.fillText(it.endTime ? `– ${it.endTime}` : "", PAD + 28, ry + rowH * 0.68);

      const tx = PAD + 28 + timeW;
      const maxW = cardW - timeW - 56;
      ctx.fillStyle = "#0f172a";
      ctx.font = font(30 * s, 700);
      ctx.fillText(fit(it.title, maxW), tx, ry + rowH * 0.36);
      ctx.fillStyle = "#334155";
      ctx.font = font(23 * s, 500);
      const meta = [it.room, it.sks ? `${it.sks} SKS` : null].filter(Boolean).join(" · ");
      ctx.fillText(fit(meta || formatTimeRange(it.startTime, it.endTime), maxW), tx, ry + rowH * 0.68);
      ry += rowH;
    });
    y += blockH + gap;
  }

  if (groups.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = font(32, 500);
    ctx.fillText("Belum ada jadwal.", PAD, TOP + 90);
  }
  return canvas;
}

export function WallpaperDownload({ items, semesterLabel, fileName }: { items: ScheduleLike[]; semesterLabel: string; fileName: string }) {
  function download() {
    drawWallpaper(items, semesterLabel).toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }
  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <Smartphone className="size-4" aria-hidden /> Wallpaper (PNG)
    </button>
  );
}
