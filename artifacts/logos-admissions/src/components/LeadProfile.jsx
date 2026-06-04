import React from 'react';

// ── Field label maps ───────────────────────────────────────────────────────────
const MINISTRY_FIELDS = {
  ministerial_years_fulltime:   'Full-time (yrs)',
  ministerial_years_associated: 'Associated (yrs)',
  years_christian:              'Years as Christian',
  how_long_christian:           'Years as Christian',
  CargoPosicion:                'Position',
  ministerial_role:             'Role',
  rol_ministerial:              'Role',
  NombreDeIglesia:              'Church',
  church_name:                  'Church',
  iglesia:                      'Church',
  NombreDeLaIglesia:            'Church',
  Denominacion:                 'Denomination',
  denomination:                 'Denomination',
  AQueDenominacionPertenece:    'Denomination',
  AnoOrdenado:                  'Year Ordained',
  year_ordained:                'Year Ordained',
  DesdeCuandoPastorea:          'Pastoring Since',
  CuantasPersonasAsisten:       'Sunday Attendance',
  ResumenMinisterio:            'Ministry Summary',
  ministry_summary:             'Ministry Summary',
  has_ministerial_education:    'Prior Min. Education',
  instituto_classes_completed:  'Instituto Classes',
  PosicionMinisterialActual:    'Current Position',
  DescripcionMinisterio:        'Ministry Description',
  LogrosMinisteriales:          'Achievements',
  VisionMinisterial:            'Vision',
  EntrenamientoBiblico:         'Biblical Training',
  ListaMinisterios:             'Ministries',
  TareasIglesia:                'Church Duties',
  SeminariosTalleres:           'Seminars & Workshops',
  VidaDevocional:               'Devotional Life',
  ResumenTestimonio:            'Testimony',
  NombreIglesiaForm3:           'Church (Form 3)',
  NombrePastorForm3:            'Pastor (Form 3)',
};

const ACADEMIC_FIELDS = {
  highest_education:              'Highest Education',
  secular_degree_field:           'Degree Field',
  campo_de_estudio:               'Degree Field',
  has_existing_doctorate:         'Holds Th.D./D.Min.',
  transfer_credits:               'Transfer Credits',
  life_experience_description:    'Life Experience',
  CompletoSuEscuelaSecundaria:    'Completed High School',
  NombreEscuelaSecundaria:        'High School',
  AnoGraduacionSecundaria:        'HS Grad Year',
  Associate:                      'Associate Degree',
  Licenciatura:                   'Bachelor\'s',
  Maestria:                       'Master\'s',
  Doctorado:                      'Doctorate',
  NombreUniversidad:              'University / Seminary',
  GradoObtenido:                  'Degree Earned',
  AnoGraduacionUniversidad:       'Grad Year',
};

const PERSONAL_FIELDS = {
  Title:                'Title',
  GeneroSexo:           'Gender',
  gender:               'Gender',
  FechaNacimiento:      'Date of Birth',
  date_of_birth:        'Date of Birth',
  EstadoCivil:          'Marital Status',
  marital_status:       'Marital Status',
  PaisDeNacimiento:     'Birth Country',
  PaisCiudadania:       'Citizenship',
  citizenship:          'Citizenship',
  ciudad:               'City',
  Ciudad:               'City',
  Estado:               'State',
  state:                'State',
  Pais:                 'Country',
  country:              'Country',
  WhatsApp:             'WhatsApp',
  IdiomaPreferido:      'Language',
  language_preferred:   'Language',
};

const FINANCIAL_FIELDS = {
  monthly_budget:       'Monthly Budget',
  BudgetsPresupuesto:   'Monthly Budget',
  budget:               'Monthly Budget',
  presupuesto:          'Monthly Budget',
};

const DOCUMENT_FIELDS = {
  submitted_transcripts:           'Transcripts Submitted',
  submitted_diploma:               'Diploma Submitted',
  submitted_undergraduate_diploma: 'Undergrad Diploma',
};

const PASTORAL_FIELDS = {
  NombreDelPastor:    'Pastor Name',
  ApellidoPastor:     'Pastor Last Name',
  NombreIglesiaRec:   'Pastor\'s Church',
  DenominacionRec:    'Denomination',
  CorreoPastor:       'Pastor Email',
  TelefonoPastor:     'Pastor Phone',
  TiempoConociendo:   'Known Applicant For',
  RecomendariaPersona:'Would Recommend',
  RecomendacionFinal: 'Recommendation',
};

const ALL_SECTION_MAPS = [
  MINISTRY_FIELDS, ACADEMIC_FIELDS, PERSONAL_FIELDS,
  FINANCIAL_FIELDS, DOCUMENT_FIELDS, PASTORAL_FIELDS,
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function initials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
}

