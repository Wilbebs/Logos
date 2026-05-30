import { Router } from 'express';
import supabase from '../db/client.js';

// emailService is built by Agent 3 — import conditionally so the server
// still starts if the file doesn't exist yet during development.
let emailService = null;
try {
  const mod = await import('../services/emailService.js');
  emailService = mod.default ?? mod;
} catch {
  console.warn(
    '[email router] emailService not found — email endpoints will return 503 until Agent 3 delivers services/emailService.js'
  );
}

const router = Router();

// ------------------------------------------------------------------
// POST /api/email/resend/:applicantId
// Manual resend trigger for admins.
// Body: { email_type: string }
// ------------------------------------------------------------------
router.post('/resend/:applicantId', async (req, res) => {
  try {
    const { applicantId } = req.params;
    const { email_type } = req.body;

    if (!email_type) {
      return res.status(400).json({ error: 'Field "email_type" is required.' });
    }

    // Verify applicant exists
    const { data: applicant, error: fetchError } = await supabase
      .from('applicants')
      .select('*')
      .eq('id', applicantId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Applicant not found.' });
      }
      console.error('[POST /api/email/resend] Supabase fetch error:', fetchError);
      return res.status(500).json({ error: fetchError.message });
    }

    if (!emailService) {
      return res.status(503).json({
        error: 'Email service is not available. Please ensure emailService.js is deployed.',
      });
    }

    // Dispatch to the appropriate emailService method based on email_type
    const emailTypeMap = {
      approval:       'sendApprovalEmail',
      rejected:       'sendRejectionEmail',
      rejection:      'sendRejectionEmail',
      info_requested: 'sendInfoRequestEmail',
      form2_reminder: 'sendForm2ReminderEmail',
      form3_reminder: 'sendForm3ReminderEmail',
      welcome:        'sendWelcomeEmail',
    };

    const methodName = emailTypeMap[email_type];

    if (methodName && typeof emailService[methodName] === 'function') {
      await emailService[methodName](applicant);
    } else if (typeof emailService.sendEmail === 'function') {
      // Generic fallback
      await emailService.sendEmail(applicant, email_type);
    } else {
      return res.status(400).json({
        error: `Unknown email_type "${email_type}" and no generic sendEmail method available.`,
      });
    }

    // Log the resend event
    const { error: logError } = await supabase.from('email_log').insert({
      applicant_id: applicantId,
      email_type: `resend:${email_type}`,
      status: 'sent',
    });

    if (logError) {
      // Non-fatal — log but don't fail the response
      console.error('[POST /api/email/resend] Failed to write email log:', logError);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[POST /api/email/resend] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
