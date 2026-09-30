import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jadwalin — Jadwal Kuliah ITERA",
  description:
    "Jadwalin: susun jadwal kuliah ITERA otomatis dari SIAKAD dan SPS, tambah jadwal praktikum, lalu export ke Excel.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
