import { getSql } from "@/lib/db";
import catalog from "@/data/lounges.json";

type SeedLounge = Record<string, unknown>;

function asText(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function asList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}

function loadSeedFile(): { exported_at: string | null; lounges: SeedLounge[] } {
  const raw = catalog as { exported_at?: string; lounges?: SeedLounge[] };
  return {
    exported_at: raw.exported_at ?? null,
    lounges: Array.isArray(raw.lounges) ? raw.lounges : [],
  };
}

export async function ensureCatalogSeeded(): Promise<void> {
  const sql = await getSql();
  const counts = await sql<{ n: number }>`select count(*)::int as n from lounges`;
  if ((counts[0]?.n ?? 0) > 0) return;

  const seed = loadSeedFile();
  if (!seed.lounges.length) {
    throw new Error("Không tìm thấy dữ liệu seed phòng chờ.");
  }

  const payload = seed.lounges.map((row) => ({
    id: asText(row.id) || `${asText(row.airport_code)}_${asText(row.lounge_code)}`,
    airport_code: asText(row.airport_code),
    lounge_code: asText(row.lounge_code),
    name: asText(row.name),
    country: asText(row.country),
    airport_name: asText(row.airport_name),
    terminal: asText(row.terminal),
    location: asText(row.location),
    location_vi: asText(row.location_vi),
    opening_hours: asText(row.opening_hours),
    opening_hours_vi: asText(row.opening_hours_vi),
    conditions: asText(row.conditions),
    conditions_vi: asText(row.conditions_vi),
    additional_info: asText(row.additional_info),
    additional_info_vi: asText(row.additional_info_vi),
    facilities: asList(row.facilities),
    facilities_vi: asList(row.facilities_vi),
    images: asList(row.images),
    source_url: asText(row.source_url),
    image_pdf_src: asText(row.image_pdf_src),
    updated_at: asText(row.updated_at) || null,
    checked_at: asText(row.checked_at) || null,
  }));

  await sql.query(
    `insert into lounges
     select * from json_populate_recordset(null::lounges, $1::json)
     on conflict (id) do nothing`,
    [JSON.stringify(payload)],
  );

  const after = await sql<{ n: number }>`select count(*)::int as n from lounges`;
  await sql.query(
    `insert into sync_meta (id, exported_at, seeded_at, lounge_count)
     values (1, $1, now(), $2)
     on conflict (id) do update set exported_at = excluded.exported_at,
       seeded_at = excluded.seeded_at, lounge_count = excluded.lounge_count`,
    [seed.exported_at, after[0]?.n ?? 0],
  );
}
