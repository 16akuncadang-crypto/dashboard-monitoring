import { NextRequest } from "next/server";
import { getMonitors, createMonitor } from "@/lib/db/queries";
import { setCredential } from "@/lib/db/credentials";
import { requireAuth, unauthorized, ok, badRequest, serverError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAuth();
    const monitors = await getMonitors(user.id);
    return ok(monitors);
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const { credentials, ...monitorData } = body;

    if (!monitorData.name) return badRequest("name is required");
    if (!monitorData.type) return badRequest("type is required");

    const monitor = await createMonitor({ ...monitorData, user_id: user.id });

    // Store credentials securely if provided
    if (credentials && typeof credentials === "object") {
      for (const [key, value] of Object.entries(credentials)) {
        if (typeof value === "string" && value.trim()) {
          await setCredential(monitor.id, key, value);
        }
      }
    }

    return ok(monitor);
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
