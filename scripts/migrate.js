#!/usr/bin/env node
const { readFileSync } = require("fs");
const { join } = require("path");
const { Pool } = require("pg");

// Load .env.local manually
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
  console.log("📄  Loaded .env.local");
} catch {
  // rely on externally set env vars
}

async function migrate() {
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌  DATABASE_URL is not set");
    process.exit(1);
  }

  // Remove sslmode from URL entirely — we pass ssl config object directly
  // This prevents pg from overriding our ssl settings with sslmode=verify-full
  connectionString = connectionString
    .replace(/[?&]sslmode=[^&]*/g, "")
    .replace(/[?&]$/, "")
    .replace(/\?&/, "?");

  const caCert = process.env.CA_CERT;
  if (caCert) {
    console.log("🔐  Using CA_CERT from environment");
  }

  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
      ...(caCert ? { ca: caCert.replace(/\\n/g, "\n") } : {}),
    },
  });

  const sqlPath = join(__dirname, "..", "sql", "schema.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  console.log("🔗  Connecting to database...");
  const client = await pool.connect();

  try {
    console.log("📦  Running schema migration...");
    await client.query(sql);
    console.log("✅  Migration complete!");
  } catch (e) {
    console.error("❌  Migration failed:", e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();