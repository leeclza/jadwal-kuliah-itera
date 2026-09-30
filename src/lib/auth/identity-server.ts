import { HttpError } from "@/lib/api";
import { nimFromEmail } from "./identity";

/** NIM profil tidak boleh beda dengan NIM yang tertera di email Google ITERA. */
export function assertNimMatchesEmail(email: string, nim: string) {
  const fromEmail = nimFromEmail(email);
  if (fromEmail && fromEmail !== nim) {
    throw new HttpError(400, `NIM harus sama dengan NIM di email ITERA kamu (${fromEmail}).`);
  }
}
