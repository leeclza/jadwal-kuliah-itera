import { Search } from "lucide-react";
import type { AuditFilters } from "@/lib/audit/query";

const field =
  "min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20";
const label = "mb-1 block text-xs font-medium text-slate-600";

/** Form GET biasa -> filter dikirim ke server lewat query string (tanpa JS). */
export function AuditFiltersForm({ filters }: { filters: AuditFilters }) {
  return (
    <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
      <div className="lg:col-span-2">
        <label htmlFor="f-role" className={label}>Filter by Role</label>
        <select id="f-role" name="role" defaultValue={filters.role ?? ""} className={field}>
          <option value="">Semua Role</option>
          <option value="ADMIN">Admin</option>
          <option value="MAHASISWA">Mahasiswa</option>
        </select>
      </div>
      <fieldset className="sm:col-span-2 lg:col-span-5">
        <legend className={label}>Rentang Tanggal</legend>
        <div className="flex items-center gap-2">
          <input type="date" name="from" aria-label="Tanggal mulai" defaultValue={filters.from} className={field} />
          <span className="text-xs text-slate-400">s/d</span>
          <input type="date" name="to" aria-label="Tanggal akhir" defaultValue={filters.to} className={field} />
        </div>
      </fieldset>
      <div className="sm:col-span-2 lg:col-span-5">
        <label htmlFor="f-q" className={label}>Cari User</label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input id="f-q" name="q" defaultValue={filters.q} placeholder="Nama user, target, atau kode…" className={`${field} pl-9`} />
          </div>
          <button type="submit" className="min-h-10 rounded-lg bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            Cari
          </button>
        </div>
      </div>
    </form>
  );
}
