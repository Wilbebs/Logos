import { Router } from 'express';
import multer from 'multer';
import supabase from '../db/client.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// File uploads — stored in memory, then forwarded to Supabase Storage.
// Max file size: 20 MB. Accepted MIME types are checked at the route level.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

// Supabase Storage bucket name — create this bucket in your Supabase project.
// Dashboard → Storage → New bucket → name: "applicant-files" → public or private.
// If private, replace getPublicUrl with createSignedUrl (adjust TTL as needed).
const STORAGE_BUCKET = 'applicant-files';

// emailService is built by Agent 3 — import conditionally so the server
// still starts if the file doesn't exist yet during development.
let emailService = null;
try {
  const mod = await import('../services/emailService.js');
  emailService = mod.default ?? mod;
} catch {
  console.warn(
    '[applicants] emailService not found — email triggers will be skipped until Agent 3 delivers services/emailService.js'
  );
}

const router = Router();

// ------------------------------------------------------------------
// Allowed enum values
// ------------------------------------------------------------------
const VALID_DECISIONS = ['approved', 'rejected', 'info_requested'];

// ------------------------------------------------------------------
// GET /api/applicants
// Query params:
//   ?status=pending|eligible|ineligible|needs_review|approved|rejected
//   ?forms_complete=true|false
// ------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    let query = supabase
      .from('applicants')
      .select('*')
      .order('created_at', { ascending: false });

    const { status, forms_complete } = req.query;

    if (status) {
      // status can map to either eligibility_status or decision
      const eligibilityValues = ['pending', 'eligible', 'ineligible', 'needs_review'];
      const decisionValues = ['approved', 'rejected', 'info_requested'];

      if (eligibilityValues.includes(status)) {
        query = query.eq('eligibility_status', status);
      } else if (decisionValues.includes(status)) {
        query = query.eq('decision', status);
      } else {
        return res.status(400).json({
          error: `Invalid status value: "${status}". Must be one of: pending, eligible, ineligible, needs_review, approved, rejected, info_requested.`,
        });
      }
    }

    if (forms_complete !== undefined) {
      if (forms_complete === 'true') {
        query = query.eq('forms_complete', true);
      } else if (forms_complete === 'false') {
        query = query.eq('forms_complete', false);
      } else {
        return res.status(400).json({
          error: 'Invalid forms_complete value. Must be "true" or "false".',
        });
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('[GET /api/applicants] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  } catch (err) {
    console.error('[GET /api/applicants] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ------------------------------------------------------------------
// GET /api/applicants/stats
// Must be defined before /:id so Express doesn't treat "stats" as an id.
// Returns dashboard aggregate counts.
// ------------------------------------------------------------------
router.get('/stats', async (req, res) => {
  try {
    // Fetch all applicants (lightweight — only columns needed for stats)
    const { data, error } = await supabase
      .from('applicants')
      .select('forms_complete, eligibility_status, decision');

    if (error) {
      console.error('[GET /api/applicants/stats] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    const stats = {
      total: data.length,
      forms_complete: 0,
      needs_review: 0,
      eligible: 0,
      ineligible: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
    };

    for (const row of data) {
      if (row.forms_complete) stats.forms_complete++;
      if (row.eligibility_status === 'needs_review') stats.needs_review++;
      if (row.eligibility_status === 'eligible') stats.eligible++;
      if (row.eligibility_status === 'ineligible') stats.ineligible++;
      if (row.decision === 'approved') stats.approved++;
      if (row.decision === 'rejected') stats.rejected++;
      if (row.decision === 'pending') stats.pending++;
    }

    return res.json(stats);
  } catch (err) {
    console.error('[GET /api/applicants/stats] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ------------------------------------------------------------------
// GET /api/applicants/:id
// Returns applicant + all form submissions as forms: [...]
// ------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch applicant
    const { data: applicant, error: applicantError } = await supabase
      .from('applicants')
      .select('*')
      .eq('id', id)
      .single();

    if (applicantError) {
      if (applicantError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Applicant not found.' });
      }
      console.error('[GET /api/applicants/:id] Supabase error:', applicantError);
      return res.status(500).json({ error: applicantError.message });
    }

    // Fetch form submissions for this applicant
    const { data: forms, error: formsError } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('applicant_id', id)
      .order('form_number', { ascending: true });

    if (formsError) {
      console.error('[GET /api/applicants/:id] Forms fetch error:', formsError);
      return res.status(500).json({ error: formsError.message });
    }

    return res.json({ ...applicant, forms: forms ?? [] });
  } catch (err) {
    console.error('[GET /api/applicants/:id] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ------------------------------------------------------------------
// PATCH /api/applicants/:id/decision
// Body: { decision, decision_notes, decision_by }
// ------------------------------------------------------------------
router.patch('/:id/decision', async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, decision_notes, decision_by } = req.body;

    // Validate required field
    if (!decision) {
      return res.status(400).json({ error: 'Field "decision" is required.' });
    }

    if (!VALID_DECISIONS.includes(decision)) {
      return res.status(400).json({
        error: `Invalid decision value: "${decision}". Must be one of: ${VALID_DECISIONS.join(', ')}.`,
      });
    }

    const updatePayload = {
      decision,
      decision_at: new Date().toISOString(),
    };

    if (decision_notes !== undefined) updatePayload.decision_notes = decision_notes;
    if (decision_by !== undefined) updatePayload.decision_by = decision_by;

    const { data: updated, error } = await supabase
      .from('applicants')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Applicant not found.' });
      }
      console.error('[PATCH /api/applicants/:id/decision] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Trigger decision email if emailService is available
    if (emailService) {
      try {
        if (decision === 'approved' && typeof emailService.sendApprovalEmail === 'function') {
          await emailService.sendApprovalEmail(updated);
        } else if (decision === 'rejected' && typeof emailService.sendRejectionEmail === 'function') {
          await emailService.sendRejectionEmail(updated);
        } else if (
          decision === 'info_requested' &&
          typeof emailService.sendInfoRequestEmail === 'function'
        ) {
          await emailService.sendInfoRequestEmail(updated);
        } else if (typeof emailService.sendDecisionEmail === 'function') {
          // Fallback to generic decision email if specific methods aren't present
          await emailService.sendDecisionEmail(updated, decision);
        }
      } catch (emailErr) {
        // Log but do not fail the request — the decision was already saved
        console.error('[PATCH /api/applicants/:id/decision] Email trigger failed:', emailErr);
      }
    }

    return res.json(updated);
  } catch (err) {
    console.error('[PATCH /api/applicants/:id/decision] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ------------------------------------------------------------------
// GET /api/applicants/:id/files
// List all files attached to an applicant.
// ------------------------------------------------------------------
router.get('/:id/files', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('applicant_files')
      .select('*')
      .eq('applicant_id', id)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('[GET /api/applicants/:id/files] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    return res.json(data ?? []);
  } catch (err) {
    console.error('[GET /api/applicants/:id/files] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ------------------------------------------------------------------
// POST /api/applicants/:id/files
// Upload a file for an applicant. Stored in Supabase Storage.
// Multipart form field: "file"
// Optional form field:  "uploaded_by" (name of team member uploading)
// ------------------------------------------------------------------
router.post('/:id/files', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided. Send multipart/form-data with a "file" field.' });
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return res.status(400).json({
        error: `File type "${file.mimetype}" is not allowed. Accepted: PDF, images, Word, Excel.`,
      });
    }

    // Verify the applicant exists before storing
    const { data: applicant, error: applicantError } = await supabase
      .from('applicants')
      .select('id')
      .eq('id', id)
      .single();

    if (applicantError || !applicant) {
      return res.status(404).json({ error: 'Applicant not found.' });
    }

    // Build a unique storage path: applicants/{applicant_id}/{timestamp}-{original_name}
    const safeFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `applicants/${id}/${Date.now()}-${safeFilename}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('[POST /api/applicants/:id/files] Storage upload error:', uploadError);
      return res.status(500).json({ error: 'File upload to storage failed: ' + uploadError.message });
    }

    // Get the public URL (works for public buckets; for private buckets use createSignedUrl)
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    const fileUrl = urlData?.publicUrl || null;

    // Record in applicant_files table
    const { data: fileRecord, error: insertError } = await supabase
      .from('applicant_files')
      .insert({
        applicant_id: id,
        file_name: file.originalname,
        file_path: storagePath,
        file_url: fileUrl,
        file_size: file.size,
        file_type: file.mimetype,
        uploaded_by: req.body.uploaded_by || 'admissions_team',
      })
      .select()
      .single();

    if (insertError) {
      console.error('[POST /api/applicants/:id/files] DB insert error:', insertError);
      // File is in storage but DB record failed — log it and return the URL anyway
      return res.status(500).json({ error: 'File uploaded but database record failed: ' + insertError.message });
    }

    return res.status(201).json(fileRecord);
  } catch (err) {
    console.error('[POST /api/applicants/:id/files] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ------------------------------------------------------------------
// DELETE /api/applicants/:id/files/:fileId
// Delete a file from storage and remove its database record.
// ------------------------------------------------------------------
router.delete('/:id/files/:fileId', async (req, res) => {
  try {
    const { id, fileId } = req.params;

    // Fetch the file record to get the storage path
    const { data: fileRecord, error: fetchError } = await supabase
      .from('applicant_files')
      .select('*')
      .eq('id', fileId)
      .eq('applicant_id', id)  // Ensure the file belongs to this applicant
      .single();

    if (fetchError || !fileRecord) {
      return res.status(404).json({ error: 'File not found.' });
    }

    // Delete from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([fileRecord.file_path]);

    if (storageError) {
      console.error('[DELETE /api/applicants/:id/files/:fileId] Storage delete error:', storageError);
      // Continue to delete the DB record even if storage delete fails
    }

    // Delete the database record
    const { error: deleteError } = await supabase
      .from('applicant_files')
      .delete()
      .eq('id', fileId);

    if (deleteError) {
      console.error('[DELETE /api/applicants/:id/files/:fileId] DB delete error:', deleteError);
      return res.status(500).json({ error: deleteError.message });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/applicants/:id/files/:fileId] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ------------------------------------------------------------------
// POST /api/applicants/:id/acceptance-letter
// AI-generates a draft acceptance letter for an approved applicant.
// ------------------------------------------------------------------
router.post('/:id/acceptance-letter', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: applicant, error } = await supabase
      .from('applicants')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !applicant) {
      return res.status(404).json({ error: 'Applicant not found.' });
    }

    if (applicant.decision !== 'approved') {
      return res.status(400).json({ error: 'Acceptance letters can only be generated for approved applicants.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured.' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const firstName = (applicant.first_name || applicant.full_name?.split(' ')[0] || 'Applicant');
    const fullName  = applicant.full_name || `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim();
    const program   = applicant.program_applied || 'your chosen program';
    const level     = applicant.program_level   || '';

    const prompt = `You are the admissions office of Logos Christian University, a Spanish-English bilingual Christian seminary.

Write a warm, professional acceptance letter for the following admitted student. Write it in English but include the Spanish greeting "Estimado/a" as appropriate. Use a formal but warm pastoral tone.

Student: ${fullName}
Program: ${program}
Level: ${level}
Decision date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

The letter should:
1. Open with congratulations
2. Confirm acceptance into the specific program
3. Briefly mention what an exciting journey awaits them at Logos
4. Include a placeholder for next steps: [NEXT STEPS PLACEHOLDER]
5. Close with a warm, faith-affirming sign-off
6. Be signed: Admissions Office, Logos Christian University

Return only the letter text, no extra commentary.`;

    const result = await model.generateContent(prompt);
    const letter = result.response.text().trim();

    return res.json({ letter });
  } catch (err) {
    console.error('[POST /api/applicants/:id/acceptance-letter] Error:', err);
    return res.status(500).json({ error: 'Failed to generate acceptance letter.' });
  }
});

// ------------------------------------------------------------------
// POST /api/applicants/:id/suggest-email
// AI-generates a suggestion message for an info_requested decision,
// explaining what the applicant needs to provide.
// ------------------------------------------------------------------
router.post('/:id/suggest-email', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: applicant, error: aErr } = await supabase
      .from('applicants')
      .select('*')
      .eq('id', id)
      .single();

    if (aErr || !applicant) {
      return res.status(404).json({ error: 'Applicant not found.' });
    }

    // Fetch form submissions to understand what's missing
    const { data: forms } = await supabase
      .from('form_submissions')
      .select('form_number, raw_data')
      .eq('applicant_id', id)
      .order('form_number', { ascending: true });

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured.' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const fullName = applicant.full_name || `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim();
    const program  = applicant.program_applied || 'their chosen program';
    const level    = applicant.program_level   || '';
    const aiReason = applicant.ai_reasoning    || '';
    const formsReceived = forms?.length ?? 0;

    const prompt = `You are an admissions coordinator at Logos Christian University.

Write a short, warm, professional email suggestion to send to an applicant requesting more information. This is NOT a rejection — it is a friendly request to help complete their application.

Applicant: ${fullName}
Program: ${program} (${level})
Forms received: ${formsReceived} of 3
AI review notes: ${aiReason || 'No specific AI notes.'}
Missing docs: transcripts=${applicant.submitted_transcripts ? 'yes' : 'no'}, diploma=${applicant.submitted_diploma ? 'yes' : 'no'}

Write 3-5 short sentences. Be specific about what they need to provide based on the information above. Warm, encouraging, faith-based tone.
Do not include a subject line. Start directly with the salutation.`;

    const result = await model.generateContent(prompt);
    const suggestion = result.response.text().trim();

    return res.json({ suggestion });
  } catch (err) {
    console.error('[POST /api/applicants/:id/suggest-email] Error:', err);
    return res.status(500).json({ error: 'Failed to generate email suggestion.' });
  }
});

// ------------------------------------------------------------------
// POST /api/applicants/:id/ai-review
// Manually (re)run the AI assessment for any applicant.
// Updates ai_recommendation + ai_reasoning only.
// Does NOT change eligibility_status or decision.
// ------------------------------------------------------------------
router.post('/:id/ai-review', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch applicant
    const { data: applicant, error: aErr } = await supabase
      .from('applicants').select('*').eq('id', id).single();
    if (aErr || !applicant) return res.status(404).json({ error: 'Applicant not found.' });

    // Fetch form submissions and merge raw data (same pattern as webhook)
    const { data: allForms } = await supabase
      .from('form_submissions')
      .select('form_number, raw_data')
      .eq('applicant_id', id)
      .order('form_number', { ascending: true });

    const form1 = (allForms || []).find(f => Number(f.form_number) === 1) ?? null;
    const form3 = (allForms || []).find(f => Number(f.form_number) === 3) ?? null;
    const mergedRaw = { ...(form1?.raw_data || {}), ...(form3?.raw_data || {}) };
    const mergedSubmission = { raw_data: mergedRaw };

    // If the rules engine already flagged missing documents, preserve that
    // determination instead of calling the AI (which would produce inconsistent
    // natural language that doesn't match the document-flag UI card).
    const { evaluateEligibility } = await import('../services/eligibility.js');
    const freshEval = evaluateEligibility(applicant, mergedSubmission);

    let aiResult;
    if (freshEval.document_flag && freshEval.missing_documents?.length > 0) {
      const { DOC_LABELS_PUBLIC } = await import('../services/eligibility.js').catch(() => ({}));
      const missingLabels = freshEval.missing_documents.map(d =>
        d === 'transcripts'           ? 'academic transcripts' :
        d === 'diploma'               ? 'diploma' :
        d === 'undergraduate_diploma' ? 'undergraduate diploma (bachelor\'s degree — required for all graduate programs)' :
        d
      );
      aiResult = {
        recommendation: 'escalate',
        reasoning: freshEval.document_note ||
          `Missing required documents. Missing: ${missingLabels.join('; ')}. Cannot confirm eligibility until all required documents are received.`,
        confidence: 0.95,
        flags: ['MISSING_DOCUMENTS'],
      };
    } else {
      // Import and call the AI reviewer
      const { callAIReview } = await import('../services/aiReview.js');
      aiResult = await callAIReview(applicant, mergedSubmission);
    }

    // Write ONLY the AI fields — never touch eligibility_status or decision
    const { data: updated, error: uErr } = await supabase
      .from('applicants')
      .update({
        ai_recommendation: aiResult.recommendation,
        ai_reasoning:      aiResult.reasoning,
        updated_at:        new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, full_name, eligibility_status, ai_recommendation, ai_reasoning, decision')
      .single();

    if (uErr) return res.status(500).json({ error: uErr.message });

    return res.json({
      success: true,
      ai_recommendation: aiResult.recommendation,
      ai_reasoning:      aiResult.reasoning,
      confidence:        aiResult.confidence,
      flags:             aiResult.flags,
      applicant:         updated,
    });
  } catch (err) {
    console.error('[POST /api/applicants/:id/ai-review] Error:', err);
    return res.status(500).json({ error: 'AI review failed: ' + (err.message || 'unknown error') });
  }
});

export default router;
