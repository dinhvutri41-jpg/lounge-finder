import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const spreadsheetId = "1T6z_IMxZcOdkYGFserRTOa_8XQ-dEC46I2IwqJHOJGk";

const complaintSheets = [
  { name: "T1-5/2026", gid: "201431387" },
  { name: "T6/2026", gid: "1984496612" },
  { name: "T7/2026", gid: "800040619" },
  { name: "T8/2026", gid: "656949867" },
  { name: "T9/2026", gid: "825423510" },
] as const;

type ComplaintRecord = {
  id: string;
  source: string;
  project: string;
  receivedDate: string;
  month: string;
  customer: string;
  bookingCode: string;
  privilege: string;
  usageDate: string;
  provider: string;
  compensation: string;
  damage: string;
};

type ComplaintReport = {
  total: number;
  monthData: Array<{ month: string; label: string; complaints: number }>;
  projectData: Array<{ project: string; complaints: number }>;
  providerData: Array<{ provider: string; complaints: number }>;
  records: ComplaintRecord[];
  availableMonths: string[];
  availableProjects: string[];
  availableProviders: string[];
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"') {
      if (quoted && next === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (value || row.length) {
    row.push(value.trim());
    if (row.some(Boolean)) rows.push(row);
  }
  return rows;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function cell(row: string[], index: number): string {
  return index >= 0 ? row[index]?.trim() ?? "" : "";
}

function parseDate(value: string): string | null {
  const clean = value.trim();
  const dateMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const serial = Number(clean);
  if (Number.isFinite(serial) && serial > 30000) {
    const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    return date.toISOString().slice(0, 10);
  }
  return null;
}

function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-");
  return `T${Number(monthNumber)}/${year}`;
}

function headerIndex(headers: string[], terms: string[]): number {
  return headers.findIndex((header) => {
    const value = normalize(header);
    return terms.every((term) => value.includes(normalize(term)));
  });
}

async function fetchSheet(sheet: (typeof complaintSheets)[number]): Promise<ComplaintRecord[]> {
  const url = new URL(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export`);
  url.searchParams.set("format", "csv");
  url.searchParams.set("gid", sheet.gid);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Không thể đọc sheet ${sheet.name}: ${response.status}`);

  const rows = parseCsv((await response.text()).replace(/^\uFEFF/, ""));
  const headerRowIndex = rows.findIndex((row) =>
    row.some((value) => normalize(value).includes("ngay tiep nhan")),
  );
  if (headerRowIndex < 0) return [];

  const headers = rows[headerRowIndex];
  const dateIndex = headerIndex(headers, ["ngay tiep nhan"]);
  const projectIndex = headerIndex(headers, ["ten du an"]);
  const customerIndex = headerIndex(headers, ["thong tin khach hang"]);
  const bookingIndex = headerIndex(headers, ["ma booking"]);
  const privilegeIndex = headerIndex(headers, ["loai", "dac quyen"]);
  const usageIndex = headerIndex(headers, ["lich su dung"]);
  const providerIndex = headerIndex(headers, ["nha cung cap"]);
  const compensationIndex = headerIndex(headers, ["qua tang den bu"]);
  const damageIndex = headerIndex(headers, ["thiet hai"]);
  let currentProject = "Không xác định";

  return rows.slice(headerRowIndex + 1).flatMap((row, rowOffset) => {
    const projectMarker = cell(row, 0);
    if (projectMarker && normalize(projectMarker).startsWith("du an")) {
      currentProject = projectMarker.replace(/^Dự án\s*/i, "").trim() || currentProject;
    }

    const receivedDate = parseDate(cell(row, dateIndex));
    if (!receivedDate) return [];

    const project = cell(row, projectIndex) || currentProject;
    return [{
      id: `${sheet.gid}-${rowOffset}-${receivedDate}`,
      source: sheet.name,
      project,
      receivedDate,
      month: receivedDate.slice(0, 7),
      customer: cell(row, customerIndex),
      bookingCode: cell(row, bookingIndex),
      privilege: cell(row, privilegeIndex),
      usageDate: cell(row, usageIndex),
      provider: cell(row, providerIndex),
      compensation: cell(row, compensationIndex),
      damage: cell(row, damageIndex),
    }];
  });
}

function aggregate(records: ComplaintRecord[], filter: { fromMonth?: string; toMonth?: string; project?: string; provider?: string }): ComplaintReport {
  const filtered = records.filter((record) => {
    if (filter.fromMonth && record.month < filter.fromMonth) return false;
    if (filter.toMonth && record.month > filter.toMonth) return false;
    if (filter.project && record.project !== filter.project) return false;
    if (filter.provider && record.provider !== filter.provider) return false;
    return true;
  });

  const countBy = (key: "month" | "project" | "provider") => {
    const counts = new Map<string, number>();
    for (const record of filtered) {
      const value = record[key] || "Không xác định";
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([value, complaints]) => ({ value, complaints }))
      .sort((a, b) => b.complaints - a.complaints || a.value.localeCompare(b.value));
  };

  const months = countBy("month").sort((a, b) => a.value.localeCompare(b.value));
  const projects = countBy("project");
  const providers = countBy("provider");
  const allMonths = [...new Set(records.map((record) => record.month))].sort();
  const allProjects = [...new Set(records.map((record) => record.project).filter(Boolean))].sort();
  const allProviders = [...new Set(records.map((record) => record.provider).filter(Boolean))].sort();

  return {
    total: filtered.length,
    monthData: months.map(({ value, complaints }) => ({
      month: value,
      label: monthLabel(value),
      complaints,
    })),
    projectData: projects.map(({ value: project, complaints }) => ({ project, complaints })),
    providerData: providers.map(({ value: provider, complaints }) => ({ provider, complaints })),
    records: filtered,
    availableMonths: allMonths,
    availableProjects: allProjects,
    availableProviders: allProviders,
  };
}

export const getComplaintReport = createServerFn({ method: "GET" })
  .validator(
    z.object({
      fromMonth: z.string().optional(),
      toMonth: z.string().optional(),
      project: z.string().optional(),
      provider: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<ComplaintReport> => {
    const sheets = await Promise.all(complaintSheets.map(fetchSheet));
    const allRecords = sheets.flat();
    return aggregate(allRecords, data);
  });
