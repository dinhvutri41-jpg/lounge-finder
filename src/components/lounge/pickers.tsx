import { Building2, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { WEEKDAY_VI } from "@/lib/hours";

const MONTHS_VI = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function formatDateVi(iso: string): string {
  const d = parseIsoDate(iso);
  if (!d) return "";
  return `${WEEKDAY_VI[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatTimeVi(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  return `${pad(Number(m[1]))}:${m[2]}`;
}

export function useDismiss(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
}

export function FieldButton({
  icon,
  label,
  placeholder,
  open,
  disabled,
  onClick,
  onClear,
}: {
  icon?: ReactNode;
  label: string | null;
  placeholder: string;
  open?: boolean;
  disabled?: boolean;
  onClick: () => void;
  onClear?: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "flex min-h-12 w-full items-center gap-3 rounded-md bg-surface px-4 py-3 text-left ring-1 outline-none transition-colors duration-150",
          disabled
            ? "cursor-not-allowed bg-bg text-subtle ring-border"
            : open
              ? "ring-2 ring-primary-mid"
              : "ring-border hover:ring-primary-mid/50",
        )}
      >
        {icon && <span className="text-primary-mid">{icon}</span>}
        <span className={cn("min-w-0 flex-1 truncate", label ? "text-fg" : "text-subtle")}>
          {label || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-subtle transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>
      {label && onClear && !disabled && (
        <button
          type="button"
          aria-label="Xóa"
          className="absolute top-1/2 right-10 -translate-y-1/2 rounded-full p-1 text-subtle hover:bg-primary-soft hover:text-fg"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export function PickerPanel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "picker-pop absolute z-30 mt-2 overflow-hidden rounded-lg bg-surface shadow-card ring-1 ring-border",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DatePicker({
  value,
  open,
  onOpen,
  onClose,
  onChange,
}: {
  value: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChange: (iso: string) => void;
}) {
  const selected = parseIsoDate(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [cursor, setCursor] = useState(() => selected ?? today);
  const wrap = useDismiss(open, onClose);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date; inMonth: boolean }> = [];
  for (let i = 0; i < startWeekday; i += 1) {
    const d = new Date(year, month, i - startWeekday + 1);
    cells.push({ date: d, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const n = new Date(last);
    n.setDate(n.getDate() + 1);
    cells.push({ date: n, inMonth: false });
  }

  return (
    <div className="relative" ref={wrap}>
      <FieldButton
        icon={<CalendarDays className="size-5" />}
        label={value ? formatDateVi(value) : null}
        placeholder="Chọn ngày bay"
        open={open}
        onClick={onOpen}
        onClear={() => onChange("")}
      />
      {open && (
      <PickerPanel className="w-full min-w-[18rem] p-3">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            className="rounded-sm p-2 text-primary-mid hover:bg-primary-soft"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            aria-label="Tháng trước"
          >
            <ChevronLeft className="size-4" />
          </button>
          <p className="text-sm font-semibold">
            {MONTHS_VI[month]} {year}
          </p>
          <button
            type="button"
            className="rounded-sm p-2 text-primary-mid hover:bg-primary-soft"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            aria-label="Tháng sau"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-subtle">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map(({ date, inMonth }) => {
            const iso = isoFromDate(date);
            const isSel = value === iso;
            const isToday = isoFromDate(today) === iso;
            return (
              <button
                key={iso + String(inMonth)}
                type="button"
                onClick={() => {
                  onChange(iso);
                  onClose();
                }}
                className={cn(
                  "flex size-10 items-center justify-center rounded-sm text-sm transition-colors duration-150",
                  !inMonth && "text-subtle/70",
                  isSel && "bg-primary text-surface",
                  !isSel && isToday && "ring-1 ring-primary-mid",
                  !isSel && inMonth && "hover:bg-primary-soft",
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
          <button
            type="button"
            className="rounded-sm px-3 py-2 text-sm text-primary-mid hover:bg-primary-soft"
            onClick={() => {
              onChange(isoFromDate(today));
              onClose();
            }}
          >
            Hôm nay
          </button>
          <button
            type="button"
            className="rounded-sm px-3 py-2 text-sm text-muted hover:bg-primary-soft"
            onClick={() => {
              onChange("");
              onClose();
            }}
          >
            Không lọc ngày
          </button>
        </div>
      </PickerPanel>
      )}
    </div>
  );
}

export function TimePicker({
  value,
  open,
  onOpen,
  onClose,
  onChange,
}: {
  value: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChange: (hhmm: string) => void;
}) {
  const parsed = /^(\d{1,2}):(\d{2})$/.exec(value);
  const hour = parsed ? Number(parsed[1]) : null;
  const minute = parsed ? Number(parsed[2]) : 0;
  const presets = ["06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];

  function commit(h: number, m: number) {
    onChange(`${pad(h)}:${pad(m)}`);
  }
  const wrap = useDismiss(open, onClose);

  return (
    <div className="relative" ref={wrap}>
      <FieldButton
        icon={<Clock className="size-5" />}
        label={value ? formatTimeVi(value) : null}
        placeholder="Chọn giờ bay"
        open={open}
        onClick={onOpen}
        onClear={() => onChange("")}
      />
      {open && (
      <PickerPanel className="w-full p-3">
        <p className="mb-2 text-xs font-medium text-muted">Gợi ý</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                onChange(p);
                onClose();
              }}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs ring-1",
                value === p
                  ? "bg-primary text-surface ring-primary"
                  : "bg-surface text-fg ring-border hover:bg-primary-soft",
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">Giờ</p>
            <div className="grid max-h-44 grid-cols-4 gap-1 overflow-y-auto pr-1">
              {Array.from({ length: 24 }, (_, h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => commit(h, minute || 0)}
                  className={cn(
                    "h-9 rounded-sm text-sm",
                    hour === h ? "bg-primary text-surface" : "hover:bg-primary-soft",
                  )}
                >
                  {pad(h)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted">Phút</p>
            <div className="grid grid-cols-2 gap-1">
              {[0, 15, 30, 45].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    commit(hour ?? 0, m);
                    onClose();
                  }}
                  className={cn(
                    "h-9 rounded-sm text-sm",
                    minute === m && value ? "bg-primary text-surface" : "hover:bg-primary-soft",
                  )}
                >
                  {pad(m)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="mt-3 w-full rounded-sm py-2 text-sm text-muted hover:bg-primary-soft"
          onClick={() => {
            onChange("");
            onClose();
          }}
        >
          Không lọc giờ
        </button>
      </PickerPanel>
      )}
    </div>
  );
}

export function SelectPicker({
  value,
  options,
  placeholder,
  disabled,
  open,
  onOpen,
  onClose,
  onChange,
  emptyHint,
}: {
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  disabled?: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChange: (v: string) => void;
  emptyHint?: string;
}) {
  const current = options.find((o) => o.value === value);
  const wrap = useDismiss(open && !disabled, onClose);
  return (
    <div className="relative" ref={wrap}>
      <FieldButton
        icon={<Building2 className="size-5" />}
        label={current?.label ?? (value ? value : null)}
        placeholder={placeholder}
        open={open}
        disabled={disabled}
        onClick={onOpen}
      />
      {open && !disabled && (
      <PickerPanel className="w-full py-1">
        {options.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted">{emptyHint || "Không có lựa chọn"}</p>
        ) : (
          options.map((o) => (
            <button
              key={o.value || "all"}
              type="button"
              onClick={() => {
                onChange(o.value);
                onClose();
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-primary-soft",
                o.value === value && "bg-primary-soft font-medium",
              )}
            >
              <span>{o.label}</span>
              {o.value === value && <Check className="size-4 text-primary-mid" />}
            </button>
          ))
        )}
      </PickerPanel>
      )}
    </div>
  );
}
