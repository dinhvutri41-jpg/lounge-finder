import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  MapPin,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DisclaimerModal } from "@/components/lounge/disclaimer";
import { FacilityList } from "@/components/lounge/facilities";
import { DatePicker, SelectPicker, TimePicker } from "@/components/lounge/pickers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { fieldOf, formatStamp, originalUrl } from "@/lib/format";
import { WEEKDAY_VI } from "@/lib/hours";
import {
  getAirport,
  getCatalogMeta,
  getLounge,
  searchAirports,
  searchLounges,
  tickCatalogSync,
} from "@/lib/lounges.functions";
import type { Airport, LoungeCard, SearchCriteria } from "@/lib/lounge-types";

type Lang = "vi" | "en";

function LangToggle({ value, onChange }: { value: Lang; onChange: (v: Lang) => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded-sm ring-1 ring-border text-sm">
      {(["en", "vi"] as const).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cn(
            "px-3 py-2 uppercase",
            value === k ? "bg-primary text-surface" : "bg-surface text-muted hover:bg-primary-soft",
          )}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

function ZoneToggle({
  value,
  onChange,
}: {
  value: "" | "domestic" | "international";
  onChange: (v: "" | "domestic" | "international") => void;
}) {
  const items: Array<["" | "domestic" | "international", string]> = [
    ["", "Tất cả"],
    ["domestic", "Nội địa"],
    ["international", "Quốc tế"],
  ];
  return (
    <div className="inline-flex overflow-hidden rounded-sm ring-1 ring-border text-sm">
      {items.map(([k, label]) => (
        <button
          key={k || "all"}
          type="button"
          onClick={() => onChange(k)}
          className={cn(
            "px-3 py-2",
            value === k ? "bg-primary text-surface" : "bg-surface text-muted hover:bg-primary-soft",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SearchForm({
  initial,
  onSearch,
}: {
  initial: SearchCriteria | null;
  onSearch: (c: SearchCriteria) => void;
}) {
  const [code, setCode] = useState(initial?.airportCode ?? "");
  const [date, setDate] = useState(initial?.flightDate ?? "");
  const [time, setTime] = useState(initial?.flightTime ?? "");
  const [terminal, setTerminal] = useState(initial?.terminal ?? "");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [picker, setPicker] = useState<null | "date" | "time" | "terminal">(null);

  const airports = useQuery({
    queryKey: ["airports", q],
    queryFn: () => searchAirports({ data: { q } }),
    enabled: open,
  });

  const airportInfo = useQuery({
    queryKey: ["airport", code],
    queryFn: () => getAirport({ data: { code } }),
    enabled: !!code,
  });

  const selected = airportInfo.data?.airport ?? null;
  const terminals = airportInfo.data?.terminals ?? [];

  function pick(a: Airport) {
    setCode(a.code);
    setTerminal("");
    setQ("");
    setOpen(false);
    setPicker(null);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-center text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
        Tra cứu phòng chờ sân bay
      </h1>
      <p className="mt-2 mb-8 text-center text-sm text-muted">
        Chọn sân bay, ngày bay, giờ bay và terminal để tìm kiếm phòng chờ phù hợp
      </p>
      <div className="space-y-5 rounded-xl bg-surface p-5 shadow-card ring-1 ring-border sm:p-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Sân bay</label>
          {selected ? (
            <div className="flex items-center justify-between gap-2 rounded-md bg-primary-soft px-4 py-3 ring-1 ring-border">
              <span className="font-medium">
                {selected.name}{" "}
                <span className="text-muted">({selected.code})</span>
              </span>
              <button
                type="button"
                className="shrink-0 text-sm text-primary-mid hover:text-fg"
                onClick={() => {
                  setCode("");
                  setTerminal("");
                  setOpen(true);
                }}
              >
                Đổi
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-2 rounded-md bg-surface px-4 py-3 ring-1 ring-border focus-within:ring-2 focus-within:ring-primary-mid">
                <Search className="size-5 shrink-0 text-primary-mid" />
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setOpen(true);
                    setPicker(null);
                  }}
                  onFocus={() => {
                    setOpen(true);
                    setPicker(null);
                  }}
                  placeholder="Nhập tên quốc gia hoặc sân bay..."
                  className="min-h-6 flex-1 bg-transparent outline-none placeholder:text-subtle"
                  suppressHydrationWarning
                />
              </div>
              {open && (airports.data?.length ?? 0) > 0 && (
                <ul className="absolute z-10 mt-2 w-full overflow-hidden rounded-md bg-surface shadow-card ring-1 ring-border">
                  {airports.data!.map((a) => (
                    <li key={a.code}>
                      <button
                        type="button"
                        onClick={() => pick(a)}
                        className="w-full px-4 py-3 text-left hover:bg-primary-soft"
                      >
                        <span className="font-medium">
                          {a.name} ({a.code})
                        </span>
                        <span className="text-muted"> — {a.country || "—"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {open && q && airports.data && airports.data.length === 0 && (
                <div className="absolute z-10 mt-2 w-full rounded-md bg-surface px-4 py-3 text-muted shadow-card ring-1 ring-border">
                  Không tìm thấy sân bay phù hợp.
                </div>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">
              Ngày bay
              <span className="block font-normal text-subtle">(để trống = không lọc theo ngày)</span>
            </label>
            <DatePicker
              value={date}
              open={picker === "date"}
              onOpen={() => setPicker(picker === "date" ? null : "date")}
              onClose={() => setPicker(null)}
              onChange={setDate}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-muted">
              Giờ bay
              <span className="block font-normal text-subtle">(để trống = không lọc theo giờ)</span>
            </label>
            <TimePicker
              value={time}
              open={picker === "time"}
              onOpen={() => setPicker(picker === "time" ? null : "time")}
              onClose={() => setPicker(null)}
              onChange={setTime}
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted">Terminal</label>
          <SelectPicker
            value={terminal}
            disabled={!code}
            open={picker === "terminal"}
            onOpen={() => code && setPicker(picker === "terminal" ? null : "terminal")}
            onClose={() => setPicker(null)}
            onChange={setTerminal}
            placeholder={code ? "Tất cả terminal" : "Chọn sân bay trước"}
            emptyHint="Sân bay này không có terminal riêng"
            options={[
              { value: "", label: "Tất cả terminal" },
              ...terminals.map((t) => ({ value: t, label: t })),
            ]}
          />
        </div>
        <Button
          className="w-full"
          disabled={!code}
          onClick={() =>
            onSearch({
              airportCode: code,
              flightDate: date,
              flightTime: time,
              terminal,
            })
          }
        >
          Tìm kiếm
        </Button>
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return (s || "")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">");
}

function SummaryDialog({
  open,
  onClose,
  lounges,
}: {
  open: boolean;
  onClose: () => void;
  lounges: LoungeCard[];
}) {
  const [lang, setLang] = useState<Lang>("vi");
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => {
    const vi = lang === "vi";
    const labels = vi
      ? {
          hours: "Giờ hoạt động:",
          location: "Vị trí:",
          conditions: "Điều kiện sử dụng:",
        }
      : {
          hours: "Opening Hours:",
          location: "Location:",
          conditions: "Conditions:",
        };
    return lounges
      .map((e, i) => {
        const bits: string[] = [];
        bits.push(`<strong>${i + 1}. ${escapeHtml(e.name || e.lounge_code)}</strong>`);
        const loc = `${e.airport_name || e.airport_code}${e.airport_code ? ` (${e.airport_code})` : ""}`;
        bits.push(escapeHtml(e.terminal ? `${loc}, ${e.terminal}` : loc));
        const hours = fieldOf(e, "opening_hours", vi);
        if (hours) bits.push(`<strong>${labels.hours}</strong>`, escapeHtml(hours));
        const location = fieldOf(e, "location", vi);
        if (location) bits.push(`<strong>${labels.location}</strong>`, escapeHtml(location));
        const conditions = fieldOf(e, "conditions", vi);
        if (conditions) bits.push(`<strong>${labels.conditions}</strong>`, escapeHtml(conditions));
        return bits.join("<br>");
      })
      .join("<br><br>");
  }, [lang, lounges]);

  async function copy() {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    const text = tmp.innerText;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.alert("Không sao chép tự động được — bôi đen nội dung rồi Ctrl/Cmd + C.");
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-fg/40" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-md bg-surface shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="font-semibold text-fg">Tổng hợp thông tin ({lounges.length})</h2>
          <div className="flex items-center gap-2">
            <LangToggle value={lang} onChange={setLang} />
            <button
              type="button"
              className="rounded-full p-1.5 text-muted hover:bg-bg"
              onClick={onClose}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div
          className="min-h-[300px] flex-1 overflow-y-auto px-5 py-4 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-3">
          {copied && <span className="text-sm text-ok">Đã sao chép</span>}
          <Button size="sm" onClick={copy}>
            <Copy className="size-4" />
            Sao chép
          </Button>
        </div>
      </div>
    </div>
  );
}

function Results({
  criteria,
  onBack,
  onOpen,
}: {
  criteria: SearchCriteria;
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  const [zone, setZone] = useState<"" | "domestic" | "international">("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState(false);
  const [lang, setLang] = useState<Lang>("vi");

  const airportQ = useQuery({
    queryKey: ["airport", criteria.airportCode],
    queryFn: () => getAirport({ data: { code: criteria.airportCode } }),
  });
  const listQ = useQuery({
    queryKey: ["lounges", criteria],
    queryFn: () =>
      searchLounges({
        data: {
          airportCode: criteria.airportCode,
          flightDate: criteria.flightDate,
          flightTime: criteria.flightTime,
          terminal: criteria.terminal,
        },
      }),
  });

  useEffect(() => {
    setPicked(new Set());
    setZone("");
  }, [criteria]);

  const weekday = (() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(criteria.flightDate || "");
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay();
  })();

  const all = listQ.data ?? [];
  const filtered = zone
    ? all.filter((a) => {
        if (zone === "domestic" && a.zone === "international") return false;
        if (zone === "international" && a.zone === "domestic") return false;
        return true;
      })
    : all;
  const selectedLounges =
    picked.size === 0 ? filtered : filtered.filter((a) => picked.has(a.id));
  const partial = picked.size > 0 && picked.size < filtered.length;

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const airport = airportQ.data?.airport;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 text-sm text-primary-mid hover:text-fg"
      >
        ← Tìm kiếm khác
      </button>
      <h2 className="text-xl font-semibold text-fg">
        {airport?.name || "Sân bay"}{" "}
        <span className="text-subtle">({airport?.code || criteria.airportCode})</span>
      </h2>
      <p className="mt-1 text-sm text-muted">
        {criteria.terminal || "Tất cả terminal"}
        {weekday != null ? ` · ${WEEKDAY_VI[weekday]}` : ""}
        {criteria.flightTime ? ` · ${criteria.flightTime}` : ""}
        {" · "}
        {filtered.length} phòng chờ
      </p>
      {all.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <ZoneToggle value={zone} onChange={setZone} />
          <LangToggle value={lang} onChange={setLang} />
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => setSummary(true)}
          >
            {partial ? `Tổng hợp thông tin (${picked.size})` : "Tổng hợp thông tin"}
          </Button>
        </div>
      )}
      {listQ.isLoading && <p className="mt-8 text-muted">Đang tải dữ liệu…</p>}
      {!listQ.isLoading && filtered.length === 0 && (
        <p className="mt-8 text-muted">
          {all.length > 0
            ? `Không có phòng chờ nào ở khu ${zone === "domestic" ? "nội địa" : "quốc tế"}. Chọn "Tất cả" để xem lại.`
            : "Không tìm thấy phòng chờ nào phù hợp. Thử đổi ngày / giờ bay / terminal."}
        </p>
      )}
      <div className="mt-6 space-y-4">
        {filtered.map((lounge) => {
          const hours = fieldOf(lounge, "opening_hours", lang === "vi");
          const location = fieldOf(lounge, "location", lang === "vi");
          const thumb = lounge.images[0] || lounge.image_pdf_src;
          const href = originalUrl(lounge);
          return (
            <div
              key={lounge.id}
              onClick={() => onOpen(lounge.id)}
              className="flex cursor-pointer items-start gap-3 rounded-md bg-surface p-4 shadow-sm ring-1 ring-border hover:ring-primary-mid"
            >
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-primary"
                checked={picked.has(lounge.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggle(lounge.id)}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{lounge.name || lounge.lounge_code}</p>
                {hours && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-sm leading-snug text-muted">
                    <Clock className="mt-0.5 size-4 shrink-0" />
                    <span className="whitespace-pre-line">{hours}</span>
                  </p>
                )}
                {location && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-sm leading-snug text-muted">
                    <MapPin className="mt-0.5 size-4 shrink-0" />
                    <span className="whitespace-pre-line text-justify">{location}</span>
                  </p>
                )}
                {lounge.holiday_note && (
                  <p className="mt-1 text-xs text-warn">{lounge.holiday_note}</p>
                )}
              </div>
              <div className="flex w-36 shrink-0 flex-col items-end gap-1.5 text-right">
                <span className="text-xs text-subtle">
                  {formatStamp(lounge.checked_at || lounge.updated_at)}
                </span>
                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-primary-mid underline hover:text-fg"
                  >
                    Xem link gốc
                  </a>
                )}
                {lounge.terminal && (
                  <span className="text-sm font-bold leading-snug">{lounge.terminal}</span>
                )}
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="mt-auto h-16 w-16 rounded-sm object-cover"
                  />
                ) : (
                  <div className="mt-auto h-16 w-16 rounded-sm bg-bg" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <SummaryDialog
        open={summary}
        onClose={() => setSummary(false)}
        lounges={selectedLounges}
      />
    </div>
  );
}

function Detail({ id, onBack }: { id: string; onBack: () => void }) {
  const [lang, setLang] = useState<Lang>("vi");
  const [idx, setIdx] = useState(0);
  const q = useQuery({
    queryKey: ["lounge", id],
    queryFn: () => getLounge({ data: { id } }),
  });
  const lounge = q.data;
  const images = lounge?.images ?? [];
  useEffect(() => setIdx(0), [id]);

  if (q.isLoading || !lounge) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <button type="button" onClick={onBack} className="mb-4 text-sm text-primary-mid">
          ← Quay lại
        </button>
        <p className="text-muted">Đang tải dữ liệu…</p>
      </div>
    );
  }

  const href = originalUrl(lounge);
  const hours = fieldOf(lounge, "opening_hours", lang === "vi");
  const location = fieldOf(lounge, "location", lang === "vi");
  const conditions = fieldOf(lounge, "conditions", lang === "vi");
  const extra = fieldOf(lounge, "additional_info", lang === "vi");
  const stamp = lounge.checked_at
    ? `Đối chiếu web lần cuối: ${formatStamp(lounge.checked_at)}`
    : lounge.updated_at
      ? `Cập nhật lần cuối: ${formatStamp(lounge.updated_at)}`
      : "";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button type="button" onClick={onBack} className="mb-4 text-sm text-primary-mid hover:text-fg">
        ← Quay lại
      </button>
      <div className="overflow-hidden rounded-lg bg-surface shadow-card ring-1 ring-border">
        {images.length > 0 && (
          <div className="relative bg-fg">
            <img src={images[idx]} alt="" className="h-64 w-full object-cover sm:h-80" />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Ảnh trước"
                  className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-surface/90 p-2"
                  onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label="Ảnh sau"
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-surface/90 p-2"
                  onClick={() => setIdx((i) => (i + 1) % images.length)}
                >
                  <ChevronRight className="size-5" />
                </button>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Ảnh ${i + 1}`}
                      onClick={() => setIdx(i)}
                      className={cn(
                        "size-2 rounded-full",
                        i === idx ? "bg-surface" : "bg-surface/50",
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        <div className="space-y-5 p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{lounge.name}</h2>
              <p className="mt-1 text-sm text-muted">
                {lounge.airport_name} ({lounge.airport_code})
                {lounge.terminal ? ` · ${lounge.terminal}` : ""}
              </p>
              {stamp && <p className="mt-1 text-xs text-subtle">{stamp}</p>}
            </div>
            <div className="flex items-center gap-2">
              <LangToggle value={lang} onChange={setLang} />
              {href && (
                <Button variant="outline" size="sm" asChild>
                  <a href={href} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" />
                    Xem link gốc
                  </a>
                </Button>
              )}
            </div>
          </div>
          {hours && (
            <section>
              <h3 className="mb-1 text-sm font-semibold">Giờ mở cửa</h3>
              <p className="whitespace-pre-line text-sm text-muted">{hours}</p>
            </section>
          )}
          {location && (
            <section>
              <h3 className="mb-1 text-sm font-semibold">Vị trí</h3>
              <p className="whitespace-pre-line text-justify text-sm text-muted">{location}</p>
            </section>
          )}
          {conditions && (
            <section>
              <h3 className="mb-1 text-sm font-semibold">Điều kiện sử dụng</h3>
              <p className="whitespace-pre-line text-justify text-sm text-muted">{conditions}</p>
            </section>
          )}
          {extra && (
            <section>
              <h3 className="mb-1 text-sm font-semibold">Thông tin thêm</h3>
              <p className="whitespace-pre-line text-sm text-muted">{extra}</p>
            </section>
          )}
          <section>
            <h3 className="mb-3 text-sm font-semibold">Tiện ích</h3>
            <FacilityList
              facilities={lounge.facilities}
              labels={lang === "vi" ? lounge.facilities_vi : lounge.facilities}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

export function FinderApp() {
  const [accepted, setAccepted] = useState(false);
  const [criteria, setCriteria] = useState<SearchCriteria | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const meta = useQuery({
    queryKey: ["meta"],
    queryFn: () => getCatalogMeta(),
    refetchInterval: 60_000,
  });

  const sync = useMutation({
    mutationFn: () => tickCatalogSync(),
    onSuccess: (data) => {
      meta.refetch();
      void data;
    },
  });

  useEffect(() => {
    try {
      setAccepted(localStorage.getItem("lf-disclaimer") === "1");
    } catch {
      setAccepted(false);
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem("lf-disclaimer", "1");
    } catch {
      /* ignore */
    }
    setAccepted(true);
  }

  const seeding = (meta.isLoading || meta.isFetching) && !meta.data;

  return (
    <div className="min-h-screen bg-bg text-fg">
      {seeding && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-bg">
          <div className="size-10 animate-spin rounded-full border-2 border-border border-t-primary" />
          <p className="mt-4 text-sm text-muted">Đang tải dữ liệu…</p>
        </div>
      )}
      <header className="relative z-10 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <button
            type="button"
            className="font-semibold text-fg"
            onClick={() => {
              setCriteria(null);
              setOpenId(null);
            }}
          >
            Lounge Finder
          </button>
          <div className="flex min-w-0 items-center gap-2">
            {(meta.data?.lastTickAt || meta.data?.exportedAt) && (
              <span className="hidden truncate text-xs text-subtle sm:inline">
                LoungeKey: {formatStamp(meta.data.lastTickAt || meta.data.exportedAt)}
                {meta.data.loungeCount ? ` · ${meta.data.loungeCount} phòng chờ` : ""}
              </span>
            )}
            <button
              type="button"
              title="Đồng bộ LoungeKey"
              disabled={sync.isPending}
              onClick={() => sync.mutate()}
              className="rounded-full p-2 text-primary-mid hover:bg-primary-soft disabled:opacity-50"
            >
              <RefreshCw className={cn("size-4", sync.isPending && "animate-spin")} />
            </button>
          </div>
        </div>
      </header>
      {openId ? (
        <Detail id={openId} onBack={() => setOpenId(null)} />
      ) : !criteria ? (
        <SearchForm initial={criteria} onSearch={setCriteria} />
      ) : (
        <Results
          criteria={criteria}
          onBack={() => {
            setCriteria(null);
            setOpenId(null);
          }}
          onOpen={setOpenId}
        />
      )}
      <DisclaimerModal open={!accepted} onAccept={accept} />
    </div>
  );
}
