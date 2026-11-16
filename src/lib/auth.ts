import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/connexion" },
  providers: [Google],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) token.sub = user.id;
      return token;
    },
    session: ({ session, token }) => {
      if (session.user && token.sub) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
  events: {
    // Le tout premier compte créé devient ADMIN (Steve).
    createUser: async ({ user }) => {
      const count = await db.user.count();
      if (count <= 1 && user.id) {
        await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      }
    },
  },
});
