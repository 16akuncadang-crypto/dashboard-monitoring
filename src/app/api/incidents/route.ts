import { requireAuth, unauthorized, ok, serverError } from "@/lib/auth";
import { getRecentIncidents } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAuth();
    const incidents = await getRecentIncidents(50);
    return ok(incidents);
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
