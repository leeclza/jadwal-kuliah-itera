/** Dev (pemilik aplikasi): selalu admin, satu-satunya yang boleh mengatur role orang lain. */
export const OWNER_EMAIL = "christopher.124140097@student.itera.ac.id";

export const ROLES = ["ADMIN", "MAHASISWA"] as const;
export type AppRole = (typeof ROLES)[number];

export function isOwner(user: { email: string }) {
  return user.email.trim().toLowerCase() === OWNER_EMAIL;
}

export function isAdmin(user: { email: string; role?: string | null }) {
  return isOwner(user) || user.role === "ADMIN";
}
