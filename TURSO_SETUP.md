# Turso Setup Guide

This app uses [Turso](https://turso.tech) (libSQL/SQLite) with a Hono API backend instead of Supabase.

## Architecture

```
Browser (React SPA)
    │
    └── /api/*  →  Hono API (Vercel serverless)
                      │
                      ├── Turso (libSQL database)
                      ├── JWT Auth (replaces Supabase Auth)
                      └── Vercel Blob or local files (replaces Supabase Storage)
```

## 1. Create a Turso Database

```bash
# Install Turso CLI
brew install tursodatabase/tap/turso

# Sign up / log in
turso auth signup
turso auth login

# Create database
turso db create sculpt-sequences

# Get connection URL and auth token
turso db show sculpt-sequences --url
turso db tokens create sculpt-sequences
```

## 2. Run the Schema

```bash
turso db shell sculpt-sequences < sql/turso-schema.sql
```

## 3. Configure Environment

Copy `env.template` to `.env.local` and fill in:

- `TURSO_DATABASE_URL` — from `turso db show`
- `TURSO_AUTH_TOKEN` — from `turso db tokens create`
- `JWT_SECRET` — a long random string for production

## 4. Local Development

Run both the API server and the Vite dev server:

```bash
# Terminal 1: API server
yarn dev:api

# Terminal 2: Frontend
yarn dev
```

The Vite dev server proxies `/api` requests to the API on port 3001.

## 5. Deploy to Vercel

1. Push to GitHub and connect to Vercel
2. Add environment variables in Vercel dashboard:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `JWT_SECRET`
   - `APP_URL` (your production URL)
   - `BLOB_READ_WRITE_TOKEN` (for image uploads)
   - `RESEND_API_KEY` + `EMAIL_FROM` (for magic link emails)

## 6. Grant Admin Access

After creating your first account, grant admin permissions via Turso shell:

```sql
UPDATE user_profiles
SET permissions = json('{"admin": true}')
WHERE email = 'your@email.com';
```

## Migrating Data from Supabase

Export your data from Supabase and import into Turso. Key differences:

- `auth.users` → `users` table (with `password_hash`)
- JSONB columns → TEXT columns storing JSON strings
- Boolean columns → INTEGER (0/1)
- Users will need to reset passwords (Supabase password hashes are not portable)

## Scripts

CLI scripts now use the Turso database directly:

```bash
yarn export-poses-variations
yarn generate-transitional-cues
```

Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in your environment.
