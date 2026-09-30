import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/profile-form";
import { angkatanFromNim, nimFromEmail } from "@/lib/auth/identity";
import { requireUserPage } from "@/lib/auth/session";
import { currentSemesterNumber, DEFAULT_PRODI } from "@/lib/schedule/semester";

export default async function OnboardingPage() {
  const user = await requireUserPage({ allowIncomplete: true });
  if (user.name && user.nim && user.prodi && user.activeSemesterId) redirect("/");

  const lockedNim = nimFromEmail(user.email);
  const angkatan = angkatanFromNim(lockedNim ?? user.nim);
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-xl font-semibold">Lengkapi profil</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">Data ini dipakai untuk nama file & judul jadwal.</p>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <ProfileForm
          mode="onboarding"
          email={user.email}
          lockedNim={lockedNim}
          defaults={{
            name: user.name,
            nim: user.nim,
            prodi: user.prodi ?? DEFAULT_PRODI,
            semester: angkatan ? currentSemesterNumber(angkatan) : 1,
          }}
        />
      </div>
    </main>
  );
}
