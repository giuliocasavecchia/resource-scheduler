import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!process.env.SEED_TOKEN || token !== process.env.SEED_TOKEN) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Invalid token" },
      { status: 401 }
    );
  }

  const peopleNames = [
    "Alberto D'Ospina",
    "Beatrice Lupieri",
    "Giulia Casavecchia",
    "Marco Rossi",
    "Sara Bianchi"
  ];

  const projectNames = ["WSP", "Internal", "PMO", "Presales"];

  // Create seed rows; skipDuplicates requires a unique constraint,
  // so we'll do a safe two-step: find existing, then create missing.
  const existingPeople = await prisma.person.findMany({
    where: { name: { in: peopleNames } },
    select: { name: true }
  });
  const existingPeopleSet = new Set(existingPeople.map(p => p.name));
  const missingPeople = peopleNames.filter(n => !existingPeopleSet.has(n));

  if (missingPeople.length) {
    await prisma.person.createMany({
      data: missingPeople.map(name => ({ name, active: true }))
    });
  }

  const existingProjects = await prisma.project.findMany({
    where: { name: { in: projectNames } },
    select: { name: true }
  });
  const existingProjectsSet = new Set(existingProjects.map(p => p.name));
  const missingProjects = projectNames.filter(n => !existingProjectsSet.has(n));

  if (missingProjects.length) {
    await prisma.project.createMany({
      data: missingProjects.map(name => ({ name, active: true }))
    });
  }

  return NextResponse.json({
    ok: true,
    message: "Seed completed",
    seeded: {
      peopleAdded: missingPeople.length,
      projectsAdded: missingProjects.length
    }
  });
}
