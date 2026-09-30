/** Dikunci di kode: tidak bisa dilonggarkan lewat env. */
export const ALLOWED_DOMAIN = "itera.ac.id";

/**
 * Validasi server-side: hanya email @itera.ac.id atau subdomainnya
 * (mis. @student.itera.ac.id). Parameter `hd` Google hanya hint UX.
 */
export function isAllowedEmail(email: string | null | undefined, emailVerified = true): boolean {
  if (!email || !emailVerified) return false;
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at <= 0 || at !== e.indexOf("@")) return false;
  const domain = e.slice(at + 1);
  return domain === ALLOWED_DOMAIN || domain.endsWith(`.${ALLOWED_DOMAIN}`);
}
