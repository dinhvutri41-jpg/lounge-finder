import { getSql } from "@/lib/db";
import { fetchAirportLounges, searchAirportsRemote, type ScrapedLounge } from "@/lib/scrape.server";
import { ensureCatalogSeeded } from "@/lib/seed.server";

const BATCH = 8;
const TICK_GAP_MS = 90 * 1000;
const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

export type SyncTickResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  airports: number;
  lounges: number;
  cursor: string | null;
  discovered: number;
};

type MetaRow = {
  last_tick_at: string | Date | null;
  cursor_code: string | null;
  discover_letter: string | null;
};

function asIso(v: string | Date | null | undefined): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

async function upsertLounges(rows: ScrapedLounge[]) {
  if (!rows.length) return;
  const sql = await getSql();
  const q = `
    insert into lounges (
      id, airport_code, lounge_code, name, country, airport_name, terminal,
      location, location_vi, opening_hours, opening_hours_vi, conditions, conditions_vi,
      additional_info, additional_info_vi, facilities, facilities_vi, images,
      source_url, image_pdf_src, updated_at, checked_at
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18::jsonb,
      $19,$20, now(), now()
    )
    on conflict (id) do update set
      airport_code = excluded.airport_code,
      lounge_code = excluded.lounge_code,
      name = excluded.name,
      country = excluded.country,
      airport_name = excluded.airport_name,
      terminal = excluded.terminal,
      location = excluded.location,
      location_vi = excluded.location_vi,
      opening_hours = excluded.opening_hours,
      opening_hours_vi = excluded.opening_hours_vi,
      conditions = excluded.conditions,
      conditions_vi = excluded.conditions_vi,
      additional_info = excluded.additional_info,
      additional_info_vi = excluded.additional_info_vi,
      facilities = excluded.facilities,
      facilities_vi = excluded.facilities_vi,
      images = excluded.images,
      source_url = excluded.source_url,
      image_pdf_src = excluded.image_pdf_src,
      updated_at = now(),
      checked_at = now()
  `;
  for (const row of rows) {
    await sql.query(q, [
      row.id,
      row.airport_code,
      row.lounge_code,
      row.name,
      row.country,
      row.airport_name,
      row.terminal,
      row.location,
      row.location_vi,
      row.opening_hours,
      row.opening_hours_vi,
      row.conditions,
      row.conditions_vi,
      row.additional_info,
      row.additional_info_vi,
      JSON.stringify(row.facilities),
      JSON.stringify(row.facilities_vi),
      JSON.stringify(row.images),
      row.source_url,
      row.image_pdf_src,
    ]);
  }
}

async function seedAirportsFromLounges() {
  const sql = await getSql();
  await sql.query(`
    insert into airports (code, name, country)
    select distinct airport_code, max(airport_name), max(country)
    from lounges
    where airport_code <> ''
    group by airport_code
    on conflict (code) do update set
      name = excluded.name,
      country = excluded.country
  `);
}

async function nextAirports(cursor: string | null): Promise<string[]> {
  const sql = await getSql();
  if (!cursor) {
    return (
      await sql<{ code: string }>`
        select code from airports order by code limit ${BATCH}
      `
    ).map((r) => r.code);
  }
  const after = await sql<{ code: string }>`
    select code from airports where code > ${cursor} order by code limit ${BATCH}
  `;
  if (after.length) return after.map((r) => r.code);
  return (
    await sql<{ code: string }>`
      select code from airports order by code limit ${BATCH}
    `
  ).map((r) => r.code);
}

async function discoverLetter(letter: string): Promise<number> {
  const sql = await getSql();
  const found = await searchAirportsRemote(letter);
  let n = 0;
  for (const a of found) {
    await sql.query(
      `insert into airports (code, name, country)
       values ($1,$2,$3)
       on conflict (code) do update set name = excluded.name, country = excluded.country`,
      [a.code, a.name, a.country],
    );
    n += 1;
  }
  return n;
}

