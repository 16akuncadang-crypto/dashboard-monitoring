import { NextRequest } from "next/server";
import { getMonitorById, updateMonitor, deleteMonitor } from "@/lib/db/queries";
import { setCredential, getCredentialKeys, deleteAllCredentials } from "@/lib/db/credentials";
import { requireAuth, unauthorized, ok, badRequest, serverError } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const monitor = await getMonitorById(params.id);
    if (!monitor || monitor.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }
    const credentialKeys = await getCredentialKeys(params.id);
    return ok({ ...monitor, credential_keys: credentialKeys });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const monitor = await getMonitorById(params.id);
    if (!monitor || monitor.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }

    const body = await req.json();
    const { credentials, ...updateData } = body;

    const updated = await updateMonitor(params.id, updateData);

    if (credentials && typeof credentials === "object") {
      for (const [key, value] of Object.entries(credentials)) {
        if (typeof value === "string" && value.trim()) {
          await setCredential(params.id, key, value);
        }
      }
    }

    return ok(updated);
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth();
    const monitor = await getMonitorById(params.id);
    if (!monitor || monitor.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }
    await deleteAllCredentials(params.id);
    await deleteMonitor(params.id);
    return ok({ deleted: true });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
