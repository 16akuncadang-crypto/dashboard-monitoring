# Monitoring Dashboard

Full-stack monitoring dashboard for servers, databases, and APIs — built with Next.js 14, TypeScript, PostgreSQL, and Tailwind CSS. Deployable on Vercel (free tier) with Neon/Supabase as the database.

## Features

- **Server monitoring** — HTTP ping, response time, uptime tracking
- **Database monitoring** — PostgreSQL connection, disk size, active connections, version (via direct pg connection with SSL/cert support)
- **API monitoring** — three tiers:
  - **AI vendor integrations** (OpenRouter, Groq, OpenAI) — quota, credits, RPM/RPD/tokens remaining
  - **Header-based quota** — configurable header mapping for any API that exposes `x-ratelimit-*` headers (GitHub, etc.)
  - **Generic ping** — HTTP status + latency for any endpoint
- **Incident management** — auto-open/resolve incidents, track downtime duration
- **Email alerts** — SMTP notifications on down + recovery
- **Auth** — NextAuth.js with bcrypt-hashed passwords, JWT sessions
- **Encrypted credentials** — AES-256-GCM encryption for all API keys, DB passwords, SSL certs
- **Client-side auto-refresh** — every 10 seconds while dashboard is open

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | NextAuth.js v4 |
| Database (app) | PostgreSQL — Neon or Supabase (free forever) |
| DB driver | `pg` (no ORM) |
| Encryption | Node.js `crypto` — AES-256-GCM |
| Email | Nodemailer (SMTP) |
| Deployment | Vercel (free tier) |
| Cron | cron-job.org (hits `/api/cron/check`) |

---

## Quick start

### 1. Clone and install

```bash
git clone <your-repo>
cd monitoring-dashboard
npm install
```

### 2. Set up database

Create a free PostgreSQL database on [Neon](https://neon.tech) or [Supabase](https://supabase.com).

Run the schema:

```bash
# Copy env template
cp .env.example .env.local

# Fill in DATABASE_URL, then run:
DATABASE_URL="postgresql://..." node scripts/migrate.js
```

Or paste `sql/schema.sql` directly into your DB provider's SQL editor.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate: openssl rand -base64 32>

DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

ENCRYPTION_KEY=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

CRON_SECRET=<any random string>

# SMTP (Gmail example — use App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Monitoring <you@gmail.com>"

# Admin account (created via /api/setup)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=changeme123
```

### 4. Create admin user

```bash
npm run dev
# Then in another terminal:
curl -X POST http://localhost:3000/api/setup
```

This only works once — if no users exist yet.

### 5. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init && git add . && git commit -m "init"
git remote add origin https://github.com/you/monitoring-dashboard.git
git push -u origin main
```

### 2. Import on Vercel

Go to [vercel.com/new](https://vercel.com/new), import the repo.

Add all environment variables from `.env.example` in the Vercel dashboard (Settings → Environment Variables).

Set `NEXTAUTH_URL` to your production URL: `https://your-app.vercel.app`

### 3. Run migration on production DB

Make sure `DATABASE_URL` points to your production database, then:

```bash
DATABASE_URL="postgresql://..." node scripts/migrate.js
```

### 4. Create admin user on production

```bash
curl -X POST https://your-app.vercel.app/api/setup
```

### 5. Set up cron job on cron-job.org

1. Sign up at [cron-job.org](https://cron-job.org) (free)
2. Create a new cron job:
   - URL: `https://your-app.vercel.app/api/cron/check?secret=YOUR_CRON_SECRET`
   - Interval: every 1 minute (free tier) or every 10–30 seconds (paid)
   - Method: GET
3. Save — monitoring starts automatically

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   NextAuth handler
│   │   ├── cron/check/           Cron endpoint (hit by cron-job.org)
│   │   ├── monitors/             CRUD for monitors
│   │   ├── incidents/            Incident history
│   │   ├── notifications/        Email channel CRUD
│   │   ├── status/               Dashboard status summary
│   │   └── setup/                First-run admin creation
│   ├── dashboard/                Protected pages
│   │   ├── page.tsx              Overview
│   │   ├── servers/              Server monitors
│   │   ├── databases/            DB monitors
│   │   ├── apis/                 API monitors with quota
│   │   ├── incidents/            Incident log
│   │   └── settings/             Notifications + cron setup
│   └── login/                    Auth page
├── components/
│   ├── dashboard/Sidebar.tsx
│   ├── forms/AddMonitorForm.tsx  Universal add form (all types)
│   └── ui/                       StatusBadge, QuotaBar
├── lib/
│   ├── db/                       Raw pg queries (no ORM)
│   │   ├── client.ts             Pool setup
│   │   ├── queries.ts            Monitor + incident queries
│   │   ├── users.ts              User + notification queries
│   │   └── credentials.ts        Encrypted credential storage
│   ├── checkers/                 Check logic per type
│   │   ├── server.ts             HTTP ping
│   │   ├── database.ts           pg connection + metrics
│   │   └── api.ts                Routes to integrations
│   ├── integrations/             Vendor-specific API fetchers
│   │   ├── openrouter.ts
│   │   ├── groq.ts
│   │   └── openai.ts
│   ├── notifications/email.ts    Nodemailer SMTP alerts
│   ├── runner.ts                 Orchestrates all checks + incidents
│   ├── crypto.ts                 AES-256-GCM encrypt/decrypt
│   └── auth.ts                   Session helpers + response utils
├── types/index.ts                All TypeScript types
└── middleware.ts                 Protects /dashboard routes
sql/
└── schema.sql                    Full DB schema (run once)
scripts/
└── migrate.js                    CLI migration runner
```

---

## Adding a new AI vendor integration

1. Create `src/lib/integrations/yourvendor.ts`:

```typescript
export async function checkYourVendor(monitor: Monitor): Promise<...> {
  const apiKey = await getCredential(monitor.id, "api_key");
  // fetch their API, return { status, response_ms, quota }
}
```

2. Add the vendor to the `Vendor` type in `src/types/index.ts`

3. Import and add a case in `src/lib/checkers/api.ts` → `checkAiApi()`

4. Add to `AI_VENDORS` array in `AddMonitorForm.tsx`

---

## Security notes

- All credentials (API keys, DB passwords, SSL certs) are encrypted at rest with AES-256-GCM before storing in the database. The encryption key lives only in your environment variable — never in the DB.
- User passwords are hashed with bcrypt (12 rounds).
- The cron endpoint is protected by `CRON_SECRET` — keep this secret and treat the cron URL as sensitive.
- `ENCRYPTION_KEY` must be 64 hex characters (32 bytes). If you lose it, stored credentials cannot be recovered.
- Dashboard routes are protected by NextAuth middleware — unauthenticated requests are redirected to `/login`.

---

## Free tier limits

| Service | Limit | Notes |
|---|---|---|
| Vercel | 100GB bandwidth/mo, 100hr compute/mo | More than enough for this app |
| Neon | 0.5 GB storage, 1 project | Fine for months of check history at 7-day retention |
| Supabase | 500 MB DB, 2 GB bandwidth | Alternative to Neon |
| cron-job.org | 5 jobs, 1-minute minimum | Free forever |
