import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const projects = await prisma.project.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });
  return NextResponse.json({ ok: true, projects });
}
