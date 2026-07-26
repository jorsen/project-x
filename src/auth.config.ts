import type { NextAuthConfig } from "next-auth";

// Edge-safe config shared by the full auth.ts (Node runtime, used in Server
// Components/Actions) and the lightweight proxy instance (Edge runtime).
// Must not import Prisma/bcrypt or anything Node-only.
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "EDITOR" | "VIEWER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
