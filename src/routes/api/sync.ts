import { createFileRoute } from "@tanstack/react-router";
import { runSyncTick } from "@/lib/sync.server";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const auth = request.headers.get("authorization") || "";
  const header = request.headers.get("x-cron-secret") || "";
  return auth === `Bearer ${secret}` || header === secret;
}

export const Route = createFileRoute("/api/sync")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorized(request)) {
          return new Response("Unauthorized", { status: 401 });
        }
        const result = await runSyncTick(true);
        return Response.json(result);
      },
    },
  },
});
