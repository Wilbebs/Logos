import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';

const API_URL = import.meta.env.VITE_API_URL || '';

const REC_COLORS = {
  approve:  'text-green-700 font-semibold',
  reject:   'text-red-700 font-semibold',
  escalate: 'text-yellow-700 font-semibold',
};

const REC_LABELS = {
  approve:  'Approve',
  reject:   'Reject',
  escalate: 'Escalate to Admissions Officer',
};

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Detection helpers ──────────────────────────────────────────────────────────

function isDocumentFlag(reasoning) {
  if (!reasoning) return false;
  const lower = reasoning.toLowerCase();
  return (
    lower.includes('missing required documents') ||
    lower.includes('missing: academic transcripts') ||
    lower.includes('missing: undergraduate diploma') ||
    lower.includes('cannot confirm eligibility until') ||
    lower.includes('required documents are missing') ||
    lower.includes('have not been submitted') ||
    lower.includes('has not been submitted') ||
    lower.includes('not been submitted') ||
    lower.includes('documents have not') ||
    lower.includes('documents are missing') ||
    lower.includes('eligibility cannot be confirmed') ||
    lower.includes('without these required documents') ||
    (lower.includes('missing') && lower.includes('diploma')) ||
    (lower.includes('missing') && lower.includes('transcripts'))
  );
}

function isFinancialMismatch(reasoning) {
  if (!reasoning) return false;
  const lower = reasoning.toLowerCase();
  return (
    lower.includes('presupuesto') ||
    lower.includes('financial mismatch') ||
    lower.includes('budget does not support') ||
    lower.includes('recomendado como primer paso') ||
    lower.includes('recomendado para presupuesto') ||
    lower.includes('suggested alternative')
  );
}

// ── Requirements checklist ────────────────────────────────────────────────────

const EDU_LEVELS = {
  none: 0, high_school: 1, some_college: 2, associate: 3,
  bachelors: 4, masters: 5, doctorate: 6,
};

const EDU_LABELS = {
  none: 'None', high_school: 'High School', some_college: 'Some College',
  associate: 'Associate Degree', bachelors: "Bachelor's Degree",
  masters: "Master's Degree", doctorate: 'Doctorate',
};

function buildChecklist(applicant) {
  const level  = (applicant.program_level || '').toLowerCase();
  const edu    = applicant.highest_education || 'none';
  const eduVal = EDU_LEVELS[edu] ?? 0;
  const ftYrs  = applicant.ministerial_years_fulltime  ?? 0;
  const asYrs  = applicant.ministerial_years_associated ?? 0;
  const items  = [];

  // ── Documents ──────────────────────────────────────────────────────────────
  items.push({ label: 'Academic transcripts', passed: !!applicant.submitted_transcripts });
  if (level === 'masters' || level === 'doctorate') {
    items.push({ label: "Undergraduate diploma (bachelor's)", passed: !!applicant.submitted_undergraduate_diploma });
  } else {
    items.push({ label: 'Diploma', passed: !!applicant.submitted_diploma });
  }

  // ── Education / experience ─────────────────────────────────────────────────
  if (level === 'bachelors') {
    const ok = eduVal >= EDU_LEVELS.some_college;
    items.push({ label: 'Education: some college or higher', passed: ok,
      note: !ok ? `Currently: ${EDU_LABELS[edu] || edu}` : null });
  } else if (level === 'masters') {
    const ok = eduVal >= EDU_LEVELS.bachelors;
    items.push({ label: "Education: bachelor's degree minimum", passed: ok,
      note: !ok ? `Currently: ${EDU_LABELS[edu] || edu}` : null });
    if (!ok) {
      items.push({ label: 'Ministry exception: 5+ yrs full-time or 10+ yrs associated',
        passed: ftYrs >= 5 || asYrs >= 10,
        note: `${ftYrs} yr FT / ${asYrs} yr associated` });
    }
  } else if (level === 'doctorate') {
    const isPhD = /ph\.?d|philosophy/i.test(applicant.program_applied || '');
    if (isPhD) {
      items.push({ label: 'Prerequisite: existing Th.D. or D.Min.',
        passed: edu === 'doctorate',
        note: edu !== 'doctorate' ? `Currently: ${EDU_LABELS[edu] || edu}` : null });
    } else {
      const ok = eduVal >= EDU_LEVELS.masters;
      items.push({ label: "Education: master's degree minimum", passed: ok,
        note: !ok ? `Currently: ${EDU_LABELS[edu] || edu}` : null });
      if (!ok && eduVal >= EDU_LEVELS.bachelors) {
        items.push({ label: 'Ministry exception: 10+ yrs FT or 20+ yrs associated',
          passed: ftYrs >= 10 || asYrs >= 20,
          note: `${ftYrs} yr FT / ${asYrs} yr associated` });
      }
    }
  }
  // Institute / certificate / associate → open enrollment, docs only

  return items;
}

