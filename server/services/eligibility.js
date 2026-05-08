import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const programs = require('../../config/programs.json');

// ─── Education level hierarchy ────────────────────────────────────────────────
const EDUCATION_LEVELS = {
  none: 0,
  high_school: 1,
  some_college: 2,
  associate: 3,
  bachelors: 4,
  masters: 5,
  doctorate: 6,
};

// ─── Budget tier definitions ──────────────────────────────────────────────────
// These map the MachForm radio values (monthly_budget field) to internal tiers.
// MachForm options visible in the form screenshot:
//   "$25 USD - $50 USD"   → low   → Institute / Certificate only
//   "$50 USD - $100 USD"  → medium → Undergraduate (Associate / Bachelor)
//   (anything else / not answered) → high → Graduate programs permitted
const BUDGET_TIERS = {
  low: 1,    // ~$25/month — Institute / Certificate
  medium: 2, // $50–$100/month — Undergraduate
  high: 3,   // >$100/month — Graduate programs
};

// Program level → minimum required budget tier
const LEVEL_BUDGET_REQUIREMENT = {
  institute:   'low',
  certificate: 'low',
  associate:   'medium',
  bachelors:   'medium',
  masters:     'high',
  doctorate:   'high',
};

// When a financial mismatch is detected, suggest the best affordable program
// based on what the applicant applied for and their budget tier.
const FINANCIAL_ALTERNATIVE_SUGGESTIONS = {
  // Applied for graduate (masters/doctorate) but budget is low (~$25/month)
  low: {
    masters:   'Certificado en Estudios Bíblicos (Instituto) — recomendado para presupuesto de ~$25/mes. Puede avanzar a programas de pregrado una vez que las finanzas lo permitan.',
    doctorate: 'Certificado en Estudios Bíblicos (Instituto) — recomendado para presupuesto de ~$25/mes. Ruta a largo plazo: Instituto → Pregrado → Posgrado.',
    bachelors: 'Certificado en Estudios Bíblicos (Instituto) o Liderazgo Espiritual / Diplomado — recomendado para presupuesto de ~$25/mes.',
    associate: 'Certificado en Estudios Bíblicos (Instituto) — recomendado para presupuesto de ~$25/mes.',
  },
  // Applied for graduate (masters/doctorate) but budget is medium ($50–$100/month)
  medium: {
    masters:   'Associate of Biblical Studies (ABS) o Associate of Theological Studies (ATS) — recomendado como primer paso para presupuesto de $50–$100/mes. Completar el Asociado primero, luego la Licenciatura, y luego el programa de Maestría.',
    doctorate: 'Associate of Biblical Studies (ABS) — recomendado como primer paso para presupuesto de $50–$100/mes. Ruta: Asociado → Licenciatura → Maestría → Doctorado.',
  },
};

// ─── Document requirements by program level ───────────────────────────────────
// Open enrollment programs (institute / certificate / associate) have no prior
// credential requirements, so no documents are gated here.
// Bachelor's programs require transcripts + diploma when the applicant reports
// any prior education.
// Graduate programs (masters / doctorate) always require both.
const DOCUMENT_REQUIREMENTS = {
  institute:   [],
  certificate: [],
  associate:   [],
  bachelors:   ['transcripts', 'diploma'],
  masters:     ['transcripts', 'undergraduate_diploma'],
  doctorate:   ['transcripts', 'undergraduate_diploma'],
};

