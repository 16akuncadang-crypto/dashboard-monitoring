import { NextRequest } from "next/server";
import { runAllChecks } from "@/lib/runner";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized triggers
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const started = Date.now();
  try {
    const result = await runAllChecks();
    const elapsed = Date.now() - started;

    return new Response(
      JSON.stringify({
        ok: true,
        checked: result.checked,
        errors: result.errors,
        elapsed_ms: elapsed,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[CRON] runAllChecks failed:", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
        elapsed_ms: Date.now() - started,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
