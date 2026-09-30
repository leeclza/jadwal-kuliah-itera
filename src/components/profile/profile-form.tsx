"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Field, Input } from "@/components/ui";
import { apiFetch } from "@/lib/client-api";

const baseSchema = z.object({
  name: z.string().trim().min(2, "Nama wajib diisi"),
  nim: z.string().trim().regex(/^\d{6,15}$/, "NIM harus berupa angka"),
  prodi: z.string().trim().min(2, "Program studi wajib diisi"),
});
const onboardingSchema = baseSchema.extend({
  semester: z.coerce.number<string>().int().min(1, "Minimal 1").max(14, "Maksimal 14"),
  spsUrl: z.string().trim().optional(),
});
type FormValues = z.input<typeof onboardingSchema>;

export function ProfileForm({
  mode,
  email,
  defaults,
  onDone,
}: {
  mode: "onboarding" | "edit";
  email: string;
  defaults: { name?: string | null; nim?: string | null; prodi?: string | null };
  onDone?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(mode === "onboarding" ? onboardingSchema : baseSchema) as never,
    defaultValues: {
      name: defaults.name ?? "",
      nim: defaults.nim ?? "",
      prodi: defaults.prodi ?? "Teknik Informatika",
      semester: "1",
      spsUrl: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      if (mode === "onboarding") {
        await apiFetch("/api/onboarding", { method: "POST", body: values });
        router.replace("/");
      } else {
        const { name, nim, prodi } = values;
        await apiFetch("/api/profile", { method: "PATCH", body: { name, nim, prodi } });
        onDone?.();
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Email" htmlFor="email" hint="Dari akun Google, tidak dapat diubah.">
        <Input id="email" value={email} readOnly disabled />
      </Field>
      <Field label="Nama Lengkap" htmlFor="name" error={errors.name?.message}>
        <Input id="name" autoComplete="name" {...register("name")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="NIM" htmlFor="nim" error={errors.nim?.message}>
          <Input id="nim" inputMode="numeric" {...register("nim")} />
        </Field>
        <Field label="Program Studi" htmlFor="prodi" error={errors.prodi?.message}>
          <Input id="prodi" {...register("prodi")} />
        </Field>
      </div>
      {mode === "onboarding" && (
        <>
          <Field label="Semester aktif" htmlFor="semester" error={errors.semester?.message}>
            <Input id="semester" type="number" min={1} max={14} {...register("semester")} />
          </Field>
          <Field
            label="Link SPS (Google Sheets jadwal prodi)"
            htmlFor="spsUrl"
            hint="Boleh dikosongkan dulu — biasanya SPS baru rilis beberapa hari setelah KRS dibuka. Bisa diisi nanti di Profile."
          >
            <Input id="spsUrl" type="url" placeholder="https://docs.google.com/spreadsheets/d/..." {...register("spsUrl")} />
          </Field>
        </>
      )}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? "Menyimpan..." : mode === "onboarding" ? "Mulai" : "Simpan"}
      </Button>
    </form>
  );
}
