# LOGOS University — Admissions Dashboard

An internal admissions management system for **Universidad Cristiana Logos**, a theological university processing ~500 applications per semester. The dashboard automates eligibility screening, AI-assisted review, and decision tracking for the admissions team.

---

## Project Goal

Applicants submit three MachForm forms across the admissions process. Previously, the admissions team had to manually review each form, assess eligibility, and coordinate decisions by hand. This system:

- **Ingests** all three forms automatically via webhooks the moment an applicant submits them
- **Screens** applicants against financial capacity, document requirements, and academic eligibility rules
- **Flags** edge cases for AI review using Claude (claude-sonnet-4-6)
- **Presents** a unified dashboard where the admissions team can review applicants, see AI recommendations, attach files, and record decisions
- **Sends** automated Spanish-language emails at each stage (form received, approved, rejected, info requested)

---

## The Three Forms

All forms are in MachForm. Each fires a webhook to this server when submitted. Email is used to link all three forms to the same applicant record.

| # | Form | Filled by | Purpose |
|---|------|-----------|---------|
| 1 | Solicitud Oficial de Admisión Estados Unidos y el Mundo | Applicant | Main application — personal info, education history, program selection, budget, documents |
| 2 | Formulario de Recomendación Pastoral | Applicant's pastor | Character and spiritual reference |
| 3 | Formulario de Experiencia Ministerial | Applicant | Ministerial background, church involvement, professional experience |

Full field-by-field reference: [`WebForms/FIELD_REFERENCE.md`](WebForms/FIELD_REFERENCE.md)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js + Express (ES modules) |
| **Database** | Supabase (Postgres) |
| **File Storage** | Supabase Storage (`applicant-files` bucket) |
| **Frontend** | React + Vite + Tailwind CSS |
| **AI Review** | Anthropic Claude API (`claude-sonnet-4-6`) |
| **Email** | Resend API (Spanish-language transactional emails) |
| **Forms** | MachForm (existing forms, webhook integration) |

---

## How the Pipeline Works

```
Applicant submits form → MachForm webhook → POST /webhook/machform/1 (2 or 3)
                                                         ↓
                                              Upsert applicant by email
                                              Store raw form data
                                                         ↓
                                         All 3 forms received?
                                              ↓ YES
                                    Run eligibility engine
                                    ┌────────────────────┐
                                    │ 1. Financial check  │ → Budget vs program cost
                                    │ 2. Document check   │ → Transcripts / diplomas
                                    │ 3. Academic check   │ → Education level / experience
                                    └────────────────────┘
                                              ↓
                               Low confidence or edge case?
                                    ↓ YES         ↓ NO
                              AI Review        Save result
                           (Claude API)             ↓
                                    ↓         Dashboard shows
                              Save AI result   eligible / ineligible
                                              ↓
                                    Send Spanish email
                                    Admissions team reviews dashboard
                                    Records decision → sends decision email
```

### Eligibility Rules

**Financial gate** (runs first):
- `$25–$50/month` → institute / certificate programs only
- `$50–$100/month` → undergraduate programs (associate / bachelor)
- No budget selected → no constraint assumed (graduate programs permitted)
- Mismatch → flagged with suggested alternative program, no AI call needed

**Document gate** (runs second):
- Bachelor's programs → transcripts + diploma required (if prior education reported)
- Master's / Doctorate → transcripts + undergraduate diploma always required
- Missing docs → flagged with specific list, no AI call needed

**Academic gate** (runs third):
- Auto-approve: open enrollment programs (institute, certificate, associate)
- Auto-reject: PhD without existing Th.D. or D.Min.; Masters/Doctorate without minimum education AND experience
- Flag for review: edge cases (life experience credit, exceptional ministerial experience, inexact program match)
- AI review: triggered for low-confidence or needs_review cases

---

## Project Structure

```
/
├── README.md
├── .env.example                  # Environment variable template
├── WebForms/                     # PDF copies of all 3 MachForm forms + field reference
│   ├── Form1_Solicitud_Admision.pdf
│   ├── Form2_Recomendacion_Pastoral.pdf
│   ├── Form3_Experiencia_Ministerial.pdf
│   └── FIELD_REFERENCE.md
├── config/
│   ├── programs.json             # 28 LOGOS programs with eligibility rules
│   └── system-prompt.txt         # Claude AI review system prompt
├── server/
│   ├── index.js                  # Express entry point
│   ├── package.json
│   ├── .env                      # Local credentials (not committed to git)
│   ├── db/
│   │   ├── schema.sql            # Run once in Supabase SQL editor
│   │   └── client.js             # Supabase client singleton
│   ├── routes/
│   │   ├── applicants.js         # /api/applicants CRUD + file upload/delete
│   │   ├── email.js              # /api/email manual resend
│   │   └── webhook.js            # /webhook/machform/1, /2, /3
│   └── services/
│       ├── eligibility.js        # Rule engine (financial + document + academic)
│       ├── aiReview.js           # Claude API integration
│       └── emailService.js       # Resend — 6 Spanish email templates
└── client/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── pages/
        │   ├── Dashboard.jsx     # Applicant list, stats, filters
        │   └── ApplicantDetail.jsx
        └── components/
            ├── LeadProfile.jsx       # Auto-generated applicant profile card
            ├── FileAttachments.jsx   # Upload / view / delete documents
            ├── AIRecommendation.jsx  # AI review panel (3 states)
            ├── FormChecklist.jsx     # Form 1/2/3 completion tracker
            └── StatusBadge.jsx       # Eligibility + decision badges
```

