import type { DefaultSession } from "next-auth";

type Role = "ADMIN" | "VIEWER";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      employeeNumber: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    employeeNumber: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    employeeNumber: string;
  }
}
