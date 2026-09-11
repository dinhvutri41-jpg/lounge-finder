import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { FinderApp } from "@/components/lounge/finder-app";
import { useIdleLogout } from "@/lib/use-idle-logout";

export const Route = createFileRoute("/home")({ component: Home });

function Home() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  useIdleLogout();

  useEffect(() => {
    fetch("/api/auth")
      .then((response) => response.json())
      .then((session: { authenticated: boolean }) => {
        if (!session.authenticated) navigate({ to: "/" });
      })
      .catch(() => navigate({ to: "/" }))
      .finally(() => setChecking(false));
  }, [navigate]);

  if (checking) return <div className="flex min-h-screen items-center justify-center bg-bg text-primary">Đang kiểm tra đăng nhập...</div>;

  return (
    <>
      <FinderApp />
      <div className="fixed bottom-4 right-4 z-50 flex gap-2">
        <Link to="/demo-report" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-lg shadow-primary/20 transition hover:bg-primary-hover">
          Demo report
        </Link>
        <button type="button" onClick={async () => { await fetch("/api/auth", { method: "DELETE" }); navigate({ to: "/" }); }} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-primary shadow-lg">
          Đăng xuất
        </button>
      </div>
    </>
  );
}
