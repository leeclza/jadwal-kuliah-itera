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
    day: z.coerce.number().int().min(1).max(5).optional().nullable(),
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
  .refine(
    (v) => !v.startTime || !v.endTime || timeToMinutes(v.endTime)! > timeToMinutes(v.startTime)!,
    { message: "Jam selesai harus setelah jam mulai", path: ["endTime"] },
  );

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

export const semesterSchema = z.object({
  number: z.coerce.number().int().min(1).max(14),
  label: optStr(60),
  spsUrl: spsUrlSchema,
});

export const onboardingSchema = profileSchema.extend({
  semester: z.coerce.number().int().min(1).max(14),
  spsUrl: spsUrlSchema,
});

export const syncSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("siakad"), text: z.string().max(200_000).optional() }),
  z.object({
    mode: z.literal("pick"),
    courses: z
      .array(
        z.object({
          courseCode: z.string().trim().min(1).max(40),
          courseName: z.string().trim().min(1).max(200),
          className: z.string().trim().max(20).optional(),
          sks: z.string().trim().max(10).optional(),
        }),
      )
      .max(40),
  }),
  z.object({ mode: z.literal("refresh") }),
]);
