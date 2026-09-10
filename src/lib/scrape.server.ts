const BASE = "https://loungefinder.loungekey.com";
const SOURCE = "LSAPLINKCAREV23";
const DETAIL = `${BASE}/en/linkcarevn/lounge-detail/`;

const FACILITY_MAP: Array<{ key: string; en: string; vi: string }> = [
  { key: "Tel", en: "Telephone", vi: "Điện thoại" },
  { key: "Refresh", en: "Refreshments", vi: "Đồ uống/ăn nhẹ" },
  { key: "Tv", en: "Television", vi: "Tivi" },
  { key: "Newsmag", en: "Newspapers", vi: "Báo/tạp chí" },
  { key: "Shower", en: "Showers", vi: "Phòng tắm" },
  { key: "Wifi", en: "Wi-Fi", vi: "Wi-Fi" },
  { key: "Internt", en: "Internet", vi: "Internet" },
  { key: "Alcohol", en: "Alcohol", vi: "Đồ uống có cồn" },
  { key: "Fltinfo", en: "Flight Information Monitor", vi: "Màn hình thông tin chuyến bay" },
  { key: "Aircon", en: "Air Conditioning", vi: "Máy lạnh" },
  { key: "Nosmoke", en: "No Smoking", vi: "Không hút thuốc" },
  { key: "Disable", en: "Disabled Access", vi: "Lối đi cho người khuyết tật" },
  { key: "Conf", en: "Conference", vi: "Phòng họp" },
];

export type ScrapedAirport = {
  code: string;
  name: string;
  country: string;
};

export type ScrapedLounge = {
  id: string;
  airport_code: string;
  lounge_code: string;
  name: string;
  country: string;
  airport_name: string;
  terminal: string;
  location: string;
  location_vi: string;
  opening_hours: string;
  opening_hours_vi: string;
  conditions: string;
  conditions_vi: string;
  additional_info: string;
  additional_info_vi: string;
  facilities: string[];
  facilities_vi: string[];
  images: string[];
  source_url: string;
  image_pdf_src: string;
};

type CountryHit = {
  Country?: string;
  Airports?: Array<{ AirportCode?: string; AirportName?: string }>;
};

type LoungeHit = {
  LoungeName?: string;
  LoungeCode?: string;
  AirportCode?: string;
  AirportName?: string;
  Country?: string;
  Terminal?: string;
  Location?: string;
  OpeningHours?: string;
  Conditions?: string;
  Additional?: string;
  Images?: Array<{ Url?: string }>;
  Facilities?: Record<string, boolean | null | undefined>;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function lkGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(path, BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "LoungeFinderCatalog/1.0",
      Referer: `${BASE}/en/linkcarevn/`,
    },
    body: "",
  });
  if (!res.ok) {
    throw new Error(`LoungeKey ${res.status} ${path}`);
  }
  return (await res.json()) as T;
}

export async function searchAirportsRemote(query: string): Promise<ScrapedAirport[]> {
  const rows = await lkGet<CountryHit[]>(
    "/umbraco/api/consumerloungeapi/airportloungesearch/",
    { sourceCode: SOURCE, searchText: query, languageCode: "en" },
  );
  const out: ScrapedAirport[] = [];
  for (const country of rows || []) {
    for (const a of country.Airports || []) {
      const code = (a.AirportCode || "").trim().toUpperCase();
      if (!code) continue;
      out.push({
        code,
        name: (a.AirportName || code).trim(),
        country: (country.Country || "").trim(),
      });
    }
  }
  return out;
}

function facilitiesOf(raw: Record<string, boolean | null | undefined> | undefined) {
  const en: string[] = [];
  const vi: string[] = [];
  if (!raw) return { en, vi };
  for (const f of FACILITY_MAP) {
    if (raw[f.key]) {
      en.push(f.en);
      vi.push(f.vi);
    }
  }
  return { en, vi };
}

function mapLounge(en: LoungeHit, vi: LoungeHit | undefined): ScrapedLounge | null {
  const airport = (en.AirportCode || "").trim().toUpperCase();
  const lounge = (en.LoungeCode || "").trim();
  if (!airport || !lounge) return null;
  const fac = facilitiesOf(en.Facilities);
  const images = (en.Images || [])
    .map((i) => i.Url || "")
    .filter((u) => /^https?:\/\//.test(u));
  return {
    id: `${airport}_${lounge}`,
    airport_code: airport,
    lounge_code: lounge,
    name: (en.LoungeName || lounge).trim(),
    country: (en.Country || "").trim(),
    airport_name: (en.AirportName || airport).trim(),
    terminal: (en.Terminal || "").trim(),
    location: (en.Location || "").trim(),
    location_vi: (vi?.Location || "").trim(),
    opening_hours: (en.OpeningHours || "").trim(),
    opening_hours_vi: (vi?.OpeningHours || "").trim(),
    conditions: (en.Conditions || "").trim(),
    conditions_vi: (vi?.Conditions || "").trim(),
    additional_info: (en.Additional || "").trim(),
    additional_info_vi: (vi?.Additional || "").trim(),
    facilities: fac.en,
    facilities_vi: fac.vi,
    images,
    source_url: `${DETAIL}?airportcode=${encodeURIComponent(airport)}&loungecode=${encodeURIComponent(lounge)}`,
    image_pdf_src: images[0] || "",
  };
}

export async function fetchAirportLounges(code: string): Promise<ScrapedLounge[]> {
  const q = { sourceCode: SOURCE, searchText: code, languageCode: "en" };
  const enRows = await lkGet<LoungeHit[]>(
    "/umbraco/api/consumerloungeapi/loungesearch/",
    q,
  );
  await sleep(180);
  let viRows: LoungeHit[] = [];
  try {
    viRows = await lkGet<LoungeHit[]>("/umbraco/api/consumerloungeapi/loungesearch/", {
      ...q,
      languageCode: "vi",
    });
  } catch {
    viRows = [];
  }
  const viByCode = new Map(
    viRows.map((r) => [(r.LoungeCode || "").trim(), r] as const),
  );
  const out: ScrapedLounge[] = [];
  for (const row of enRows || []) {
    if ((row.AirportCode || "").toUpperCase() !== code.toUpperCase()) continue;
    const mapped = mapLounge(row, viByCode.get((row.LoungeCode || "").trim()));
    if (mapped) out.push(mapped);
  }
  return out;
}
