import { csvExportUrl } from "./parser";

export class SpsFetchError extends Error {}

/** Ambil CSV publik dari Google Sheets (read-only, tanpa credential). */
export async function fetchSheetCsv(sheetId: string, gid: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(csvExportUrl(sheetId, gid), {
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new SpsFetchError("Tidak dapat menghubungi Google Sheets. Coba lagi nanti.");
  }
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || type.includes("text/html")) {
    throw new SpsFetchError(
      "Spreadsheet SPS tidak dapat dibaca. Pastikan link benar dan spreadsheet dibagikan 'Siapa saja yang memiliki link'.",
    );
  }
  return res.text();
}
