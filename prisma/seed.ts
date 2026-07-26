import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const employeeNumber = process.env.SEED_ADMIN_EMPLOYEE_NUMBER ?? "002";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Pass1234";
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { employeeNumber },
    update: {},
    create: { name, employeeNumber, passwordHash, role: "ADMIN" },
  });

  console.log(`Seeded admin user: employee #${user.employeeNumber} (role: ${user.role})`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(`Default password is "${password}" — change it after first login.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
