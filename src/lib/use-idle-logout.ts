import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

const IDLE_LIMIT_MS = 5 * 60 * 1000;

export function useIdleLogout(): void {
  const navigate = useNavigate();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const logoutWhenIdle = async () => {
      await fetch("/api/auth", { method: "DELETE" }).catch(() => undefined);
      navigate({ to: "/" });
    };

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void logoutWhenIdle(), IDLE_LIMIT_MS);
    };

    const events = ["click", "keydown", "scroll", "mousemove", "touchstart"] as const;
    events.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [navigate]);
}
