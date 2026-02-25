import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

function isWeekendUTC(dateISO: string) {
  const d = new Date(dateISO + "T00:00:00.000Z");
  const day = d.getUTCDay(); // 0 Sun ... 6 Sat
  return day === 0 || day === 6;
}

function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const personId = String(body.personId ?? "");
    const projectId = String(body.projectId ?? "");
    const dateISO = String(body.date ?? "");
    const hours = Number(body.hours ?? NaN);

    if (!personId || !projectId || !isISODate(dateISO)) {
      return NextResponse.json(
        { ok: false, code: "INVALID_INPUT", message: "personId, projectId, date(YYYY-MM-DD) are required" },
        { status: 400 }
      );
    }

    if (isWeekendUTC(dateISO)) {
      return NextResponse.json(
        { ok: false, code: "WEEKEND_BLOCKED", message: "Weekends are not schedulable." },
        { status: 400 }
      );
    }

    if (Number.isNaN(hours) || hours < 0 || hours > 8) {
      return NextResponse.json(
        { ok: false, code: "INVALID_HOURS", message: "Hours must be between 0 and 8." },
        { status: 400 }
      );
    }

    const date = new Date(dateISO + "T00:00:00.000Z");

    // hours=0 => delete
    if (hours === 0) {
      await prisma.assignment.deleteMany({ where: { personId, projectId, date } });

      const totalAssigned = await prisma.assignment.aggregate({
        where: { personId, date },
        _sum: { hours: true }
      });
      const totalOff = await prisma.timeOff.aggregate({
        where: { personId, date },
        _sum: { hours: true }
      });

      const personTotalAllProjects = Number(totalAssigned._sum.hours ?? 0) + Number(totalOff._sum.hours ?? 0);

      return NextResponse.json({
        ok: true,
        personId,
        projectId,
        date: dateISO,
        hours: 0,
        personTotalAllProjects: Number(personTotalAllProjects.toFixed(2)),
        isOverbooked: personTotalAllProjects > 8 + 1e-9
      });
    }

    // Capacity hard-block: other projects + requested + time off <= 8
    const aggOther = await prisma.assignment.aggregate({
      where: {
        personId,
        date,
        NOT: { projectId }
      },
      _sum: { hours: true }
    });

    const other = Number(aggOther._sum.hours ?? 0);

    const timeOffAgg = await prisma.timeOff.aggregate({
      where: { personId, date },
      _sum: { hours: true }
    });

    const timeOff = Number(timeOffAgg._sum.hours ?? 0);

    const capacity = 8;
    const newTotal = other + hours + timeOff;

    if (newTotal > capacity + 1e-9) {
      const maxAllowed = Math.max(0, capacity - other - timeOff);
      return NextResponse.json(
        {
          ok: false,
          code: "OVER_CAPACITY",
          message: "Cannot exceed 8 hours/day for this person.",
          date: dateISO,
          capacity,
          requestedHours: hours,
          existingOtherProjectsHours: Number(other.toFixed(2)),
          timeOffHours: Number(timeOff.toFixed(2)),
          maxAllowedForThisCell: Number(maxAllowed.toFixed(2))
        },
        { status: 409 }
      );
    }

    await prisma.assignment.upsert({
      where: {
        personId_projectId_date: { personId, projectId, date }
      },
      create: { personId, projectId, date, hours },
      update: { hours }
    });

    return NextResponse.json({
      ok: true,
      personId,
      projectId,
      date: dateISO,
      hours: Number(hours.toFixed(2)),
      personTotalAllProjects: Number(newTotal.toFixed(2)),
      isOverbooked: newTotal > 8 + 1e-9
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, code: "SERVER_ERROR", message: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
