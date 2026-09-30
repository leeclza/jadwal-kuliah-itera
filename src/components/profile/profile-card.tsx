"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { ProfileForm } from "./profile-form";

export function ProfileCard({ user }: {
  user: { email: string; name: string | null; nim: string | null; prodi: string | null; image: string | null };
}) {
  const [editing, setEditing] = useState(false);
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="Foto profil" className="size-16 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
          ) : (
            <span className="grid size-16 place-items-center rounded-full bg-blue-100 text-xl font-semibold text-blue-800" aria-hidden>
              {(user.name ?? user.email).slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-lg font-semibold">{user.name}</p>
            <p className="break-all text-sm text-slate-600">{user.email}</p>
          </div>
        </div>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-4" aria-hidden /> Edit Profile
          </Button>
        )}
      </div>
      {editing ? (
        <div className="mt-5 border-t border-slate-100 pt-5">
          <ProfileForm mode="edit" email={user.email} defaults={user} onDone={() => setEditing(false)} />
          <Button variant="ghost" className="mt-2" onClick={() => setEditing(false)}>Batal</Button>
        </div>
      ) : (
        <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-5 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">NIM</dt><dd className="font-medium">{user.nim}</dd></div>
          <div><dt className="text-slate-500">Program Studi</dt><dd className="font-medium">{user.prodi}</dd></div>
        </dl>
      )}
    </Card>
  );
}
