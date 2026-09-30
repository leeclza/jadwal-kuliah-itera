export type ScheduleSourceT = "SIAKAD" | "MANUAL";
export type ScheduleTypeT = "COURSE" | "PRACTICUM" | "ASSISTANT" | "OTHER";
export type MatchStatusT = "MATCHED" | "UNMATCHED" | "AMBIGUOUS";

/** Mata kuliah yang diambil user (dari SIAKAD). */
export interface SiakadCourse {
  courseCode: string;
  courseName: string;
  className?: string;
  room?: string;
  lecturers?: string[];
  sks?: string;
  semester?: string;
  rawData?: unknown;
}

/** Satu baris jadwal dari SPS (Google Sheets). */
export interface SpsRow {
  day: number;
  startTime: string;
  endTime: string;
  courseCode: string;
  courseName: string;
  className: string;
  sks?: string;
  room?: string;
  semester?: string;
  notes?: string;
}

/** Bentuk minimal item jadwal yang dipakai untuk tampilan/export/konflik. */
export interface ScheduleLike {
  id: string;
  title: string;
  type: ScheduleTypeT;
  source: ScheduleSourceT;
  courseCode?: string | null;
  className?: string | null;
  room?: string | null;
  lecturers?: string[];
  sks?: string | null;
  day?: number | null;
  startTime?: string | null;
  endTime?: string | null;
}
