"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [newProject, setNewProject] = useState("");
  const [newPerson, setNewPerson] = useState("");
  const [msg, setMsg] = useState<string>("");

  async function refresh() {
    const [p1, p2] = await Promise.all([
      fetch("/api/projects").then(r => r.json()),
      fetch("/api/people").then(r => r.json())
    ]);
    setProjects(p1.projects ?? []);
    setPeople(p2.people ?? []);
  }

  useEffect(() => { refresh(); }, []);

  async function addProject() {
    setMsg("");
    const name = newProject.trim();
    if (!name) return setMsg("Project name is required.");

    const res = await fetch("/api/projects/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(j.message ?? "Failed to add project");
    setNewProject("");
    await refresh();
  }

  async function addPerson() {
    setMsg("");
    const name = newPerson.trim();
    if (!name) return setMsg("Person name is required.");

    const res = await fetch("/api/people/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(j.message ?? "Failed to add person");
    setNewPerson("");
    await refresh();
  }

  async function renameProject(id: string, name: string) {
    setMsg("");
    const res = await fetch("/api/projects/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(j.message ?? "Failed to rename project");
    await refresh();
  }

  async function toggleProjectActive(id: string, active: boolean) {
    setMsg("");
    const res = await fetch("/api/projects/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(j.message ?? "Failed to update project");
    await refresh();
  }

  async function renamePerson(id: string, name: string) {
    setMsg("");
    const res = await fetch("/api/people/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(j.message ?? "Failed to rename person");
    await refresh();
  }

  async function togglePersonActive(id: string, active: boolean) {
    setMsg("");
    const res = await fetch("/api/people/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active })
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(j.message ?? "Failed to update person");
    await refresh();
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Admin</h1>
      {msg ? <p style={{ marginTop: 8 }}>{msg}</p> : null}

      <section style={{ marginTop: 24, display: "grid", gap: 24, gridTemplateColumns: "1fr 1fr" }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Projects</h2>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              value={newProject}
              onChange={e => setNewProject(e.target.value)}
              placeholder="New project name"
            />
            <button onClick={addProject}>Add</button>
          </div>

          <ul style={{ marginTop: 12 }}>
            {projects.map(p => (
              <li key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <input
                  defaultValue={p.name}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== p.name) renameProject(p.id, v);
                  }}
                  style={{ flex: 1 }}
                />
                <button onClick={() => toggleProjectActive(p.id, !p.active)}>
                  {p.active ? "Deactivate" : "Activate"}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>People</h2>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input
              value={newPerson}
              onChange={e => setNewPerson(e.target.value)}
              placeholder="New person name"
            />
            <button onClick={addPerson}>Add</button>
          </div>

          <ul style={{ marginTop: 12 }}>
            {people.map(p => (
              <li key={p.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <input
                  defaultValue={p.name}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== p.name) renamePerson(p.id, v);
                  }}
                  style={{ flex: 1 }}
                />
                <button onClick={() => togglePersonActive(p.id, !p.active)}>
                  {p.active ? "Deactivate" : "Activate"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p style={{ marginTop: 24, opacity: 0.7 }}>
        Tip: open <code>/admin</code> to manage lists.
      </p>
    </main>
  );
}
