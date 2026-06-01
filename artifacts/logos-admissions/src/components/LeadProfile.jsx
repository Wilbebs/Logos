import React from 'react';

// ── Comprehensive field label maps ─────────────────────────────────────────────
const PERSONAL_FIELDS = {
  Title:                        'Title / Prefijo',
  FirstNmeNombre:               'First Name',
  first_name:                   'First Name',
  LastNameApellido:             'Last Name',
  last_name:                    'Last Name',
  GeneroSexo:                   'Gender',
  gender:                       'Gender',
  FechaNacimiento:              'Date of Birth',
  date_of_birth:                'Date of Birth',
  EstadoCivil:                  'Marital Status',
  marital_status:               'Marital Status',
  PaisDeNacimiento:             'Birth Country',
  birth_country:                'Birth Country',
  EstadoDeNacimiento:           'Birth State',
  PaisCiudadania:               'Country of Citizenship',
  citizenship:                  'Country of Citizenship',
  Direccion:                    'Street Address',
  street_address:               'Street Address',
  Ciudad:                       'City',
  city:                         'City',
  Estado:                       'State / Province',
  state:                        'State / Province',
  CodigoPostal:                 'Postal Code',
  postal_code:                  'Postal Code',
  Pais:                         'Country',
  country:                      'Country',
  WhatsApp:                     'WhatsApp',
  whatsapp:                     'WhatsApp',
  Skype:                        'Skype',
  Facebook:                     'Facebook',
  Instagram:                    'Instagram',
  LinkedIn:                     'LinkedIn',
  IdiomaPreferido:              'Preferred Language',
  language_preferred:           'Preferred Language',
  ParienteCercano:              'Nearest Relative / Friend',
  RelacionPariente:             'Relationship',
  TelefonoPariente:             'Relative Phone',
};

const MINISTRY_FIELDS = {
  ministerial_years_fulltime:   'Full-time Ministry (years)',
  ministerial_years_associated: 'Associated Ministry (years)',
  years_christian:              'Years as Christian',
  how_long_christian:           'Years as Christian',
  NombreDeIglesia:              'Church Name',
  church_name:                  'Church Name',
  iglesia:                      'Church Name',
  NombreDeLaIglesia:            'Church Name',
  CargoPosicion:                'Ministry Position',
  ministerial_role:             'Ministry Role',
  rol_ministerial:              'Ministry Role',
  Denominacion:                 'Denomination',
  denomination:                 'Denomination',
  AQueDenominacionPertenece:    'Denomination',
  AnoOrdenado:                  'Year Ordained',
  year_ordained:                'Year Ordained',
  DesdeCuandoAsiste:            'Attending Church Since',
  DesdeCuandoPastorea:          'Pastoring Since',
  CuantasPersonasAsisten:       'Sunday Attendance',
  ResumenMinisterio:            'Ministry Summary',
  ministry_summary:             'Ministry Summary',
  has_ministerial_education:    'Prior Ministerial Education',
  instituto_classes_completed:  'Instituto Classes Completed',
  references:                   'References',
};

const ACADEMIC_FIELDS = {
  highest_education:              'Highest Education',
  secular_degree_field:           'Degree Field',
  campo_de_estudio:               'Degree Field',
  has_existing_doctorate:         'Holds Th.D. or D.Min.',
  transfer_credits:               'Transfer Credits',
  life_experience_description:    'Life Experience Description',
  CompletoSuEscuelaSecundaria:    'Completed High School',
  NombreEscuelaSecundaria:        'High School Name',
  CiudadEscuelaSecundaria:        'High School City',
  AnoGraduacionSecundaria:        'High School Grad Year',
  Associate:                      'Associate Degree',
  Licenciatura:                   'Bachelor\'s Degree (Licenciatura)',
  Maestria:                       'Master\'s Degree (Maestría)',
  Doctorado:                      'Doctorate',
  NombreUniversidad:              'University / Seminary Name',
  CiudadUniversidad:              'University City',
  GradoObtenido:                  'Degree Earned',
  AnoGraduacionUniversidad:       'University Grad Year',
};

const DOCUMENT_FIELDS = {
  submitted_transcripts:           'Transcripts Submitted',
  submitted_diploma:               'Diploma Submitted',
  submitted_undergraduate_diploma: 'Undergraduate Diploma Submitted',
  MarqueLosDocumentosQueEstaIncluyen: 'Documents Included',
  documents_checklist:             'Documents Included',
  ListaDocumentosEnvia:            'Documents Sent (Form 3)',
};