function safeDecodeURI(s) {
  const clean = s.replace(/\+/g, ' ');
  try { return decodeURIComponent(clean); } catch { /* ignore */ }
  try { return unescape(clean); } catch { return s; } // eslint-disable-line no-unescape-func
}

function formatFieldValue(val) {
  if (val === null || val === undefined || val === '') return null;
  const s = safeDecodeURI(String(val).trim());
  if (!s) return null;
  if (s.toLowerCase() === 'true') return 'Yes';
  if (s.toLowerCase() === 'false') return 'No';
  return s;
}

function educationLabel(val) {
  const map = {
    none: 'None', high_school: 'High School', some_college: 'Some College',
    associate: 'Associate Degree', bachelors: "Bachelor's Degree",
    masters: "Master's Degree", doctorate: 'Doctorate',
  };
  return map[val] || val;
}

function budgetLabel(val) {
  if (!val) return null;
  const s = String(val);
  if (s.includes('25')) return '~$25 / month';
  if (s.includes('50') || s.includes('100')) return '$50–$100 / month';
  return s;
}

function buildNarrative(merged, applicant) {
  const name   = applicant.full_name || merged.full_name || 'This applicant';
  const ftYrs  = parseInt(merged.ministerial_years_fulltime   || applicant.ministerial_years_fulltime  || 0);
  const asYrs  = parseInt(merged.ministerial_years_associated || applicant.ministerial_years_associated || 0);
  const edu    = merged.highest_education || applicant.highest_education;
  const program= applicant.program_applied;
  const budget = merged.monthly_budget || merged.BudgetsPresupuesto || applicant.monthly_budget;

  const chips = [];
  if (edu && edu !== 'none') chips.push(educationLabel(edu));
  if (ftYrs > 0) chips.push(`${ftYrs} yr${ftYrs !== 1 ? 's' : ''} full-time ministry`);
  if (asYrs > 0) chips.push(`${asYrs} yr${asYrs !== 1 ? 's' : ''} associated`);
  if (program)   chips.push(`Applying: ${program}`);
  if (budget)    chips.push(`Budget: ${budgetLabel(budget) || budget}`);

  if (chips.length === 0) return null;
  return `${name} — ${chips.join(' · ')}`;
}

// ── ColumnField — label + value in a single row ────────────────────────────────
function ColumnField({ label, value }) {
  return (
    <div className="flex items-baseline py-1.5 border-b border-gray-50 last:border-0 gap-2 min-w-0">
      <span className="text-[11px] text-gray-400 shrink-0 w-36 leading-relaxed">{label}</span>
      <span className="text-sm text-gray-800 font-medium min-w-0 break-words flex-1">{value}</span>
    </div>
  );
}

// ── ColumnHeader — section title within a column ──────────────────────────────
function ColumnHeader({ label }) {
  return (
    <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase pb-2 mb-1 border-b border-gray-100">
      {label}
    </p>
  );
}

// ── Build field entries from a map ─────────────────────────────────────────────
function buildEntries(fieldMap, data, transforms = {}) {
  const entries = [];
  const seen    = new Set();
  for (const [key, label] of Object.entries(fieldMap)) {
    if (seen.has(label)) continue;
    const raw = data[key];
    const val = formatFieldValue(raw);
    if (!val) continue;
    const display = transforms[key] ? transforms[key](val) : val;
    entries.push({ label, display });
    seen.add(label);
  }
  return entries;
}

// ── Column sections ────────────────────────────────────────────────────────────

function MinistryColumn({ data }) {
  const entries = buildEntries(MINISTRY_FIELDS, data);
  return (
    <div className="px-5 py-4">
      <ColumnHeader label="Ministry" />
      {entries.length === 0
        ? <p className="text-xs text-gray-400 italic mt-2">No ministry data</p>
        : entries.map(({ label, display }) => (
            <ColumnField key={label} label={label} value={display} />
          ))
      }
    </div>
  );
}

function AcademicColumn({ data }) {
  const acadEntries = buildEntries(ACADEMIC_FIELDS, data, {
    highest_education: educationLabel,
  });
  const personEntries = buildEntries(PERSONAL_FIELDS, data);

  return (
    <div className="px-5 py-4 space-y-4">
      <div>
        <ColumnHeader label="Academic" />
        {acadEntries.length === 0
          ? <p className="text-xs text-gray-400 italic mt-2">No academic data</p>
          : acadEntries.map(({ label, display }) => (
              <ColumnField key={label} label={label} value={display} />
            ))
        }
      </div>
      {personEntries.length > 0 && (
        <div>
          <ColumnHeader label="Personal" />
          {personEntries.map(({ label, display }) => (
            <ColumnField key={label} label={label} value={display} />
          ))}
        </div>
      )}
    </div>
  );
}

