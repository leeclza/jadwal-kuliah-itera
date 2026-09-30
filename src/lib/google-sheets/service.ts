import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SpsRow } from "@/lib/schedule/types";
import { fetchSheetCsv, SpsFetchError } from "./client";
import { parseSheetUrl, parseSpsCsv } from "./parser";

/** Sumber hari + jam kuliah. */
export interface ScheduleTimeProvider {
  getRows(spsUrl: string | null | undefined): Promise<SpsRow[]>;
}

export function defaultSpsUrl(): string | null {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) return null;
  return `https://docs.google.com/spreadsheets/d/${id}/edit?gid=${process.env.GOOGLE_SHEET_GID ?? "0"}`;
}

export class GoogleSheetsScheduleProvider implements ScheduleTimeProvider {
  async getRows(spsUrl: string | null | undefined) {
    const url = spsUrl || defaultSpsUrl();
    if (!url) throw new SpsFetchError("Link SPS belum diisi. Isi di halaman Profile > Semester.");
    const parsed = parseSheetUrl(url);
    if (!parsed) throw new SpsFetchError("Link SPS tidak valid. Gunakan link docs.google.com/spreadsheets/...");
    const csv = await fetchSheetCsv(parsed.sheetId, parsed.gid);
    return parseSpsCsv(csv);
  }
}

/** Provider development: membaca fixture CSV lokal. */
export class MockScheduleTimeProvider implements ScheduleTimeProvider {
  async getRows() {
    const csv = await readFile(
      path.join(process.cwd(), "src/lib/google-sheets/fixtures/sps-sample.csv"),
      "utf8",
    );
    return parseSpsCsv(csv);
  }
}

export function getScheduleTimeProvider(): ScheduleTimeProvider {
  return process.env.SCHEDULE_TIME_PROVIDER === "mock"
    ? new MockScheduleTimeProvider()
    : new GoogleSheetsScheduleProvider();
}
