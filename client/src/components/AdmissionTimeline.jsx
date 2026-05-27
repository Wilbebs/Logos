/**
 * AdmissionTimeline
 *
 * Sticky bottom navigation bar shown on both the ApplicantDetail page
 * (when approved) and the AcceptanceLetterPage.
 *
 * Each step is a clickable link. The current step is highlighted in blue,
 * completed steps in green, future steps are grey and non-clickable.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

const STEPS = [
  { key: 'application',       label: 'Application',       path: id => `/applicants/${id}` },
  { key: 'acceptance_letter', label: 'Acceptance Letter',  path: id => `/applicants/${id}/acceptance` },
];

export default function AdmissionTimeline({ applicantId, activeStep }) {
  // activeStep: index of the current step (0 = application, 1 = acceptance_letter)
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-0">
        {STEPS.map((step, i) => {
          const done    = i < activeStep;
          const current = i === activeStep;
          const future  = i > activeStep;
          const clickable = !future; // can go back, can't skip forward

          return (
            <React.Fragment key={step.key}>
              <button
                onClick={() => clickable && navigate(step.path(applicantId))}
                disabled={!clickable}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors
                  ${current  ? 'cursor-default'
                  : clickable ? 'hover:bg-gray-100 cursor-pointer'
                  : 'cursor-not-allowed opacity-40'}`}
              >
                {/* Circle */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
                  ${done    ? 'bg-green-600 text-white'
                  : current ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                  : 'bg-gray-200 text-gray-400'}`}
                >
                  {done ? '✓' : i + 1}
                </div>
                {/* Label */}
                <span className={`text-sm font-medium whitespace-nowrap
                  ${done    ? 'text-green-700'
                  : current ? 'text-blue-700'
                  : 'text-gray-400'}`}
                >
                  {step.label}
                </span>
              </button>

              {/* Connector */}
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 rounded transition-colors
                  ${done ? 'bg-green-400' : 'bg-gray-200'}`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
