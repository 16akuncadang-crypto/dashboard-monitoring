import { NextRequest } from "next/server";
import { getMonitorById, getRecentResults } from "@/lib/db/queries";
import { requireAuth, unauthorized, ok, serverError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const monitor = await getMonitorById(params.id);
    if (!monitor || monitor.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }
    const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "100");
    const results = await getRecentResults(params.id, Math.min(limit, 500));
    return ok(results);
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
