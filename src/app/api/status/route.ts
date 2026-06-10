import { requireAuth, unauthorized, ok, serverError } from "@/lib/auth";
import { getDashboardSummary, getMonitors, getActiveIncidents } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAuth();
    const [summary, monitors, incidents] = await Promise.all([
      getDashboardSummary(user.id),
      getMonitors(user.id),
      getActiveIncidents(),
    ]);
    return ok({ summary, monitors, incidents, timestamp: new Date().toISOString() });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
