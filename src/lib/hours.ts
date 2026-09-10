const WEEKDAY: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  weds: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DAY_RE =
  /\b(sun(day)?|mon(day)?|tue(s|sday)?|wed(s|nesday)?|thur(s|sday)?|thu|fri(day)?|sat(urday)?)\b/g;

export const WEEKDAY_VI = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
];

export function parseHm(value: string): number | null {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec((value || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59) return null;
  return h * 60 + min;
}

export function weekdayFromIso(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay();
}

function dayToken(token: string): number | null {
  const k = token.toLowerCase().replace(/\.$/, "");
  return WEEKDAY[k] ?? WEEKDAY[k.replace(/s$/, "")] ?? null;
}

function daysIn(text: string): number[] {
  const set = new Set<number>();
  DAY_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = DAY_RE.exec(text))) {
    const d = dayToken(m[0]);
    if (d != null) set.add(d);
  }
  return [...set];
}

function spanDays(from: number, to: number): number[] {
  const out: number[] = [];
  let cur = from;
  for (let i = 0; i < 7; i += 1) {
    out.push(cur);
    if (cur === to) break;
    cur = (cur + 1) % 7;
  }
  return out;
}

type DayKind = { set: number[]; kind: "daily" | "days"; closed?: number[] };

function parseDayClause(clause: string): DayKind | null {
  const t = clause.toLowerCase();
  const except = t.match(/\bexcept\b(.*)$/);
  if (except) {
    const closed = daysIn(except[1]);
    if (closed.length) {
      return { set: ALL_DAYS.filter((d) => !closed.includes(d)), kind: "days", closed };
    }
  }
  if (/\b(daily|every\s?day|everyday|all\s?week|7\s?days?(\s?a\s?week)?)\b/.test(t)) {
    return { set: ALL_DAYS, kind: "daily" };
  }
  if (/\bweek\s?days?\b/.test(t)) return { set: [1, 2, 3, 4, 5], kind: "days" };
  if (/\bweek\s?ends?\b/.test(t)) return { set: [0, 6], kind: "days" };
  const range = t.match(
    /\b([a-z]{3,9})\.?\s*(?:-|to|through|thru|till|until)\s*([a-z]{3,9})\b/,
  );
  if (range) {
    const a = dayToken(range[1]);
    const b = dayToken(range[2]);
    if (a != null && b != null) return { set: spanDays(a, b), kind: "days" };
  }
  const listed = daysIn(t);
  return listed.length ? { set: listed, kind: "days" } : null;
}

type Window = { open: number; close: number };

function parseTimeWindows(clause: string): Window[] | null {
  const t = clause.toLowerCase();
  if (/\b24\s*(hours?|hrs?)\b|24\/7|round the clock|open all day|all day/.test(t)) {
    return [{ open: 0, close: 1440 }];
  }
  const times: number[] = [];
  const re = /(\d{1,2})[:.](\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 24 || min > 59) continue;
    times.push(h * 60 + min);
  }
  const lastFlight =
    /last\s*(flight|departure)|till\s*late|until\s*late|onwards?|till\s*last|until\s*last/.test(
      t,
    );
  if (times.length === 0) {
    if (/\bclosed\b/.test(t)) return [];
    if (/first flight|before first/.test(t)) return [{ open: 0, close: 1440 }];
    return null;
  }
  const windows: Window[] = [];
  for (let i = 0; i + 1 < times.length; i += 2) {
    let close = times[i + 1];
    if (close === 0) close = 1440;
    if (lastFlight) close = 1440;
    windows.push({ open: times[i], close });
  }
  if (windows.length === 0 && times.length === 1) {
    windows.push({ open: times[0], close: lastFlight ? 1440 : times[0] + 12 * 60 });
  }
  return windows;
}

function splitClauses(raw: string): string[] {
  const parts = raw
    .split(/[;\n]|•|\bthen\b/i)
    .map((p) => p.replace(/\b(note|please note|nb|cardholders?|please|we advise)\b.*$/i, "").trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    if (p.includes(",")) {
      const bits = p.split(",").map((x) => x.trim()).filter(Boolean);
      if (bits.length > 1 && bits.every((b) => parseDayClause(b) || parseTimeWindows(b))) {
        out.push(...bits);
        continue;
      }
    }
    out.push(p);
  }
  return out;
}

function inWindows(windows: Window[], minutes: number): boolean {
  for (const w of windows) {
    if (w.close <= w.open) {
      if (minutes >= w.open || minutes < w.close) return true;
    } else if (minutes >= w.open && minutes < w.close) return true;
  }
  return false;
}

export function holidayNote(hours: string): string | null {
  if (/public holiday|bank holiday|\bholidays?\b/i.test(hours || "")) {
    return "chuỗi có nhắc ngày lễ — không tự kiểm tra được ngày lễ";
  }
  return null;
}

/**
 * true = open, false = closed, null = unknown (keep in results).
 */
export function matchesHours(
  hours: string | null | undefined,
  weekday: number | null,
  minutes: number | null,
): boolean | null {
  const raw = (hours || "").toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  if (!raw) return null;

  const days: Record<number, Window[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };
  const known = new Set<number>();
  const unknown = new Set<number>();
  ALL_DAYS.forEach((d) => unknown.add(d));

  const clauses = splitClauses(raw);
  let dailyWindows: Window[] | null = null;
  for (const c of clauses) {
    const dk = parseDayClause(c);
    if (dk?.kind === "daily") {
      const tw = parseTimeWindows(c);
      if (tw && tw.length) dailyWindows = tw;
    }
  }
  if (dailyWindows) {
    for (const d of ALL_DAYS) {
      days[d] = dailyWindows.map((w) => ({ ...w }));
      known.add(d);
      unknown.delete(d);
    }
  }

  for (const c of clauses) {
    const dk = parseDayClause(c);
    const tw = parseTimeWindows(c);
    if (dk && tw) {
      for (const d of dk.set) {
        days[d] = [...days[d], ...tw];
        known.add(d);
        unknown.delete(d);
      }
    } else if (dk && !tw) {
      for (const d of dk.set) {
        known.add(d);
        unknown.delete(d);
      }
    } else if (tw) {
      for (const d of ALL_DAYS) {
        days[d] = [...days[d], ...tw];
        known.add(d);
        unknown.delete(d);
      }
    }
  }

  if (weekday == null) {
    const all: Window[] = [];
    for (const d of ALL_DAYS) all.push(...days[d]);
    if (all.length === 0) return null;
    if (minutes == null) return true;
    return inWindows(all, minutes);
  }
  if (unknown.has(weekday) && days[weekday].length === 0) return null;
  const wins = days[weekday];
  if (!wins || wins.length === 0) return false;
  if (minutes == null) return true;
  return inWindows(wins, minutes);
}

export function zoneOf(location: string): "domestic" | "international" | "both" | null {
  const t = location || "";
  const intl = /\b(international|int'?l)\b/i.test(t);
  const dom = /\bdomestic\b/i.test(t);
  if (intl && dom) return "both";
  if (intl) return "international";
  if (dom) return "domestic";
  return null;
}
