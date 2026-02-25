import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

type IsoDate = string; // YYYY-MM-DD

function toIsoDate(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}
function addDaysUTC(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}
function enumerateDates(fromISO: string, toISO: string): IsoDate[] {
  const from = new Date(fromISO + "T00:00:00.000Z");
  const to = new Date(toISO + "T00:00:00.000Z");
  const out: IsoDate[] = [];
  for (let d = from; d <= to; d = addDaysUTC(d, 1)) out.push(toIsoDate(d));
  return out;
}
function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("projectId") ?? "";
    const fromISO = url.searchParams.get("from") ?? "";
    const toISO = url.searchParams.get("to") ?? "";

    if (!projectId) {
      return NextResponse.json(
        { ok: false, code: "MISSING_PROJECT", message: "projectId is required" },
        { status: 400 }
      );
    }
    if (!isISODate(fromISO) || !isISODate(toISO)) {
      return NextResponse.json(
        { ok: false, code: "INVALID_RANGE", message: "from/to must be YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const from = new Date(fromISO + "T00:00:00.000Z");
    const toExclusive = new Date(toISO + "T00:00:00.000Z");
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);

    const dates = enumerateDates(fromISO, toISO);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true }
    });

    if (!project) {
      return NextResponse.json(
        { ok: false, code: "NOT_FOUND", message: "Project not found" },
        { status: 404 }
      );
    }

    // Include ALL active people (UI can filter to only staffed)
    const people = await prisma.person.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    });
    const personIds = people.map((p) => p.id);

    const projectAssignments = await prisma.assignment.findMany({
      where: {
        projectId,
        date: { gte: from, lt: toExclusive }
      },
      select: { personId: true, date: true, hours: true }
    });

    const totalsAll = personIds.length
      ? await prisma.assignment.groupBy({
          by: ["personId", "date"],
          where: {
            personId: { in: personIds },
            date: { gte: from, lt: toExclusive }
          },
          _sum: { hours: true }
        })
      : [];

    const timeOff = personIds.length
      ? await prisma.timeOff.groupBy({
          by: ["personId", "date"],
          where: {
            personId: { in: personIds },
            date: { gte: from, lt: toExclusive }
          },
          _sum: { hours: true }
        })
      : [];

    const totalMap = new Map<string, number>();
    for (const t of totalsAll) {
      totalMap.set(`${t.personId}|${toIsoDate(t.date)}`, Number(t._sum.hours ?? 0));
    }

    const offMap = new Map<string, number>();
    for (const t of timeOff) {
      offMap.set(`${t.personId}|${toIsoDate(t.date)}`, Number(t._sum.hours ?? 0));
    }

    const cellHoursMap = new Map<string, number>();
    for (const a of projectAssignments) {
      cellHoursMap.set(`${a.personId}|${toIsoDate(a.date)}`, Number(a.hours));
    }

    const totalsByDayThisProject: Record<IsoDate, number> = {};
    for (const d of dates) totalsByDayThisProject[d] = 0;
    for (const a of projectAssignments) {
      const d = toIsoDate(a.date);
      if (totalsByDayThisProject[d] !== undefined) totalsByDayThisProject[d] += Number(a.hours);
    }

    const CAPACITY = 8;

    const rows = people.map((person) => {
      let personTotalThisProject = 0;
      const cells: Record<IsoDate, { hours: number; personTotalAllProjects: number; isOverbooked: boolean }> = {};

      for (const d of dates) {
        const key = `${person.id}|${d}`;
        const hours = cellHoursMap.get(key) ?? 0;

        const assignedAll = totalMap.get(key) ?? 0;
        const off = offMap.get(key) ?? 0;
        const totalAllProjectsPlusOff = assignedAll + off;

        cells[d] = {
          hours,
          personTotalAllProjects: Number(totalAllProjectsPlusOff.toFixed(2)),
          isOverbooked: totalAllProjectsPlusOff > CAPACITY + 1e-9
        };

        personTotalThisProject += hours;
      }

      return {
        person,
        cells,
        personTotalThisProject: Number(personTotalThisProject.toFixed(2))
      };
    });

    return NextResponse.json({
      ok: true,
      project,
      range: { from: fromISO, to: toISO },
      dates: dates.map((date) => ({ date })),
      rows,
      totalsByDayThisProject
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, code: "SERVER_ERROR", message: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
