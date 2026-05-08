import React from 'react';

// ── Field name maps ────────────────────────────────────────────────────────────
// Maps raw MachForm field names → readable labels for display.
// Add or rename keys here as you finalize your MachForm field names.

const MINISTRY_FIELDS = {
  years_christian:              'Years as Christian',
  how_long_christian:           'Years as Christian',
  church_name:                  'Church',
  iglesia:                      'Church',
  ministerial_role:             'Ministerial Role',
  rol_ministerial:              'Ministerial Role',
  ministerial_years_fulltime:   'Full-time Ministry (years)',
  ministerial_years_associated: 'Associated Ministry (years)',
  has_ministerial_education:    'Prior Ministerial Education',
  instituto_classes_completed:  'Instituto Classes Completed',
  references:                   'References',
};

const ACADEMIC_FIELDS = {
  highest_education:              'Highest Education',
  secular_degree_field:          'Degree Field',
  campo_de_estudio:              'Degree Field',
  has_existing_doctorate:        'Holds Th.D. or D.Min.',
  transfer_credits:              'Transfer Credits',
  life_experience_description:   'Life Experience (description)',
};

const DOCUMENT_FIELDS = {
  submitted_transcripts:            'Transcripts Submitted',
  submitted_diploma:                'Diploma Submitted',
  submitted_undergraduate_diploma:  'Undergraduate Diploma Submitted',
};

const FINANCIAL_FIELDS = {
  monthly_budget: 'Monthly Budget',
};

// Fields shown in the header — exclude from body sections
const HEADER_KEYS = new Set([
  'email', 'full_name', 'name', 'phone',
  'program_applied', 'program_level', 'form_number',
]);

// All explicitly categorised keys — used to build "Other Responses" catch-all
const ALL_KNOWN_KEYS = new Set([
  ...Object.keys(MINISTRY_FIELDS),
  ...Object.keys(ACADEMIC_FIELDS),
  ...Object.keys(DOCUMENT_FIELDS),
  ...Object.keys(FINANCIAL_FIELDS),
  ...HEADER_KEYS,
]);

// ── Helpers ────────────────────────────────────────────────────────────────────

function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('');
}

function formatFieldValue(key, val) {
  if (val === null || val === undefined || val === '') return null;
  const s = String(val);
  if (s.toLowerCase() === 'true') return 'Yes';
  if (s.toLowerCase() === 'false') return 'No';
  if (s.toLowerCase() === 'yes') return 'Yes';
  if (s.toLowerCase() === 'no') return 'No';
  return s;
}

function educationLabel(val) {
  const map = {
    none: 'None',
    high_school: 'High School',
    some_college: 'Some College',
    associate: 'Associate Degree',
    bachelors: "Bachelor's Degree",
    masters: "Master's Degree",
    doctorate: 'Doctorate',
  };
  return map[val] || val;
}

function budgetLabel(val) {
  if (!val) return null;
  if (val.includes('25')) return '~$25/month (Instituto level)';
  if (val.includes('50') || val.includes('100')) return '$50–$100/month (Undergraduate level)';
  return val;
}

