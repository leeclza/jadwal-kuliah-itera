import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/prisma";
import { ALLOWED_DOMAIN, isAllowedEmail } from "@/lib/auth/domain";
import { recordLogin, recordLoginFailed } from "@/lib/audit/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,
      authorization: { params: { hd: ALLOWED_DOMAIN, prompt: "select_account" } },
    }),
  ],
  pages: { signIn: "/login", error: "/login" },
  events: {
    async signIn({ user, account }) {
      if (!user.id) return;
      const u = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, name: true, email: true, role: true, nim: true } });
      if (!u) return;
      await recordLogin(u, account?.provider);
    },
  },
  callbacks: {
    async signIn({ profile, user }) {
      const email = profile?.email ?? user.email;
      const verified = profile ? profile.email_verified !== false : true;
      if (!isAllowedEmail(email, verified)) {
        await recordLoginFailed(email, verified);
        return "/login?error=domain";
      }
      return true;
    },
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