function RequirementsChecklist({ applicant }) {
  const { t } = useLanguage();
  const items = buildChecklist(applicant);
  if (!items.length) return null;
  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('review.ai.requirements')}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <span className={`mt-0.5 font-bold ${item.passed ? 'text-green-600' : 'text-red-500'}`}>
              {item.passed ? '✓' : '✗'}
            </span>
            <span className={item.passed ? 'text-gray-700' : 'text-red-700 font-medium'}>
              {item.label}
              {item.note && <span className="text-gray-400 font-normal ml-1">({item.note})</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AIRecommendation({ applicant, onReviewComplete }) {
  const { lang, t } = useLanguage();
  // eligibility_status breakdown:
  //   eligible   → rules engine approved; AI review optional but useful
  //   ineligible → rules engine hard-rejected; AI review not applicable, show reason
  //   needs_review (doc/financial flag) → clear-cut case; AI review not useful
  //   needs_review (other) → edge case; AI review is the right tool
  const isIneligible = applicant.eligibility_status === 'ineligible';
  const isRulesEngineResult = isIneligible; // only ineligible locks the button
  const aiSourceLabel = (applicant.eligibility_status === 'eligible' || isIneligible)
    ? t('review.ai.source.engine')
    : t('review.ai.source.gemini');
  const [running, setRunning]   = useState(false);
  const [runError, setRunError] = useState('');

  // Local override so the component refreshes immediately without a full page reload
  const [localRec, setLocalRec]       = useState(null);
  const [localReason, setLocalReason] = useState(null);

  const ai_recommendation = localRec    ?? applicant.ai_recommendation;
  const ai_reasoning      = localReason ?? applicant.ai_reasoning;

  async function handleRunAssessment() {
    setRunning(true);
    setRunError('');
    try {
      const res = await fetch(`${API_URL}/api/applicants/${applicant.id}/ai-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
      setLocalRec(data.ai_recommendation);
      setLocalReason(data.ai_reasoning);
      if (onReviewComplete) onReviewComplete();
    } catch (err) {
      setRunError(err.message || 'Assessment failed.');
    } finally {
      setRunning(false);
    }
  }

  // Shared run/rerun button
  // greyed = true when AI is not applicable (rules-engine case, doc flag, etc.)
  // alreadyRun = true when AI has already produced a result — allow re-run to detect changes
  const alreadyRun = !!(localRec ?? applicant.ai_recommendation);
  const RunButton = ({ greyed = false }) => {
    const locked = greyed; // never lock on alreadyRun — re-runs are allowed
    const title = greyed
      ? 'AI assessment is not used for this case — result is determined by the rules engine'
      : alreadyRun
      ? 'Re-run assessment — Gemini will check if anything has changed since the last review'
      : undefined;
    return (
    <div className="mt-3 space-y-1">
      <button
        onClick={locked ? undefined : handleRunAssessment}
        disabled={running || locked}
        title={title}
        className={`flex items-center gap-1.5 text-xs font-medium ${
          locked
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-blue-600 hover:text-blue-800 disabled:text-blue-300'
        }`}
      >
        {running ? (
          <><span className="animate-spin inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full" /> {t('review.ai.running')}</>
        ) : (
          <>✦ {alreadyRun ? t('review.ai.rerun') : t('review.ai.run')}</>
        )}
      </button>
      {runError && <p className="text-xs text-red-600">{runError}</p>}
    </div>
  );
  };

  // ── Forms incomplete — primary blocker, shown before everything else ────────
  if (!applicant.forms_complete) {
    const missing = [];
    if (!applicant.form1_submitted_at) missing.push('Form 1 — Solicitud de Admisión');
    if (!applicant.form2_submitted_at) missing.push('Form 2 — Recomendación Pastoral');
    if (!applicant.form3_submitted_at) missing.push('Form 3 — Experiencia Ministerial');

    return (
      <div className="border border-yellow-300 rounded overflow-hidden">
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
          <p className="text-sm font-bold text-yellow-800">{t('review.waiting.title')}</p>
        </div>
        <div className="px-4 py-3 space-y-2">
          <p className="text-sm text-gray-700">{t('review.waiting.body')}</p>
          <ul className="space-y-1 mt-1">
            {['form1_submitted_at','form2_submitted_at','form3_submitted_at'].map((f, i) => {
              const labels = ['Form 1 — Solicitud de Admisión','Form 2 — Recomendación Pastoral','Form 3 — Experiencia Ministerial'];
              const submitted = !!applicant[f];
              return (
                <li key={f} className="flex items-center gap-2 text-xs">
                  <span className={`font-bold ${submitted ? 'text-green-600' : 'text-yellow-600'}`}>
                    {submitted ? '✓' : '○'}
                  </span>
                  <span className={submitted ? 'text-gray-600' : 'text-yellow-800 font-medium'}>
                    {labels[i]}{submitted ? ' (received)' : ' (pending)'}
                  </span>
                </li>
              );
            })}
          </ul>
          {applicant.ai_reasoning && (
            <p className="text-xs text-gray-400 mt-2 italic">{applicant.ai_reasoning}</p>
          )}
        </div>
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400">{t('review.waiting.footer')}</p>
        </div>
      </div>
    );
  }

  // ── Ineligible — hard rules-engine rejection ─────────────────────────────
  if (isIneligible) {
    return (
      <div className="border border-red-300 rounded overflow-hidden">
        <div className="px-4 py-2 bg-red-100 border-b border-red-200">
          <p className="text-sm font-bold text-red-800">✗ Does Not Meet Eligibility Requirements</p>
        </div>
        <div className="px-4 py-3 bg-red-50 space-y-2">
          <p className="text-sm text-red-900 leading-relaxed">
            {ai_reasoning || 'This applicant does not meet the minimum requirements for their selected program. Re-submit the application through MachForm once requirements are met to re-evaluate.'}
          </p>
          <RequirementsChecklist applicant={applicant} />
          <p className="text-xs text-red-700 font-medium mt-2">
            A final decision has not been made — this is the eligibility assessment only. The admissions team must review and submit a decision below.
          </p>
        </div>
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 flex items-center justify-between">
          <p className="text-xs text-gray-400">{aiSourceLabel}</p>
          <RunButton greyed />
        </div>
      </div>
    );
  }

  if (!ai_recommendation) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded p-4">
        <p className="text-sm text-gray-500">{lang === 'es' ? 'Sin revisión IA aún.' : 'No AI review yet.'}</p>
        <p className="text-xs text-gray-400 mt-1 mb-2">
          {lang === 'es' ? 'La revisión IA se ejecuta automáticamente en casos especiales. También puedes activarla manualmente.' : 'AI review runs automatically on edge cases. You can also trigger it manually.'}
        </p>
        <RunButton />
      </div>
    );
  }

  // ── Missing documents alert ───────────────────────────────────────────────
  if (isDocumentFlag(ai_reasoning)) {
    // Parse out the list of missing items after "Missing:" if present
    const text = ai_reasoning || '';
    const missingMatch = text.match(/Missing:\s*([^.]+)\./i);
    const missingList = missingMatch ? missingMatch[1].trim() : null;

    return (
      <div className="border border-red-300 rounded overflow-hidden">
        <div className="px-4 py-2 bg-red-100 border-b border-red-200">
          <p className="text-sm font-bold text-red-800">{t('review.doc.title')}</p>
        </div>

        <div className="px-4 py-3 bg-red-50 space-y-3">
          <p className="text-sm text-red-900 leading-relaxed">{text}</p>

          {missingList && (
            <div className="bg-white border border-red-200 rounded p-3">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">
                {t('review.doc.needed')}
              </p>
              <ul className="space-y-1">
                {missingList.split(';').map((doc, i) => (
                  <li key={i} className="text-sm text-gray-800 flex items-start gap-1">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{doc.trim()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-red-700">{t('review.doc.footer')}</p>
        </div>

        <div className="px-4 py-2 bg-red-50 border-t border-red-200 flex items-center justify-between">
          <p className="text-xs text-gray-400">Evaluated by LOGOS Eligibility Engine — document check</p>
          <RunButton greyed />
        </div>
      </div>
    );
  }

  // ── Financial placement alert ─────────────────────────────────────────────
  if (isFinancialMismatch(ai_reasoning)) {
    let mainNote = ai_reasoning || '';
    let suggestedPath = null;

    const markers = ['Suggested alternative path:', 'Suggested alternative:', 'Suggested'];
    for (const marker of markers) {
      const idx = mainNote.indexOf(marker);
      if (idx !== -1) {
        suggestedPath = mainNote.slice(idx + marker.length).trim();
        mainNote = mainNote.slice(0, idx).trim();
        break;
      }
    }

    return (
      <div className="border border-yellow-300 rounded overflow-hidden">
        <div className="px-4 py-2 bg-yellow-100 border-b border-yellow-200">
          <p className="text-sm font-bold text-yellow-800">⚠ Financial Placement Alert</p>
        </div>

        <div className="px-4 py-3 bg-yellow-50 space-y-3">
          <p className="text-sm text-yellow-900 leading-relaxed">{mainNote}</p>

          {suggestedPath && (
            <div className="bg-white border border-yellow-200 rounded p-3">
              <p className="text-xs font-semibold text-yellow-800 uppercase tracking-wide mb-1">
                Suggested Alternative Path
              </p>
              <p className="text-sm text-gray-800 leading-relaxed">{suggestedPath}</p>
            </div>
          )}

          <p className="text-xs text-yellow-700">
            Applicant meets academic requirements but their stated budget does not cover
            this program. Contact them to discuss an affordable starting point before
            making a final decision.
          </p>
        </div>

        <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200 flex items-center justify-between">
          <p className="text-xs text-gray-400">Evaluated by LOGOS Eligibility Engine — financial check</p>
          <RunButton greyed />
        </div>
      </div>
    );
  }

  // ── Standard AI review ────────────────────────────────────────────────────
  const recColorClass = REC_COLORS[ai_recommendation] || 'text-gray-700 font-semibold';
  const recLabel = REC_LABELS[ai_recommendation] || capitalize(ai_recommendation);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded p-4">
      <h3 className="text-sm font-bold text-gray-700 mb-3">{t('review.ai.title')}</h3>
      <div className="space-y-2">
        <p className="text-sm">
          <span className="font-semibold text-gray-600">{t('review.ai.recommendation')}: </span>
          <span className={recColorClass}>{recLabel}</span>
        </p>
        {ai_reasoning && (
          <p className="text-sm">
            <span className="font-semibold text-gray-600">{t('review.ai.reasoning')}: </span>
            <span className="text-gray-700">{ai_reasoning}</span>
          </p>
        )}
      </div>
      <RequirementsChecklist applicant={applicant} />
      <p className="mt-3 text-xs text-gray-400">{aiSourceLabel}</p>
      <RunButton greyed={isRulesEngineResult} />
    </div>
  );
}
