# BWH Todos

A standalone Vue 3 + Vuetify TODO app that stores your list in the browser's `localStorage`.

## Features

- Create, edit, and delete todos
- Fields: title, description, priority, due date, notes, keywords, frequency, status, completion
- Sort by completion, due date, then priority
- Filter by comma-separated tokens, with support for `priority:` and `frequency:` prefixes (e.g. `priority:high, work`)
- Highlights matching keyword/priority hits inline

## Tech Stack

- [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`)
- [Vuetify 3](https://vuetifyjs.com/)
- [Vue Router 4](https://router.vuejs.org/)
- [Vite 5](https://vitejs.dev/) build tooling
- TypeScript

## Getting Started

Requires Node.js 18+.

```bash
npm install
npm run dev
```

The dev server runs with `--host` so it's reachable from other devices on your network.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Preview the production build locally |

## Data Storage

Todos are persisted to `localStorage` under the key `bwh-todos.todos`. Clearing site data will remove all todos.
