import { ProfileCard } from "@/components/profile/profile-card";
import { SemesterManager } from "@/components/profile/semester-manager";
import { nimFromEmail } from "@/lib/auth/identity";
import { requireUserPage } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { semesterName, shortSemesterBase } from "@/lib/schedule/semester";
import { systemSemesterNumber } from "@/lib/schedule/semester-server";

export default async function ProfilePage() {
  const user = await requireUserPage();
  const semesters = await prisma.semester.findMany({
    where: { userId: user.id },
    select: { id: true, number: true, isShort: true, label: true, spsUrl: true },
  });
  const base = shortSemesterBase(
    semesters.filter((s) => !s.isShort).map((s) => s.number),
    systemSemesterNumber(user.nim),
  );
  const shortBase = base !== null && !semesters.some((s) => s.isShort && s.number === base) ? base : null;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <ProfileCard lockedNim={nimFromEmail(user.email)} user={{ email: user.email, name: user.name, nim: user.nim, prodi: user.prodi, image: user.image }} />
      <SemesterManager
        semesters={semesters.map((s) => ({ id: s.id, number: s.number, isShort: s.isShort, name: semesterName(s), spsUrl: s.spsUrl }))}
        activeId={user.activeSemesterId}
        shortBase={shortBase}
      />
    </div>
  );
}