const FINANCIAL_FIELDS = {
  monthly_budget:    'Monthly Budget',
  BudgetsPresupuesto: 'Monthly Budget',
  budget:            'Monthly Budget',
  presupuesto:       'Monthly Budget',
};

const PASTORAL_REC_FIELDS = {
  NombreDelSolicitante:         'Applicant Name',
  ApellidoDelSolicitante:       'Applicant Last Name',
  FechaNacimientoPastor:        'Applicant DOB (per pastor)',
  NombreDelPastor:              'Pastor Name',
  ApellidoPastor:               'Pastor Last Name',
  IglesiaCongregacion:          'Congregation',
  NombreIglesiaRec:             'Church Name',
  DenominacionRec:              'Denomination',
  DireccionIglesiaRec:          'Church Address',
  CiudadIglesiaRec:             'Church City',
  EstadoIglesiaRec:             'Church State',
  CorreoPastor:                 'Pastor Email',
  TelefonoPastor:               'Pastor Phone',
  FirmaPastor:                  'Pastor Signature Date',
  FirmaFecha:                   'Signature Date',
  TiempoConociendo:             'Known Applicant For',
  CuanBienConoce:               'How Well Known',
  EsSalvo:                      'Professed Salvation',
  EvidenciaFe:                  'Evidence of Faith',
  EsMiembro:                    'Church Member',
  NivelParticipacion:           'Participation Level',
  ActitudIglesia:               'Attitude Toward Church',
  DescripcionEnvolvimiento:     'Church Involvement Description',
  Fuma:                         'Uses Tobacco',
  Bebe:                         'Uses Alcohol',
  UsaSustancias:                'Uses Illegal Substances',
  PagaDeudas:                   'Responsible with Debts',
  CaracterEspiritual:           'Spiritual Character',
  HabilidadesLiderazgo:         'Leadership Skills',
  InformacionAdicional:         'Additional Information',
  RecomendariaPersona:          'Would Recommend',
  RecomendacionFinal:           'Recommendation',
  ComentariosRecomendacion:     'Recommendation Comments',
  ActitudAutoridad:             'Attitude Toward Authority',
};

const MINISTERIAL_EXP_FIELDS = {
  PosicionMinisterialActual:    'Current Ministry Position',
  DescripcionMinisterio:        'Ministry Description',
  LogrosMinisteriales:          'Ministry Achievements',
  VisionMinisterial:            'Ministry Vision',
  EntrenamientoBiblico:         'Biblical Training',
  EntrenamientoEspecial:        'Special Training / Seminars',
  ListaMinisterios:             'Ministries Involved',
  TareasIglesia:                'Church Responsibilities',
  SeminariosTalleres:           'Seminars & Workshops',
  VidaDevocional:               'Devotional Life',
  SometidoMinisterialmente:     'Ministerial Accountability',
  MinisterioDInfluencia:        'Ministry of Influence',
  MinisteriosQueAvalan:         'Ministry References',
  TresMejoresAmigos:            'Three Closest Friends',
  ResumenTestimonio:            'Personal Testimony',
  ReferenciaMinisterial1:       'Ministry Reference 1',
  ReferenciaMinisterial2:       'Ministry Reference 2',
  ReferenciaMinisterial3:       'Ministry Reference 3',
  NombreIglesiaForm3:           'Church Name',
  NombrePastorForm3:            'Pastor Name',
  DireccionIglesiaForm3:        'Church Address',
};

const PROFESSIONAL_FIELDS = {
  AreaProfesional:              'Professional Area',
  ProfesionOficio:              'Profession / Trade',
  AnosExperiencia:              'Years of Experience',
  HabilidadesPersonales:        'Personal Skills',
  SoftwareHerramientas:         'Software / Tools',
};

const HEADER_KEYS = new Set([
  'email', 'full_name', 'name', 'phone',
  'EmailICorreoElectrónicoI', 'EmailICorreoElectronico',
  'Email I - Correo Electrónico I',
  'PhoneMobileCelular',
  'FirstNmeNombre', 'LastNameApellido',
  'program_applied', 'program_level', 'form_number',
  'DesiredProgramProramaDeseado', 'StudyLevelsNivelesDeEstudio',
  'highest_education', 'monthly_budget', 'BudgetsPresupuesto',
  'submitted_transcripts', 'submitted_diploma', 'submitted_undergraduate_diploma',
]);

const ALL_SECTION_MAPS = [
  PERSONAL_FIELDS, MINISTRY_FIELDS, ACADEMIC_FIELDS,
  DOCUMENT_FIELDS, FINANCIAL_FIELDS,
  PASTORAL_REC_FIELDS, MINISTERIAL_EXP_FIELDS, PROFESSIONAL_FIELDS,
];
const ALL_KNOWN_KEYS = new Set([
  ...ALL_SECTION_MAPS.flatMap(m => Object.keys(m)),
  ...HEADER_KEYS,
]);

