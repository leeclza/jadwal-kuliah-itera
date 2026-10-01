"use client";

import { Smartphone } from "lucide-react";
import { DAY_COLORS, formatTimeRange } from "@/lib/schedule/constants";
import { groupByDay } from "@/lib/schedule/grouping";
import type { ScheduleLike } from "@/lib/schedule/types";

/** Kolom tabel (lebar dalam px logis, sebelum diskalakan ke resolusi HP). */
const COLS = [
  { label: "HARI", w: 66 },
  { label: "WAKTU", w: 104 },
  { label: "MATA KULIAH", w: 142 },
  { label: "KELAS", w: 54 },
  { label: "RUANGAN", w: 104 },
  { label: "DOSEN", w: 100 },
  { label: "SKS", w: 36 },
  { label: "KODE MK", w: 104 },
] as const;
const TABLE_W = COLS.reduce((n, c) => n + c.w, 0);
const FONT_PX = 15;
const LINE_H = 24;
const PAD_X = 5;
const PAD_Y = 8;
const TITLE_H = 24;
const HEAD_H = 24;
const FONT = `${FONT_PX}px Calibri, Carlito, "Segoe UI", Arial, sans-serif`;
const BOLD = `700 ${FONT}`;

/** Area aman lockscreen: atas untuk jam & tanggal, bawah untuk shortcut/indikator (fraksi tinggi layar). */
const SAFE_TOP = 0.14;
const SAFE_BOTTOM = 0.05;

/**
 * Resolusi wallpaper = resolusi fisik layar HP (CSS px × devicePixelRatio), selalu portrait.
 * Di desktop (bukan layar sentuh) pakai 1080×1920 sebagai default HP umum.
 */
export function wallpaperSize(): { w: number; h: number } {
  const touch = window.matchMedia("(pointer: coarse)").matches;
  if (!touch) return { w: 1080, h: 1920 };
  const dpr = window.devicePixelRatio || 1;
  const a = Math.round(window.screen.width * dpr);
  const b = Math.round(window.screen.height * dpr);
  return { w: Math.min(a, b), h: Math.max(a, b) };
}

/** Pecah teks jadi baris yang muat di lebar `max` (kata terlalu panjang dipotong per huruf). */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width <= max) { line = next; continue; }
      if (line) lines.push(line);
      line = word;
      while (ctx.measureText(line).width > max && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > max) cut--;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    lines.push(line);
  }
  return lines;
}

interface Row {
  cells: string[][]; // baris teks per kolom (kecuali HARI & DOSEN)
  lecturers: string[][]; // tiap dosen = satu sub-sel
  h: number;
  lecH: number[];
}
interface Block { day: number; label: string; rows: Row[]; h: number }

/** Hitung tata letak tabel (tinggi baris mengikuti teks terpanjang, seperti XLSX dengan wrap text). */
function layout(ctx: CanvasRenderingContext2D, items: ScheduleLike[]): Block[] {
  ctx.font = FONT;
  const inner = (i: number) => COLS[i].w - PAD_X * 2;
  const textH = (n: number) => Math.max(1, n) * LINE_H + PAD_Y;
  return groupByDay(items).map((g) => {
    const src = g.items.length ? g.items : [null];
    const rows = src.map((it): Row => {
      const vals = it
        ? [formatTimeRange(it.startTime, it.endTime), it.title, it.className ?? "", it.room ?? "", it.sks ?? "", it.courseCode ?? ""]
        : ["", "", "", "", "", ""];
      const colIdx = [1, 2, 3, 4, 6, 7];
      const cells = vals.map((v, k) => wrap(ctx, v, inner(colIdx[k])));
      const lecturers = (it?.lecturers ?? []).filter(Boolean).map((l) => wrap(ctx, l, inner(5)));
      const lecH = lecturers.map((l) => textH(l.length));
      const h = Math.max(LINE_H * 2, ...cells.map((c) => textH(c.length)), lecH.reduce((a, b) => a + b, 0));
      // Sisa tinggi diberikan ke sub-sel dosen terakhir agar memenuhi baris.
      if (lecH.length) lecH[lecH.length - 1] += h - lecH.reduce((a, b) => a + b, 0);
      return { cells, lecturers, h, lecH };
    });
    return { day: g.day, label: g.label.toUpperCase(), rows, h: rows.reduce((a, r) => a + r.h, 0) };
  });
}

/** Gambar wallpaper: tabel jadwal ala XLSX ITERA, diskalakan agar muat penuh di layar HP. */
function drawWallpaper(items: ScheduleLike[], semesterLabel: string): HTMLCanvasElement {
  const { w: W, h: H } = wallpaperSize();
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const blocks = layout(ctx, items);
  const tableH = TITLE_H + HEAD_H + blocks.reduce((a, b) => a + b.h, 0);

  const top = H * SAFE_TOP;
  const availH = H - top - H * SAFE_BOTTOM;
  const margin = W * 0.03;
  const s = Math.min((W - margin * 2) / TABLE_W, availH / tableH);
  const ox = (W - TABLE_W * s) / 2;
  const oy = top + Math.max(0, (availH - tableH * s) / 2);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.setTransform(s, 0, 0, s, ox, oy);
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.lineWidth = 1 / s; // garis 1px fisik
  ctx.strokeStyle = "#000000";

  const cell = (x: number, y: number, w: number, h: number, fill: string | null, lines: string[], bold = false) => {
    if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "#000000";
    ctx.font = bold ? BOLD : FONT;
    const y0 = y + h / 2 - ((lines.length - 1) * LINE_H) / 2;
    lines.forEach((l, i) => ctx.fillText(l, x + w / 2, y0 + i * LINE_H));
  };

  cell(0, 0, TABLE_W, TITLE_H, "#ffffff", [`JADWAL KULIAH ${semesterLabel.toUpperCase()}`], true);
  let x = 0;
  for (const c of COLS) { cell(x, TITLE_H, c.w, HEAD_H, "#ffffff", [c.label], true); x += c.w; }

  let y = TITLE_H + HEAD_H;
  for (const b of blocks) {
    const color = `#${DAY_COLORS[b.day]}`;
    cell(0, y, COLS[0].w, b.h, color, [b.label]);
    let ry = y;
    for (const r of b.rows) {
      let cx = COLS[0].w;
      let k = 0;
      COLS.forEach((c, i) => {
        if (i === 0) return;
        if (i === 5) {
          if (!r.lecturers.length) cell(cx, ry, c.w, r.h, color, []);
          let ly = ry;
          r.lecturers.forEach((l, j) => { cell(cx, ly, c.w, r.lecH[j], color, l); ly += r.lecH[j]; });
        } else {
          cell(cx, ry, c.w, r.h, color, r.cells[k++]);
        }
        cx += c.w;
      });
      ry += r.h;
    }
    y += b.h;
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
      title="Ukuran gambar menyesuaikan resolusi layar HP kamu"
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <Smartphone className="size-4" aria-hidden /> Wallpaper (PNG)
    </button>
  );
}
