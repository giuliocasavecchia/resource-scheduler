import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "").trim();
  const name = body?.name !== undefined ? String(body.name).trim() : undefined;
  const active = body?.active !== undefined ? Boolean(body.active) : undefined;

  if (!id) return NextResponse.json({ ok: false, message: "id is required" }, { status: 400 });

  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(active !== undefined ? { active } : {})
    }
  });

  return NextResponse.json({ ok: true, project: updated });
}
