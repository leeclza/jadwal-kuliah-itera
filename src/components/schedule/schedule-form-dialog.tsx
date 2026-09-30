"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button, Dialog, Field, Input, Select, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/client-api";
import { DAYS } from "@/lib/schedule/constants";
import type { ScheduleDTO } from "@/lib/schedule/repo";

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

export function ScheduleFormDialog({ item, open, onClose, onSaved }: {
  item: ScheduleDTO | null; open: boolean; onClose: () => void; onSaved: (msg: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ defaultValues: toForm(item) });

  const isSiakad = item?.source === "SIAKAD";

  const onSubmit = handleSubmit(async (v) => {
    setError(null);
    const body = { ...v, day: v.day ? Number(v.day) : null };
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
          <Field label="Jenis" htmlFor="f-type">
            <Select id="f-type" disabled={isSiakad} {...register("type")}>
              <option value="COURSE">Mata Kuliah</option>
              <option value="PRACTICUM">Praktikum</option>
              <option value="ASSISTANT">Asisten</option>
              <option value="OTHER">Lainnya</option>
            </Select>
          </Field>
          <Field label="Hari" htmlFor="f-day">
            <Select id="f-day" {...register("day")}>
              <option value="">—</option>
              {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Nama" htmlFor="f-title" error={errors.title?.message}>
          <Input id="f-title" placeholder="mis. Praktikum Basis Data" {...register("title", { required: "Nama wajib diisi" })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jam Mulai" htmlFor="f-start"><Input id="f-start" type="time" {...register("startTime")} /></Field>
          <Field label="Jam Selesai" htmlFor="f-end"><Input id="f-end" type="time" {...register("endTime")} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Kode Matkul" htmlFor="f-code"><Input id="f-code" {...register("courseCode")} /></Field>
          <Field label="Kelas" htmlFor="f-class"><Input id="f-class" {...register("className")} /></Field>
          <Field label="SKS" htmlFor="f-sks"><Input id="f-sks" {...register("sks")} /></Field>
        </div>
        <Field label="Ruangan" htmlFor="f-room"><Input id="f-room" placeholder="mis. LABTEK 1 LT 3" {...register("room")} /></Field>
        <Field label="Dosen / Penanggung Jawab" htmlFor="f-lect" hint="Satu nama per baris.">
          <Textarea id="f-lect" rows={2} {...register("lecturers")} />
        </Field>
        <Field label="Catatan" htmlFor="f-notes"><Textarea id="f-notes" rows={2} {...register("notes")} /></Field>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : "Simpan"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
