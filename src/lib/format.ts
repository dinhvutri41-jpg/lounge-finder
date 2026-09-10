export function formatStamp(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function originalUrl(lounge: {
  source_url?: string;
  airport_code?: string;
  lounge_code?: string;
}): string {
  if (lounge.source_url) return lounge.source_url;
  if (lounge.airport_code && lounge.lounge_code) {
    return `https://loungefinder.loungekey.com/en/linkcarevn/lounge-detail/?airportcode=${lounge.airport_code}&loungecode=${lounge.lounge_code}`;
  }
  return "";
}

export function fieldOf(
  row: Record<string, unknown>,
  key: string,
  vi: boolean,
): string {
  const localized = vi ? row[`${key}_vi`] : undefined;
  const fallback = row[key];
  const pick = (localized ?? fallback ?? "") as unknown;
  return typeof pick === "string" ? pick.trim() : "";
}

