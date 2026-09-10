export type Lounge = {
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
  updated_at: string | null;
  checked_at: string | null;
};

export type Airport = {
  code: string;
  name: string;
  country: string;
};

export type LoungeCard = Lounge & {
  zone: "domestic" | "international" | "both" | null;
  holiday_note: string | null;
};

export type SearchCriteria = {
  airportCode: string;
  flightDate: string;
  flightTime: string;
  terminal: string;
};

export type CatalogMeta = {
  exportedAt: string | null;
  loungeCount: number;
  airportCount: number;
  lastTickAt: string | null;
  lastError: string | null;
  lastBatchCount: number;
  cursor: string | null;
};
