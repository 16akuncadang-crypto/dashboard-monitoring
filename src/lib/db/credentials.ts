import { query, queryOne } from "./client";
import { encrypt, decrypt } from "@/lib/crypto";

export async function setCredential(
  monitorId: string,
  keyName: string,
  value: string
): Promise<void> {
  const { encrypted, iv, authTag } = encrypt(value);
  await query(
    `INSERT INTO monitor_credentials (monitor_id, key_name, encrypted_val, iv, auth_tag)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (monitor_id, key_name)
     DO UPDATE SET encrypted_val = $3, iv = $4, auth_tag = $5`,
    [monitorId, keyName, encrypted, iv, authTag]
  );
}

export async function getCredential(
  monitorId: string,
  keyName: string
): Promise<string | null> {
  const row = await queryOne<{
    encrypted_val: string;
    iv: string;
    auth_tag: string;
  }>(
    `SELECT encrypted_val, iv, auth_tag FROM monitor_credentials
     WHERE monitor_id = $1 AND key_name = $2`,
    [monitorId, keyName]
  );
  if (!row) return null;
  return decrypt(row.encrypted_val, row.iv, row.auth_tag);
}

export async function getCredentialKeys(monitorId: string): Promise<string[]> {
  const rows = await query<{ key_name: string }>(
    `SELECT key_name FROM monitor_credentials WHERE monitor_id = $1`,
    [monitorId]
  );
  return rows.map((r) => r.key_name);
}

export async function deleteCredential(
  monitorId: string,
  keyName: string
): Promise<void> {
  await query(
    `DELETE FROM monitor_credentials WHERE monitor_id = $1 AND key_name = $2`,
    [monitorId, keyName]
  );
}

export async function deleteAllCredentials(monitorId: string): Promise<void> {
  await query(
    `DELETE FROM monitor_credentials WHERE monitor_id = $1`,
    [monitorId]
  );
}
