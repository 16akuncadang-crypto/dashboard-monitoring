import { NextRequest } from "next/server";
import {
  getNotificationChannels,
  createNotificationChannel,
  deleteNotificationChannel,
} from "@/lib/db/users";
import { requireAuth, unauthorized, ok, badRequest, serverError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireAuth();
    const channels = await getNotificationChannels(user.id);
    return ok(channels);
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { name, to } = body;

    if (!name || !to) return badRequest("name and to are required");

    const channel = await createNotificationChannel(user.id, name, { to });
    return ok(channel);
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth();
    const { id } = await req.json();
    if (!id) return badRequest("id is required");
    await deleteNotificationChannel(id);
    return ok({ deleted: true });
  } catch (e) {
    if ((e as Error).message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
