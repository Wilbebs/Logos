# LOGOS University — Admissions Dashboard

An internal admissions management system for **Universidad Cristiana Logos**, a Christian theological university processing hundreds of applications per semester. The system automates eligibility screening, AI-assisted review, decision tracking, acceptance letter generation, and cloud document storage — replacing a previously manual process.

**Live:** [logos-murex-mu.vercel.app](https://logos-murex-mu.vercel.app)  
**Backend:** [logos-production-c920.up.railway.app](https://logos-production-c920.up.railway.app)

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Database Schema](#database-schema)
5. [Environment Variables](#environment-variables)
6. [API Reference](#api-reference)
7. [Running Locally](#running-locally)
8. [Deployment](#deployment)

---

## Features

### 1. Webhook-Driven Form Ingestion
Applicants submit **three MachForm forms** during the admissions process. Each form fires a webhook to the server the moment it is submitted.

| # | Form | Filed by |
|---|------|----------|
| 1 | Solicitud Oficial de Admisión | Applicant — personal info, education, program, budget |
| 2 | Formulario de Recomendación Pastoral | Applicant's pastor — character/spiritual reference |
| 3 | Formulario de Experiencia Ministerial | Applicant — ministry background and church involvement |

- Applicants are matched across all three forms by **email address**
- Each form's raw JSON is stored in `form_submissions` for audit
- `forms_complete` is set to `true` once all three are received, which triggers the eligibility engine automatically

---

### 2. Eligibility Engine
A multi-gate rule engine runs automatically when all three forms are received. Gates run in sequence; a failure at any gate short-circuits the rest.

**Gate 1 — Financial Check**
- `$25–$50/month` → institute/certificate programs only
- `$50–$100/month` → undergraduate programs (associate/bachelor)
- No budget → graduate programs permitted
- Budget mismatch → immediately flagged with a suggested alternative program

**Gate 2 — Document Check**
- Bachelor's programs require transcripts + diploma if prior education was reported
- Master's and Doctorate always require transcripts + undergraduate diploma
- Missing documents → flagged with a specific list of what is missing

**Gate 3 — Academic Eligibility**
- Auto-approve: open enrollment programs (institute, certificate, associate)
- Auto-reject: PhD without an existing Th.D. or D.Min.; graduate programs without minimum education and experience
- Flag for AI review: edge cases (exceptional ministerial experience, life credit, inexact program match)

Results are written to `eligibility_status` (`eligible` | `ineligible` | `needs_review`) and an `ai_recommendation` field.

---

### 3. AI Review Panel (Gemini)
When the eligibility engine flags an applicant as `needs_review`, the AI review panel in the applicant detail page fetches a full structured analysis from **Gemini 2.5 Flash**.

The panel shows:
- **Recommendation** — Approve / Reject / Escalate
- **Reasoning** — plain-language explanation of the decision
- **Requirements checklist** — each program requirement shown with a ✓ (met) or ✗ (not met) symbol, color-coded green/red, mirroring the requirements checklist logic from the eligibility engine

The checklist is built from the same rules as the eligibility engine so the two views are always consistent.

---

### 4. Dashboard
The main dashboard (`/`) shows all applicants in a filterable, sortable list.

- **Stats bar** — live counts for total applicants, forms complete, pending decision, approved, rejected
- **Tab filters** — All | Needs Review | Forms Complete | Pending Decision | Approved | Rejected
- **Per-row data** — name, email, program, level, form completion (e.g. `3/3`), eligibility badge, AI recommendation chip, decision badge, submission date
- **Click any row** → navigates to the full Applicant Detail page

---

### 5. Applicant Detail Page
A full read/write view for a single applicant, composed of panels:

- **Lead Profile** — photo avatar placeholder, name, email, phone, program, program level, submission dates for all three forms
- **Form Checklist** — visual `✓` / `○` tracker for Forms 1, 2, 3
- **AI Recommendation** — the three-state panel (Loading / Eligible → no panel / Needs Review → full analysis with checklist)
- **Decision Panel** — records Approve / Reject / Request Info decisions with optional notes; once a decision is recorded, a **Revoke** button allows resetting to `pending`
- **File Attachments** — four-tab cloud storage panel (see feature 7)
- **Acceptance Letter shortcut** — once approved, a "Next Step" panel appears in the sidebar with a link to compose the acceptance letter

---

### 6. Decision Recording & Email Triggers
Admissions staff record decisions from the Decision Panel:

- Decisions: **Approved**, **Rejected**, **Info Requested**
- Optional free-text notes field
- Decisions are logged with a `decision_by` name and `decision_at` timestamp
- Each decision automatically **triggers a Spanish-language email** to the applicant via Resend
- Decisions can be **revoked** (reset to pending) without losing prior decision notes

---

### 7. Cloud File Storage (Four Categories)
The File Attachments panel on each applicant detail page provides categorized cloud storage backed by **Supabase Storage** (`applicant-files` bucket).

| Tab | Category key | Purpose |
|-----|-------------|---------|
| 📄 Applicant Docs | `applicant_documents` | Transcripts, diplomas, IDs uploaded by the team |
| 📝 Admission Docs | `admission_documents` | Acceptance letters, enrollment forms generated by LOGOS |
| 📎 Other | `other` | Anything else |
| ✉ Communications | — | Read-only log of all emails sent through the system |

**Upload features:**
- Drag-and-drop or click-to-browse
- Max 20 MB per file; accepted types: PDF, Word, Excel, JPEG, PNG, GIF, WebP
- Category selector (pill buttons) before upload; file is stored under that category path
- Files stored at `applicants/{applicant_id}/{category}/{timestamp}-{filename}`
- File metadata (name, URL, size, type, category) saved to `applicant_files` table

**Communications log:**
- Shows every email sent via the system for that applicant
- Displays: type, status badge (sent = green, blocked = yellow, failed = red), from/to addresses, subject, expandable body text
- Ordered by most recent first

> **Note:** File uploads require `SUPABASE_SERVICE_ROLE_KEY` in Railway env vars. The server uses a dedicated admin Supabase client to bypass RLS for storage writes.

---

### 8. AI Chatbot with Fuzzy Search
A floating `✦` button on every page opens a full-featured admissions assistant chatbot powered by **Gemini 2.5 Flash**.

**Capabilities:**
- Look up any applicant by name, email, or partial email descriptor (e.g. `test-phd-approve`)
- Fuzzy name recovery — if a name isn't found exactly, the bot strips suffixes, retries with partial email matching, and suggests "Did you mean [name]?" with the closest match
- Report eligibility status, AI recommendation, decision, program details
- Show a **requirements checklist** (same ✓/✗ format as the AI panel) for any applicant when asked
- Answer aggregate questions: "How many applicants need review?", "How many are approved?"
- Return a clickable **"Open Application →"** link for any named applicant

The chatbot uses Gemini function calling (`query_applicants`, `get_applicant_details`) to fetch live data from Supabase rather than hallucinating.

---

### 9. Acceptance Letter Flow
A dedicated compose page at `/applicants/:id/acceptance` (accessible only for approved applicants).

**Layout — Email containing a document:**
The page is structured as an email composer with the acceptance letter embedded as an inline document inside the email body:

1. **Email envelope** — From / To / Subject fields (all editable)
2. **Email body** (rendered email view):
   - LOGOS blue header stripe with university branding
   - **Preamble** — editable intro text (auto-filled with a polite template, will become fully templated)
   - **Filename pill** — `📄 Acceptance_Letter_Name.docx · attached`
   - **Word document shell** — white paper page with drop shadow, Georgia serif font, 12pt/1.8 line-height, 72px margins — looks like a real Word document
   - **Sign-off** — editable closing text (auto-filled with a blessing and contact info)
3. **Send bar** — Cancel + Send Letter button

**Generation:** The "Generate Letter" button calls Gemini to draft a warm, formal acceptance letter in plain English, personalized with the applicant's name, program, and decision notes.

**Sending:** The "Send Letter" button:
- Sends the email via Resend with the full email body (preamble + letter + sign-off)
- Generates a `.docx` Word document from the letter body using the `docx` npm package
- Attaches the `.docx` to the email
- Saves the `.docx` to Supabase Storage under `admission_documents`
- Logs the send to `email_log` with full content
- Protected by an **email allowlist** — only allowlisted addresses receive real emails during development

**Navigation:** Protected by the admission timeline (see feature 10). Blocked sends show a warning screen.

---

### 10. Admission Timeline Navigation
A sticky bar fixed to the bottom of both the Applicant Detail page and the Acceptance Letter page. Visible only when an applicant is **approved**.

- Shows all steps in the admission flow with progress indicators
- Current step: blue ring
- Completed steps: green ✓
- All steps are clickable for back-and-forth navigation

Current steps:
1. Application (`/applicants/:id`)
2. Acceptance Letter (`/applicants/:id/acceptance`)

More steps (enrollment paperwork, tuition, orientation) can be added to the `STEPS` array in `AdmissionTimeline.jsx` as the workflow expands.

---

### 11. Spanish-Language Email Templates
Six automated email templates sent via **Resend**. All emails are in Spanish and personalized with the applicant's name and program.

| Trigger | Template |
|---------|---------|
| Form 1 received | Confirmation of application receipt |
| All 3 forms received | Confirmation that review has begun |
| Approved | Approval notification with next steps |
| Rejected | Rejection with encouragement |
| Info Requested | Request for additional information |
| Acceptance Letter | Formal letter with .docx attachment |

Development guard: `EMAIL_ALLOWLIST` env var restricts real sends to listed addresses.

---

## Architecture

```mermaid
graph TD
    subgraph "Frontend — Vercel"
        A[React + Vite + Tailwind]
        A --> B[Dashboard]
        A --> C[ApplicantDetail]
        A --> D[AcceptanceLetterPage]
    end

    subgraph "Backend — Railway (Node.js/Express)"
        E[/api/applicants]
        F[/api/applicants/:id/acceptance]
        G[/api/chat]
        H[/webhook/machform/1,2,3]
        I[/api/email]
    end

    subgraph "Services"
        J[eligibility.js — rule engine]
        K[aiReview.js — Claude eligibility]
        L[emailService.js — Resend templates]
    end

    subgraph "External APIs"
        M[Gemini 2.5 Flash — chat + letter gen]
        N[Resend — email delivery]
        O[MachForm — form webhooks]
    end

    subgraph "Supabase"
        P[(Postgres DB)]
        Q[Storage: applicant-files bucket]
    end

    B & C & D -->|REST| E & F & G
    O -->|POST webhook| H
    H --> J --> K
    K -->|Claude API| R[Anthropic]
    H & E --> L --> N
    F --> M
    G --> M
    E & F & G & H --> P
    E & F --> Q
```

---

## File Structure

```
Logos/
│
├── README.md                          # This file
├── .env.example                       # Environment variable template
├── .gitignore
├── vercel.json                        # Root-level Vercel routing (unused — client/ has its own)
│
├── WebForms/                          # Source PDFs of all three MachForm forms
│   ├── Form1_Solicitud_Admision.pdf
│   ├── Form2_Recomendacion_Pastoral.pdf
│   ├── Form3_Experiencia_Ministerial.pdf
│   └── FIELD_REFERENCE.md             # Field-by-field mapping of all form fields to DB columns
│
├── config/                            # Shared config (mirrored into server/config/)
│   ├── programs.json                  # 28 LOGOS programs with eligibility rules, costs, requirements
│   └── system-prompt.txt              # System prompt for the Claude/Gemini AI review calls
│
├── tests/                             # PowerShell test scripts for local testing
│   ├── webhook-test.ps1               # Fire test webhook payloads at the local server
│   ├── ai-test.ps1                    # Test AI review logic with sample applicants
│   ├── real-world-tests.ps1           # End-to-end test scenarios
│   └── check-results.ps1              # Query DB and assert expected outcomes
│
├── calculator/                        # Standalone Next.js tuition calculator (separate app)
│   └── src/pages/index.tsx            # Eligibility + cost estimator UI
│
│
├── server/                            # Node.js / Express backend (deployed to Railway)
│   ├── index.js                       # Express app entry point — mounts all routers, CORS, health check
│   ├── package.json                   # Dependencies: express, supabase-js, multer, resend, docx, @google/generative-ai
│   ├── .env                           # Local credentials (never committed)
│   │
│   ├── config/
│   │   ├── programs.json              # 28 programs — same file as root config/, kept in sync manually
│   │   └── system-prompt.txt          # AI review system prompt
│   │
│   ├── db/
│   │   ├── schema.sql                 # Full Postgres schema — run once in Supabase SQL Editor
│   │   └── client.js                  # Two Supabase clients:
│   │                                  #   supabase (anon key) — all DB queries
│   │                                  #   supabaseAdmin (service role key) — storage uploads (bypasses RLS)
│   │
│   ├── routes/
│   │   ├── applicants.js              # /api/applicants — full CRUD + file upload/delete + communications log
│   │   │                              #   GET  /api/applicants           — list with filters
│   │   │                              #   GET  /api/applicants/stats      — aggregate counts
│   │   │                              #   GET  /api/applicants/:id        — single applicant + form data
│   │   │                              #   PATCH /api/applicants/:id/decision — record decision
│   │   │                              #   GET  /api/applicants/:id/files  — list uploaded files
│   │   │                              #   POST /api/applicants/:id/files  — upload file (multipart)
│   │   │                              #   DELETE /api/applicants/:id/files/:fileId — delete file
│   │   │                              #   GET  /api/applicants/:id/communications — email log
│   │   │
│   │   ├── acceptance.js              # /api/applicants/:id/acceptance — letter generation + send
│   │   │                              #   POST /:id/acceptance/generate  — Gemini drafts letter, returns {subject, body}
│   │   │                              #   POST /:id/acceptance/send      — sends email + .docx via Resend,
│   │   │                              #                                    saves .docx to Supabase Storage,
│   │   │                              #                                    logs to email_log
│   │   │
│   │   ├── chat.js                    # /api/chat — Gemini-powered admissions assistant chatbot
│   │   │                              #   POST /api/chat — stateless, receives message + history,
│   │   │                              #                    uses function calling to query Supabase live
│   │   │
│   │   ├── email.js                   # /api/email — manual email resend endpoint
│   │   │                              #   POST /api/email/resend/:applicantId
│   │   │
│   │   └── webhook.js                 # /webhook/machform/1,2,3 — MachForm webhook receivers
│   │                                  #   Validates HMAC signature, upserts applicant by email,
│   │                                  #   stores raw JSON in form_submissions,
│   │                                  #   triggers eligibility engine once all 3 forms received
│   │
│   └── services/
│       ├── eligibility.js             # Three-gate rule engine (financial → document → academic)
│       │                              #   Returns: { status, recommendation, reasoning, checklist }
│       │                              #   Reads program rules from config/programs.json
│       │
│       ├── aiReview.js                # Sends low-confidence applicants to Gemini for deeper analysis
│       │                              #   Formats a structured prompt with all applicant data
│       │                              #   Returns parsed recommendation + reasoning
│       │
│       └── emailService.js            # Resend integration — 6 Spanish email templates
│                                      #   logEmail() — writes to email_log with full content
│                                      #   EMAIL_ALLOWLIST guard — blocks real sends in dev
│
│
└── client/                            # React + Vite frontend (deployed to Vercel)
    ├── index.html
    ├── package.json                   # Dependencies: react, react-router-dom, tailwindcss, vite
    ├── vite.config.js                 # Proxy /api → backend in dev, VITE_API_URL in prod
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── vercel.json                    # Vercel SPA routing — all paths → index.html
    │
    └── src/
        ├── main.jsx                   # React entry point
        ├── index.css                  # Tailwind base styles
        │
        ├── App.jsx                    # React Router setup
        │                             #   /                         → Dashboard
        │                             #   /applicants/:id           → ApplicantDetail
        │                             #   /applicants/:id/acceptance → AcceptanceLetterPage
        │
        ├── pages/
        │   ├── Dashboard.jsx          # Main list view
        │   │                         #   Stats bar (total / complete / pending / approved / rejected)
        │   │                         #   Tab filters (All | Needs Review | Forms Complete | ...)
        │   │                         #   Applicant rows — click to navigate to detail
        │   │
        │   ├── ApplicantDetail.jsx    # Full applicant read/write view
        │   │                         #   Composes all panels: LeadProfile, FormChecklist,
        │   │                         #   AIRecommendation, DecisionPanel, FileAttachments,
        │   │                         #   AcceptanceLetter (sidebar next-step card when approved)
        │   │                         #   AdmissionTimeline (sticky bottom, when approved)
        │   │
        │   └── AcceptanceLetterPage.jsx  # Acceptance letter compose page
        │                                #   Email envelope (From/To/Subject)
        │                                #   Email body container with:
        │                                #     - Editable preamble text
        │                                #     - Word document shell (DocShell component)
        │                                #     - Editable sign-off text
        │                                #   Generate Letter button → Gemini
        │                                #   Send Letter button → POST /acceptance/send
        │
        └── components/
            ├── AIRecommendation.jsx   # AI review panel — three states:
            │                         #   loading spinner | eligible (hidden) | needs_review (full analysis)
            │                         #   Shows recommendation chip + reasoning + ✓/✗ requirements checklist
            │
            ├── AcceptanceLetter.jsx   # Sidebar "Next Step" card (shown when decision = approved)
            │                         #   Mini admission mini-timeline + "Compose Acceptance Letter" button
            │
            ├── AdmissionTimeline.jsx  # Sticky bottom navigation bar for the admission flow
            │                         #   Steps: Application → Acceptance Letter (more coming)
            │                         #   All steps clickable; current = blue, done = green ✓, future = grey
            │
            ├── ChatBot.jsx            # Floating ✦ chatbot button + panel
            │                         #   Gemini function-calling chatbot
            │                         #   Fuzzy applicant search (name + email partial match)
            │                         #   "Did you mean?" recovery for misspelled names
            │                         #   Requirements checklist rendering (✓/✗ with color)
            │                         #   Clickable "Open Application →" links in responses
            │
            ├── FileAttachments.jsx    # Cloud file storage panel — four tabs:
            │                         #   Applicant Docs | Admission Docs | Other | Communications
            │                         #   Upload zone with drag-and-drop + category selector
            │                         #   Communications tab: read-only email log with expandable bodies
            │
            ├── FormChecklist.jsx      # Form 1/2/3 completion tracker — shows submitted date or ○ pending
            │
            ├── LeadProfile.jsx        # Applicant info card (name, email, phone, program, dates)
            │
            └── StatusBadge.jsx        # Reusable eligibility and decision status pills
```

---

## Database Schema

Four tables in Supabase Postgres. Run `server/db/schema.sql` once in the Supabase SQL Editor.

### `applicants`
One row per applicant. The central record.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | Auto-generated |
| `email` | text UNIQUE | Primary identifier linking all three forms |
| `full_name` | text | |
| `phone` | text | |
| `program_applied` | text | e.g. "Master of Divinity (M.Div)" |
| `program_level` | text | `institute` \| `certificate` \| `associate` \| `bachelors` \| `masters` \| `doctorate` |
| `form1_submitted_at` | timestamptz | |
| `form2_submitted_at` | timestamptz | |
| `form3_submitted_at` | timestamptz | |
| `forms_complete` | boolean | True when all 3 forms received |
| `eligibility_status` | text | `pending` \| `eligible` \| `ineligible` \| `needs_review` |
| `ai_recommendation` | text | `approve` \| `reject` \| `escalate` |
| `ai_reasoning` | text | Plain-language explanation from AI |
| `decision` | text | `pending` \| `approved` \| `rejected` \| `info_requested` |
| `decision_by` | text | Staff member name |
| `decision_at` | timestamptz | |
| `decision_notes` | text | |
| `created_at` / `updated_at` | timestamptz | Auto-managed |

### `form_submissions`
Raw JSON from each MachForm webhook payload.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `applicant_id` | uuid FK | References `applicants` |
| `form_number` | integer | 1, 2, or 3 |
| `submitted_at` | timestamptz | |
| `raw_data` | jsonb | Full webhook payload |

### `applicant_files`
Metadata for files stored in Supabase Storage.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `applicant_id` | uuid FK | |
| `file_name` | text | Original filename |
| `file_path` | text | Storage path: `applicants/{id}/{category}/{ts}-{name}` |
| `file_url` | text | Public URL |
| `file_size` | bigint | Bytes |
| `file_type` | text | MIME type |
| `category` | text | `applicant_documents` \| `admission_documents` \| `other` |
| `uploaded_by` | text | `admissions_team` or `system` |
| `uploaded_at` | timestamptz | |

### `email_log`
Record of every email sent (or blocked) through the system.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `applicant_id` | uuid FK | |
| `email_type` | text | `acceptance_letter`, `approved`, `rejected`, etc. |
| `status` | text | `sent` \| `blocked` \| `failed` |
| `subject` | text | Email subject line |
| `body_text` | text | Full email body |
| `from_address` | text | |
| `to_address` | text | |
| `sent_at` | timestamptz | |

> **Migration note:** If you created the schema before the file storage and acceptance letter features were added, run these in the SQL editor:
> ```sql
> ALTER TABLE applicant_files ADD COLUMN IF NOT EXISTS category text DEFAULT 'applicant_documents';
> ALTER TABLE email_log ADD COLUMN IF NOT EXISTS subject text;
> ALTER TABLE email_log ADD COLUMN IF NOT EXISTS body_text text;
> ALTER TABLE email_log ADD COLUMN IF NOT EXISTS from_address text;
> ALTER TABLE email_log ADD COLUMN IF NOT EXISTS to_address text;
> ```

---

## Environment Variables

### Server (`server/.env` or Railway env vars)

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key (DB queries) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key — bypasses RLS for storage uploads. **Server-side only. Never expose to frontend.** |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key — used for chatbot and acceptance letter generation |
| `ANTHROPIC_API_KEY` | ⬜ | Anthropic Claude API key — used for eligibility AI review (legacy path) |
| `RESEND_API_KEY` | ✅ | Resend email API key |
| `RESEND_FROM_EMAIL` | ✅ | Verified sender address (e.g. `admissions@logos.edu`) |
| `EMAIL_ALLOWLIST` | ✅ | Comma-separated list of emails that can receive real emails during development (e.g. `you@gmail.com`) |
| `WEBHOOK_SECRET` | ✅ | Shared secret for HMAC verification of MachForm webhooks |
| `PORT` | ⬜ | Backend port (default `3001`) |
| `ADMISSIONS_EMAIL` | ⬜ | Internal team email for admin notifications |
| `FORM_2_URL` | ⬜ | Public URL to Form 2 (included in Form 1 confirmation email) |
| `FORM_3_URL` | ⬜ | Public URL to Form 3 (included in Form 1 confirmation email) |

### Frontend (`client/.env.local` or Vercel env vars)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ (prod) | Full backend URL (e.g. `https://logos-production-c920.up.railway.app`). Empty string in dev (Vite proxy handles it). |

---

## API Reference

### Applicants

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/applicants` | List all applicants. Query: `?status=`, `?forms_complete=true/false` |
| GET | `/api/applicants/stats` | Aggregate counts for the dashboard stats bar |
| GET | `/api/applicants/:id` | Single applicant with all form submission data |
| PATCH | `/api/applicants/:id/decision` | Record a decision; triggers email. Body: `{ decision, decision_notes, decision_by }` |
| GET | `/api/applicants/:id/files` | List uploaded files for the applicant |
| POST | `/api/applicants/:id/files` | Upload a file. `multipart/form-data` with `file` + `category` fields |
| DELETE | `/api/applicants/:id/files/:fileId` | Delete a file from storage + DB |
| GET | `/api/applicants/:id/communications` | Fetch email log for the applicant |

### Acceptance Letter

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/applicants/:id/acceptance/generate` | Generate letter with Gemini. Returns `{ subject, body }` |
| POST | `/api/applicants/:id/acceptance/send` | Send letter email + attach .docx. Body: `{ from, to, subject, body, emailPreamble, emailSignoff }` |

### Chat

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Stateless chat message. Body: `{ message, history[] }`. Returns `{ reply }` |

### Email

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/email/resend/:applicantId` | Manually resend an email for an applicant |

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhook/machform/1` | Form 1 — Solicitud de Admisión |
| POST | `/webhook/machform/2` | Form 2 — Recomendación Pastoral |
| POST | `/webhook/machform/3` | Form 3 — Experiencia Ministerial |

---

## Running Locally

```bash
# Terminal 1 — Backend
cd server
cp ../.env.example .env      # fill in your credentials
npm install
npm run dev
# → http://localhost:3001
# → http://localhost:3001/health  (health check)

# Terminal 2 — Frontend
cd client
npm install
npm run dev
# → http://localhost:5173
```

The Vite dev server proxies `/api` and `/webhook` to `localhost:3001` automatically (see `vite.config.js`). No `VITE_API_URL` needed locally.

---

## Deployment

### Backend → Railway

1. Connect your GitHub repo to [Railway](https://railway.app)
2. Set **Root Directory** to `/server`
3. Set **Start Command** to `node index.js` (or `npm start`)
4. Add all environment variables from the table above under **Settings → Variables**
5. Railway auto-deploys on every push to `main`

### Frontend → Vercel

1. Connect your GitHub repo to [Vercel](https://vercel.com)
2. Set **Root Directory** to `client`
3. Set **Framework Preset** to `Vite`
4. Add `VITE_API_URL` pointing to your Railway backend URL
5. Vercel auto-deploys on every push to `main`

### Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `server/db/schema.sql` in the SQL Editor
3. Create a storage bucket named `applicant-files` (public or private)
4. Copy your project URL, anon key, and service role key into Railway env vars
5. The service role key is under **Project Settings → API → service_role** — never put it in the frontend

### MachForm Webhook Configuration

Configure each form in MachForm → **Integrations → Webhook**:

| Form | Webhook URL | Header |
|------|-------------|--------|
| Solicitud de Admisión | `https://YOUR-RAILWAY-URL/webhook/machform/1` | `X-Webhook-Secret: <WEBHOOK_SECRET>` |
| Recomendación Pastoral | `https://YOUR-RAILWAY-URL/webhook/machform/2` | `X-Webhook-Secret: <WEBHOOK_SECRET>` |
| Experiencia Ministerial | `https://YOUR-RAILWAY-URL/webhook/machform/3` | `X-Webhook-Secret: <WEBHOOK_SECRET>` |

The applicant's **email address** is used to link all three forms to the same record. No hidden fields needed.

---

## Notes for Replit

- The project is a **monorepo** with separate `server/` and `client/` directories — each has its own `package.json` and `node_modules`
- Run both concurrently or use Replit's multi-pane terminal
- `VITE_API_URL` should be empty string in development (Vite proxy handles `/api` routing)
- The `calculator/` directory is a separate standalone Next.js app — ignore it unless working on the tuition calculator
- `WebForms/` contains PDF source files for reference — not served by any route
- All AI features (chatbot, letter generation, eligibility review) require a `GEMINI_API_KEY`
- File uploads will fail with an RLS error unless `SUPABASE_SERVICE_ROLE_KEY` is set — this is expected in dev if you haven't set it
- The `EMAIL_ALLOWLIST` env var prevents accidental emails to real applicants — add your own email to test sends
