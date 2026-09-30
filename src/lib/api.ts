import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "@/lib/auth/session";
import { SpsFetchError } from "@/lib/google-sheets/client";
import { SpsFormatError } from "@/lib/google-sheets/parser";
import { SiakadInputError } from "@/lib/siakad/service";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Bungkus route handler: error jadi pesan manusiawi, tanpa stack trace ke client. */
export function withErrors<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return NextResponse.json({ error: "Sesi berakhir. Silakan masuk kembali." }, { status: 401 });
      }
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: err.issues[0]?.message ?? "Input tidak valid.", issues: err.issues },
          { status: 400 },
        );
      }
      if (err instanceof SpsFetchError || err instanceof SpsFormatError || err instanceof SiakadInputError) {
        return NextResponse.json({ error: err.message }, { status: 422 });
      }
      // Log aman: hanya nama & pesan, tanpa data request (tidak ada token/cookie).
      console.error("[api]", err instanceof Error ? `${err.name}: ${err.message}` : "unknown error");
      return NextResponse.json({ error: "Terjadi kesalahan di server. Coba lagi." }, { status: 500 });
    }
  };
}
