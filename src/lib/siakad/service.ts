import type { SiakadCourse } from "@/lib/schedule/types";
import { parseSiakadText } from "./parser";

export class SiakadInputError extends Error {}

export interface SiakadInput {
  /** Teks tabel KRS/Jadwal yang di-copy dari SIAKAD. */
  text?: string;
}

export interface SiakadProvider {
  readonly name: "mock" | "real";
  getCourses(input: SiakadInput): Promise<SiakadCourse[]>;
}

export class RealSiakadProvider implements SiakadProvider {
  readonly name = "real" as const;
  async getCourses({ text }: SiakadInput) {
    if (!text?.trim()) {
      throw new SiakadInputError("Tempel dulu tabel KRS/Jadwal dari SIAKAD.");
    }
    const courses = parseSiakadText(text);
    if (courses.length === 0) {
      throw new SiakadInputError(
        "Tidak ada kode mata kuliah (mis. IF25-21010) yang terbaca dari teks SIAKAD.",
      );
    }
    return courses;
  }
}

/** Data contoh untuk development (Semester 3 Teknik Informatika). */
export class MockSiakadProvider implements SiakadProvider {
  readonly name = "mock" as const;
  async getCourses({ text }: SiakadInput) {
    if (text?.trim()) return new RealSiakadProvider().getCourses({ text });
    return [
      { courseCode: "IF25-21010", courseName: "Probabilitas dan Statistika", className: "RB", sks: "3", lecturers: ["Miranti Verdiana, M.Si."] },
      { courseCode: "IF25-21013", courseName: "Strategi Algoritma", className: "RB", sks: "3", lecturers: ["Angga Wijaya, S.Si., M.Si."] },
      { courseCode: "IF25-21008", courseName: "Jaringan Komputer", className: "RG", sks: "2+1", lecturers: ["I Wayan Wiprayoga Wisesa, S.Kom., M.Kom"] },
      { courseCode: "IF25-21012", courseName: "Basis Data", className: "RC", sks: "3", lecturers: ["Rajif Agung Yunmar, S.Kom., M.Cs."] },
      { courseCode: "IF25-21011", courseName: "Dasar Rekayasa Perangkat Lunak", className: "RA", sks: "3", lecturers: ["Hafiz Budi Firmansyah, S.Kom., M.Sc., Ph.D."] },
    ];
  }
}

export function getSiakadProvider(): SiakadProvider {
  return process.env.SIAKAD_PROVIDER === "mock" ? new MockSiakadProvider() : new RealSiakadProvider();
}
