# Sculpt Sequences

A web app for yoga teachers to build class sequences, manage pose libraries and variations, and share schedules with students.

**Stack:** React + Vite · Hono API · Turso (libSQL) · JWT auth · Vercel

## Features

- Pose library with variations, cues, and images
- Drag-and-drop sequence builder with sections and timing
- Public share links and instructor profiles
- Transitional cue generation helpers
- Role-based permissions for pose management

## Quick start

### Prerequisites

- Node.js 18+
- [Yarn](https://yarnpkg.com/)
- A [Turso](https://turso.tech) database (or local SQLite for development)

### Install

```bash
git clone https://github.com/ianherdegen/Sculpt-Sequences.git
cd Sculpt-Sequences
yarn install
```

### Environment

```bash
cp env.template .env.local
```

Fill in at least:

| Variable | Purpose |
|----------|---------|
| `TURSO_DATABASE_URL` | Turso URL, or `file:local.db` for local SQLite |
| `TURSO_AUTH_TOKEN` | Turso auth token (not needed for `file:`) |
| `JWT_SECRET` | Secret used to sign auth tokens |

See `env.template` for optional Blob storage and Resend email settings. Full Turso setup: [`TURSO_SETUP.md`](./TURSO_SETUP.md).

### Database

```bash
# Turso cloud
turso db shell sculpt-sequences < sql/turso-schema.sql

# Or local SQLite
sqlite3 local.db < sql/turso-schema.sql
```

### Run locally

```bash
# Terminal 1 — API (http://localhost:3001)
yarn dev:api

# Terminal 2 — Frontend (http://localhost:3000)
yarn dev
```

The Vite dev server proxies `/api` to the local API.

## Project layout

```
src/          React SPA
server/       Hono API (local + shared handlers)
api/          Vercel serverless entry
sql/          Schema and maintenance scripts
scripts/      One-off migration / data tools
```

## Docs

- [`TURSO_SETUP.md`](./TURSO_SETUP.md) — database and deployment
- [`PERMISSIONS_SETUP.md`](./PERMISSIONS_SETUP.md) — permissions model
- [`IMAGE_UPLOAD_SETUP.md`](./IMAGE_UPLOAD_SETUP.md) — image storage
- [`TRANSITIONAL_CUES_SETUP.md`](./TRANSITIONAL_CUES_SETUP.md) — transitional cues

## License

MIT — see [LICENSE](./LICENSE).
