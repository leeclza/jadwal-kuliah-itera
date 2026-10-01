import { SiakadImport } from "@/components/schedule/siakad-import";
import { requireUserPage } from "@/lib/auth/session";
import { loadActiveSchedule } from "@/lib/schedule/page-data";

export default async function ImportSiakadPage() {
  const user = await requireUserPage();
  const { semester, semesterLabel } = await loadActiveSchedule(user);
  return (
    <div className="mx-auto max-w-2xl">
      <SiakadImport semester={semester?.number ?? null} semesterLabel={semesterLabel} />
    </div>
  );
}
