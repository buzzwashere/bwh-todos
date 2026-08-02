# BWH Todos

A Vue 3 + Vuetify TODO app with **cloud sync** — your list follows you across every
device. Auth0 handles sign-in, a small set of Vercel serverless functions own the
backend, and Neon Postgres stores the data.

## Features

- Create, edit, and delete todos, synced to the cloud in real time per device
- Sign in with Auth0; every user sees only their own todos (enforced server-side)
- Fields: title, description, priority, due date, notes, keywords, frequency, status, completion
- Sort by completion, due date, then priority
- Filter by comma-separated tokens, with `priority:` and `frequency:` prefixes (e.g. `priority:high, work`)
- One-time import of todos previously saved in the browser's `localStorage`

## Architecture

```
Browser (Vue SPA)  ──sign in──►  Auth0  ──JWT──►  Browser
      │  fetch('/api/todos', Authorization: Bearer <JWT>)
      ▼
/api/* serverless functions (Vercel)
      │  verify JWT (jose + Auth0 JWKS) → scope every query by user_id
      ▼
Neon Postgres
```

- **`api/_auth.ts`** verifies the Auth0 access token (issuer + audience) against Auth0's JWKS.
- **`api/todos/index.ts`** — `GET` list / `POST` create. **`api/todos/[id].ts`** — `PUT` / `DELETE`.
- Every query is filtered by the token's `sub` claim, so users can only touch their own rows.

## Tech Stack

- [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`) + [Vuetify 3](https://vuetifyjs.com/)
- [Vue Router 4](https://router.vuejs.org/) · [Vite 5](https://vitejs.dev/) · TypeScript
- [Auth0](https://auth0.com/) (`@auth0/auth0-vue`) for authentication
- [Vercel Functions](https://vercel.com/docs/functions) for the backend
- [Neon Postgres](https://neon.tech/) via [`@neondatabase/serverless`](https://github.com/neondatabase/serverless)
- [`jose`](https://github.com/panva/jose) for JWT verification

## Getting Started

Requires Node.js 18+. **First-time setup (Auth0 + Neon + env vars) is in
[SETUP.md](SETUP.md)** — do that once, then:

```bash
npm install
npm run dev      # frontend on http://localhost:5173
```

For the full stack locally (frontend + `/api`), use `vercel dev` — see SETUP.md.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server (frontend only) |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Preview the production build locally |
| `vercel dev` | Run frontend + `/api` functions together |

## Data Storage

Todos live in Neon Postgres, one row-set per authenticated user. On first sign-in, any
todos left in this browser's `localStorage` (from the pre-sync version) can be imported
with one click.
