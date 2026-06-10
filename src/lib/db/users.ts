import { query, queryOne } from "./client";
import bcrypt from "bcryptjs";
import type { User } from "@/types";
import type { NotificationChannel } from "@/types";

export async function getUserByEmail(email: string) {
  return queryOne<User & { password: string }>(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );
}

export async function getUserById(id: string) {
  return queryOne<User>(
    `SELECT id, email, name, role, created_at FROM users WHERE id = $1`,
    [id]
  );
}

export async function createUser(
  email: string,
  name: string,
  password: string,
  role: "admin" | "viewer" = "viewer"
) {
  const hash = await bcrypt.hash(password, 12);
  const rows = await query<User>(
    `INSERT INTO users (email, name, password, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email, name, role`,
    [email, name, hash, role]
  );
  return rows[0] ?? null;
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function countUsers(): Promise<number> {
  const rows = await query<{ count: string }>("SELECT COUNT(*) AS count FROM users");
  return parseInt(rows[0].count);
}

// ── Notification channels ────────────────────────────────────

export async function getNotificationChannels(
  userId: string
): Promise<NotificationChannel[]> {
  return query<NotificationChannel>(
    `SELECT * FROM notification_channels WHERE user_id = $1 ORDER BY created_at`,
    [userId]
  );
}

export async function createNotificationChannel(
  userId: string,
  name: string,
  config: { to: string }
) {
  const rows = await query<NotificationChannel>(
    `INSERT INTO notification_channels (user_id, name, type, config)
     VALUES ($1, $2, 'email', $3) RETURNING *`,
    [userId, name, JSON.stringify(config)]
  );
  return rows[0];
}

export async function deleteNotificationChannel(id: string) {
  await query(`DELETE FROM notification_channels WHERE id = $1`, [id]);
}

export async function getChannelsForMonitor(
  monitorId: string
): Promise<NotificationChannel[]> {
  return query<NotificationChannel>(
    `SELECT nc.* FROM notification_channels nc
     JOIN monitor_notifications mn ON mn.channel_id = nc.id
     WHERE mn.monitor_id = $1 AND nc.enabled = TRUE`,
    [monitorId]
  );
}

export async function linkMonitorToChannel(
  monitorId: string,
  channelId: string
) {
  await query(
    `INSERT INTO monitor_notifications (monitor_id, channel_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [monitorId, channelId]
  );
}
