// Runs `prisma migrate deploy` against DIRECT_DATABASE_URL instead of
// DATABASE_URL. Neon's pooled connection (PgBouncer, "-pooler" hostname) can
// multiplex the advisory lock Prisma Migrate takes across sessions, which
// surfaces as a P1002 "Timed out trying to acquire a postgres advisory lock"
// error. Falls back to DATABASE_URL if DIRECT_DATABASE_URL isn't set (e.g.
// local dev against `npx prisma dev`, which has no pooler).
import { execSync } from "node:child_process";

const directUrl = process.env.DIRECT_DATABASE_URL;

if (!directUrl && process.env.VERCEL) {
  console.error(
    "\nDIRECT_DATABASE_URL is not set in this Vercel environment.\n" +
      "prisma migrate deploy must run against Neon's *unpooled* connection string " +
      '(same as DATABASE_URL but without "-pooler" in the hostname) — otherwise its ' +
      "advisory lock can get stuck on Neon's PgBouncer pooler and every later deploy " +
      "times out with a P1002 error.\n" +
      "Add DIRECT_DATABASE_URL in Vercel Project Settings -> Environment Variables " +
      "(scoped to this environment: Production/Preview/Development as needed), then redeploy.\n",
  );
  process.exit(1);
}

const env = {
  ...process.env,
  DATABASE_URL: directUrl || process.env.DATABASE_URL,
};

execSync("npx prisma migrate deploy", { stdio: "inherit", env });
