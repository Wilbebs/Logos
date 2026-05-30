# LOGOS Admissions

A Christian university admissions management dashboard for reviewing, filtering, and acting on applicant records stored in Supabase.

## Run & Operate

- `pnpm --filter @workspace/logos-admissions run dev` — run the frontend (Vite, port auto-assigned)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-server run build` — rebuild the API server bundle (runs esbuild + copies config to dist/)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v3, react-router-dom
- API: Express 5 (bundled with esbuild)
- DB: Supabase (Postgres) — NOT Replit's built-in Postgres
- AI: Google Gemini (`@google/generative-ai`)
- Email: Resend
- File uploads: multer (memory storage → Supabase Storage)
- Doc generation: docx

## Where things live

- `artifacts/logos-admissions/src/` — React frontend (JSX, not TSX)
  - `App.jsx` — BrowserRouter with routes: `/`, `/applicants/:id`, `/applicants/:id/acceptance`
  - `pages/` — Dashboard, ApplicantDetail, AcceptanceLetterPage
  - `components/` — StatusBadge, ChatBot, FormChecklist, AdmissionTimeline, AcceptanceLetter
- `artifacts/api-server/src/` — Express backend
  - `routes/` — applicants.js, acceptance.js, chat.js, emailRoutes.js, webhook.js
  - `services/` — eligibility.js, aiReview.js, emailService.js
  - `db/client.js` — Supabase client (anon + admin)
  - `config/programs.json` — program definitions used by eligibility engine
  - `config/system-prompt.txt` — Gemini system prompt for AI review
- `artifacts/api-server/build.mjs` — esbuild config; copies `src/config/` → `dist/config/` at build time

## Architecture decisions

- Supabase is the database — all data access goes through the Supabase JS client, not Drizzle or a direct Postgres connection.
- Config files (`programs.json`, `system-prompt.txt`) are loaded at runtime via `fs.readFileSync`. The build script copies them from `src/config/` to `dist/config/` so they're available after esbuild bundles the JS.
- Resend and Gemini clients are initialized lazily (inside functions, not at module load) so the server starts cleanly even when API keys aren't set.
- Frontend uses `VITE_API_URL` (defaults to `''`) so all API calls are relative — they route through the Replit proxy to the api-server at `/api`.
- MachForm webhook (`POST /api/webhook`) accepts `Content-Type: text/plain` with URL-encoded key-value pairs; a middleware in `app.ts` parses this before Express's body parsers run.

## Product

- Dashboard showing all applicants with stats (total, forms complete, needs review, approved, rejected)
- Filter tabs by status; date range and "forms complete only" filters
- Applicant detail view with form checklist, uploaded files, AI eligibility review, and decision controls
- Acceptance letter generator (Gemini-drafted, editable, sent via Resend with .docx attachment)
- Floating AI chat assistant on every page
- MachForm webhook integration for automatic applicant ingestion

## Required environment secrets

- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (admin operations)
- `GEMINI_API_KEY` — Google Gemini API key
- `RESEND_API_KEY` — Resend API key
- `RESEND_FROM_EMAIL` — From address for outgoing emails
- `EMAIL_ALLOWLIST` — Comma-separated list of allowed recipient emails

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The api-server build copies `src/config/` to `dist/config/` — if you add new static config files, they must live in `src/config/` to be picked up automatically.
- `eligibility.js` and `aiReview.js` use `import.meta.url` + `fs.readFileSync` to load config. After bundling, `import.meta.url` resolves to `dist/index.mjs`, so the path becomes `dist/config/` — correct as long as the build script copies the files.
- Frontend source is JSX (not TSX) — the scaffold's `.tsx` files were removed during migration.
- `react-router-dom` must be installed in `artifacts/logos-admissions`, not the workspace root.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
