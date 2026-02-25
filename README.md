# Resource Scheduler (Standalone Web App)

Interactive per-project scheduling tool:
- Rows: people
- Columns: days
- Cell: hours assigned to the selected project
- Capacity: hard cap 8h/day per person (Mon–Fri)

## Prereqs
- Node.js 18+ (or 20+)
- Docker (for Postgres)

## Setup

1) Start Postgres
```bash
docker compose up -d
```

2) Configure env
```bash
cp .env.example .env
```

3) Install deps
```bash
npm install
```

4) Init DB + generate Prisma client
```bash
npm run db:push
npm run prisma:generate
```

5) Seed sample data
```bash
npm run seed
```

6) Run
```bash
npm run dev
```
Open http://localhost:3000

## Notes
- Editing a cell triggers save on blur.
- If saving would exceed 8h/day (considering all projects + time off), the API returns 409 and the UI shows a toast.
