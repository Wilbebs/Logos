/**
 * Acceptance Letter routes
 *
 * POST /api/applicants/:id/acceptance/generate
 *   → Uses Gemini to draft an acceptance letter based on applicant data.
 *   → Returns { subject, body } plain text.
 *
 * POST /api/applicants/:id/acceptance/send
 *   → Receives { from, to, subject, body } from the UI (already edited).
 *   → Sends the email via Resend (allowlist-guarded).
 *   → Generates a .docx attachment from the body text.
 *   → Returns { success, blocked? }
 */

import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
} from 'docx';
import supabase, { supabaseAdmin } from '../db/client.js';
import { Resend } from 'resend';
import { logEmail } from '../services/emailService.js';

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// ── Allowlist (mirrors emailService.js) ───────────────────────────────────────
const EMAIL_ALLOWLIST = (process.env.EMAIL_ALLOWLIST || 'hernwilbwork@gmail.com')
  .split(',').map(e => e.trim().toLowerCase());

// ── Generate letter with Gemini ────────────────────────────────────────────────
router.post('/:id/acceptance/generate', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: applicant, error } = await supabase
      .from('applicants').select('*').eq('id', id).single();
    if (error || !applicant) return res.status(404).json({ error: 'Applicant not found' });
    if (applicant.decision !== 'approved') {
      return res.status(400).json({ error: 'Applicant has not been approved' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are drafting a formal acceptance letter for LOGOS Christian University.
Write a professional, warm acceptance letter in English for the following applicant.
The letter should feel personal and encouraging — this is a Christian seminary.

Applicant details:
- Full name: ${applicant.full_name || 'Applicant'}
- Program applied: ${applicant.program_applied || 'Not specified'}
- Program level: ${applicant.program_level || 'Not specified'}
- Education: ${applicant.highest_education || 'Not specified'}
- Decision notes: ${applicant.decision_notes || 'None'}

Instructions:
- Start with "Dear [Name],"
- Congratulate them and state their program clearly.
- Mention 2-3 next steps (enrollment paperwork, required documents, tuition/payment info).
- Close warmly with "In His service," then a blank line for signature.
- Do NOT include any markdown formatting — plain text only.
- Keep it to 3-4 short paragraphs.
- Do not invent specific dates, deadlines, or dollar amounts.

Return ONLY the letter body (no subject line, no meta-text).`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 },
    });

    const body = result.response.text().trim();
    const subject = `Congratulations! Acceptance to ${applicant.program_applied || 'LOGOS University'}`;

    return res.json({ subject, body });
  } catch (err) {
    console.error('[acceptance/generate]', err);
    return res.status(500).json({ error: 'Letter generation failed: ' + err.message });
  }
});

// ── Build Word doc from letter body ───────────────────────────────────────────
function buildDocx(applicantName, subject, body) {
  const lines = body.split('\n');

  const children = [
    new Paragraph({
      text: 'LOGOS Christian University',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: 'Office of Admissions',
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: subject, bold: true, size: 26 })],
      spacing: { after: 300 },
    }),
    ...lines.map(line =>
      new Paragraph({
        children: [new TextRun({ text: line || ' ', size: 24 })],
        spacing: { after: line.trim() === '' ? 0 : 200 },
      })
    ),
  ];

  return new Document({
    sections: [{ children }],
  });
}

// ── Send acceptance letter email ───────────────────────────────────────────────
router.post('/:id/acceptance/send', async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'to, subject, and body are required' });
    }

    const { data: applicant, error } = await supabase
      .from('applicants').select('id, full_name, email, program_applied').eq('id', id).single();
    if (error || !applicant) return res.status(404).json({ error: 'Applicant not found' });

    const recipientEmail = to.trim().toLowerCase();

    // Allowlist guard
    if (!EMAIL_ALLOWLIST.includes(recipientEmail)) {
      console.warn(`[acceptance/send] BLOCKED — "${recipientEmail}" not on allowlist`);
      await logEmail(id, 'acceptance_letter', 'blocked', { subject, toAddress: recipientEmail });
      return res.json({
        success: false,
        blocked: true,
        message: `Email blocked — "${recipientEmail}" is not on the allowlist. Add to EMAIL_ALLOWLIST env var to enable real sends.`,
      });
    }

    // Generate Word doc
    const doc = buildDocx(applicant.full_name, subject, body);
    const docBuffer = await Packer.toBuffer(doc);
    const docBase64 = docBuffer.toString('base64');

    const fromAddress = from?.trim() || process.env.RESEND_FROM_EMAIL || 'admissions@logos.edu';

    const { data: sendData, error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: recipientEmail,
      subject,
      text: body,
      attachments: [
        {
          filename: `Acceptance_Letter_${(applicant.full_name || 'Applicant').replace(/\s+/g, '_')}.docx`,
          content: docBase64,
        },
      ],
    });

    if (sendError) throw new Error(sendError.message || JSON.stringify(sendError));

    // ── Save .docx to Supabase Storage under admission-documents ──────────────
    const safeApplicantName = (applicant.full_name || 'Applicant').replace(/[^a-zA-Z0-9._-]/g, '_');
    const docFilename   = `Acceptance_Letter_${safeApplicantName}_${Date.now()}.docx`;
    const storagePath   = `applicants/${id}/admission_documents/${docFilename}`;
    const STORAGE_BUCKET = 'applicant-files';

    const { error: storageErr } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, docBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: false,
      });

    if (!storageErr) {
      const { data: urlData } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
      // Record file in applicant_files so it shows in the Files tab
      await supabase.from('applicant_files').insert({
        applicant_id: id,
        file_name:    docFilename,
        file_path:    storagePath,
        file_url:     urlData?.publicUrl || null,
        file_size:    docBuffer.length,
        file_type:    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        category:     'admission_documents',
        uploaded_by:  'system',
      });
    } else {
      console.warn('[acceptance/send] Could not save .docx to storage:', storageErr.message);
    }

    // ── Log email with full content ────────────────────────────────────────────
    await logEmail(id, 'acceptance_letter', 'sent', {
      subject,
      bodyText:    body,
      fromAddress: fromAddress,
      toAddress:   recipientEmail,
    });

    return res.json({ success: true, data: sendData });
  } catch (err) {
    console.error('[acceptance/send]', err);
    return res.status(500).json({ error: 'Send failed: ' + err.message });
  }
});

export default router;
