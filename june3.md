# Handoff Notes — June 3, 2026
For Claude Code to review before picking up work on LOGOS Admissions.

---

## Environment & Access

- **Codebase**: pnpm monorepo. Two artifacts: `artifacts/logos-admissions` (React + Vite frontend) and `artifacts/api-server` (Express 5 API).
- **Database**: Supabase (Postgres). All access via `@supabase/supabase-js` client — NOT Drizzle, NOT Replit's built-in Postgres.
- **Vercel deployment**: `https://logos-murex-mu.vercel.app` — this is where the live app is hosted and where Claude Code should test.
- **Replit dev URL**: NOT usable by Claude Code — it requires Replit login to access (auth wall). Ignore it.
- **Claude Code testing workflow**:
  1. Edit code locally
  2. `git push` → Vercel auto-deploys
  3. Test against `https://logos-murex-mu.vercel.app`
  - This is the same workflow as before. Nothing changes.
- **Vercel env secrets**: Must be set in the Vercel dashboard (`vercel.com → project → Settings → Environment Variables`). Claude Code cannot set these itself — owner must add them manually, especially the new Gemini key.
- **Local dev** (if needed):
  - Frontend: `pnpm --filter @workspace/logos-admissions run dev`
  - API: `pnpm --filter @workspace/api-server run dev` (port 8080)

---

## Required Environment Secrets

These must be set both locally and in Vercel's dashboard:

| Secret | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin ops) |
| `GEMINI_API_KEY` | Google Gemini — **see issue below** |
| `RESEND_API_KEY` | Resend email service |
| `RESEND_FROM_EMAIL` | From address for outgoing emails |
| `EMAIL_ALLOWLIST` | Comma-separated allowed recipient emails |

---

## Priority Issues to Fix

### 1. Gemini API Key — Leaked / Needs Rotation (HIGH PRIORITY)
The `GEMINI_API_KEY` was shared during an AI assistant session and has been flagged as leaked. It currently returns **403 errors**, which silently breaks:
- **AI eligibility review** on every applicant detail page (`/applicants/:id`)
- **Floating AI chatbot** on every page

**Action**: Generate a new Gemini API key at https://aistudio.google.com/apikey and update it in:
- Vercel environment variables dashboard
- Local `.env` / secrets store

Relevant files:
- `artifacts/api-server/src/services/aiReview.js` — uses Gemini for eligibility analysis
- `artifacts/api-server/src/routes/chat.js` — uses Gemini for the chatbot

---

## Frontend Notes

- Source files are **JSX not TSX** (`artifacts/logos-admissions/src/`)
- API calls from the frontend are **relative** (no hardcoded host) — `VITE_API_URL` defaults to `''`
- Routes: `/` (Dashboard), `/applicants/:id` (ApplicantDetail), `/applicants/:id/acceptance` (AcceptanceLetterPage)
- Brand color: maroon `#7B2D3E`

## API / Build Notes

- Config files (`programs.json`, `system-prompt.txt`) live in `src/config/` and are copied to `dist/config/` at build time via `build.mjs` — if you add new static config files, put them in `src/config/`
- Resend and Gemini clients are initialized lazily (inside functions) so the server starts even when keys are missing
- MachForm webhook: `POST /api/webhook` accepts `Content-Type: text/plain` with URL-encoded body
