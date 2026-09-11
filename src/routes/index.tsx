import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LockKeyhole, Mail } from "lucide-react";

export const Route = createFileRoute("/")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const copy = language === "vi"
    ? {
        login: "Đăng nhập",
        description: "Đăng nhập để truy cập Lounge Finder và hệ thống báo cáo.",
        email: "Email",
        password: "Mật khẩu",
        passwordPlaceholder: "Nhập mật khẩu",
        loading: "Đang đăng nhập...",
        error: "Đăng nhập thất bại.",
      }
    : {
        login: "Sign in",
        description: "Sign in to access Lounge Finder and the reporting system.",
        email: "Email",
        password: "Password",
        passwordPlaceholder: "Enter your password",
        loading: "Signing in...",
        error: "Sign in failed.",
      };

  useEffect(() => {
    setPassword("");
    setError("");
    fetch("/api/auth")
      .then((response) => response.json())
      .then((session: { authenticated: boolean }) => {
        if (session.authenticated) navigate({ to: "/home" });
      })
      .catch(() => undefined);
  }, [navigate]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || copy.error);
      navigate({ to: "/home" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.25),_transparent_38%),linear-gradient(135deg,#edf3ff_0%,#dceaff_100%)] px-4 py-10">
      <section className="flex h-[560px] w-full max-w-md flex-col rounded-3xl border border-primary/10 bg-white p-6 shadow-[0_24px_60px_-25px_rgba(18,61,122,0.45)] sm:p-8">
        <div className="mb-8 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-white">L</div>
          <div>
            <p className="text-lg font-semibold text-primary">LinkCare</p>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Operations portal</p>
          </div>
          </div>
          <div className="flex rounded-lg border border-primary/10 bg-slate-50 p-1 text-xs font-semibold">
            <button type="button" onClick={() => setLanguage("vi")} className={["rounded-md px-2 py-1", language === "vi" ? "bg-primary text-white" : "text-slate-500"].join(" ")}>VI</button>
            <button type="button" onClick={() => setLanguage("en")} className={["rounded-md px-2 py-1", language === "en" ? "bg-primary text-white" : "text-slate-500"].join(" ")}>EN</button>
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-primary">{copy.login}</h1>
        <p className="mt-2 text-sm text-slate-500">{copy.description}</p>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">{copy.email}</span>
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input required autoComplete="username" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@linkcare.vn" className="h-11 w-full rounded-xl border border-primary/15 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-primary focus:bg-white" />
            </span>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700">{copy.password}</span>
            <span className="relative block">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input required autoComplete="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={copy.passwordPlaceholder} className="h-11 w-full rounded-xl border border-primary/15 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-primary focus:bg-white" />
            </span>
          </label>
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <button disabled={loading} type="submit" className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60">
            {loading ? copy.loading : copy.login}
          </button>
        </form>
      </section>
    </main>
  );
}
