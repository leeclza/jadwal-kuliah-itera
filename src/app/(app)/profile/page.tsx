import { ProfileCard } from "@/components/profile/profile-card";
import { SemesterManager } from "@/components/profile/semester-manager";
import { requireUserPage } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function ProfilePage() {
  const user = await requireUserPage();
  const semesters = await prisma.semester.findMany({
    where: { userId: user.id },
    select: { id: true, number: true, label: true, spsUrl: true },
  });
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <ProfileCard user={{ email: user.email, name: user.name, nim: user.nim, prodi: user.prodi, image: user.image }} />
      <SemesterManager semesters={semesters} activeId={user.activeSemesterId} />
    </div>
  );
}
