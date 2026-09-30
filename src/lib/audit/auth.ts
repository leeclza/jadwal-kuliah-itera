import { AuditAction, AuditTargetType } from "./actions";
import { actorName, logSafe, type AuditActor } from "./audit.service";

type AuthUser = NonNullable<AuditActor> & { nim?: string | null };

export function recordLogin(user: AuthUser, provider = "google") {
  return logSafe({
    actor: user,
    action: AuditAction.AUTH_LOGIN,
    description: `${actorName(user)} masuk ke sistem`,
    targetType: AuditTargetType.USER,
    targetId: user.id,
    targetName: actorName(user),
    metadata: { provider, nim: user.nim ?? null },
  });
}

/** Hanya email + alasan; tidak ada token/credential yang disimpan. */
export function recordLoginFailed(email: string | null | undefined, verified: boolean) {
  return logSafe({
    actor: null,
    action: AuditAction.AUTH_LOGIN_FAILED,
    description: `Percobaan login ditolak karena email bukan email ITERA${email ? ` (${email})` : ""}`,
    metadata: { provider: "google", email: email ?? null, emailVerified: verified, reason: "DOMAIN_NOT_ALLOWED" },
  });
}

export function recordLogout(user: AuthUser) {
  return logSafe({
    actor: user,
    action: AuditAction.AUTH_LOGOUT,
    description: `${actorName(user)} keluar dari sistem`,
    targetType: AuditTargetType.USER,
    targetId: user.id,
    targetName: actorName(user),
  });
}
