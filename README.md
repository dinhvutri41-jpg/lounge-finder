# Lounge Finder

Airport lounge search for the **LinkCare VN / LoungeKey** catalog. Vietnamese UI, Postgres backend, and automatic LoungeKey sync.

Inspired by [linkcareloungefinder.web.app](https://linkcareloungefinder.web.app/). This app stores the catalog in **your** database instead of a static JSON file.

---

## How it works

```
Browser  →  TanStack Start (React)  →  server functions
                                      ↓
                                 Postgres
                                      ↑
                         LoungeKey search API (batched)
```

1. **First boot** — if the `lounges` table is empty, the server seeds ~1,590 lounges from `src/data/lounges.json`.
2. **Search** — pick airport, optional date / time / terminal. Hours matching runs on the server (`src/lib/hours.ts`).
3. **Sync** — the app calls LoungeKey’s public search API (the same one their website uses):
   - `POST /umbraco/api/consumerloungeapi/airportloungesearch/` — discover airports
   - `POST /umbraco/api/consumerloungeapi/loungesearch/` — lounge details (en + vi)
4. **Batches** — 8 airports per tick, ~90s cooldown locally, Vercel Cron every 15 minutes (`/api/sync`). Rows are **upserted**, never wiped.
5. **UI** — custom airport, date, time, and terminal pickers. Header refresh icon runs one extra batch.

Data source: [loungefinder.loungekey.com/en/linkcarevn](https://loungefinder.loungekey.com/en/linkcarevn/). This is an unofficial helper; always confirm on LoungeKey before travel.

---

## Stack

| Layer | Choice |
|---|---|
| App | TanStack Start + React 19 |
| Style | Tailwind CSS v4 |
| Data fetching | TanStack Query + `createServerFn` |
| Database | Postgres (`pg`). Local preview can use PGLite if `DATABASE_URL` is unset |
| Hosting | Vercel (Nitro preset) |
| Sync | `GET /api/sync` + `vercel.json` cron |

---

## Local development

**Need:** Node 22+

```bash
git clone https://github.com/huypccursor/lounge-finder.git
cd lounge-finder
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:8080](http://localhost:8080).

Without `DATABASE_URL`, the app uses in-memory **PGLite** and seeds from `src/data/lounges.json`. Fine for trying the UI. Use real Postgres for production (sync state must persist).

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 8080 |
| `npm run typecheck` | TypeScript |
| `npm run build` | Production build + migrate |
| `npm run db:migrate` | Apply `migrations/*.sql` to `DATABASE_URL` |
| `npm run preview` | Serve the production build locally |

---

## Environment

Copy `.env.example` → `.env`:

```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

That’s the only required secret for production. Neon, Supabase, RDS, or any Postgres 15+ works.

Optional:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string. If missing, PGLite (dev only) |
| `CRON_SECRET` | If set, `/api/sync` requires `Authorization: Bearer <secret>` |

---

## Deploy to Vercel

1. Create a Postgres database (Neon is simplest: [neon.tech](https://neon.tech)).
2. Push this repo to GitHub (already done if you cloned this).
3. [vercel.com/new](https://vercel.com/new) → import **huypccursor/lounge-finder**.
4. Set env:
   - `DATABASE_URL` = your Postgres URL
5. Deploy. `npm run build` runs migrations automatically.
6. Confirm **Cron Jobs** in the Vercel project: `GET /api/sync` every 15 minutes.

First request seeds the snapshot. Sync then walks airports in the background. A full catalog pass takes several hours (by design — small polite batches).

### Manual sync

```bash
curl https://YOUR_DOMAIN/api/sync
```

Header refresh icon in the app also triggers one batch.

---

## Project structure

```
src/
  components/lounge/     UI: search, pickers, results, disclaimer
  lib/
    lounges.functions.ts search / meta server functions
    scrape.server.ts     LoungeKey HTTP + field mapping
    sync.server.ts       batched upsert + cooldown
    seed.server.ts       first-boot JSON seed
    hours.ts             opening-hours filter
    db.ts                Postgres / PGLite
  data/lounges.json      snapshot seed (~1,590 lounges)
  routes/api/sync.ts     cron + manual tick
migrations/
  0002_lounges.sql       lounges + sync_meta
  0003_sync.sql          airports queue + sync cursor
```

---

## Notes

- Sync is **best-effort**. If LoungeKey is down or rate-limits, search still uses the last good catalog.
- Do not add a public “scrape everything now” button. Batches + cooldown exist so we don’t hammer LoungeKey.
- Facility labels (en/vi) are mapped in `src/lib/scrape.server.ts`.
