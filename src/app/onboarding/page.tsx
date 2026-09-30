import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/profile-form";
import { requireUserPage } from "@/lib/auth/session";

export default async function OnboardingPage() {
  const user = await requireUserPage({ allowIncomplete: true });
  if (user.name && user.nim && user.prodi && user.activeSemesterId) redirect("/");
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-xl font-semibold">Lengkapi profil</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">Data ini dipakai untuk nama file & judul jadwal.</p>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <ProfileForm mode="onboarding" email={user.email} defaults={user} />
      </div>
    </main>
  );
}