function FinancialColumn({ data }) {
  const finEntries = buildEntries(FINANCIAL_FIELDS, data, {
    monthly_budget:     budgetLabel,
    BudgetsPresupuesto: budgetLabel,
  });

  const docChecks = [
    { key: 'submitted_transcripts',           label: 'Transcripts' },
    { key: 'submitted_diploma',               label: 'Diploma' },
    { key: 'submitted_undergraduate_diploma', label: 'Undergrad Diploma' },
  ];
  const presentDocs = docChecks.filter(c => data[c.key] !== undefined);

  const pastEntries = buildEntries(PASTORAL_FIELDS, data);

  return (
    <div className="px-5 py-4 space-y-4">
      {/* Financial */}
      <div>
        <ColumnHeader label="Financial" />
        {finEntries.length === 0
          ? <p className="text-xs text-gray-400 italic mt-2">No financial data</p>
          : finEntries.map(({ label, display }) => (
              <ColumnField key={label} label={label} value={display} />
            ))
        }
      </div>

      {/* Documents submitted */}
      {presentDocs.length > 0 && (
        <div>
          <ColumnHeader label="Documents" />
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            {presentDocs.map(({ key, label }) => {
              const val = String(data[key] || '').toLowerCase();
              const submitted = val === 'true' || val === 'yes';
              return (
                <div key={key} className="flex items-center gap-1">
                  <span className={`text-xs font-bold ${submitted ? 'text-green-600' : 'text-red-500'}`}>
                    {submitted ? '✓' : '✗'}
                  </span>
                  <span className={`text-xs ${submitted ? 'text-gray-700' : 'text-red-600 font-medium'}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pastoral recommendation */}
      {pastEntries.length > 0 && (
        <div>
          <ColumnHeader label="Pastoral Rec." />
          {pastEntries.map(({ label, display }) => (
            <ColumnField key={label} label={label} value={display} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function LeadProfile({ applicant, forms }) {
  const merged = {};
  [...(forms || [])].sort((a, b) => a.form_number - b.form_number).forEach(f => {
    Object.assign(merged, f.raw_data || {});
  });
  const data = { ...merged, ...applicant };

  const narrative = buildNarrative(merged, applicant);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">

      {/* ── Profile Header ── */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        {/* Brand-color avatar */}
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: '#7B2D3E' }}>
          <span className="text-white font-bold text-xs">{initials(applicant.full_name)}</span>
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-gray-900 leading-tight">{applicant.full_name || '(no name)'}</h2>
          <p className="text-xs text-gray-500">{applicant.email || '—'}{applicant.phone ? ` · ${applicant.phone}` : ''}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {applicant.program_applied && (
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider leading-tight">Applying for</p>
              <p className="text-xs font-semibold text-gray-800 leading-tight">{applicant.program_applied}</p>
              {applicant.program_level && (
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {applicant.program_level}
                </span>
              )}
            </div>
          )}
          {/* Form completion pills */}
          <div className="flex items-center gap-1">
            {[
              { n: 1, label: 'Solicitud de Admisión' },
              { n: 2, label: 'Recomendación Pastoral' },
              { n: 3, label: 'Experiencia Ministerial' },
            ].map(({ n, label }) => {
              const submitted = !!applicant[`form${n}_submitted_at`];
              return (
                <span key={n} title={`Form ${n} — ${label}`}
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap ${
                    submitted
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : 'bg-gray-100 border-gray-200 text-gray-400'
                  }`}>
                  {submitted ? `Form ${n}: ${label} ✓` : `Form ${n}: ${label}`}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Narrative summary ── */}
      {narrative && (
        <div className="px-5 py-2.5 border-b border-gray-100" style={{ backgroundColor: '#fdf6f7' }}>
          <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: '#7B2D3E' }}>
            Profile Summary
          </p>
          <p className="text-sm leading-relaxed" style={{ color: '#5a1e2a' }}>{narrative}</p>
        </div>
      )}

      {/* ── Three-column data grid with clean dividers ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
        <MinistryColumn  data={data} />
        <AcademicColumn  data={data} />
        <FinancialColumn data={data} />
      </div>

      {/* Empty state */}
      {(!forms || forms.length === 0) && (
        <div className="px-5 py-4 text-sm text-gray-400 border-t border-gray-100">
          No form responses yet — profile will populate as forms are submitted.
        </div>
      )}
    </div>
  );
}
