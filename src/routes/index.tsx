import { createFileRoute } from "@tanstack/react-router";
import { FinderApp } from "@/components/lounge/finder-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <FinderApp />;
}
