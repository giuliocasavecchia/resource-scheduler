"use client";

import { useEffect, useMemo, useState } from "react";

type Project = { id: string; name: string };

type ScheduleResp = {
  ok: boolean;
  project: Project;
  range: { from: string; to: string };
  dates: { date: string }[];
  rows: {
    person: { id: string; name: string };
    cells: Record<string, { hours: number; personTotalAllProjects: number; isOverbooked: boolean }>;
    personTotalThisProject: number;
  }[];
  totalsByDayThisProject: Record<string, number>;
};

function isoToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysISO(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function Page() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>("");

  const [from, setFrom] = useState<string>(() => isoToday());
  const [to, setTo] = useState<string>(() => addDaysISO(isoToday(), 13)); // 2 weeks

  const [showOnlyStaffed, setShowOnlyStaffed] = useState(true);
  const [data, setData] = useState<ScheduleResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/projects");
      const j = await r.json();
      if (j.ok) {
        setProjects(j.projects);
        if (!projectId && j.projects.length) setProjectId(j.projects[0].id);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    if (!projectId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/schedule/project?projectId=${encodeURIComponent(projectId)}&from=${from}&to=${to}`);
      const j = (await r.json()) as ScheduleResp;
      setData(j.ok ? j : null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (projectId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, from, to]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const visibleRows = useMemo(() => {
    if (!data) return [];
    return showOnlyStaffed ? data.rows.filter(r => (r.personTotalThisProject ?? 0) > 0) : data.rows;
  }, [data, showOnlyStaffed]);

  async function saveCell(personId: string, date: string, hours: number) {
    if (!data) return;
    const res = await fetch("/api/assignments/upsert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId, projectId: data.project.id, date, hours })
    });

    if (res.status === 409) {
      const j = await res.json();
      setToast(`${j.message} Max allowed here: ${j.maxAllowedForThisCell}h.`);
      return;
    }

    if (!res.ok) {
      const j = await res.json().catch(() => null);
      setToast(j?.message ?? "Save failed");
      return;
    }

    // simple refresh (MVP). You can optimize with local patching later.
    await load();
  }

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Resource Scheduler</div>
            <div className="muted">Per project • People × Day • Hard 8h/day cap (Mon–Fri)</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>
          </div>
        </div>

        <div className="header" style={{ marginTop: 12 }}>
          <div>
            <label>Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>

          <div>
            <label>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>

          <div style={{ alignSelf: "center", marginTop: 18, display: "flex", gap: 8, alignItems: "center" }}>
            <input
              id="onlyStaffed"
              type="checkbox"
              checked={showOnlyStaffed}
              onChange={(e) => setShowOnlyStaffed(e.target.checked)}
            />
            <label htmlFor="onlyStaffed" style={{ margin: 0, cursor: "pointer" }}>Show only staffed people</label>
          </div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="card">
        {!data ? (
          <div className="muted">Select a project to load schedule.</div>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th className="stickyCol">Person</th>
                  {data.dates.map((d) => (
                    <th key={d.date}>{d.date}</th>
                  ))}
                  <th>Row total</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => (
                  <tr key={r.person.id}>
                    <td className="stickyCol"><b>{r.person.name}</b></td>
                    {data.dates.map((d) => {
                      const cell = r.cells[d.date] ?? { hours: 0, personTotalAllProjects: 0, isOverbooked: false };
                      return (
                        <td key={d.date} title={`Person total (all projects + time off): ${cell.personTotalAllProjects}h`}>
                          <input
                            className={`cellInput ${cell.isOverbooked ? "over" : ""}`}
                            defaultValue={cell.hours ? String(cell.hours) : ""}
                            inputMode="decimal"
                            onBlur={(e) => {
                              const vRaw = e.currentTarget.value.trim();
                              const v = vRaw === "" ? 0 : Number(vRaw);
                              if (Number.isNaN(v)) {
                                setToast("Invalid number");
                                e.currentTarget.value = cell.hours ? String(cell.hours) : "";
                                return;
                              }
                              if (v === cell.hours) return;
                              saveCell(r.person.id, d.date, v);
                            }}
                          />
                        </td>
                      );
                    })}
                    <td className="rowTotal"><b>{r.personTotalThisProject}</b></td>
                  </tr>
                ))}
                <tr>
                  <td className="stickyCol"><b>Project total/day</b></td>
                  {data.dates.map((d) => (
                    <td key={d.date} className="rowTotal"><b>{Number((data.totalsByDayThisProject[d.date] ?? 0).toFixed(2))}</b></td>
                  ))}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
