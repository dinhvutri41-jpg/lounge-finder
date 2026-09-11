import { Link, createFileRoute } from "@tanstack/react-router";
import { FinderApp } from "@/components/lounge/finder-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <>
      <FinderApp />
      <div className="fixed right-4 bottom-4 z-50">
        <Link
          to="/demo-report"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white shadow-lg shadow-primary/20 transition hover:bg-primary-hover"
        >
          Demo report
        </Link>
      </div>
    </>
  );
}
