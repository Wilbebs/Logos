import { Resend } from 'resend';
import supabase from '../db/client.js';

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

function form1ReceivedEmail(applicant) {
  return {
    subject: 'Hemos recibido tu primera solicitud — Paso 1 de 3',
    text: `Estimado/a ${applicant.full_name || 'Solicitante'},

Hemos recibido con éxito tu primera solicitud a LOGOS University.

Para continuar con tu proceso de admisión, necesitas completar el Formulario 2.
Por favor, haz clic en el siguiente enlace para acceder al Formulario 2:

${process.env.FORM_2_URL || '[FORM 2 URL - Configure in .env]'}

El Formulario 2 incluirá información sobre tu historial educativo y experiencia ministerial.

Si tienes alguna pregunta, comunícate con nosotros en ${process.env.ADMISSIONS_EMAIL || 'admissions@logos.edu'}.

Bendiciones,
Equipo de Admisiones
LOGOS University`,
  };
}

function form2ReceivedEmail(applicant) {
  return {
    subject: 'Paso 2 completado — Un paso más',
    text: `Estimado/a ${applicant.full_name || 'Solicitante'},

Hemos recibido el Formulario 2 de tu solicitud. ¡Vas muy bien!

Solo queda un paso más. Por favor, completa el Formulario 3 en el siguiente enlace:

${process.env.FORM_3_URL || '[FORM 3 URL - Configure in .env]'}

Para el Formulario 3, ten listos los siguientes documentos:
- Transcripciones académicas o diplomas
- Carta de recomendación pastoral
- Carta de declaración de fe (si aplica)
- Cualquier documentación de experiencia ministerial

Si tienes alguna pregunta, comunícate con nosotros en ${process.env.ADMISSIONS_EMAIL || 'admissions@logos.edu'}.

Bendiciones,
Equipo de Admisiones
LOGOS University`,
  };
}

function form3ReceivedEmail(applicant) {
  return {
    subject: 'Tu solicitud está completa — En revisión',
    text: `Estimado/a ${applicant.full_name || 'Solicitante'},

¡Felicitaciones! Hemos recibido los tres formularios de tu solicitud a LOGOS University. Tu expediente está completo y ha sido enviado al equipo de admisiones para su revisión.

Programa solicitado: ${applicant.program_applied || 'No especificado'}

Tiempo estimado de revisión: 5-10 días hábiles.

Una vez que el equipo de admisiones haya revisado tu expediente, recibirás una notificación con la decisión final.

Si tienes alguna pregunta, comunícate con nosotros en ${process.env.ADMISSIONS_EMAIL || 'admissions@logos.edu'}.

Bendiciones,
Equipo de Admisiones
LOGOS University`,
  };
}

function approvedEmail(applicant) {
  return {
    subject: '¡Felicitaciones! Tu solicitud ha sido aprobada',
    text: `Estimado/a ${applicant.full_name || 'Solicitante'},

Es un placer informarte que tu solicitud de admisión a LOGOS University ha sido APROBADA.

Programa: ${applicant.program_applied || 'No especificado'}

Próximos pasos para tu inscripción:
1. Comunícate con nuestra oficina de admisiones para completar el proceso de matrícula
2. Envía cualquier documento original que aún no hayas enviado
3. Realiza el pago de matrícula según las instrucciones que recibirás por separado

Para comenzar tu proceso de inscripción, comunícate con nosotros en ${process.env.ADMISSIONS_EMAIL || 'admissions@logos.edu'}.

¡Bienvenido/a a la familia LOGOS!

Bendiciones,
Equipo de Admisiones
LOGOS University`,
  };
}

function rejectedEmail(applicant) {
  return {
    subject: 'Actualización sobre tu solicitud a LOGOS',
    text: `Estimado/a ${applicant.full_name || 'Solicitante'},

Gracias por tu interés en LOGOS University y por el tiempo que dedicaste a completar tu solicitud.

Después de una revisión cuidadosa de tu expediente, lamentablemente no podemos aprobar tu solicitud para el programa ${applicant.program_applied || 'solicitado'} en este momento.

${applicant.decision_notes ? `Notas del equipo de admisiones:\n${applicant.decision_notes}\n` : ''}
Te invitamos a considerar otros programas de LOGOS University que puedan ajustarse mejor a tu perfil actual, o a volver a aplicar en un futuro cuando hayas cumplido con los requisitos necesarios.

Para más información o para explorar otras opciones, comunícate con nosotros en ${process.env.ADMISSIONS_EMAIL || 'admissions@logos.edu'}.

Bendiciones,
Equipo de Admisiones
LOGOS University`,
  };
}

