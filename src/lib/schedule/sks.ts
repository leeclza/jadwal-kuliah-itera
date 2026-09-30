/** Batas maksimal SKS per semester. */
export const MAX_SKS = 24;

/** "3" -> 3, "2+1" -> 3 */
export function sksToNumber(sks: string | null | undefined) {
  if (!sks) return 0;
  return sks.split("+").reduce((a, b) => a + (Number(b) || 0), 0);
}

type SksItem = { id?: string; type: string; title: string; courseCode: string | null; className: string | null; sks: string | null };

/**
 * Total SKS: hanya jenis Mata Kuliah yang dihitung, satu kali per matkul+kelas.
 * Praktikum sudah termasuk SKS matkul induknya; asisten & lainnya tidak menambah SKS.
 */
export function totalSks(items: SksItem[]) {
  const courses = new Map<string, number>();
  for (const i of items) {
    if (i.type !== "COURSE") continue;
    const key = `${i.courseCode ?? i.title}|${i.className ?? ""}`;
    if (!courses.has(key)) courses.set(key, sksToNumber(i.sks));
  }
  return { count: courses.size, sks: [...courses.values()].reduce((a, b) => a + b, 0) };
}

export const SKS_LIMIT_MESSAGE = `Sudah melebihi batas pengisian SKS (maksimal ${MAX_SKS} SKS).`;
