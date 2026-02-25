import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const people = ["Alberto", "Beatrice", "Carlo", "Daria"];
  const projects = ["Project A", "Project B", "Internal"];

  for (const name of people) {
    await prisma.person.upsert({
      where: { email: `${name.toLowerCase()}@example.com` },
      update: { name, active: true },
      create: { name, email: `${name.toLowerCase()}@example.com`, active: true }
    });
  }

  for (const name of projects) {
    await prisma.project.upsert({
      where: { name },
      update: { active: true },
      create: { name, active: true }
    });
  }

  console.log("Seeded people and projects.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