export async function runSyncTick(force = false): Promise<SyncTickResult> {
  await ensureCatalogSeeded();
  const sql = await getSql();
  await seedAirportsFromLounges();

  const metaRows = await sql<MetaRow>`
    select last_tick_at, cursor_code, discover_letter from sync_meta where id = 1
  `;
  const meta = metaRows[0];
  const last = asIso(meta?.last_tick_at);
  if (!force && last) {
    const age = Date.now() - new Date(last).getTime();
    if (Number.isFinite(age) && age < TICK_GAP_MS) {
      return {
        ok: true,
        skipped: true,
        reason: "cooldown",
        airports: 0,
        lounges: 0,
        cursor: meta?.cursor_code ?? null,
        discovered: 0,
      };
    }
  }

  try {
    const letter = meta?.discover_letter;
    if (letter && LETTERS.includes(letter)) {
      const idx0 = LETTERS.indexOf(letter);
      let discovered = 0;
      let nextLetter: string | null = letter;
      for (let i = 0; i < 4 && nextLetter; i += 1) {
        discovered += await discoverLetter(nextLetter);
        const idx = LETTERS.indexOf(nextLetter);
        nextLetter = idx >= 0 && idx < LETTERS.length - 1 ? LETTERS[idx + 1] : null;
      }
      const count = await sql<{ n: number }>`select count(*)::int as n from lounges`;
      await sql.query(
        `update sync_meta set last_tick_at = now(), last_error = null,
           last_batch_count = $1, discover_letter = $2, lounge_count = $3
         where id = 1`,
        [discovered, nextLetter, count[0]?.n ?? 0],
      );
      return {
        ok: true,
        airports: 0,
        lounges: 0,
        cursor: meta?.cursor_code ?? null,
        discovered,
      };
    }

    const codes = await nextAirports(meta?.cursor_code ?? null);
    let loungeCount = 0;
    for (const code of codes) {
      const lounges = await fetchAirportLounges(code);
      await upsertLounges(lounges);
      loungeCount += lounges.length;
      await sql.query(`update airports set last_synced_at = now() where code = $1`, [code]);
    }
    const newCursor = codes.length ? codes[codes.length - 1] : meta?.cursor_code ?? null;
    const jumped =
      Boolean(meta?.cursor_code) &&
      codes.length > 0 &&
      codes[0] < (meta?.cursor_code || "");

    const total = await sql<{ n: number }>`select count(*)::int as n from lounges`;
    await sql.query(
      `update sync_meta set
         last_tick_at = now(),
         cursor_code = $1,
         last_error = null,
         last_batch_count = $2,
         lounge_count = $3,
         exported_at = case when $4 then now() else exported_at end,
         last_full_at = case when $4 then now() else last_full_at end,
         discover_letter = case when $4 then 'a' else discover_letter end
       where id = 1`,
      [newCursor, loungeCount, total[0]?.n ?? 0, jumped],
    );
    return {
      ok: true,
      airports: codes.length,
      lounges: loungeCount,
      cursor: newCursor,
      discovered: 0,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await sql.query(`update sync_meta set last_tick_at = now(), last_error = $1 where id = 1`, [
      msg.slice(0, 400),
    ]);
    return {
      ok: false,
      reason: msg,
      airports: 0,
      lounges: 0,
      cursor: meta?.cursor_code ?? null,
      discovered: 0,
    };
  }
}

const g = globalThis as typeof globalThis & {
  __loungeSyncLoop__?: ReturnType<typeof setInterval>;
  __loungeSyncKick__?: Promise<void>;
};

export function kickSyncIfDue() {
  if (g.__loungeSyncKick__) return;
  g.__loungeSyncKick__ = runSyncTick(false)
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      g.__loungeSyncKick__ = undefined;
    });
}

export function startSyncLoop() {
  if (process.env.VERCEL) return;
  if (g.__loungeSyncLoop__) return;
  g.__loungeSyncLoop__ = setInterval(() => {
    kickSyncIfDue();
  }, TICK_GAP_MS);
  kickSyncIfDue();
}
