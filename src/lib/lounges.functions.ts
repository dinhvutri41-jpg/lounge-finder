import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { fold } from "@/lib/fold";
import { holidayNote, matchesHours, parseHm, weekdayFromIso, zoneOf } from "@/lib/hours";
import { ensureCatalogSeeded } from "@/lib/seed.server";
import { kickSyncIfDue, runSyncTick, startSyncLoop } from "@/lib/sync.server";
import type { Airport, CatalogMeta, Lounge, LoungeCard } from "@/lib/lounge-types";

function parseJsonList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((x) => typeof x === "string");
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  }
  return [];
}

function isoOrNull(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

type LoungeRow = Record<string, unknown>;

function mapLounge(row: LoungeRow): Lounge {
  return {
    id: String(row.id ?? ""),
    airport_code: String(row.airport_code ?? ""),
    lounge_code: String(row.lounge_code ?? ""),
    name: String(row.name ?? ""),
    country: String(row.country ?? ""),
    airport_name: String(row.airport_name ?? ""),
    terminal: String(row.terminal ?? ""),
    location: String(row.location ?? ""),
    location_vi: String(row.location_vi ?? ""),
    opening_hours: String(row.opening_hours ?? ""),
    opening_hours_vi: String(row.opening_hours_vi ?? ""),
    conditions: String(row.conditions ?? ""),
    conditions_vi: String(row.conditions_vi ?? ""),
    additional_info: String(row.additional_info ?? ""),
    additional_info_vi: String(row.additional_info_vi ?? ""),
    facilities: parseJsonList(row.facilities),
    facilities_vi: parseJsonList(row.facilities_vi),
    images: parseJsonList(row.images),
    source_url: String(row.source_url ?? ""),
    image_pdf_src: String(row.image_pdf_src ?? ""),
    updated_at: isoOrNull(row.updated_at),
    checked_at: isoOrNull(row.checked_at),
  };
}

function decorate(lounge: Lounge): LoungeCard {
  return {
    ...lounge,
    zone: zoneOf(lounge.location),
    holiday_note: holidayNote(lounge.opening_hours),
  };
}

export const getCatalogMeta = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogMeta> => {
    await ensureCatalogSeeded();
    startSyncLoop();
    kickSyncIfDue();
    const sql = await getSql();
    const meta = await sql<{
      exported_at: string | null;
      lounge_count: number;
      last_tick_at: string | null;
      last_error: string | null;
      last_batch_count: number;
      cursor_code: string | null;
    }>`
      select exported_at, lounge_count, last_tick_at, last_error, last_batch_count, cursor_code
      from sync_meta where id = 1
    `;
    const airports = await sql<{ n: number }>`
      select count(distinct airport_code)::int as n from lounges
    `;
    const row = meta[0];
    return {
      exportedAt: isoOrNull(row?.exported_at),
      loungeCount: row?.lounge_count ?? 0,
      airportCount: airports[0]?.n ?? 0,
      lastTickAt: isoOrNull(row?.last_tick_at),
      lastError: row?.last_error ?? null,
      lastBatchCount: row?.last_batch_count ?? 0,
      cursor: row?.cursor_code ?? null,
    };
  },
);

export const tickCatalogSync = createServerFn({ method: "POST" }).handler(
  async (): Promise<CatalogMeta> => {
    await runSyncTick(true);
    const sql = await getSql();
    const meta = await sql<{
      exported_at: string | null;
      lounge_count: number;
      last_tick_at: string | null;
      last_error: string | null;
      last_batch_count: number;
      cursor_code: string | null;
    }>`
      select exported_at, lounge_count, last_tick_at, last_error, last_batch_count, cursor_code
      from sync_meta where id = 1
    `;
    const airports = await sql<{ n: number }>`
      select count(distinct airport_code)::int as n from lounges
    `;
    const row = meta[0];
    return {
      exportedAt: isoOrNull(row?.exported_at),
      loungeCount: row?.lounge_count ?? 0,
      airportCount: airports[0]?.n ?? 0,
      lastTickAt: isoOrNull(row?.last_tick_at),
      lastError: row?.last_error ?? null,
      lastBatchCount: row?.last_batch_count ?? 0,
      cursor: row?.cursor_code ?? null,
    };
  },
);

export const searchAirports = createServerFn({ method: "GET" })
  .validator(z.object({ q: z.string() }))
  .handler(async ({ data }): Promise<Airport[]> => {
    await ensureCatalogSeeded();
    const sql = await getSql();
    const rows = await sql<{
      airport_code: string;
      airport_name: string;
      country: string;
    }>`
      select distinct airport_code, airport_name, country
      from lounges
      order by airport_name, airport_code
    `;
    const needle = fold(data.q);
    const mapped: Airport[] = rows.map((r) => ({
      code: r.airport_code,
      name: r.airport_name || r.airport_code,
      country: r.country,
    }));
    if (!needle) return mapped.slice(0, 8);
    return mapped
      .filter(
        (a) =>
          fold(a.name).includes(needle) ||
          fold(a.code).includes(needle) ||
          fold(a.country).includes(needle),
      )
      .slice(0, 8);
  });

export const getAirport = createServerFn({ method: "GET" })
  .validator(z.object({ code: z.string() }))
  .handler(async ({ data }): Promise<{ airport: Airport | null; terminals: string[] }> => {
    await ensureCatalogSeeded();
    const sql = await getSql();
    const rows = await sql<LoungeRow>`
      select * from lounges where airport_code = ${data.code}
    `;
    if (!rows.length) return { airport: null, terminals: [] };
    const first = mapLounge(rows[0]);
    const terminals = [
      ...new Set(rows.map((r) => String(r.terminal || "")).filter(Boolean)),
    ].sort();
    return {
      airport: {
        code: first.airport_code,
        name: first.airport_name || first.airport_code,
        country: first.country,
      },
      terminals,
    };
  });

export const searchLounges = createServerFn({ method: "GET" })
  .validator(
    z.object({
      airportCode: z.string(),
      flightDate: z.string().optional(),
      flightTime: z.string().optional(),
      terminal: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<LoungeCard[]> => {
    await ensureCatalogSeeded();
    const sql = await getSql();
    const rows = await sql<LoungeRow>`
      select * from lounges where airport_code = ${data.airportCode}
      order by name
    `;
    const weekday = weekdayFromIso(data.flightDate || "");
    const minutes = parseHm(data.flightTime || "");
    const terminal = (data.terminal || "").trim();
    return rows
      .map(mapLounge)
      .filter((lounge) => {
        if (terminal && lounge.terminal !== terminal) return false;
        if (weekday == null && minutes == null) return true;
        return matchesHours(lounge.opening_hours, weekday, minutes) !== false;
      })
      .map(decorate);
  });

export const getLounge = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }): Promise<LoungeCard | null> => {
    await ensureCatalogSeeded();
    const sql = await getSql();
    const rows = await sql<LoungeRow>`select * from lounges where id = ${data.id} limit 1`;
    if (!rows[0]) return null;
    return decorate(mapLounge(rows[0]));
  });
