// Runs `prisma migrate deploy` against DIRECT_DATABASE_URL instead of
// DATABASE_URL. Neon's pooled connection (PgBouncer, "-pooler" hostname) can
// multiplex the advisory lock Prisma Migrate takes across sessions, which
// surfaces as a P1002 "Timed out trying to acquire a postgres advisory lock"
// error. Falls back to DATABASE_URL if DIRECT_DATABASE_URL isn't set (e.g.
// local dev against `npx prisma dev`, which has no pooler).
import { execSync } from "node:child_process";

const env = {
  ...process.env,
  DATABASE_URL: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
};

execSync("npx prisma migrate deploy", { stdio: "inherit", env });