---

## Setup Progress

### ✅ Step 1 — Supabase
- Project created at [supabase.com](https://supabase.com)
- Schema run in SQL Editor (`server/db/schema.sql`) — 4 tables created:
  - `applicants` — one row per applicant, tracks all eligibility/decision fields
  - `form_submissions` — raw JSON from each form submission
  - `email_log` — record of all emails sent
  - `applicant_files` — metadata for uploaded files
- Storage bucket `applicant-files` created
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` added to `server/.env`

### ✅ Step 2 — Local Development Running
- Backend running: `http://localhost:3001`
- Frontend running: `http://localhost:5173`
- Dashboard loads and connects to Supabase (0 applicants — empty DB is correct)

### ⬜ Step 3 — Anthropic API Key
- Sign up / log in at [console.anthropic.com](https://console.anthropic.com)
- Create an API key
- Add to `server/.env`: `ANTHROPIC_API_KEY=sk-ant-...`
- Required for AI eligibility review on edge cases

### ⬜ Step 4 — Resend API Key (Email)
- Sign up at [resend.com](https://resend.com)
- Verify your sending domain (e.g. `logos.edu`)
- Create an API key
- Add to `server/.env`:
  ```
  RESEND_API_KEY=re_...
  RESEND_FROM_EMAIL=admissions@logos.edu
  ```
- Required for automated Spanish-language emails to applicants

### ⬜ Step 5 — MachForm Webhook Configuration
Configure each form in MachForm → **Integrations → Webhook**:

| Form | Webhook URL | Header |
|------|-------------|--------|
| Solicitud de Admisión | `https://YOUR-SERVER/webhook/machform/1` | `X-Webhook-Secret: <WEBHOOK_SECRET>` |
| Recomendación Pastoral | `https://YOUR-SERVER/webhook/machform/2` | `X-Webhook-Secret: <WEBHOOK_SECRET>` |
| Experiencia Ministerial | `https://YOUR-SERVER/webhook/machform/3` | `X-Webhook-Secret: <WEBHOOK_SECRET>` |

No hidden fields needed — the URL itself identifies which form.
The applicant's **email field** is used to link all 3 forms to one record.

### ⬜ Step 6 — Deploy to a Public Server
Options:
- **Railway** (recommended) — connect GitHub repo, set root to `/server`, add env vars in dashboard
- **Render** — similar process, free tier available
- **VPS** (DigitalOcean, etc.) — manual Node.js setup

Once deployed, update the MachForm webhook URLs from `localhost` to your public domain.

---

## Environment Variables

Copy `.env.example` to `server/.env` and fill in all values:

| Variable | Description | Status |
|----------|-------------|--------|
| `SUPABASE_URL` | Supabase project URL | ✅ Set |
| `SUPABASE_ANON_KEY` | Supabase anon/public key | ✅ Set |
| `ANTHROPIC_API_KEY` | Claude API key | ⬜ Needed |
| `RESEND_API_KEY` | Resend email API key | ⬜ Needed |
| `RESEND_FROM_EMAIL` | Verified sender address | ⬜ Needed |
| `WEBHOOK_SECRET` | Shared secret with MachForm | ✅ Set (default) |
| `PORT` | Backend port (default `3001`) | ✅ Set |
| `ADMISSIONS_EMAIL` | Internal team email for notifications | ⬜ Update |

---

## API Reference

### Applicants

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/applicants` | List all. Supports `?status=` and `?forms_complete=` filters |
| GET | `/api/applicants/stats` | Dashboard aggregate counts |
| GET | `/api/applicants/:id` | Single applicant + all form submissions |
| PATCH | `/api/applicants/:id/decision` | Record decision; triggers email |
| GET | `/api/applicants/:id/files` | List uploaded files |
| POST | `/api/applicants/:id/files` | Upload a file (multipart/form-data) |
| DELETE | `/api/applicants/:id/files/:fileId` | Delete a file |

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhook/machform/1` | Form 1 — Solicitud de Admisión |
| POST | `/webhook/machform/2` | Form 2 — Recomendación Pastoral |
| POST | `/webhook/machform/3` | Form 3 — Experiencia Ministerial |

### Email

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/email/resend/:applicantId` | Manually resend an email |

---

## Running Locally

```bash
# Terminal 1 — Backend
cd server
npm install
npm run dev

# Terminal 2 — Frontend
cd client
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health check: http://localhost:3001/health
