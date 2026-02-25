import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!process.env.SEED_TOKEN || token !== process.env.SEED_TOKEN) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Invalid token" },
      { status: 401 }
    );
  }

  // Seed People
  const peopleNames = [
    "Alberto D'Ospina",
    "Beatrice Lupieri",
    "Giulia Casavecchia",
    "Marco Rossi",
    "Sara Bianchi"
  ];

  for (const name of peopleNames) {
    await prisma.person.upsert({
      where: { name },
      create: { name, active: true },
      update: { active: true }
    });
  }

  // Seed Projects
  const projectNames = ["WSP", "Internal", "PMO", "Presales"];

  for (const name of projectNames) {
    await prisma.project.upsert({
      where: { name },
      create: { name, active: true },
      update: { active: true }
    });
  }

  return NextResponse.json({
    ok: true,
    message: "Seed completed",
    seeded: { people: peopleNames.length, projects: projectNames.length }
  });
}
