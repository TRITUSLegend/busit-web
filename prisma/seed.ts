/**
 * prisma/seed.ts
 *
 * Seeds the database with demo accounts for local development and testing.
 *
 * Run with:  npx prisma db seed
 * (configured in package.json → "prisma": { "seed": "tsx prisma/seed.ts" })
 *
 * Demo accounts:
 *   Student — studentId: STUDENT-DEMO  / password: busit123
 *   Driver  — studentId: DRIVER-DEMO   / password: busit123
 *
 * Uses upsert so it is safe to run multiple times.
 * Existing data is not deleted.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "busit123";
const BCRYPT_ROUNDS = 10;

async function main(): Promise<void> {
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  const student = await prisma.user.upsert({
    where: { studentId: "STUDENT-DEMO" },
    update: {},
    create: {
      studentId: "STUDENT-DEMO",
      name: "Demo Student",
      email: "student@busit.dev",
      password: hashedPassword,
      role: "STUDENT",
      credits: 100,
      cardStatus: "ACTIVE",
    },
  });

  const driver = await prisma.user.upsert({
    where: { studentId: "DRIVER-DEMO" },
    update: {},
    create: {
      studentId: "DRIVER-DEMO",
      name: "Demo Driver",
      email: "driver@busit.dev",
      password: hashedPassword,
      role: "DRIVER",
      credits: 0,
      cardStatus: "ACTIVE",
    },
  });

  console.log("✅ Seed complete:");
  console.log(`   Student: studentId=${student.studentId}, credits=${student.credits}`);
  console.log(`   Driver:  studentId=${driver.studentId}`);
  console.log("");
  console.log("   Login at /login using studentId + password: busit123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
