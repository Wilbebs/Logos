import express from 'express';
import supabase, { supabaseAdmin } from '../db/client.js';
import { evaluateEligibility } from '../services/eligibility.js';
import { callAIReview } from '../services/aiReview.js';

// ─────────────────────────────────────────────────────────────────────────────
// MachForm file ingestion
// Files attached to Form 1 are listed by filename in DocumentosParaEvaluaciónSePuedenA.
// We download each from the known MachForm uploads base URL and store in Supabase.
// ─────────────────────────────────────────────────────────────────────────────
const MACHFORM_UPLOADS_BASE = 'https://logoscu.com/forms/uploads/';
const STORAGE_BUCKET = 'applicant-files';

async function ingestMachFormFiles(applicantId, body) {
  const rawField = body['DocumentosParaEvaluaciónSePuedenA']
    || body['DocumentosParaEvaluacionSePuedenA']
    || body['DocumentosParaEvaluaciónSePuedenA']
    || '';

  if (!rawField || rawField.trim() === '-' || rawField.trim() === '') return;

  const filenames = rawField.split(',').map(f => f.trim()).filter(Boolean);
  if (filenames.length === 0) return;

  console.log(`[webhook] Ingesting ${filenames.length} MachForm file(s) for applicant ${applicantId}`);

  for (const filename of filenames) {
    try {
      // Download from MachForm
      const url = MACHFORM_UPLOADS_BASE + encodeURIComponent(filename);
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[webhook] Could not download ${filename}: HTTP ${response.status}`);
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || 'application/octet-stream';

      // Upload to Supabase Storage
      const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `applicants/${applicantId}/applicant_documents/${Date.now()}-${safeFilename}`;

      const { error: uploadErr } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, { contentType, upsert: false });

      if (uploadErr) {
        console.warn(`[webhook] Storage upload failed for ${filename}:`, uploadErr.message);
        continue;
      }

      const { data: urlData } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);

      await supabase.from('applicant_files').insert({
        applicant_id:  applicantId,
        file_name:     filename,
        file_path:     storagePath,
        file_url:      urlData?.publicUrl || null,
        file_size:     buffer.length,
        file_type:     contentType,
        category:      'applicant_documents',
        uploaded_by:   'machform',
      });

      console.log(`[webhook] Ingested ${filename} (${buffer.length} bytes)`);
    } catch (err) {
      console.warn(`[webhook] Failed to ingest ${filename}:`, err.message);
    }
  }
}

// emailService is optional — loaded lazily on first use
let sendEmail = null;
import('../services/emailService.js')
  .then(mod => { sendEmail = mod.sendEmail ?? mod.default?.sendEmail ?? null; })
  .catch(() => { console.warn('[webhook] emailService not found — email triggers will be skipped.'); });

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Field extraction helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Try multiple key names and return the first non-empty value found.
 * MachForm may send field names using the label text, a slugified version,
 * or a custom element name — so we cast a wide net.
 */
function pick(body, ...keys) {
  for (const k of keys) {
    const v = body[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  return null;
}

/**
 * Map the "Study levels / Niveles de Estudio" radio value from the form
 * to our internal program_level enum.
 *
 * Form options:
 *   Certificate - Certificado  → certificate
 *   Diplomado                  → institute
 *   Associate - Técnico Superior → associate
 *   Bachelor - Licenciatura    → bachelors
 *   Master - Maestría          → masters
 *   Doctoral - Doctorado       → doctorate
 */
function mapProgramLevel(raw) {
  if (!raw) return null;
  const v = raw.toLowerCase();
  if (v.includes('certificate') || v.includes('certificado')) return 'certificate';
  if (v.includes('diplomado'))                                  return 'institute';
  if (v.includes('associate') || v.includes('técnico') || v.includes('tecnico')) return 'associate';
  if (v.includes('bachelor')  || v.includes('licenciatura'))   return 'bachelors';
  if (v.includes('master')    || v.includes('maestr'))         return 'masters';
  if (v.includes('doctoral')  || v.includes('doctorado'))      return 'doctorate';
  return raw; // return as-is so the eligibility engine can still attempt a match
}

/**
 * Derive the applicant's highest completed education level from Form 1's
 * university/college sections. The form has separate yes/no dropdowns for
 * Associate, Licenciatura (Bachelor), Maestría (Master), and Doctorado —
 * plus a "Completo Su Escuela Secundaria" field.
 *
 * We check from highest to lowest so the most advanced credential wins.
 */
function deriveHighestEducation(body) {
  function isYes(val) {
    if (!val) return false;
    const s = String(val).toLowerCase().trim();
    // Exact matches
    if (s === 'yes' || s === 'sí' || s === 'si' || s === 'true' || s === '1') return true;
    // MachForm sends phrases like "Si tengo", "Si, complete el estudio", "Sí tengo"
    if (s.startsWith('si ') || s.startsWith('sí ') || s.startsWith('si,') || s.startsWith('sí,')) return true;
    return false;
  }

  // Doctorate
  const doctorado = pick(body,
    'Doctorado', 'Doctorado *', 'doctorado',
    'doctorate', 'has_doctorate'
  );
  if (isYes(doctorado)) return 'doctorate';

  // Masters
  const maestria = pick(body,
    'Maestría', 'Maestría *', 'Maestria', 'Maestria *', 'maestria',
    'masters', 'has_masters'
  );
  if (isYes(maestria)) return 'masters';

  // Bachelor
  const licenciatura = pick(body,
    'Licenciatura', 'Licenciatura *', 'licenciatura',
    'bachelor', 'bachelors', 'has_bachelor'
  );
  if (isYes(licenciatura)) return 'bachelors';

  // Associate
  const associate = pick(body,
    'Associate', 'Associate *', 'associate',
    'tecnico', 'técnico', 'has_associate'
  );
  if (isYes(associate)) return 'associate';

  // High school
  const highSchool = pick(body,
    'CompletoSuEscuelaSecundaria',
    'Completo Su Escuela Secundaria. *',
    'Completo Su Escuela Secundaria.',
    'Completo Su Escuela Secundaria',
    'high_school', 'escuela_secundaria'
  );
  if (isYes(highSchool)) return 'high_school';

  return 'none';
}

/**
 * Detect which documents the applicant checked in the Form 1 document list.
 * The form has a multi-select checkbox with options like:
 *   "Copia del título de Secundaria"
 *   "Hoja de metas educacionales"
 *   "Copia de la Licenciatura"
 *   "Copia del Associate - Técnico"
 *   "Copia del título de postgrado"
 *   "Transcripts - Registros oficiales de Notas de grado"
 *
 * MachForm sends multi-checkbox values as a comma-separated string or as
 * individual checked item labels joined by the field separator.
 * We search the full body for any key whose value mentions the target.
 */
function detectDocuments(body) {
  // Prefer to read only the dedicated document checklist field to avoid false
  // positives from other body values (e.g. an email address containing "transcript").
  const checklistField = pick(body,
    'MarqueLosDocumentosQueEstaIncluyen',
    'MarqueLosDocumentosQueEstáIncluyen',
    'Marque los documentos que está incluyendo',
    'documents_checklist'
  );

  // Fall back to scanning all values only when no dedicated field is present
  // (e.g. legacy or alternate MachForm configurations).
  const searchable = checklistField
    ? checklistField.toLowerCase()
    : Object.values(body)
        .filter(v => {
          const s = String(v).toLowerCase();
          // Exclude obvious non-document fields to prevent false positives
          return !s.includes('@') && !s.includes('http');
        })
        .map(v => String(v).toLowerCase())
        .join(' | ');

  const submitted_transcripts =
    searchable.includes('transcript') ||
    searchable.includes('registros oficiales');

  // Matches any diploma: high school diploma, bachelor's/licenciatura, etc.
  const submitted_diploma =
    searchable.includes('licenciatura') ||
    searchable.includes('bachelor') ||
    searchable.includes('diploma de escuela secundaria') ||
    searchable.includes('high school diploma') ||
    searchable.includes('diploma');

  // Graduate programs need an undergraduate (bachelor's) diploma specifically
  const submitted_undergraduate_diploma =
    searchable.includes('licenciatura') ||
    searchable.includes('postgrado') ||
    searchable.includes('undergraduate');

  return { submitted_transcripts, submitted_diploma, submitted_undergraduate_diploma };
}

/**
 * Extract and normalize the core fields we need from a Form 1 (Admision) payload.
 * MachForm may use the field label as-is, a slugified version, or a custom
 * element name — so we try many variations for each field.
 *
 * Everything else lands in raw_data automatically (we store req.body).
 */
function normalizeForm1(body) {
  const email = pick(body,
    'email',
    'EmailICorreoElectrónicoI',
    'EmailICorreoElectronico',       // ASCII fallback (test scripts, encoding-safe)
    'Email I - Correo Electrónico I',
    'email_i_correo_electronico_i',
    'Email I',
    'email_i'
  );

  const firstName = pick(body,
    'FirstNmeNombre',
    'first_name', 'First Name', 'First Nme / Nombre',
    'first_nme_nombre', 'nombre', 'Nombre'
  );
  const lastName = pick(body,
    'LastNameApellido',
    'last_name', 'Last Name', 'Last Name / Apellido',
    'last_name_apellido', 'apellido', 'Apellido'
  );
  const full_name = [firstName, lastName].filter(Boolean).join(' ') || null;

  const phone = pick(body,
    'PhoneMobileCelular',
    'phone', 'Phone Mobile/Celular', 'phone_mobile_celular',
    'phone_mobile', 'celular', 'Celular', 'Phone Mobile'
  );

  const programLevelRaw = pick(body,
    'StudyLevelsNivelesDeEstudio',
    'program_level',
    'Study levels / Niveles de Estudio',
    'study_levels_niveles_de_estudio',
    'study_levels', 'niveles_de_estudio'
  );
  const program_level = mapProgramLevel(programLevelRaw);

  const program_applied = pick(body,
    'DesiredProgramProramaDeseado',
    'program_applied',
    'Desired Program/Prorama Deseado',
    'desired_program_prorama_deseado',
    'desired_program', 'programa_deseado'
  );

  const monthly_budget = pick(body,
    'BudgetsPresupuesto',
    'Budgets / Presupuesto',
    'monthly_budget',
    'budgets_presupuesto',
    'budget', 'presupuesto',
    'Cantidad que puede pagar al mes por sus estudios'
  );

  const highest_education = deriveHighestEducation(body);
  const docs = detectDocuments(body);

  return {
    email,
    full_name,
    phone,
    program_level,
    program_applied,
    // Enriched raw_data fields that the eligibility engine reads
    _enriched: {
      monthly_budget,
      highest_education,
      ...docs,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Core pipeline — shared by all three form routes
// ─────────────────────────────────────────────────────────────────────────────

async function handleFormSubmission(req, res, formNumber) {
  try {
    // 1. Authenticate
    const secret = req.headers['x-webhook-secret'];
    const expectedSecret = process.env.WEBHOOK_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = req.body;
    console.log(`[webhook] Form ${formNumber} raw body:`, JSON.stringify(body));
    console.log(`[webhook] Content-Type:`, req.headers['content-type']);

    // 2. Normalize fields based on which form this is
    let email, full_name, phone, program_level, program_applied, enriched;

    if (formNumber === 1) {
      const normalized = normalizeForm1(body);
      email           = normalized.email;
      full_name       = normalized.full_name;
      phone           = normalized.phone;
      program_level   = normalized.program_level;
      program_applied = normalized.program_applied;
      enriched        = normalized._enriched;
    } else {
      // Forms 2 & 3 — just need the email to link to the applicant.
      // All their data goes into raw_data for the admissions officer to review.
      email = pick(body,
        'EmailICorreoElectrónicoI',
        'CorreoElectrónico',
        'CorreoElectronico',
        'email', 'Email I - Correo Electrónico I', 'email_i',
        'Email', 'correo', 'Correo Electrónico'
      );
      // Also try to extract name from Forms 2 & 3 — used to backfill if Form 1 missed it
      const firstName2 = pick(body, 'FirstNmeNombre', 'first_name', 'Nombre', 'nombre', 'First Name', 'FirstName');
      const lastName2  = pick(body, 'LastNameApellido', 'last_name', 'Apellido', 'apellido', 'Last Name', 'LastName');
      full_name = [firstName2, lastName2].filter(Boolean).join(' ') || null;
      enriched = {};
    }

    if (!email) {
      console.warn(`[webhook] Form ${formNumber} submission missing email. Body keys:`, Object.keys(body));
      return res.status(400).json({
        error: 'Could not extract email from form submission. Check that the email field name is recognized.',
      });
    }

    // 3. Upsert applicant by email
    // For Forms 2 & 3, only write full_name if the applicant doesn't have one yet
    const existingApplicant = formNumber !== 1 ? (await supabase.from('applicants').select('full_name').eq('email', email).single()).data : null;
    const shouldWriteName = full_name && (formNumber === 1 || !existingApplicant?.full_name);

    const applicantPayload = { email };
    if (shouldWriteName)  applicantPayload.full_name       = full_name;
    if (phone)           applicantPayload.phone           = phone;
    if (program_level)   applicantPayload.program_level   = program_level;
    if (program_applied) applicantPayload.program_applied = program_applied;

    // For Form 1, write enriched eligibility fields directly onto the applicant
    // so the eligibility engine can read them from freshApplicant without
    // needing a secondary form_submissions query.
    if (formNumber === 1 && enriched) {
      if (enriched.highest_education)               applicantPayload.highest_education               = enriched.highest_education;
      if (enriched.monthly_budget !== undefined)    applicantPayload.monthly_budget                  = enriched.monthly_budget;
      applicantPayload.submitted_transcripts            = enriched.submitted_transcripts            ?? false;
      applicantPayload.submitted_diploma                = enriched.submitted_diploma                ?? false;
      applicantPayload.submitted_undergraduate_diploma  = enriched.submitted_undergraduate_diploma  ?? false;
    }

    // Extract ministerial experience from ANY form that includes it.
    // MachForm sends these on the Experiencia Ministerial form (Form 3),
    // but some test paths put them in Form 1 — so we check every submission.
    const min_ft = parseInt(body.ministerial_years_fulltime, 10);
    const min_as = parseInt(body.ministerial_years_associated, 10);
    if (!isNaN(min_ft) && min_ft > 0) applicantPayload.ministerial_years_fulltime   = min_ft;
    if (!isNaN(min_as) && min_as > 0) applicantPayload.ministerial_years_associated = min_as;

    const { data: applicant, error: upsertError } = await supabase
      .from('applicants')
      .upsert(applicantPayload, { onConflict: 'email', ignoreDuplicates: false })
      .select()
      .single();

    if (upsertError) {
      console.error('[webhook] Applicant upsert failed:', upsertError);
      return res.status(500).json({ error: 'Internal error' });
    }

    // 4. Insert form_submission record
    // Merge any enriched fields into raw_data so the eligibility engine can read them
    const rawData = { ...body, ...enriched };

    const { data: formSubmission, error: insertError } = await supabase
      .from('form_submissions')
      .insert({
        applicant_id: applicant.id,
        form_number: formNumber,
        raw_data: rawData,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[webhook] Form submission insert failed:', insertError);
      return res.status(500).json({ error: 'Internal error' });
    }

    // 4b. Auto-ingest files attached to Form 1 from MachForm uploads
    if (formNumber === 1) {
      ingestMachFormFiles(applicant.id, body).catch(err =>
        console.warn('[webhook] ingestMachFormFiles error:', err.message)
      );
    }

    // 5. Stamp the form timestamp
    const timestampField = `form${formNumber}_submitted_at`;
    await supabase
      .from('applicants')
      .update({ [timestampField]: new Date().toISOString() })
      .eq('id', applicant.id);

    // 6. Re-fetch applicant with latest state
    const { data: freshApplicant, error: fetchError } = await supabase
      .from('applicants')
      .select('*')
      .eq('id', applicant.id)
      .single();

    if (fetchError) {
      console.error('[webhook] Re-fetch applicant failed:', fetchError);
      return res.status(500).json({ error: 'Internal error' });
    }

    // 7. Respond immediately so MachForm shows its confirmation page.
    //    The eligibility pipeline (DB queries + optional Gemini AI call) runs
    //    in the background after the response is already sent.
    res.json({ success: true, applicant_id: applicant.id });

    // ── Background pipeline ───────────────────────────────────────────────────
    (async () => {
      try {
        const allFormsComplete =
          freshApplicant.form1_submitted_at &&
          freshApplicant.form2_submitted_at &&
          freshApplicant.form3_submitted_at;

        if (allFormsComplete && !freshApplicant.forms_complete) {
          await supabase
            .from('applicants')
            .update({ forms_complete: true })
            .eq('id', applicant.id);

          const { data: allSubmissions, error: subFetchError } = await supabase
            .from('form_submissions')
            .select('*')
            .eq('applicant_id', applicant.id)
            .order('submitted_at', { ascending: true });

          console.log(`[webhook] form_submissions fetch: count=${allSubmissions?.length ?? 'null'} error=${subFetchError?.message ?? 'none'}`);

          const form1Submission = (allSubmissions || []).find(s => Number(s.form_number) === 1) ?? null;
          const form3Submission = (allSubmissions || []).find(s => Number(s.form_number) === 3) ?? null;

          if (!form1Submission) {
            console.warn(`[webhook] WARNING: No Form 1 submission found for applicant ${applicant.id}`);
            console.log(`[webhook] All submission form_numbers:`, (allSubmissions || []).map(s => s.form_number));
          } else {
            console.log(`[webhook] Form 1 found — highest_education=${form1Submission.raw_data?.highest_education}, submitted_transcripts=${form1Submission.raw_data?.submitted_transcripts}`);
          }

          const baseSubmission = form1Submission ?? formSubmission;
          const mergedRawData = {
            ...(form1Submission?.raw_data || {}),
            ...(form3Submission?.raw_data || {}),
          };
          Object.assign(mergedRawData, form1Submission?.raw_data || {});
          const mergedSubmission = { ...baseSubmission, raw_data: mergedRawData };

          console.log(`[webhook] ministerial_years_fulltime (merged): ${mergedRawData.ministerial_years_fulltime}`);

          const eligResult = evaluateEligibility(freshApplicant, mergedSubmission);

          if (eligResult.document_flag) {
            await supabase
              .from('applicants')
              .update({
                eligibility_status: 'needs_review',
                ai_recommendation: 'escalate',
                ai_reasoning:
                  eligResult.document_note ||
                  `Missing required documents: ${(eligResult.missing_documents || []).join(', ')}.`,
              })
              .eq('id', applicant.id);

            console.log(`[webhook] Missing docs for ${applicant.id}:`, eligResult.missing_documents);

          } else if (eligResult.financial_flag) {
            await supabase
              .from('applicants')
              .update({
                eligibility_status: 'needs_review',
                ai_recommendation: 'escalate',
                ai_reasoning:
                  eligResult.financial_note ||
                  `Budget does not support requested program. Suggested alternative: ${eligResult.suggested_alternative || 'discuss with applicant.'}`,
              })
              .eq('id', applicant.id);

            console.log(`[webhook] Financial flag for ${applicant.id}:`, eligResult.suggested_alternative);

          } else {
            const baseUpdate = { eligibility_status: eligResult.status };
            if (eligResult.status === 'ineligible') {
              const coreReason =
                eligResult.reasons?.[eligResult.reasons.length - 1] ||
                eligResult.recommended_action ||
                'Application does not meet eligibility requirements.';

              const programLevel = (freshApplicant.program_level || '').toLowerCase();
              const missingDocs = [];
              if (!freshApplicant.submitted_transcripts) missingDocs.push('transcripts');
              if (programLevel === 'masters' || programLevel === 'doctorate') {
                if (!freshApplicant.submitted_undergraduate_diploma) missingDocs.push('undergraduate diploma');
              } else {
                if (!freshApplicant.submitted_diploma) missingDocs.push('diploma');
              }
              const docNote = missingDocs.length > 0
                ? ` Additionally, required documents have not been submitted: ${missingDocs.join(', ')}.`
                : '';

              baseUpdate.ai_reasoning = coreReason + docNote;
            }
            await supabase
              .from('applicants')
              .update(baseUpdate)
              .eq('id', applicant.id);

            if (eligResult.confidence === 'low' || eligResult.status === 'needs_review') {
              const aiResult = await callAIReview(freshApplicant, form1Submission ?? formSubmission);
              await supabase
                .from('applicants')
                .update({
                  ai_recommendation: aiResult.recommendation,
                  ai_reasoning: aiResult.reasoning,
                  eligibility_status: 'needs_review',
                })
                .eq('id', applicant.id);
            }
          }
        }
      } catch (bgErr) {
        console.error('[webhook] Background pipeline error:', bgErr);
      }
    })();

    if (sendEmail) {
      sendEmail(`form${formNumber}_received`, freshApplicant).catch(emailErr =>
        console.error('[webhook] Email trigger failed:', emailErr)
      );
    }

    console.log(`[webhook] Form ${formNumber} processed for applicant ${applicant.id} (${email})`);

  } catch (err) {
    console.error('[webhook] Unhandled error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Routes — one URL per form so no hidden field is needed in MachForm.
//
// Configure MachForm → Integrations → Webhook:
//   Form 1 (Admisión):           POST /webhook/machform/1
//   Form 2 (Rec. Pastoral):      POST /webhook/machform/2
//   Form 3 (Exp. Ministerial):   POST /webhook/machform/3
//
// Add header: X-Webhook-Secret: <your WEBHOOK_SECRET from .env>
// ─────────────────────────────────────────────────────────────────────────────

router.post('/machform/1', (req, res) => handleFormSubmission(req, res, 1));
router.post('/machform/2', (req, res) => handleFormSubmission(req, res, 2));
router.post('/machform/3', (req, res) => handleFormSubmission(req, res, 3));

// Legacy route — still works if form_number is sent in the body
router.post('/machform', (req, res) => {
  const formNumber = parseInt(req.body?.form_number, 10);
  if (!formNumber || formNumber < 1 || formNumber > 3) {
    return res.status(400).json({
      error: 'Missing or invalid form_number. Use /webhook/machform/1, /2, or /3 instead.',
    });
  }
  return handleFormSubmission(req, res, formNumber);
});

export default router;
