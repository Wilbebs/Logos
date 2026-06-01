/**
 * AdmissionTimeline
 *
 * Sticky bottom navigation bar shown on both the ApplicantDetail page
 * (when approved) and the AcceptanceLetterPage.
 *
 * Completed steps are green. Current step is maroon/active. The next
 * step is styled as an obviously-clickable action — not grayed out.
 */
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const STEPS = [
  { key: 'application',       label: 'Application',      path: id => `/applicants/${id}` },
  { key: 'acceptance_letter', label: 'Acceptance Letter', path: id => `/applicants/${id}/acceptance` },
];

const BRAND = '#7B2D3E';

export default function AdmissionTimeline({ applicantId, activeStep }) {
  const navigate = useNavigate();
  const barRef = useRef(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const h = entries[0]?.borderBoxSize?.[0]?.blockSize ?? entries[0]?.contentRect?.height ?? 0;
      document.documentElement.style.setProperty('--timeline-bar-height', `${h}px`);
    });
    observer.observe(el);
    // Set immediately in case ResizeObserver fires async
    document.documentElement.style.setProperty('--timeline-bar-height', `${el.offsetHeight}px`);
    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty('--timeline-bar-height', '0px');
    };
  }, []);

  return (
    <div ref={barRef} className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-0">
        {STEPS.map((step, i) => {
          const done    = i < activeStep;
          const current = i === activeStep;
          const isNext  = i === activeStep + 1;
          const future  = i > activeStep + 1;

          // Circle styling
          let circleStyle = {};
          let circleClass = 'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ';
          if (done) {
            circleClass += 'text-white';
            circleStyle = { backgroundColor: '#16a34a' };
          } else if (current) {
            circleClass += 'text-white ring-2 ring-offset-1';
            circleStyle = { backgroundColor: BRAND, ringColor: BRAND };
          } else if (isNext) {
            circleClass += 'border-2';
            circleStyle = { borderColor: BRAND, color: BRAND, backgroundColor: '#fff' };
          } else {
            circleClass += 'bg-gray-200 text-gray-400';
          }

          // Label styling
          let labelClass = 'text-sm font-medium whitespace-nowrap transition-colors ';
          if (done)         labelClass += 'text-green-700';
          else if (current) labelClass += 'font-bold';
          else if (isNext)  labelClass += 'font-semibold';
          else              labelClass += 'text-gray-400';

          // Button wrapper
          let btnClass = 'flex items-center gap-2 px-3 py-2 rounded-lg transition-all ';
          if (current) {
            btnClass += 'cursor-default';
          } else if (isNext) {
            btnClass += 'cursor-pointer hover:bg-red-50 ring-1 ring-inset';
          } else {
            btnClass += 'cursor-pointer hover:bg-gray-100';
          }

          const labelStyle = (!done && !future && !current) ? { color: BRAND } : {};
          const btnRingStyle = isNext ? { ringColor: `${BRAND}33` } : {};

          return (
            <React.Fragment key={step.key}>
              <button
                onClick={() => navigate(step.path(applicantId))}
                className={btnClass}
                style={isNext ? { outline: `1px solid ${BRAND}33` } : {}}
                title={isNext ? `Go to ${step.label}` : undefined}
              >
                {/* Step circle */}
                <div className={circleClass} style={circleStyle}>
                  {done ? '✓' : i + 1}
                </div>

                {/* Label */}
                <span className={labelClass} style={isNext ? { color: BRAND } : {}}>
                  {step.label}
                </span>

                {/* "Go" cue for next step */}
                {isNext && (
                  <span className="text-xs ml-0.5" style={{ color: BRAND }}>→</span>
                )}
              </button>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-2 rounded transition-colors"
                  style={{ backgroundColor: done ? '#16a34a' : '#e5e7eb' }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