// Build a 2–3 sentence narrative from merged form data
function buildNarrative(merged, applicant) {
  const parts = [];
  const name = applicant.full_name || merged.full_name || 'This applicant';

  const yearsChr = merged.years_christian || merged.how_long_christian;
  const role = merged.ministerial_role || merged.rol_ministerial;
  const church = merged.church_name || merged.iglesia;
  const ftYears = merged.ministerial_years_fulltime;
  const assocYears = merged.ministerial_years_associated;
  const edu = merged.highest_education;
  const program = applicant.program_applied;
  const budget = merged.monthly_budget;

  // Sentence 1: who they are
  let s1 = `${name}`;
  if (yearsChr) s1 += ` has been a Christian for ${yearsChr} years`;
  if (role) s1 += ` and serves as ${/^[aeiou]/i.test(role) ? 'an' : 'a'} ${role}`;
  if (church) s1 += ` at ${church}`;
  parts.push(s1 + '.');

  // Sentence 2: experience & education
  const expParts = [];
  if (ftYears && parseInt(ftYears) > 0) expParts.push(`${ftYears} year(s) of full-time ministerial experience`);
  if (assocYears && parseInt(assocYears) > 0) expParts.push(`${assocYears} year(s) associated`);
  const eduLabel = edu ? educationLabel(edu).toLowerCase() : null;

  let s2 = '';
  if (expParts.length > 0 || eduLabel) {
    s2 = 'They';
    if (eduLabel && eduLabel !== 'none') s2 += ` hold ${/^[aeiou]/.test(eduLabel) ? 'an' : 'a'} ${eduLabel}`;
    if (expParts.length > 0) s2 += (eduLabel && eduLabel !== 'none' ? ' and have' : ' have') + ' ' + expParts.join(' and ');
    parts.push(s2 + '.');
  }

  // Sentence 3: program & budget
  let s3 = '';
  if (program) s3 += `They are applying for the ${program} program`;
  if (budget) s3 += `${program ? ' with' : 'Their'} a monthly study budget of ${budget}`;
  if (s3) parts.push(s3 + '.');

  return parts.length > 0 ? parts.join(' ') : null;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ProfileSection({ title, fieldMap, data }) {
  const entries = Object.entries(fieldMap)
    .map(([key, label]) => {
      // Only use the first matching key (handles aliases)
      const val = formatFieldValue(key, data[key]);
      return val ? { label, val, key } : null;
    })
    .filter(Boolean)
    // Deduplicate labels (keep first occurrence)
    .filter((item, idx, arr) => arr.findIndex(x => x.label === item.label) === idx);

  if (entries.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</p>
      <dl className="space-y-1">
        {entries.map(({ label, val, key }) => (
          <div key={key} className="flex gap-2 text-sm">
            <dt className="text-gray-500 shrink-0 w-44">{label}</dt>
            <dd className="text-gray-800 font-medium">{key === 'highest_education' ? educationLabel(val) : val}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function DocumentStatus({ data }) {
  const checks = [
    { key: 'submitted_transcripts', label: 'Transcripts' },
    { key: 'submitted_diploma', label: 'Diploma' },
    { key: 'submitted_undergraduate_diploma', label: 'Undergrad Diploma' },
  ];

  const present = checks.filter(c => data[c.key] !== undefined);
  if (present.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Documents</p>
      <div className="flex flex-wrap gap-2">
        {present.map(({ key, label }) => {
          const val = String(data[key] || '').toLowerCase();
          const submitted = val === 'true' || val === 'yes';
          return (
            <span
              key={key}
              className={`text-xs px-2 py-0.5 rounded-full border ${
                submitted
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-red-50 border-red-300 text-red-700'
              }`}
            >
              {submitted ? '✓' : '✗'} {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LeadProfile({ applicant, forms }) {
  // Merge all form raw_data in order — later forms override earlier for duplicate keys
  const merged = {};
  [...(forms || [])].sort((a, b) => a.form_number - b.form_number).forEach(f => {
    Object.assign(merged, f.raw_data || {});
  });

  const narrative = buildNarrative(merged, applicant);

  // Build "Other Responses" — everything not in a known section or header
  const otherEntries = Object.entries(merged).filter(([key]) => !ALL_KNOWN_KEYS.has(key));

  const [showOther, setShowOther] = React.useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded overflow-hidden">
      {/* ── Profile Header ── */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">
            {initials(applicant.full_name)}
          </span>
        </div>

        {/* Name + contact */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 leading-tight">
            {applicant.full_name || '(no name)'}
          </h2>
          <p className="text-sm text-gray-500">{applicant.email || '—'}</p>
          {applicant.phone && <p className="text-sm text-gray-500">{applicant.phone}</p>}
        </div>

        {/* Program badge */}
        {applicant.program_applied && (
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-500 mb-0.5">Applying for</p>
            <p className="text-sm font-semibold text-gray-800">{applicant.program_applied}</p>
            {applicant.program_level && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {applicant.program_level}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Auto-generated narrative ── */}
      {narrative && (
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Profile Summary</p>
          <p className="text-sm text-blue-900 leading-relaxed">{narrative}</p>
        </div>
      )}

      {/* ── Profile sections grid ── */}
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <ProfileSection title="Ministry Background" fieldMap={MINISTRY_FIELDS} data={merged} />
        <ProfileSection title="Academic Background" fieldMap={ACADEMIC_FIELDS} data={merged} />

        <div className="space-y-4">
          <ProfileSection title="Financial" fieldMap={FINANCIAL_FIELDS} data={{ ...merged, monthly_budget: budgetLabel(merged.monthly_budget) }} />
          <DocumentStatus data={merged} />
        </div>
      </div>

      {/* ── Other responses (catch-all) ── */}
      {otherEntries.length > 0 && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setShowOther(v => !v)}
            className="w-full flex items-center justify-between px-5 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50"
          >
            <span>Additional responses ({otherEntries.length} fields)</span>
            <span>{showOther ? '▲' : '▼'}</span>
          </button>
          {showOther && (
            <div className="px-5 pb-4">
              <dl className="space-y-1">
                {otherEntries.map(([key, val]) => (
                  <div key={key} className="flex gap-2 text-sm">
                    <dt className="text-gray-500 shrink-0 w-44 break-all">{key}</dt>
                    <dd className="text-gray-800">{String(val ?? '—')}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      )}

      {forms.length === 0 && (
        <div className="px-5 py-4 text-sm text-gray-400">
          No form responses yet — profile will populate as forms are submitted.
        </div>
      )}
    </div>
  );
}
