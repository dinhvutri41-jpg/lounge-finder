import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Bell,
  Briefcase,
  CalendarDays,
  ChevronDown,
  CreditCard,
  FolderKanban,
  Globe,
  LayoutDashboard,
  MessageSquareText,
  Search,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import { getComplaintReport } from "@/lib/complaints.functions";
import { getReportData } from "@/lib/lounges.functions";
import { useIdleLogout } from "@/lib/use-idle-logout";

const navSections = [
  {
    title: "Báo cáo",
    items: [
      { label: "Tổng quan", icon: LayoutDashboard, view: "overview" },
      { label: "Thống kê khiếu nại", icon: MessageSquareText, view: "complaints" },
      { label: "Thống kê dịch vụ", icon: Briefcase, view: "services" },
      { label: "Phụ thu", icon: CreditCard, view: "surcharge" },
    ],
  },
];

function DemoReportPage() {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);
  useIdleLogout();
  const [countryFilter, setCountryFilter] = useState("all");
  const [airportFilter, setAirportFilter] = useState("all");
  const [complaintFromMonth, setComplaintFromMonth] = useState("all");
  const [complaintToMonth, setComplaintToMonth] = useState("all");
  const [complaintProject, setComplaintProject] = useState("all");
  const [complaintProvider, setComplaintProvider] = useState("all");
  const [complaintSearch, setComplaintSearch] = useState("");
  const [complaintPage, setComplaintPage] = useState(1);
  const [activeView, setActiveView] = useState("overview");

  useEffect(() => {
    fetch("/api/auth")
      .then((response) => response.json())
      .then((session: { authenticated: boolean }) => {
        if (!session.authenticated) navigate({ to: "/" });
      })
      .catch(() => navigate({ to: "/" }))
      .finally(() => setCheckingSession(false));
  }, [navigate]);

  const reportQ = useQuery({
    queryKey: ["demo-report", countryFilter, airportFilter],
    enabled: !checkingSession,
    queryFn: () =>
      getReportData({
        data: {
          country: countryFilter === "all" ? undefined : countryFilter,
          airportCode: airportFilter === "all" ? undefined : airportFilter,
        },
      }),
  });

  const data = reportQ.data;
  const chartData = data?.chartData ?? [];
  const countries = data?.countries ?? [];
  const countriesMax = Math.max(1, ...(countries.map((item) => item.loungeCount) ?? [1]));

  const complaintQ = useQuery({
    queryKey: [
      "complaint-report",
      complaintFromMonth,
      complaintToMonth,
      complaintProject,
      complaintProvider,
    ],
    enabled: !checkingSession,
    queryFn: () =>
      getComplaintReport({
        data: {
          fromMonth: complaintFromMonth === "all" ? undefined : complaintFromMonth,
          toMonth: complaintToMonth === "all" ? undefined : complaintToMonth,
          project: complaintProject === "all" ? undefined : complaintProject,
          provider: complaintProvider === "all" ? undefined : complaintProvider,
        },
      }),
  });

  const complaintData = complaintQ.data;
  const complaintProjectMax = Math.max(
    1,
    ...(complaintData?.projectData.map((item) => item.complaints) ?? [1]),
  );
  const serviceStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const record of complaintData?.records ?? []) {
      const service = record.privilege || "Chưa phân loại";
      counts.set(service, (counts.get(service) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([service, complaints]) => ({ service, complaints }))
      .sort((a, b) => b.complaints - a.complaints);
  }, [complaintData]);
  const surchargeRecords = (complaintData?.records ?? []).filter(
    (record) => record.compensation || record.damage,
  );
  const filteredComplaintRecords = useMemo(() => {
    const needle = complaintSearch.trim().toLocaleLowerCase();
    if (!needle) return complaintData?.records ?? [];
    return (complaintData?.records ?? []).filter((record) =>
      [
        record.project,
        record.receivedDate,
        record.customer,
        record.bookingCode,
        record.privilege,
        record.usageDate,
        record.provider,
      ].some((value) => value.toLocaleLowerCase().includes(needle)),
    );
  }, [complaintData, complaintSearch]);
  const complaintPageSize = 10;
  const complaintPageCount = Math.max(1, Math.ceil(filteredComplaintRecords.length / complaintPageSize));
  const complaintPageIndex = Math.min(complaintPage, complaintPageCount);
  const visibleComplaintRecords = filteredComplaintRecords.slice(
    (complaintPageIndex - 1) * complaintPageSize,
    complaintPageIndex * complaintPageSize,
  );

  useEffect(() => {
    setComplaintPage(1);
  }, [complaintSearch, complaintFromMonth, complaintToMonth, complaintProject, complaintProvider]);

  const stats = useMemo(
    () => [
      {
        name: "Total lounges",
        value: data ? data.totalLounges.toLocaleString() : "—",
        delta: "+12%",
        tone: "bg-sky-500/10 text-sky-600",
        subtitle: "catalog",
      },
      {
        name: "Airports",
        value: data ? data.totalAirports.toLocaleString() : "—",
        delta: "+4%",
        tone: "bg-violet-500/10 text-violet-600",
        subtitle: "coverage",
      },
      {
        name: "Countries",
        value: data ? data.countryCount.toLocaleString() : "—",
        delta: "Live",
        tone: "bg-emerald-500/10 text-emerald-600",
        subtitle: "coverage",
      },
    ],
    [data],
  );

  if (checkingSession) {
    return <div className="flex min-h-screen items-center justify-center bg-bg text-primary">Đang kiểm tra đăng nhập...</div>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.18),_transparent_35%),linear-gradient(180deg,_#edf3ff_0%,_#eaf2ff_100%)] text-slate-800">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-primary/10 bg-[linear-gradient(180deg,#123d7a_0%,#102d54_100%)] text-slate-100 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-sm font-semibold text-sky-100">
              L
            </div>
            <div>
              <div className="text-sm font-semibold tracking-wide text-white">LinkCare</div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-sky-100/70">Dashboard</div>
            </div>
          </div>

          <div className="flex-1 space-y-8 overflow-y-auto px-4 py-6">
            {navSections.map((section) => (
              <div key={section.title}>
                <h3 className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-100/60">
                  {section.title}
                </h3>
                <nav className="space-y-1">
                  {section.items.map(({ label, icon: Icon, view }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setActiveView(view)}
                      className={[
                        "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition",
                        activeView === view
                          ? "bg-white/10 text-white shadow-sm ring-1 ring-white/15"
                          : "text-sky-50/80 hover:bg-white/8 hover:text-white",
                      ].join(" ")}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4" />
                        {label}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-primary/10 bg-white/70 backdrop-blur-sm">
            <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6 xl:px-8">
              <div className="min-w-0">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-white text-primary lg:hidden"
                >
                  <span className="sr-only">Toggle menu</span>
                  <LayoutDashboard className="h-4 w-4" />
                </button>
                <div className="relative hidden sm:block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    placeholder="Search airports…"
                    className="h-10 w-64 rounded-lg border border-primary/10 bg-slate-50 pl-9 text-sm text-slate-700 outline-none transition focus:border-primary focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-primary/10 bg-white p-2 text-primary shadow-sm hover:bg-primary-soft sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
                >
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">Notifications</span>
                </button>
                <button
                  type="button"
                  className="hidden items-center gap-2 rounded-lg border border-primary/10 bg-white px-3 py-2 text-sm font-medium text-primary shadow-sm hover:bg-primary-soft sm:inline-flex"
                >
                  Need help?
                </button>
                <button
                  type="button"
                  className="flex shrink-0 items-center gap-2 rounded-xl border border-primary/10 bg-white px-1.5 py-1.5 text-left shadow-sm hover:bg-primary-soft sm:gap-3 sm:px-2"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-mid text-sm font-semibold text-white">
                    L
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-sm font-medium text-primary">LinkCare</div>
                  </div>
                  <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block" />
                </button>
              </div>
            </div>
          </header>

          <div className="min-w-0 p-3 sm:p-6 xl:p-8">
            <div className={activeView === "overview" ? "block" : "hidden"}>
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-primary">Dashboard</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {data?.lastSyncedAt
                    ? `Updated ${new Date(data.lastSyncedAt).toLocaleString("vi-VN")}`
                    : "Loading catalog…"}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
                <a
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    setActiveView("complaints");
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/15 bg-white px-3 py-2 text-sm font-medium text-primary shadow-sm hover:bg-primary-soft"
                >
                  Khiếu nại
                </a>
                <label className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-primary/10 bg-white px-3 py-2 text-sm text-primary shadow-sm sm:justify-start">
                  <span className="shrink-0 font-medium">Country</span>
                  <select
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-right text-sm text-slate-700 outline-none sm:flex-none sm:text-left"
                  >
                    <option value="all">All</option>
                    {(data?.availableCountries ?? []).map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-primary/10 bg-white px-3 py-2 text-sm text-primary shadow-sm sm:justify-start">
                  <span className="shrink-0 font-medium">Airport</span>
                  <select
                    value={airportFilter}
                    onChange={(e) => setAirportFilter(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-right text-sm text-slate-700 outline-none sm:flex-none sm:text-left"
                  >
                    <option value="all">All</option>
                    {(data?.availableAirports ?? []).map((airport) => (
                      <option key={airport.code} value={airport.code}>
                        {airport.name}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-hover"
                >
                  <TrendingUp className="h-4 w-4" />
                  Apply filters
                </button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.name} className="rounded-2xl border border-primary/10 bg-white p-5 shadow-[0_16px_32px_-20px_rgba(18,61,122,0.35)]">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-primary">{stat.name}</h2>
                    <button type="button" className="rounded-lg border border-primary/10 p-1.5 text-slate-500">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{stat.subtitle}</div>
                      <div className="mt-3 text-3xl font-semibold text-slate-900">{stat.value}</div>
                    </div>
                    <div className={[
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                      stat.tone,
                    ].join(" ")}>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      {stat.delta}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_0.9fr_0.9fr]">
              <div className="rounded-2xl border border-primary/10 bg-white p-5 shadow-[0_16px_32px_-20px_rgba(18,61,122,0.35)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-primary">Airport coverage</h2>
                  <button type="button" className="rounded-lg border border-primary/10 p-1.5 text-slate-500">
                    <TrendingUp className="h-4 w-4" />
                  </button>
                </div>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#dfeaf8" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#52657d" }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#52657d" }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #d7e2f1", background: "white" }}
                      />
                      <Bar dataKey="lounges" fill="#123d7a" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-primary/10 bg-white p-5 shadow-[0_16px_32px_-20px_rgba(18,61,122,0.35)]">
                <h2 className="text-lg font-semibold text-primary">Top countries</h2>
                <div className="mt-6 space-y-4">
                  {(countries ?? []).map(({ country, loungeCount }) => (
                    <div key={country}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-600">{country || "Unknown"}</span>
                        <span className="font-medium text-slate-900">{loungeCount}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-[linear-gradient(90deg,#123d7a_0%,#1d4f94_100%)]"
                          style={{ width: `${(loungeCount / countriesMax) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-primary/10 bg-white p-5 shadow-[0_16px_32px_-20px_rgba(18,61,122,0.35)]">
                <h2 className="text-lg font-semibold text-primary">Catalog health</h2>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-semibold text-slate-900">
                      {data ? data.totalLounges.toLocaleString() : "--"}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Live
                    </div>
                  </div>
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-soft to-white ring-8 ring-primary/10">
                    <Globe className="h-8 w-8 text-primary" />
                  </div>
                </div>
              </div>
            </div>
            </div>

            {/* <div className="mt-6 rounded-2xl border border-primary/10 bg-white p-5 shadow-[0_16px_32px_-20px_rgba(18,61,122,0.35)]">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-primary">Filtered lounge results</h2>
                <button type="button" className="text-sm font-medium text-primary hover:text-primary-hover">
                  View more
                </button>
              </div>
              <div className="overflow-hidden rounded-xl border border-primary/10">
                <table className="min-w-full divide-y divide-primary/10 text-left text-sm">
                  <thead className="bg-primary-soft text-primary">
                    <tr>
                      <th className="px-4 py-3 font-medium">Airport</th>
                      <th className="px-4 py-3 font-medium">Country</th>
                      <th className="px-4 py-3 font-medium">Terminal</th>
                      <th className="px-4 py-3 font-medium">Lounge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/10 bg-white">
                    {(data?.lounges ?? []).map((lounge) => (
                      <tr key={lounge.id} className="hover:bg-primary-soft/30">
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {lounge.airport_name || lounge.airport_code}
                          <span className="ml-2 text-slate-400">({lounge.airport_code})</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{lounge.country || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{lounge.terminal || "—"}</td>
                        <td className="px-4 py-3 text-slate-700">{lounge.name || lounge.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div> */}

            <section className={activeView === "complaints" ? "block" : "hidden"}>
              <div className="mb-5 flex min-w-0 flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-mid">vipbooking24h111lct</p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-primary">Thống kê khiếu nại</h2>
                  <p className="mt-1 text-sm text-slate-500">Tổng hợp 5 sheet khiếu nại, phân tích theo tháng, dự án và nhà cung cấp.</p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                  <select
                    value={complaintFromMonth}
                    onChange={(event) => setComplaintFromMonth(event.target.value)}
                    className="w-full rounded-lg border border-primary/10 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary sm:w-auto"
                    aria-label="Từ tháng"
                  >
                    <option value="all">Từ tháng: tất cả</option>
                    {(complaintData?.availableMonths ?? []).map((month) => (
                      <option key={month} value={month}>{`Từ ${month}`}</option>
                    ))}
                  </select>
                  <select
                    value={complaintToMonth}
                    onChange={(event) => setComplaintToMonth(event.target.value)}
                    className="w-full rounded-lg border border-primary/10 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary sm:w-auto"
                    aria-label="Đến tháng"
                  >
                    <option value="all">Đến tháng: tất cả</option>
                    {(complaintData?.availableMonths ?? []).map((month) => (
                      <option key={month} value={month}>{`Đến ${month}`}</option>
                    ))}
                  </select>
                  <select
                    value={complaintProject}
                    onChange={(event) => setComplaintProject(event.target.value)}
                    className="w-full max-w-none rounded-lg border border-primary/10 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary sm:w-auto sm:max-w-52"
                    aria-label="Lọc theo dự án"
                  >
                    <option value="all">Dự án: tất cả</option>
                    {(complaintData?.availableProjects ?? []).map((project) => (
                      <option key={project} value={project}>{project}</option>
                    ))}
                  </select>
                  <select
                    value={complaintProvider}
                    onChange={(event) => setComplaintProvider(event.target.value)}
                    className="w-full max-w-none rounded-lg border border-primary/10 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-primary sm:w-auto sm:max-w-60"
                    aria-label="Lọc theo nhà cung cấp"
                  >
                    <option value="all">Nhà cung cấp: tất cả</option>
                    {(complaintData?.availableProviders ?? []).map((provider) => (
                      <option key={provider} value={provider}>{provider}</option>
                    ))}
                  </select>
                </div>
              </div>

              {complaintQ.isLoading ? (
                <div className="mb-6 rounded-xl border border-primary/10 bg-white px-4 py-3 text-sm text-slate-500">
                  Đang tải dữ liệu khiếu nại từ Google Sheet...
                </div>
              ) : null}
              {complaintQ.isError ? (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Không thể tải dữ liệu khiếu nại. {complaintQ.error instanceof Error ? complaintQ.error.message : "Vui lòng kiểm tra quyền chia sẻ Google Sheet."}
                </div>
              ) : null}

              <div className="grid min-w-0 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-primary/10 bg-white p-5 shadow-[0_16px_32px_-20px_rgba(18,61,122,0.35)]">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Tổng khiếu nại</div>
                  <div className="mt-3 text-3xl font-semibold text-primary">{complaintData?.total.toLocaleString() ?? "—"}</div>
                  <div className="mt-2 text-sm text-slate-500">Sau khi áp dụng bộ lọc</div>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-white p-5 shadow-[0_16px_32px_-20px_rgba(18,61,122,0.35)]">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Số tháng có dữ liệu</div>
                  <div className="mt-3 text-3xl font-semibold text-primary">{complaintData?.monthData.length ?? "—"}</div>
                  <div className="mt-2 text-sm text-slate-500">Theo ngày tiếp nhận khiếu nại</div>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-white p-5 shadow-[0_16px_32px_-20px_rgba(18,61,122,0.35)]">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Dự án nổi bật</div>
                  <div className="mt-3 truncate text-xl font-semibold text-primary sm:text-2xl">{complaintData?.projectData[0]?.project ?? "—"}</div>
                  <div className="mt-2 text-sm text-slate-500">{complaintData?.projectData[0]?.complaints ?? 0} khiếu nại</div>
                </div>
              </div>

              <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-[1.5fr_0.9fr]">
                <div className="min-w-0 rounded-2xl border border-primary/10 bg-white p-3 shadow-[0_16px_32px_-20px_rgba(18,61,122,0.35)] sm:p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-primary">Khiếu nại theo tháng</h3>
                      <p className="mt-1 text-xs text-slate-500">Mốc thời gian lấy từ ngày tiếp nhận khiếu nại / phàn nàn</p>
                    </div>
                    <CalendarDays className="h-5 w-5 text-primary-mid" />
                  </div>
                  <div className="h-64 min-w-0 w-full">
                    {complaintData?.monthData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={complaintData.monthData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#dfeaf8" />
                          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#52657d" }} />
                          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#52657d" }} />
                          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d7e2f1", background: "white" }} />
                          <Bar dataKey="complaints" name="Khiếu nại" fill="#123d7a" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-xl bg-primary-soft/40 text-sm text-slate-500">
                        Chưa có dữ liệu phù hợp với bộ lọc.
                      </div>
                    )}
                  </div>
                </div>

                <div className="min-w-0 rounded-2xl border border-primary/10 bg-white p-4 shadow-[0_16px_32px_-20px_rgba(18,61,122,0.35)] sm:p-5">
                  <h3 className="text-lg font-semibold text-primary">Theo dự án</h3>
                  <div className="mt-5 space-y-4">
                    {(complaintData?.projectData ?? []).slice(0, 7).map(({ project, complaints }) => (
                      <div key={project}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                          <span className="truncate text-slate-600">{project}</span>
                          <span className="font-semibold text-primary">{complaints}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div className="h-2 rounded-full bg-[linear-gradient(90deg,#123d7a_0%,#2d6fba_100%)]" style={{ width: `${(complaints / complaintProjectMax) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 min-w-0 rounded-2xl border border-primary/10 bg-white p-3 shadow-[0_16px_32px_-20px_rgba(18,61,122,0.35)] sm:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-primary">Danh sách khiếu nại tổng hợp</h3>
                    <p className="mt-1 text-xs text-slate-500">Tên dự án, ngày tiếp nhận, khách hàng, booking, đặc quyền, lịch sử dụng và nhà cung cấp</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="search"
                        value={complaintSearch}
                        onChange={(event) => setComplaintSearch(event.target.value)}
                        placeholder="Tìm khiếu nại..."
                        aria-label="Tìm kiếm khiếu nại"
                        className="h-10 w-full rounded-lg border border-primary/10 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-primary focus:bg-white"
                      />
                    </label>
                    <span className="shrink-0 rounded-full bg-primary-soft px-2 py-1 text-xs font-semibold text-primary sm:px-3">{filteredComplaintRecords.length} bản ghi</span>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-primary/10">
                  <table className="min-w-[980px] divide-y divide-primary/10 text-left text-sm">
                    <thead className="bg-primary-soft text-primary">
                      <tr>
                        <th className="px-4 py-3 font-medium">Tên dự án</th>
                        <th className="px-4 py-3 font-medium">Ngày tiếp nhận</th>
                        <th className="px-4 py-3 font-medium">Thông tin khách hàng</th>
                        <th className="px-4 py-3 font-medium">Mã booking</th>
                        <th className="px-4 py-3 font-medium">Loại đặc quyền</th>
                        <th className="px-4 py-3 font-medium">Lịch sử dụng</th>
                        <th className="px-4 py-3 font-medium">Nhà cung cấp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/10 bg-white">
                      {visibleComplaintRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-primary-soft/30">
                          <td className="px-4 py-3 font-medium text-slate-700">{record.project}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.receivedDate}</td>
                          <td className="max-w-64 whitespace-pre-wrap px-4 py-3 text-slate-600">{record.customer || "—"}</td>
                          <td className="px-4 py-3 text-slate-600">{record.bookingCode || "—"}</td>
                          <td className="max-w-56 px-4 py-3 text-slate-600">{record.privilege || "—"}</td>
                          <td className="max-w-52 px-4 py-3 text-slate-600">{record.usageDate || "—"}</td>
                          <td className="max-w-64 px-4 py-3 text-slate-600">{record.provider || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!filteredComplaintRecords.length ? (
                  <p className="px-2 py-6 text-center text-sm text-slate-500">
                    Không tìm thấy dữ liệu phù hợp với từ khóa “{complaintSearch}”.
                  </p>
                ) : null}
                {filteredComplaintRecords.length > complaintPageSize ? (
                  <div className="flex flex-col gap-3 border-t border-primary/10 px-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-0">
                    <p className="text-xs text-slate-500">
                      Hiển thị {(complaintPageIndex - 1) * complaintPageSize + 1}–{Math.min(complaintPageIndex * complaintPageSize, filteredComplaintRecords.length)} trong {filteredComplaintRecords.length} bản ghi
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={complaintPageIndex === 1}
                        onClick={() => setComplaintPage((page) => Math.max(1, page - 1))}
                        className="rounded-lg border border-primary/10 px-3 py-1.5 text-sm text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Trước
                      </button>
                      {Array.from({ length: complaintPageCount }, (_, index) => index + 1).map((page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setComplaintPage(page)}
                          className={[
                            "h-8 min-w-8 rounded-lg px-2 text-sm",
                            page === complaintPageIndex
                              ? "bg-primary text-white"
                              : "border border-primary/10 text-primary hover:bg-primary-soft",
                          ].join(" ")}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={complaintPageIndex === complaintPageCount}
                        onClick={() => setComplaintPage((page) => Math.min(complaintPageCount, page + 1))}
                        className="rounded-lg border border-primary/10 px-3 py-1.5 text-sm text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className={activeView === "services" ? "block" : "hidden"}>
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-mid">Report 02</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-primary">Thống kê dịch vụ</h2>
                <p className="mt-1 text-sm text-slate-500">Phân bổ khiếu nại theo loại đặc quyền / dịch vụ.</p>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-primary/10 bg-white shadow-[0_16px_32px_-20px_rgba(18,61,122,0.35)]">
                <table className="min-w-[520px] divide-y divide-primary/10 text-left text-sm">
                  <thead className="bg-primary-soft text-primary">
                    <tr>
                      <th className="px-4 py-3 font-medium">Dịch vụ / loại đặc quyền</th>
                      <th className="px-4 py-3 font-medium">Số khiếu nại</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/10 bg-white">
                    {serviceStats.map(({ service, complaints }) => (
                      <tr key={service} className="hover:bg-primary-soft/30">
                        <td className="px-4 py-3 text-slate-700">{service}</td>
                        <td className="px-4 py-3 font-semibold text-primary">{complaints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={activeView === "surcharge" ? "block" : "hidden"}>
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-mid">Report 03</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-primary">Phụ thu / đền bù</h2>
                <p className="mt-1 text-sm text-slate-500">Các trường hợp có quà tặng đền bù hoặc ghi nhận thiệt hại.</p>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-primary/10 bg-white shadow-[0_16px_32px_-20px_rgba(18,61,122,0.35)]">
                <table className="min-w-[760px] divide-y divide-primary/10 text-left text-sm">
                  <thead className="bg-primary-soft text-primary">
                    <tr>
                      <th className="px-4 py-3 font-medium">Dự án</th>
                      <th className="px-4 py-3 font-medium">Ngày tiếp nhận</th>
                      <th className="px-4 py-3 font-medium">Mã booking</th>
                      <th className="px-4 py-3 font-medium">Đền bù</th>
                      <th className="px-4 py-3 font-medium">Thiệt hại</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/10 bg-white">
                    {surchargeRecords.map((record) => (
                      <tr key={`${record.id}-surcharge`} className="hover:bg-primary-soft/30">
                        <td className="px-4 py-3 font-medium text-slate-700">{record.project}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.receivedDate}</td>
                        <td className="px-4 py-3 text-slate-600">{record.bookingCode || "—"}</td>
                        <td className="max-w-72 whitespace-pre-wrap px-4 py-3 text-slate-600">{record.compensation || "—"}</td>
                        <td className="max-w-72 whitespace-pre-wrap px-4 py-3 text-slate-600">{record.damage || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!surchargeRecords.length ? (
                  <p className="px-4 py-6 text-sm text-slate-500">Chưa có dữ liệu phụ thu hoặc đền bù theo bộ lọc hiện tại.</p>
                ) : null}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/demo-report")({
  component: DemoReportPage,
});
