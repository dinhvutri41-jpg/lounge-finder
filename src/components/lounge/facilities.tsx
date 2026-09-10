import {
  Accessibility,
  Ban,
  CircleHelp,
  ConciergeBell,
  Droplets,
  Monitor,
  Newspaper,
  Phone,
  Plane,
  Snowflake,
  Tv,
  Wifi,
  Wine,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Telephone: Phone,
  Refreshments: ConciergeBell,
  Television: Tv,
  Newspapers: Newspaper,
  Showers: Droplets,
  "Wi-Fi": Wifi,
  Internet: Wifi,
  Alcohol: Wine,
  "Flight Information Monitor": Plane,
  "Air Conditioning": Snowflake,
  "No Smoking": Ban,
  "Disabled Access": Accessibility,
  Conference: Monitor,
};

export function FacilityList({
  facilities,
  labels,
}: {
  facilities: string[];
  labels?: string[];
}) {
  if (!facilities.length) return null;
  return (
    <ul className="space-y-3">
      {facilities.map((item, i) => {
        const Icon = ICONS[item] ?? CircleHelp;
        return (
          <li key={`${item}-${i}`} className="flex items-center gap-3">
            <Icon className="size-5 shrink-0 text-fg" strokeWidth={1.75} />
            <span>{labels?.[i] ?? item}</span>
          </li>
        );
      })}
    </ul>
  );
}
