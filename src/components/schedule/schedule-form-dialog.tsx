"use client";

import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { Button, Dialog, Field, Input, Select, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/client-api";
import { DAYS } from "@/lib/schedule/constants";
import type { ScheduleDTO } from "@/lib/schedule/repo";
import { MAX_SKS, SKS_LIMIT_MESSAGE, totalSks } from "@/lib/schedule/sks";

interface FormValues {
  type: ScheduleDTO["type"];
  title: string;
  courseCode: string;
  className: string;
  day: string;
  startTime: string;
  endTime: string;
  room: string;
  lecturers: string;
  sks: string;
  notes: string;
}

const toForm = (i: ScheduleDTO | null): FormValues => ({
  type: i?.type ?? "PRACTICUM",
  title: i?.title ?? "",
  courseCode: i?.courseCode ?? "",
  className: i?.className ?? "",
  day: i?.day ? String(i.day) : "",
  startTime: i?.startTime ?? "",
  endTime: i?.endTime ?? "",
  room: i?.room ?? "",
  lecturers: i?.lecturers.join("\n") ?? "",
  sks: i?.sks ?? "",
  notes: i?.notes ?? "",
});

const TYPE_HINT: Record<FormValues["type"], string> = {
  COURSE: "Mata kuliah tambahan (mis. kelas yang tidak ada di SPS). SKS-nya ikut dihitung ke total.",
  PRACTICUM: "SKS praktikum sudah termasuk SKS mata kuliah induknya, jadi tidak perlu diisi.",
  ASSISTANT: "Jadwal asisten praktikum tidak menambah SKS.",
  OTHER: "Kegiatan lain (rapat, les, dll.) tidak menambah SKS.",
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Ketik 4 digit -> otomatis jadi HH:MM. Jam dibatasi 00–23, menit 00–59. */
function maskTime(v: string) {
  let d = "";
  for (const c of v.replace(/\D/g, "")) {
    if (d.length === 4) break;
    const n = Number(c);
    if (d.length === 0 && n > 2) d += "0"; // ketik "8" -> "08"
    else if (d.length === 1 && d === "2" && n > 3) continue; // jam maks 23
    else if (d.length === 2 && n > 5) continue; // menit maks 59
    d += c;
  }
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
}

function TimeInput({ id, reg, invalid }: { id: string; reg: UseFormRegisterReturn; invalid: boolean }) {
  return (
    <Input
      id={id}
      inputMode="numeric"
      autoComplete="off"
      placeholder="--:--"
      maxLength={5}
      aria-invalid={invalid}
      className="tabular-nums"
      {...reg}
      onChange={(e) => {
        e.target.value = maskTime(e.target.value);
        reg.onChange(e);
      }}
    />
  );
}


export function ScheduleFormDialog({ item, items, open, onClose, onSaved }: {
  item: ScheduleDTO | null; items: ScheduleDTO[]; open: boolean; onClose: () => void; onSaved: (msg: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({ defaultValues: toForm(item) });

  const isSiakad = item?.source === "SIAKAD";
  const type = watch("type");
  const isCourse = type === "COURSE";
  const isOther = type === "OTHER";

  // Total SKS semester ini jika item ini disimpan (item yang sedang diedit tidak dihitung dua kali).
  const others = items.filter((i) => i.id !== item?.id);
  const current = totalSks(others).sks;
  const values = watch();
  const projected = isCourse
    ? totalSks([...others, { type, title: values.title, courseCode: values.courseCode || null, className: values.className || null, sks: values.sks || null }]).sks
    : current;
  const overLimit = isCourse && projected > MAX_SKS && projected > current;

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    if (overLimit) {
      setError(SKS_LIMIT_MESSAGE);
      return;
    }
    // Field disabled (data SIAKAD) tidak ikut terkirim oleh react-hook-form -> pakai nilai asli.
    const body = {
      ...v,
      type: isSiakad ? item!.type : v.type,
      day: v.day ? Number(v.day) : null,
      sks: isSiakad ? item!.sks : isCourse ? v.sks : null,
    };
    try {
      if (item) await apiFetch(`/api/schedule/${item.id}`, { method: "PATCH", body });
      else await apiFetch("/api/schedule", { method: "POST", body });
      onSaved(item ? "Jadwal diperbarui." : "Jadwal ditambahkan.");
    } catch (e) {
      setError((e as Error).message);
    }
  });

  return (
    <Dialog open={open} onClose={onClose} title={item ? "Edit Jadwal" : "Tambah Jadwal"}>
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        {isSiakad && (
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
            Ini data SIAKAD. Perubahan bisa tertimpa saat Update dari SIAKAD berikutnya. Untuk versi custom yang
            permanen, pakai &quot;Salin jadi manual&quot;.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Jenis" required htmlFor="f-type" hint={TYPE_HINT[type]}>
            <Select id="f-type" disabled={isSiakad} {...register("type")}>
              <option value="COURSE">Mata Kuliah</option>
              <option value="PRACTICUM">Praktikum</option>
              <option value="ASSISTANT">Asisten</option>
              <option value="OTHER">Lainnya</option>
            </Select>
          </Field>
          <Field label="Hari" required htmlFor="f-day" error={errors.day?.message}>
            <Select id="f-day" aria-invalid={!!errors.day} {...register("day", { required: "Hari wajib diisi" })}>
              <option value="" disabled hidden>Pilih hari</option>
              {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Nama" required htmlFor="f-title" error={errors.title?.message}>
          <Input id="f-title" aria-invalid={!!errors.title} placeholder="mis. Praktikum Jaringan Komputer"
            {...register("title", { validate: (v) => !!v.trim() || "Nama wajib diisi" })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jam Mulai" required htmlFor="f-start" hint="Format 24 jam, mis. 0730" error={errors.startTime?.message}>
            <TimeInput id="f-start" invalid={!!errors.startTime}
              reg={register("startTime", { required: "Jam mulai wajib diisi", pattern: { value: TIME_RE, message: "Format jam HH:MM" } })} />
          </Field>
          <Field label="Jam Selesai" required htmlFor="f-end" error={errors.endTime?.message}>
            <TimeInput id="f-end" invalid={!!errors.endTime}
              reg={register("endTime", {
                required: "Jam selesai wajib diisi",
                pattern: { value: TIME_RE, message: "Format jam HH:MM" },
                validate: (v, all) => !TIME_RE.test(all.startTime) || v > all.startTime || "Jam selesai harus setelah jam mulai",
              })} />
          </Field>
        </div>
        <div className={`grid gap-3 ${isCourse ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <Field label="Kode Matkul" htmlFor="f-code"><Input id="f-code" {...register("courseCode")} /></Field>
          <Field label="Kelas" htmlFor="f-class"><Input id="f-class" {...register("className")} /></Field>
          {isCourse && (
            <Field label="SKS" required htmlFor="f-sks" error={errors.sks?.message}>
              <Input id="f-sks" inputMode="numeric" aria-invalid={!!errors.sks} disabled={isSiakad}
                {...register("sks", {
                  validate: (v) => !isCourse || isSiakad || /^[1-6]$/.test(v.trim()) || "SKS 1–6",
                })} />
            </Field>
          )}
        </div>
        {isCourse && (
          <p className={`rounded-lg px-3 py-2 text-xs ${overLimit ? "bg-red-50 font-medium text-red-700" : "bg-slate-50 text-slate-600"}`}>
            {overLimit
              ? `⚠️ ${SKS_LIMIT_MESSAGE} Total jadi ${projected} SKS.`
              : `Total SKS semester ini: ${projected} / ${MAX_SKS}`}
          </p>
        )}
        <Field label="Ruangan" htmlFor="f-room"><Input id="f-room" placeholder="mis. LABTEK 1 LT 3" {...register("room")} /></Field>
        <Field label="Dosen / Penanggung Jawab" htmlFor="f-lect" hint="Satu nama per baris.">
          <Textarea id="f-lect" rows={2} {...register("lecturers")} />
        </Field>
        <Field
          label="Catatan" required={isOther}
          htmlFor="f-notes"
          hint={isOther ? "Jelaskan ini jadwal apa, mis. rapat himpunan, les, kerja kelompok." : undefined}
          error={errors.notes?.message}
        >
          <Textarea
            id="f-notes"
            rows={2}
            {...register("notes", {
              validate: (v, all) => all.type !== "OTHER" || !!v.trim() || "Catatan wajib diisi untuk jenis Lainnya",
            })}
          />
        </Field>
        <p className="text-xs text-slate-500"><span className="text-red-600">*</span> wajib diisi</p>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={isSubmitting || overLimit}>{isSubmitting ? "Menyimpan..." : "Simpan"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
