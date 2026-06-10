#!/usr/bin/env node
// Usage: node __test__/change-password.js <email> <password>
// Kalau user belum ada, otomatis dibuat sebagai admin

const { readFileSync } = require("fs");
const { join } = require("path");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

try {
  const envPath = join(__dirname, "..", ".env.local");
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch {}

async function run() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Usage: node __test__/change-password.js <email> <password>");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("❌  Password minimal 8 karakter");
    process.exit(1);
  }

  let connectionString = process.env.DATABASE_URL;
  connectionString = connectionString
    .replace(/[?&]sslmode=[^&]*/g, "")
    .replace(/[?&]$/, "")
    .replace(/\?&/, "?");

  const caCert = process.env.CA_CERT;
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false, ...(caCert ? { ca: caCert.replace(/\\n/g, "\n") } : {}) },
  });

  const client = await pool.connect();
  try {
    console.log("🔐  Hashing password...");
    const hash = await bcrypt.hash(password, 12);

    const existing = await client.query("SELECT id FROM users WHERE email = $1", [email]);

    if (existing.rows.length > 0) {
      await client.query("UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2", [hash, email]);
      console.log(`✅  Password berhasil diubah untuk: ${email}`);
    } else {
      await client.query(
        `INSERT INTO users (email, name, password, role) VALUES ($1, $2, $3, 'admin')`,
        [email, "Admin", hash]
      );
      console.log(`✅  User admin baru dibuat: ${email}`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run();