// Human-readable labels for the missing-document messages
const DOC_LABELS = {
  transcripts:            'academic transcripts',
  diploma:                'diploma',
  undergraduate_diploma:  'undergraduate diploma (bachelor\'s degree — required for all graduate programs)',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise MachForm yes/no/true/false values to a boolean. */
function isTrue(val) {
  if (!val) return false;
  const s = String(val).toLowerCase().trim();
  return s === 'true' || s === 'yes' || s === '1';
}

/**
 * Parse the MachForm monthly_budget field value into an internal tier string.
 * Returns 'low', 'medium', or 'high'.
 */
function parseBudgetTier(monthlyBudgetValue) {
  if (!monthlyBudgetValue) return 'high'; // not answered → no constraint assumed

  const val = String(monthlyBudgetValue).toLowerCase().trim();

  // Matches "$25 USD - $50 USD", "$25", "25", "$25/mes", etc.
  if (val.includes('25') && !val.includes('100')) return 'low';

  // Matches "$50 USD - $100 USD", "$50", "$100", etc.
  if (val.includes('50') || val.includes('100')) return 'medium';

  // Anything else (higher values, "no constraint", blank) → high
  return 'high';
}

/**
 * Find a program entry by matching applicant.program_applied (display_name,
 * case-insensitive) or falling back to applicant.program_level as a level
 * label. Returns { programId, program } or null.
 */
function findProgram(applicant) {
  const rawName = (applicant.program_applied || '').trim().toLowerCase();
  const rawLevel = (applicant.program_level || '').trim().toLowerCase();

  // 1. Exact display_name match (case-insensitive)
  for (const [id, prog] of Object.entries(programs)) {
    if (prog.display_name.toLowerCase() === rawName) {
      return { programId: id, program: prog };
    }
  }

  // 2. Partial display_name contains the applied string
  if (rawName) {
    for (const [id, prog] of Object.entries(programs)) {
      if (prog.display_name.toLowerCase().includes(rawName)) {
        return { programId: id, program: prog };
      }
    }
  }

  // 3. program_id key match
  if (rawName && programs[rawName]) {
    return { programId: rawName, program: programs[rawName] };
  }

  // 4. Match by program_level (return first program at that level)
  if (rawLevel) {
    for (const [id, prog] of Object.entries(programs)) {
      if (prog.level === rawLevel) {
        return { programId: id, program: prog };
      }
    }
  }

  return null;
}

function educationLevel(key) {
  return EDUCATION_LEVELS[key] ?? -1;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Evaluate whether an applicant meets eligibility requirements for their
 * chosen program, incorporating both academic and financial criteria.
 *
 * @param {object} applicant  - Applicant record (shared interface)
 * @param {object} formData   - Form data object (form_number, submitted_at, raw_data)
 * @returns {{
 *   status: string,
 *   confidence: string,
 *   reasons: string[],
 *   recommended_action: string,
 *   financial_flag: boolean,
 *   suggested_alternative: string|null,
 *   financial_note: string|null
 * }}
 */
export function evaluateEligibility(applicant, formData) {
  const reasons = [];

  // ── 1. Locate the program ──────────────────────────────────────────────────
  const match = findProgram(applicant);

  if (!match) {
    return {
      status: 'needs_review',
      confidence: 'low',
      reasons: [
        `Program not recognized: "${applicant.program_applied || '(none)'}". ` +
          'Could not match to any program in the LOGOS curriculum.',
      ],
      recommended_action:
        'Escalate to admissions officer — program name could not be matched to a known LOGOS program; manual verification required.',
      financial_flag: false,
      suggested_alternative: null,
      financial_note: null,
      document_flag: false,
      missing_documents: [],
      document_note: null,
    };
  }

  const { programId, program } = match;

  // Warn when the match was inexact
  const exactMatch =
    (applicant.program_applied || '').trim().toLowerCase() ===
    program.display_name.toLowerCase();
  if (!exactMatch) {
    reasons.push(
      `Program "${applicant.program_applied}" was matched to "${program.display_name}" (${programId}) — verify this is the correct program.`
    );
  }

  reasons.push(`Program identified: ${program.display_name} (${program.level} level).`);

  // ── 2. Extract education, experience, and BUDGET from form data ────────────
  const rawData = formData?.raw_data ?? {};

  // highest_education is either set directly (legacy) or derived by the webhook
  // normalizer from Form 1's education section dropdowns (Associate *, Licenciatura *,
  // Maestría *, Doctorado *, Completo Su Escuela Secundaria.).
  const highest_education = rawData.highest_education || 'none';

  const ministerial_years_fulltime =
    parseInt(rawData.ministerial_years_fulltime, 10) || 0;
  const ministerial_years_associated =
    parseInt(rawData.ministerial_years_associated, 10) || 0;
  const has_existing_doctorate = isTrue(rawData.has_existing_doctorate);

  // Budget: read from "monthly_budget" (normalized by webhook from the
  // "Budgets / Presupuesto" field). Form options:
  //   "$25 USD - $50 USD"  → low tier  (institute / certificate only)
  //   "$50 USD - $100 USD" → medium tier (undergraduate programs)
  //   (not answered)       → high tier assumed (no financial constraint)
  //
  // Note: the form has no option above $100 — graduate applicants who can afford
  // graduate tuition will simply leave the field blank, which correctly maps to
  // the high tier (no constraint). Applicants who select either option and apply
  // for a graduate program will be flagged for a financial conversation.
  const monthly_budget_raw = rawData.monthly_budget || '';
  const budgetTier = parseBudgetTier(monthly_budget_raw);

  // Documents: detected from Form 1's document checklist checkboxes by the
  // webhook normalizer (detectDocuments). Fields injected into raw_data:
  //   submitted_transcripts            — checked "Transcripts - Registros oficiales"
  //   submitted_diploma                — checked "Copia de la Licenciatura"
  //   submitted_undergraduate_diploma  — checked "Copia de la Licenciatura" or "postgrado"
  const submitted_transcripts = isTrue(rawData.submitted_transcripts);
  const submitted_diploma     = isTrue(rawData.submitted_diploma);
  const submitted_undergraduate_diploma =
    isTrue(rawData.submitted_undergraduate_diploma) || isTrue(rawData.submitted_diploma);

  const eduLevel = educationLevel(highest_education);

  reasons.push(`Highest education reported: ${highest_education} (level ${eduLevel}).`);

  if (monthly_budget_raw) {
    reasons.push(`Monthly budget reported: ${monthly_budget_raw} (tier: ${budgetTier}).`);
  } else {
    reasons.push('Monthly budget not reported — no financial constraint assumed.');
  }

  if (ministerial_years_fulltime > 0 || ministerial_years_associated > 0) {
    reasons.push(
      `Ministerial experience: ${ministerial_years_fulltime} year(s) full-time, ` +
        `${ministerial_years_associated} year(s) associated/part-time.`
    );
  }

  if (has_existing_doctorate) {
    reasons.push('Applicant holds an existing Th.D. or D.Min. degree.');
  }

  // ── 3. FINANCIAL CHECK ─────────────────────────────────────────────────────
  // Run before academic checks. A financial mismatch never hard-rejects —
  // it always routes to needs_review with a clear alternative suggestion so
  // the admissions officer can have a placement conversation with the applicant.

  const requiredBudgetTier = LEVEL_BUDGET_REQUIREMENT[program.level];
  const applicantBudgetValue = BUDGET_TIERS[budgetTier] ?? 3;
  const requiredBudgetValue = BUDGET_TIERS[requiredBudgetTier] ?? 1;

  if (applicantBudgetValue < requiredBudgetValue) {
    const suggestions = FINANCIAL_ALTERNATIVE_SUGGESTIONS[budgetTier] || {};
    const suggestedAlt = suggestions[program.level] || null;

    const financialNote =
      `Applicant applied for ${program.display_name} (${program.level} level, ~$${program.monthly_cost_approx_usd}/mes) ` +
      `but reported a monthly budget of "${monthly_budget_raw || 'not specified'}" (tier: ${budgetTier}). ` +
      `This program requires approximately $${program.monthly_cost_approx_usd}/month, which exceeds their stated budget. ` +
      (suggestedAlt ? `Suggested alternative path: ${suggestedAlt}` : 'Admissions officer should discuss affordable options with the applicant.');

    return {
      status: 'needs_review',
      confidence: 'low',
      reasons: [
        ...reasons,
        `Financial mismatch: budget tier "${budgetTier}" is below the "${requiredBudgetTier}" tier required for ${program.level}-level programs.`,
      ],
      recommended_action:
        `Escalate to admissions officer — applicant is academically eligible but budget does not support ${program.display_name}. Discuss alternative program placement.`,
      financial_flag: true,
      suggested_alternative: suggestedAlt,
      financial_note: financialNote,
      document_flag: false,
      missing_documents: [],
      document_note: null,
    };
  }

  // Budget is sufficient — continue with academic checks.
  if (monthly_budget_raw) {
    reasons.push(
      `Financial check passed: reported budget (${budgetTier} tier) is sufficient for ${program.level}-level programs.`
    );
  }

  // ── 4. DOCUMENT CHECK ─────────────────────────────────────────────────────
  // Missing transcripts or diploma → cannot qualify. Route to needs_review so
  // the admissions officer can request the documents. No AI call needed —
  // the reason is clear.
  //
  // Rules:
  //   • Open enrollment programs (institute/certificate/associate): no docs gated.
  //   • Bachelor's: transcripts + diploma required when applicant reports prior education.
  //   • Masters/Doctorate: transcripts + undergraduate (bachelor's) diploma always required.

  const requiredDocs = DOCUMENT_REQUIREMENTS[program.level] || [];

  if (requiredDocs.length > 0) {
    const missingDocs = [];

    if (requiredDocs.includes('transcripts') && !submitted_transcripts) {
      missingDocs.push('transcripts');
    }

    if (requiredDocs.includes('diploma') && !submitted_diploma) {
      // For bachelor's: only require diploma if they report having prior education
      const hasPriorEdu = eduLevel > EDUCATION_LEVELS.none;
      if (hasPriorEdu) missingDocs.push('diploma');
    }

    if (requiredDocs.includes('undergraduate_diploma') && !submitted_undergraduate_diploma) {
      missingDocs.push('undergraduate_diploma');
    }

    if (missingDocs.length > 0) {
      const missingLabels = missingDocs.map(d => DOC_LABELS[d] || d);
      const missingList = missingLabels.join('; ');

      const docNote =
        program.level === 'masters' || program.level === 'doctorate'
          ? `Graduate programs require both academic transcripts and an undergraduate (bachelor's) diploma before eligibility can be confirmed. ` +
            `Missing: ${missingList}.`
          : `Required documents are missing. Cannot confirm eligibility until the following are received: ${missingList}.`;

      reasons.push(`Document check failed — missing: ${missingList}.`);

      return {
        status: 'needs_review',
        confidence: 'high',
        reasons,
        recommended_action:
          `Request missing documents from applicant — cannot qualify for ${program.display_name} without: ${missingList}. Contact applicant to submit before proceeding.`,
        financial_flag: false,
        suggested_alternative: null,
        financial_note: null,
        document_flag: true,
        missing_documents: missingDocs,
        document_note: docNote,
      };
    }

    // All required docs present — note it
    reasons.push(`Document check passed: required documents submitted (${requiredDocs.join(', ')}).`);
  }

  // ── 5. AUTO-REJECT checks (academic) ──────────────────────────────────────

  // 4a. PhD without existing doctorate — strict hard rule
  if (programId === 'phd' && !has_existing_doctorate) {
    return {
      status: 'ineligible',
      confidence: 'high',
      reasons: [
        ...reasons,
        'Auto-reject: The Doctor of Religious Philosophy (Ph.D) program strictly requires an existing Th.D. or D.Min. degree. Applicant does not meet this requirement.',
      ],
      recommended_action:
        'Reject application — applicant does not hold an existing Th.D. or D.Min., which is a strict prerequisite for the Ph.D program.',
      financial_flag: false,
      suggested_alternative: null,
      financial_note: null,
      document_flag: false,
      missing_documents: [],
      document_note: null,
    };
  }

  // 4b. Masters — below bachelor's AND low ministerial experience
  if (program.level === 'masters') {
    const belowBachelors = eduLevel < EDUCATION_LEVELS.bachelors;
    const lowExperience =
      ministerial_years_fulltime < 5 && ministerial_years_associated < 10;

    if (belowBachelors && lowExperience) {
      return {
        status: 'ineligible',
        confidence: 'high',
        reasons: [
          ...reasons,
          `Auto-reject: Master's programs require a bachelor's degree. Applicant's highest education is "${highest_education}" ` +
            `and has only ${ministerial_years_fulltime} year(s) full-time / ${ministerial_years_associated} year(s) associated ministerial experience ` +
            '(minimum thresholds: 5 years full-time OR 10 years associated for exceptional review).',
        ],
        recommended_action:
          `Reject application — applicant does not meet minimum educational requirements for ${program.display_name} and has insufficient ministerial experience for an exceptional review.`,
        financial_flag: false,
        suggested_alternative: null,
        financial_note: null,
      };
    }
  }

  // 4c. Doctorate (non-PhD) — below master's AND low ministerial experience
  if (program.level === 'doctorate' && programId !== 'phd') {
    const belowMasters = eduLevel < EDUCATION_LEVELS.masters;
    const totalMinisterialYears =
      ministerial_years_fulltime + ministerial_years_associated;
    const lowExperience =
      ministerial_years_fulltime < 10 &&
      ministerial_years_associated < 20 &&
      totalMinisterialYears < 10;

    if (belowMasters && lowExperience) {
      return {
        status: 'ineligible',
        confidence: 'high',
        reasons: [
          ...reasons,
          `Auto-reject: Doctoral programs require a master's degree. Applicant's highest education is "${highest_education}" ` +
            `and has only ${ministerial_years_fulltime} year(s) full-time / ${ministerial_years_associated} year(s) associated ministerial experience.`,
        ],
        recommended_action:
          `Reject application — applicant does not meet minimum educational requirements for ${program.display_name} and has insufficient ministerial experience for an exceptional review.`,
        financial_flag: false,
        suggested_alternative: null,
        financial_note: null,
      };
    }
  }

  // ── 5. FLAG FOR REVIEW checks (academic edge cases) ────────────────────────

  // 5a. Bachelors — high school or no education (possible life experience credit)
  if (
    program.level === 'bachelors' &&
    (highest_education === 'high_school' || highest_education === 'none')
  ) {
    return {
      status: 'needs_review',
      confidence: 'low',
      reasons: [
        ...reasons,
        `Flag for review: Applicant's highest education is "${highest_education}". ` +
          'Bachelor\'s programs normally require at least some college, but up to 30 credits may be awarded via documented Life Experience and up to 15 via Ministerial Internship.',
      ],
      recommended_action:
        `Escalate to admissions officer — applicant may qualify for life experience credit toward ${program.display_name}, but documentation must be reviewed before admission.`,
      financial_flag: false,
      suggested_alternative: null,
      financial_note: null,
      document_flag: false,
      missing_documents: [],
      document_note: null,
    };
  }

  // 5b. Masters — sub-bachelor but exceptional ministerial experience
  if (program.level === 'masters') {
    const subBachelors =
      highest_education === 'associate' || highest_education === 'some_college';

    if (subBachelors && ministerial_years_fulltime >= 5) {
      return {
        status: 'needs_review',
        confidence: 'low',
        reasons: [
          ...reasons,
          `Flag for review: Applicant's highest education is "${highest_education}" (below bachelor's) but has ${ministerial_years_fulltime} year(s) of full-time ministerial experience — exceptional case.`,
        ],
        recommended_action:
          `Escalate to admissions officer — applicant lacks a bachelor's degree for ${program.display_name} but has significant full-time ministerial experience; exceptional admission may be warranted.`,
        financial_flag: false,
        suggested_alternative: null,
        financial_note: null,
      };
    }

    if (subBachelors && ministerial_years_associated >= 10) {
      return {
        status: 'needs_review',
        confidence: 'low',
        reasons: [
          ...reasons,
          `Flag for review: Applicant's highest education is "${highest_education}" (below bachelor's) but has ${ministerial_years_associated} year(s) of associated ministerial experience — exceptional case.`,
        ],
        recommended_action:
          `Escalate to admissions officer — applicant lacks a bachelor's degree for ${program.display_name} but has extensive associated ministerial experience; exceptional admission may be warranted.`,
        financial_flag: false,
        suggested_alternative: null,
        financial_note: null,
      };
    }
  }

  // 5c. Doctorate (non-PhD) — bachelor's only but exceptional experience
  if (program.level === 'doctorate' && programId !== 'phd') {
    if (highest_education === 'bachelors' && ministerial_years_fulltime >= 10) {
      return {
        status: 'needs_review',
        confidence: 'low',
        reasons: [
          ...reasons,
          `Flag for review: Applicant holds a bachelor's (below master's) but has ${ministerial_years_fulltime} year(s) of full-time ministerial experience — exceptional case.`,
        ],
        recommended_action:
          `Escalate to admissions officer — applicant lacks a master's degree for ${program.display_name} but has extensive full-time ministerial experience.`,
        financial_flag: false,
        suggested_alternative: null,
        financial_note: null,
      };
    }

    if (highest_education === 'bachelors' && ministerial_years_associated >= 20) {
      return {
        status: 'needs_review',
        confidence: 'low',
        reasons: [
          ...reasons,
          `Flag for review: Applicant holds a bachelor's (below master's) but has ${ministerial_years_associated} year(s) of associated ministerial experience — exceptional case.`,
        ],
        recommended_action:
          `Escalate to admissions officer — applicant lacks a master's degree for ${program.display_name} but has extensive associated ministerial experience.`,
        financial_flag: false,
        suggested_alternative: null,
        financial_note: null,
      };
    }
  }

  // 5d. Inexact program name match
  if (!exactMatch) {
    return {
      status: 'needs_review',
      confidence: 'low',
      reasons: [
        ...reasons,
        'Flag for review: Program name did not exactly match a known program — matched by partial name. Human verification recommended.',
      ],
      recommended_action:
        `Escalate to admissions officer — program "${applicant.program_applied}" was only partially matched to "${program.display_name}"; confirm the correct program before proceeding.`,
      financial_flag: false,
      suggested_alternative: null,
      financial_note: null,
      document_flag: false,
      missing_documents: [],
      document_note: null,
    };
  }

  // ── 6. AUTO-APPROVE checks ────────────────────────────────────────────────

  // 6a. Institute / Certificate — open enrollment
  if (program.level === 'institute' || program.level === 'certificate') {
    reasons.push(
      `${program.display_name} is an open-enrollment ${program.level} program — no prior education requirement.`
    );
    return {
      status: 'eligible',
      confidence: 'high',
      reasons,
      recommended_action: 'Approve application — requirements met.',
      financial_flag: false,
      suggested_alternative: null,
      financial_note: null,
      document_flag: false,
      missing_documents: [],
      document_note: null,
    };
  }

  // 6b. Associate — open enrollment
  if (program.level === 'associate') {
    reasons.push(
      `${program.display_name} is an open-enrollment associate program — no prior education requirement.`
    );
    return {
      status: 'eligible',
      confidence: 'high',
      reasons,
      recommended_action: 'Approve application — requirements met.',
      financial_flag: false,
      suggested_alternative: null,
      financial_note: null,
      document_flag: false,
      missing_documents: [],
      document_note: null,
    };
  }

  // 6c. Bachelors — some_college or higher
  if (program.level === 'bachelors') {
    if (eduLevel >= EDUCATION_LEVELS.some_college) {
      reasons.push(
        `Applicant's education level (${highest_education}) meets the requirement for ${program.display_name}.`
      );
      return {
        status: 'eligible',
        confidence: 'high',
        reasons,
        recommended_action: 'Approve application — requirements met.',
        financial_flag: false,
        suggested_alternative: null,
        financial_note: null,
      };
    }
  }

  // 6d. Masters — bachelor's or higher
  if (program.level === 'masters') {
    if (eduLevel >= EDUCATION_LEVELS.bachelors) {
      reasons.push(
        `Applicant holds a ${highest_education} degree, meeting the bachelor's-level prerequisite for ${program.display_name}.`
      );
      return {
        status: 'eligible',
        confidence: 'high',
        reasons,
        recommended_action: 'Approve application — requirements met.',
        financial_flag: false,
        suggested_alternative: null,
        financial_note: null,
      };
    }
  }

  // 6e. Doctorate (non-PhD) — master's or higher
  if (program.level === 'doctorate' && programId !== 'phd') {
    if (eduLevel >= EDUCATION_LEVELS.masters) {
      reasons.push(
        `Applicant holds a ${highest_education} degree, meeting the master's-level prerequisite for ${program.display_name}.`
      );
      return {
        status: 'eligible',
        confidence: 'high',
        reasons,
        recommended_action: 'Approve application — requirements met.',
        financial_flag: false,
        suggested_alternative: null,
        financial_note: null,
      };
    }
  }

  // 6f. PhD — existing doctorate confirmed
  if (programId === 'phd' && has_existing_doctorate) {
    reasons.push(
      'Applicant holds an existing Th.D. or D.Min., satisfying the strict prerequisite for the Ph.D program.'
    );
    return {
      status: 'eligible',
      confidence: 'high',
      reasons,
      recommended_action: 'Approve application — requirements met.',
      financial_flag: false,
      suggested_alternative: null,
      financial_note: null,
      document_flag: false,
      missing_documents: [],
      document_note: null,
    };
  }

  // ── 7. Fallback ───────────────────────────────────────────────────────────
  reasons.push(
    'Could not determine eligibility with confidence based on the information provided.'
  );
  return {
    status: 'needs_review',
    confidence: 'low',
    reasons,
    recommended_action:
      `Escalate to admissions officer — eligibility for ${program.display_name} could not be determined automatically; manual review required.`,
    financial_flag: false,
    suggested_alternative: null,
    financial_note: null,
  };
}
