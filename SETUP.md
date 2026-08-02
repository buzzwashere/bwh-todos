# Cloud sync setup

BWH Todos syncs across devices using **Auth0** (login), **Neon Postgres** (storage),
and **Vercel serverless functions** (the `/api` backend). Everything below has a free
tier. Do these steps once, then `npm run dev` / deploy work end-to-end.

You'll collect five values along the way. Put them in a `.env.local` file
(copy `.env.example`):

```
VITE_AUTH0_DOMAIN=      # e.g. dev-abc123.us.auth0.com
VITE_AUTH0_CLIENT_ID=   # SPA app Client ID
VITE_AUTH0_AUDIENCE=    # API Identifier, e.g. https://bwh-todos-api
DATABASE_URL=           # Neon pooled connection string
AUTH0_DOMAIN=           # same as VITE_AUTH0_DOMAIN
AUTH0_AUDIENCE=         # same as VITE_AUTH0_AUDIENCE
```

---

## 1. Neon (database)

1. Sign up at <https://neon.tech> and create a project (any name/region).
2. In the project, open **SQL Editor**, paste the contents of [`db/schema.sql`](db/schema.sql),
   and run it. This creates the `todos` table.
3. Open **Connection Details**, choose the **Pooled connection** string, and copy it
   into `DATABASE_URL`. It looks like
   `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require`.

## 2. Auth0 (login + tokens)

### 2a. Create the SPA application

1. Sign up at <https://auth0.com>. Your tenant domain (e.g. `dev-abc123.us.auth0.com`)
   is `AUTH0_DOMAIN` / `VITE_AUTH0_DOMAIN`.
2. **Applications → Create Application → Single Page Web Application** (name it `BWH Todos`).
3. Copy its **Client ID** into `VITE_AUTH0_CLIENT_ID`.
4. In the app's **Settings**, add these URLs (comma-separated), for **both** local dev
   and your Vercel URL:
   - **Allowed Callback URLs:** `http://localhost:5173, https://<your-app>.vercel.app`
   - **Allowed Logout URLs:** `http://localhost:5173, https://<your-app>.vercel.app`
   - **Allowed Web Origins:** `http://localhost:5173, https://<your-app>.vercel.app`
5. Save.

> Using `vercel dev` instead of `npm run dev`? It serves on `http://localhost:3000` —
> add that to the three URL lists too.

### 2b. Create the API (this is what makes tokens verifiable)

1. **Applications → APIs → Create API.**
2. **Name:** `BWH Todos API`. **Identifier:** `https://bwh-todos-api`
   (any URL-like string; it never has to resolve). This value is
   `VITE_AUTH0_AUDIENCE` **and** `AUTH0_AUDIENCE` — they must match exactly.
3. Signing algorithm: **RS256** (default). Save.

### 2c. (Optional) Passwordless email / magic link

Under **Authentication → Passwordless**, enable **Email**. Auth0's default database
login (email + password) works out of the box if you skip this.

## 3. Run it locally

```bash
npm install
npm run dev            # UI on http://localhost:5173
```

`npm run dev` serves the frontend only — the `/api` functions don't run under Vite.
To exercise the full stack locally, use the Vercel CLI:

```bash
npm i -g vercel
vercel dev             # frontend + /api on http://localhost:3000
```

`vercel dev` reads the same `.env.local`. (Remember to add `http://localhost:3000` to
the Auth0 URL lists from step 2a.)

## 4. Deploy to Vercel

1. Push the repo to GitHub and **Import** it at <https://vercel.com> (framework preset:
   **Vite**).
2. In **Project → Settings → Environment Variables**, add all six variables from your
   `.env.local` (the `VITE_*` ones are exposed to the browser by design; `DATABASE_URL`,
   `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` stay server-side).
3. Deploy. Then add the deployed `https://<your-app>.vercel.app` to the three Auth0 URL
   lists (step 2a) if you haven't already.

That's it — sign in on any device and your todos follow you.
