import { createFileRoute } from "@tanstack/react-router";
import {
  authCookieName,
  clearedSessionCookie,
  configuredCredentials,
  createSession,
  readCookie,
  sessionCookie,
  verifySession,
} from "@/lib/auth.server";

export const Route = createFileRoute("/api/auth")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as { email?: string; password?: string } | null;
        const credentials = configuredCredentials();
        if (body?.email?.trim() !== credentials.email || body.password !== credentials.password) {
          return Response.json({ error: "Email hoặc mật khẩu không đúng." }, { status: 401 });
        }
        const token = await createSession(credentials.email);
        return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(token) } });
      },
      GET: async ({ request }) => {
        const session = await verifySession(readCookie(request));
        return Response.json({ authenticated: Boolean(session), email: session?.email ?? null });
      },
      DELETE: async () =>
        new Response(null, { status: 204, headers: { "Set-Cookie": clearedSessionCookie() } }),
    },
  },
});
