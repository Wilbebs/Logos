-- LOGOS University Admissions Dashboard
-- Database Schema for Supabase (Postgres)
-- Run this in the Supabase SQL editor to set up the schema.

-- ============================================================
-- applicants table
-- ============================================================
CREATE TABLE IF NOT EXISTS applicants (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email               text UNIQUE NOT NULL,
  full_name           text,
  phone               text,
  program_applied     text,
  program_level       text,          -- institute | certificate | associate | bachelors | masters | doctorate
  form1_submitted_at  timestamptz,
  form2_submitted_at  timestamptz,
  form3_submitted_at  timestamptz,
  forms_complete      boolean DEFAULT false,
  eligibility_status  text DEFAULT 'pending',   -- pending | eligible | ineligible | needs_review
  ai_recommendation   text,
  ai_reasoning        text,
  decision            text DEFAULT 'pending',   -- pending | approved | rejected | info_requested
  decision_by         text,
  decision_at         timestamptz,
  decision_notes      text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- ============================================================
-- form_submissions table
-- ============================================================
CREATE TABLE IF NOT EXISTS form_submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id  uuid REFERENCES applicants(id) ON DELETE CASCADE,
  form_number   integer NOT NULL,   -- 1, 2, or 3
  submitted_at  timestamptz DEFAULT now(),
  raw_data      jsonb
);

-- ============================================================
-- email_log table
-- ============================================================
CREATE TABLE IF NOT EXISTS email_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id  uuid REFERENCES applicants(id) ON DELETE CASCADE,
  email_type    text,
  sent_at       timestamptz DEFAULT now(),
  status        text
);

-- ============================================================
-- updated_at auto-update trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS applicants_updated_at ON applicants;
CREATE TRIGGER applicants_updated_at
  BEFORE UPDATE ON applicants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Indexes for common query patterns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_applicants_email              ON applicants (email);
CREATE INDEX IF NOT EXISTS idx_applicants_eligibility_status ON applicants (eligibility_status);
CREATE INDEX IF NOT EXISTS idx_applicants_decision           ON applicants (decision);
CREATE INDEX IF NOT EXISTS idx_applicants_forms_complete     ON applicants (forms_complete);
CREATE INDEX IF NOT EXISTS idx_applicants_created_at         ON applicants (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_applicant_id ON form_submissions (applicant_id);
CREATE INDEX IF NOT EXISTS idx_email_log_applicant_id        ON email_log (applicant_id);

-- ─── applicant_files ──────────────────────────────────────────────────────────
-- Stores metadata for files uploaded by the team or applicant (transcripts,
-- diplomas, supporting documents). The actual files live in Supabase Storage
-- under the "applicant-files" bucket at path applicants/{applicant_id}/{filename}.
CREATE TABLE IF NOT EXISTS applicant_files (
  id            uuid primary key default gen_random_uuid(),
  applicant_id  uuid references applicants(id) on delete cascade,
  file_name     text not null,          -- original filename as uploaded
  file_path     text not null,          -- storage path: applicants/{id}/{timestamp}-{name}
  file_url      text,                   -- public or signed URL for direct access
  file_size     bigint,                 -- bytes
  file_type     text,                   -- MIME type
  uploaded_by   text default 'admissions_team',
  uploaded_at   timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_applicant_files_applicant_id ON applicant_files (applicant_id);

-- ─── Supabase Storage setup note ─────────────────────────────────────────────
-- After running this schema, create the storage bucket in Supabase:
--   Dashboard → Storage → New bucket
--   Name: applicant-files
--   Public: true  (files accessible via public URL)
--   OR
--   Public: false (use signed URLs — update getPublicUrl → createSignedUrl in applicants.js)
-- Recommended: keep private and use signed URLs for sensitive documents.
