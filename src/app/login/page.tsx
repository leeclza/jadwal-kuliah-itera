import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { signIn } from "@/auth";
import { getCurrentUser } from "@/lib/auth/session";

const ERRORS: Record<string, string> = {
  domain: "Hanya email ITERA (@itera.ac.id) yang boleh masuk.",
  AccessDenied: "Hanya email ITERA (@itera.ac.id) yang boleh masuk.",
  OAuthAccountNotLinked: "Akun ini sudah terhubung dengan metode login lain.",
  Configuration: "Login sedang bermasalah (konfigurasi server). Hubungi admin.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { error } = await searchParams;

  async function login() {
    "use server";
    await signIn("google", { redirectTo: "/" });
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <CalendarDays className="size-6 text-blue-700" aria-hidden />
          <h1 className="text-lg font-semibold">Jadwalin</h1>
        </div>
        <p className="mb-6 text-sm text-slate-600">
          Gabungkan mata kuliah dari SIAKAD dengan hari &amp; jam dari SPS, tambah jadwal praktikum, lalu
          download dalam format Excel.
        </p>
        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {ERRORS[error] ?? "Login gagal. Coba lagi."}
          </p>
        )}
        <form action={login}>
          <button
            type="submit"
            className="flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
            </svg>
            Masuk dengan Google
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-500">Khusus akun @student.itera.ac.id</p>
      </div>
    </main>
  );
}
