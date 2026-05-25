import express from 'express';
import supabase from '../db/client.js';
import { evaluateEligibility } from '../services/eligibility.js';
import { callAIReview } from '../services/aiReview.js';

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
    'Maestría', 'Maestría *', 'Maestria *', 'maestria',
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
  // Gather all string values from the body into one searchable blob
  const allValues = Object.values(body)
    .map(v => String(v).toLowerCase())
    .join(' | ');

  const submitted_transcripts =
    allValues.includes('transcript') ||
    allValues.includes('registros oficiales');

  const submitted_diploma =
    allValues.includes('licenciatura') ||
    allValues.includes('bachelor');

  // Graduate programs need an undergraduate diploma specifically
  const submitted_undergraduate_diploma =
    allValues.includes('licenciatura') ||
    allValues.includes('postgrado') ||
    allValues.includes('undergraduate');

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
      enriched = {};
    }

    if (!email) {
      console.warn(`[webhook] Form ${formNumber} submission missing email. Body keys:`, Object.keys(body));
      return res.status(400).json({
        error: 'Could not extract email from form submission. Check that the email field name is recognized.',
      });
    }

    // 3. Upsert applicant by email
    const applicantPayload = { email };
    if (full_name)       applicantPayload.full_name       = full_name;
    if (phone)           applicantPayload.phone           = phone;
    if (program_level)   applicantPayload.program_level   = program_level;
    if (program_applied) applicantPayload.program_applied = program_applied;

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

    // 7. If all 3 forms are now complete, run eligibility pipeline
    const allFormsComplete =
      freshApplicant.form1_submitted_at &&
      freshApplicant.form2_submitted_at &&
      freshApplicant.form3_submitted_at;

    if (allFormsComplete && !freshApplicant.forms_complete) {
      await supabase
        .from('applicants')
        .update({ forms_complete: true })
        .eq('id', applicant.id);

      // Always evaluate eligibility against Form 1 — it holds the document
      // checklist, budget, and education fields that the engine needs.
      const { data: allSubmissions, error: subFetchError } = await supabase
        .from('form_submissions')
        .select('*')
        .eq('applicant_id', applicant.id)
        .order('created_at', { ascending: true });

      console.log(`[webhook] form_submissions fetch: count=${allSubmissions?.length ?? 'null'} error=${subFetchError?.message ?? 'none'}`);

      const form1Submission = (allSubmissions || []).find(s => s.form_number === 1) ?? null;

      if (!form1Submission) {
        console.warn(`[webhook] WARNING: No Form 1 submission found for applicant ${applicant.id}`);
        console.log(`[webhook] All submission form_numbers:`, (allSubmissions || []).map(s => s.form_number));
      } else {
        console.log(`[webhook] Form 1 found — highest_education=${form1Submission.raw_data?.highest_education}, submitted_transcripts=${form1Submission.raw_data?.submitted_transcripts}`);
      }

      const eligResult = evaluateEligibility(freshApplicant, form1Submission ?? formSubmission);

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
        await supabase
          .from('applicants')
          .update({ eligibility_status: eligResult.status })
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

    // 8. Send stage email
    if (sendEmail) {
      try {
        const emailType = `form${formNumber}_received`;
        await sendEmail(emailType, freshApplicant);
      } catch (emailErr) {
        console.error('[webhook] Email trigger failed:', emailErr);
      }
    }

    console.log(`[webhook] Form ${formNumber} processed for applicant ${applicant.id} (${email})`);
    return res.json({ success: true, applicant_id: applicant.id });

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
