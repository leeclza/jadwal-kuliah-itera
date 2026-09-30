import { z } from "zod";
import { normalizeTime, timeToMinutes } from "@/lib/schedule/constants";
import { parseSheetUrl } from "@/lib/google-sheets/parser";

const optStr = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const time = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((v) => !v || normalizeTime(v) !== null, "Format jam harus HH:MM")
  .transform((v) => (v ? normalizeTime(v) : null));

export const scheduleInputSchema = z
  .object({
    type: z.enum(["COURSE", "PRACTICUM", "ASSISTANT", "OTHER"]),
    title: z.string().trim().min(1, "Nama wajib diisi").max(200),
    courseCode: optStr(40),
    className: optStr(20),
    day: z.coerce.number().int().min(1).max(7).optional().nullable(),
    startTime: time,
    endTime: time,
    room: optStr(120),
    lecturers: z
      .union([z.array(z.string()), z.string()])
      .optional()
      .nullable()
      .transform((v) =>
        (Array.isArray(v) ? v : (v ?? "").split(/\n|;/))
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 10),
      ),
    sks: optStr(10),
    notes: optStr(1000),
  })
  // SKS hanya untuk Mata Kuliah: praktikum sudah termasuk matkul induknya, asisten/lainnya tidak menambah SKS.
  .transform((v) => (v.type === "COURSE" ? v : { ...v, sks: null }))
  .refine((v) => v.day != null, { message: "Hari wajib diisi", path: ["day"] })
  .refine((v) => !!v.startTime, { message: "Jam mulai wajib diisi", path: ["startTime"] })
  .refine((v) => !!v.endTime, { message: "Jam selesai wajib diisi", path: ["endTime"] })
  .refine((v) => v.type !== "COURSE" || /^\d+(\+\d+)*$/.test(v.sks ?? ""), {
    message: "SKS wajib diisi angka untuk Mata Kuliah",
    path: ["sks"],
  })
  .refine(
    (v) => !v.startTime || !v.endTime || timeToMinutes(v.endTime)! > timeToMinutes(v.startTime)!,
    { message: "Jam selesai harus setelah jam mulai", path: ["endTime"] },
  )
  .refine((v) => v.type !== "OTHER" || !!v.notes, {
    message: "Catatan wajib diisi untuk jenis Lainnya",
    path: ["notes"],
  });

export type ScheduleInput = z.infer<typeof scheduleInputSchema>;

export const spsUrlSchema = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .refine((v) => !v || parseSheetUrl(v) !== null, "Link SPS harus link Google Sheets (docs.google.com/spreadsheets/...)")
  .transform((v) => (v ? v : null));

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Nama wajib diisi").max(120),
  nim: z.string().trim().regex(/^\d{6,15}$/, "NIM harus berupa angka"),
  prodi: z.string().trim().min(2, "Program studi wajib diisi").max(120),
});

/** User hanya boleh menambah semester pendek; nomor semester reguler ditentukan sistem. */
export const shortSemesterSchema = z.object({
  spsUrl: spsUrlSchema,
});

export const onboardingSchema = profileSchema.extend({
  spsUrl: spsUrlSchema,
});

export const syncSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("siakad"), text: z.string().max(200_000).optional() }),
  z.object({ mode: z.literal("refresh") }),
]);

