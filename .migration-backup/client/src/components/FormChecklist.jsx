import React from 'react';

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

const FORMS = [
  { key: 'form1_submitted_at', label: 'Form 1 — Application' },
  { key: 'form2_submitted_at', label: 'Form 2 — Background' },
  { key: 'form3_submitted_at', label: 'Form 3 — Documents' },
];

export default function FormChecklist({ applicant }) {
  const submittedCount = FORMS.filter((f) => applicant[f.key]).length;
  const allComplete = submittedCount === 3;

  return (
    <div>
      <ul className="space-y-2">
        {FORMS.map((form) => {
          const submitted = !!applicant[form.key];
          return (
            <li key={form.key} className="flex items-center gap-3">
              {submitted ? (
                <span className="text-green-600 font-bold text-base leading-none">✓</span>
              ) : (
                <span className="text-gray-400 font-bold text-base leading-none">✗</span>
              )}
              <span className="text-sm text-gray-800">{form.label}</span>
              {submitted && (
                <span className="text-xs text-gray-500 ml-auto">{formatDate(applicant[form.key])}</span>
              )}
            </li>
          );
        })}
      </ul>
      <p className={`mt-3 text-sm font-medium ${allComplete ? 'text-green-600' : 'text-gray-500'}`}>
        {allComplete ? 'All forms received' : `${submittedCount} of 3 forms received`}
      </p>
    </div>
  );
}
