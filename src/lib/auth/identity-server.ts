import { HttpError } from "@/lib/api";
import { nimFromEmail } from "./identity";

/**
 * NIM final untuk disimpan: jika email ITERA memuat NIM, selalu pakai itu
 * (input client diabaikan). Selain itu wajib diisi user.
 */
export function resolveNim(email: string, inputNim: string | null | undefined): string {
  const fromEmail = nimFromEmail(email);
  if (fromEmail) return fromEmail;
  const nim = (inputNim ?? "").trim();
  if (!/^\d{6,15}$/.test(nim)) throw new HttpError(400, "NIM harus berupa angka.");
  return nim;
}
