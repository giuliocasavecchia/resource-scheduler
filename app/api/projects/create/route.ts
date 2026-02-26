import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();

  if (!name) {
    return NextResponse.json({ ok: false, message: "name is required" }, { status: 400 });
  }

  const created = await prisma.project.create({
    data: { name, active: true }
  });

  return NextResponse.json({ ok: true, project: created });
}