function infoRequestedEmail(applicant) {
  return {
    subject: 'Necesitamos información adicional',
    text: `Estimado/a ${applicant.full_name || 'Solicitante'},

Gracias por tu solicitud a LOGOS University. El equipo de admisiones ha revisado tu expediente y necesita información adicional para continuar con el proceso.

Información requerida:
${applicant.decision_notes || 'Por favor, comunícate con la oficina de admisiones.'}

Por favor, responde a este correo o comunícate con nosotros directamente en ${process.env.ADMISSIONS_EMAIL || 'admissions@logos.edu'} para proporcionar la información solicitada.

Bendiciones,
Equipo de Admisiones
LOGOS University`,
  };
}

// ---------------------------------------------------------------------------
// logEmail — writes a record to the email_log table
// ---------------------------------------------------------------------------

export async function logEmail(applicantId, emailType, status, extra = {}) {
  try {
    const { error } = await supabase.from('email_log').insert({
      applicant_id: applicantId,
      email_type: emailType,
      status,
      subject:      extra.subject      || null,
      body_text:    extra.bodyText     || null,
      from_address: extra.fromAddress  || null,
      to_address:   extra.toAddress    || null,
    });

    if (error) {
      console.error('[emailService] Failed to log email:', error);
    }
  } catch (err) {
    console.error('[emailService] logEmail threw an error:', err);
  }
}

// ---------------------------------------------------------------------------
// sendEmail — selects template and delivers via Resend
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Allowlist guard — only send real emails to approved addresses.
// During development/testing, restrict to a single address so real applicants
// are never accidentally emailed. Remove or expand this list when ready.
// ---------------------------------------------------------------------------
const EMAIL_ALLOWLIST = (process.env.EMAIL_ALLOWLIST || 'hernwilbwork@gmail.com')
  .split(',')
  .map(e => e.trim().toLowerCase());

export async function sendEmail(emailType, applicant, extraData = {}) {
  const recipientEmail = applicant.email?.toLowerCase() || '';

  if (!EMAIL_ALLOWLIST.includes(recipientEmail)) {
    console.warn(
      `[emailService] BLOCKED — "${recipientEmail}" is not on the allowlist. ` +
      `Email type "${emailType}" was NOT sent. ` +
      `Add to EMAIL_ALLOWLIST env var to enable.`
    );
    await logEmail(applicant.id, emailType, 'blocked', { toAddress: recipientEmail });
    return { success: false, blocked: true };
  }

  let template;

  switch (emailType) {
    case 'form1_received':
      template = form1ReceivedEmail(applicant);
      break;
    case 'form2_received':
      template = form2ReceivedEmail(applicant);
      break;
    case 'form3_received':
      template = form3ReceivedEmail(applicant);
      break;
    case 'approved':
      template = approvedEmail(applicant);
      break;
    case 'rejected':
      template = rejectedEmail(applicant);
      break;
    case 'info_requested':
      template = infoRequestedEmail(applicant);
      break;
    default:
      throw new Error(`[emailService] Unknown email type: ${emailType}`);
  }

  try {
    const _resend = getResend(); if (!_resend) throw new Error("RESEND_API_KEY not configured"); const { data, error } = await _resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'admissions@logos.edu',
      to: applicant.email?.toLowerCase(),
      subject: template.subject,
      text: template.text,
    });

    if (error) throw error;

    const fromAddr = process.env.RESEND_FROM_EMAIL || 'admissions@logos.edu';
    await logEmail(applicant.id, emailType, 'sent', {
      subject:     template.subject,
      bodyText:    template.text,
      fromAddress: fromAddr,
      toAddress:   applicant.email?.toLowerCase(),
    });
    return { success: true, data };
  } catch (err) {
    console.error('[emailService] Email send failed:', err);
    await logEmail(applicant.id, emailType, 'failed');
    throw err;
  }
}