// ── Helpers ────────────────────────────────────────────────────────────────────

function humanizeKey(key) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

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
  if (String(val).includes('25')) return '~$25/month';
  if (String(val).includes('50') || String(val).includes('100')) return '$50–$100/month';
  return String(val);
}

function buildNarrative(merged, applicant) {
  const parts = [];
  const name = applicant.full_name || merged.full_name || 'This applicant';
  const ftYears = merged.ministerial_years_fulltime   || applicant.ministerial_years_fulltime;
  const asYears = merged.ministerial_years_associated || applicant.ministerial_years_associated;
  const edu     = merged.highest_education            || applicant.highest_education;
  const program = applicant.program_applied;
  const budget  = merged.monthly_budget || merged.BudgetsPresupuesto || applicant.monthly_budget;

  const expParts = [];
  if (ftYears && parseInt(ftYears) > 0) expParts.push(`${ftYears} year(s) of full-time ministerial experience`);
  if (asYears && parseInt(asYears) > 0) expParts.push(`${asYears} year(s) associated`);
  const eduLabel = edu ? educationLabel(edu).toLowerCase() : null;

  let s = name;
  if (eduLabel && eduLabel !== 'none') s += `. They hold ${/^[aeiou]/.test(eduLabel) ? 'an' : 'a'} ${eduLabel}`;
  if (expParts.length > 0) s += ` and have ${expParts.join(' and ')}`;
  if (s !== name) parts.push(s + '.');

  let s2 = '';
  if (program) s2 += `They are applying for the ${program} program`;
  if (budget)  s2 += `${program ? ' with' : 'With'} a monthly study budget of ${budget}`;
  if (s2) parts.push(s2 + '.');

  return parts.length > 0 ? parts.join(' ') : null;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FieldRow({ label, value }) {
  return (
    <div className="flex gap-2 text-sm py-1 border-b border-gray-50 last:border-0">
      <dt className="text-gray-500 shrink-0 w-44">{label}</dt>
      <dd className="text-gray-800 font-medium break-words min-w-0 flex-1">{value}</dd>
    </div>
  );
}

function ProfileSection({ title, fieldMap, data }) {
  const entries = [];
  const seenLabels = new Set();

  for (const [key, label] of Object.entries(fieldMap)) {
    if (seenLabels.has(label)) continue;
    const raw = data[key];
    const val = formatFieldValue(raw);
    if (!val) continue;

    let display = val;
    if (key === 'highest_education') display = educationLabel(val);
    else if (key === 'monthly_budget' || key === 'BudgetsPresupuesto') display = budgetLabel(val);

    entries.push({ label, display });
    seenLabels.add(label);
  }

  if (entries.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 mt-1">{title}</p>
      <dl>
        {entries.map(({ label, display }) => (
          <FieldRow key={label} label={label} value={display} />
        ))}
      </dl>
    </div>
  );
}

function DocumentStatus({ data }) {
  const checks = [
    { key: 'submitted_transcripts',           label: 'Transcripts' },
    { key: 'submitted_diploma',               label: 'Diploma' },
    { key: 'submitted_undergraduate_diploma', label: 'Undergrad Diploma' },
  ];
  const present = checks.filter(c => data[c.key] !== undefined);
  if (present.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Documents</p>
      <div className="flex flex-wrap gap-2">
        {present.map(({ key, label }) => {
          const val = String(data[key] || '').toLowerCase();
          const submitted = val === 'true' || val === 'yes';
          return (
            <span key={key} className={`text-xs px-2 py-0.5 rounded-full border ${
              submitted ? 'bg-green-50 border-green-300 text-green-700' : 'bg-red-50 border-red-300 text-red-700'
            }`}>
              {submitted ? '✓' : '✗'} {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// All form responses — collapsed by default (can expand individually)
function AllFormResponses({ forms }) {
  // Start collapsed — users open only what they need
  const [openForms, setOpenForms] = React.useState([]);

  function toggle(i) {
    setOpenForms(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  }

  function getLabel(key) {
    for (const map of ALL_SECTION_MAPS) {
      if (map[key]) return map[key];
    }
    return humanizeKey(key);
  }

  const SKIP_KEYS = new Set([
    'form_number', 'applicant_id',
    'submitted_transcripts', 'submitted_diploma', 'submitted_undergraduate_diploma',
    'highest_education',
  ]);

  if (!forms || forms.length === 0) return null;

  const allOpen = openForms.length === forms.length;

  return (
    <div className="border-t border-gray-100">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">All Form Responses</p>
          <p className="text-xs text-gray-400 mt-0.5">Every field submitted across all {forms.length} forms</p>
        </div>
        <button
          onClick={() => setOpenForms(allOpen ? [] : forms.map((_, i) => i))}
          className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors"
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
      <div className="divide-y divide-gray-100">
        {forms.map((form, i) => {
          const isOpen = openForms.includes(i);
          const entries = Object.entries(form.raw_data || {})
            .filter(([k]) => !SKIP_KEYS.has(k))
            .map(([k, v]) => ({ key: k, label: getLabel(k), value: formatFieldValue(v) }))
            .filter(e => e.value !== null);

          const formLabel = form.form_number === 1 ? 'Form 1 — Solicitud de Admisión'
            : form.form_number === 2 ? 'Form 2 — Recomendación Pastoral'
            : form.form_number === 3 ? 'Form 3 — Experiencia Ministerial'
            : `Form ${form.form_number ?? i + 1}`;

          return (
            <div key={form.id || i}>
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center justify-between px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 text-left"
              >
                <span>
                  {formLabel}
                  <span className="text-gray-400 font-normal text-xs ml-2">({entries.length} fields)</span>
                </span>
                <span className="text-gray-400 text-xs ml-2">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="px-5 pb-4">
                  {entries.length === 0 ? (
                    <p className="text-sm text-gray-400">No data available.</p>
                  ) : (
                    <dl>
                      {entries.map(({ key, label, value }) => (
                        <FieldRow key={key} label={label} value={value} />
                      ))}
                    </dl>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
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

  // Form completion summary for the header
  const formKeys = ['form1_submitted_at', 'form2_submitted_at', 'form3_submitted_at'];
  const submittedCount = formKeys.filter(k => applicant[k]).length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">

      {/* ── Profile Header ── */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-4">
        {/* Brand-color avatar */}
        <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: '#7B2D3E' }}>
          <span className="text-white font-bold text-sm">{initials(applicant.full_name)}</span>
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 leading-tight">{applicant.full_name || '(no name)'}</h2>
          <p className="text-sm text-gray-500">{applicant.email || '—'}</p>
          {applicant.phone && <p className="text-sm text-gray-500">{applicant.phone}</p>}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {applicant.program_applied && (
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-0.5">Applying for</p>
              <p className="text-sm font-semibold text-gray-800">{applicant.program_applied}</p>
              {applicant.program_level && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {applicant.program_level}
                </span>
              )}
            </div>
          )}
          {/* Compact form-completion pills */}
          <div className="flex items-center gap-1 mt-1">
            {[1, 2, 3].map(n => {
              const submitted = !!applicant[`form${n}_submitted_at`];
              return (
                <span key={n} title={`Form ${n}`}
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                    submitted
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : 'bg-gray-100 border-gray-200 text-gray-400'
                  }`}>
                  {submitted ? `F${n} ✓` : `F${n}`}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Narrative ── */}
      {narrative && (
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Profile Summary</p>
          <p className="text-sm text-blue-900 leading-relaxed">{narrative}</p>
        </div>
      )}

      {/* ── Structured sections ── */}
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
        <div>
          <ProfileSection title="Ministry Background"     fieldMap={MINISTRY_FIELDS}        data={data} />
          <ProfileSection title="Ministerial Experience"  fieldMap={MINISTERIAL_EXP_FIELDS}  data={data} />
        </div>
        <div>
          <ProfileSection title="Academic Background"     fieldMap={ACADEMIC_FIELDS}         data={data} />
          <ProfileSection title="Personal Information"    fieldMap={PERSONAL_FIELDS}          data={data} />
          <ProfileSection title="Professional Background" fieldMap={PROFESSIONAL_FIELDS}      data={data} />
        </div>
        <div>
          <div className="mb-4">
            <ProfileSection title="Financial"             fieldMap={FINANCIAL_FIELDS}        data={data} />
            <DocumentStatus data={data} />
          </div>
          <ProfileSection title="Pastoral Recommendation" fieldMap={PASTORAL_REC_FIELDS}    data={data} />
        </div>
      </div>

      {/* ── All Form Responses (collapsed by default) ── */}
      {forms && forms.length > 0 && (
        <AllFormResponses forms={[...forms].sort((a, b) => a.form_number - b.form_number)} />
      )}

      {forms && forms.length === 0 && (
        <div className="px-5 py-4 text-sm text-gray-400">
          No form responses yet — profile will populate as forms are submitted.
        </div>
      )}
    </div>
  );
}
