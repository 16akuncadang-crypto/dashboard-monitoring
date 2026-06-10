import { countUsers, createUser } from "@/lib/db/users";
import { ok, serverError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const count = await countUsers();
    if (count > 0) {
      return new Response(
        JSON.stringify({ error: "Setup already completed. Users already exist." }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const user = await createUser(email, "Admin", password, "admin");
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Failed to create user (email may already exist)" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return ok({ message: "Admin user created successfully.", email: user.email });
  } catch (e) {
    return serverError(e);
  }
}
