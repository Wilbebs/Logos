/**
 * AcceptanceLetter
 * Shown in ApplicantDetail sidebar when decision === 'approved'.
 * Prominent CTA — navigate to the acceptance letter compose page.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AcceptanceLetter({ applicant }) {
  const navigate = useNavigate();

  function go() {
    navigate('/applicants/' + applicant.id + '/acceptance');
  }

  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Next Step</p>

      <button
        onClick={go}
        className="w-full group flex items-center gap-4 rounded-lg border-2 px-4 py-4 text-left transition-all"
        style={{
          borderColor: '#7B2D3E',
          backgroundColor: '#fdf6f7',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = '#7B2D3E';
          e.currentTarget.querySelectorAll('[data-hover-white]').forEach(el => {
            el.style.color = '#fff';
          });
          e.currentTarget.querySelectorAll('[data-hover-icon]').forEach(el => {
            el.style.backgroundColor = 'rgba(255,255,255,0.2)';
          });
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = '#fdf6f7';
          e.currentTarget.querySelectorAll('[data-hover-white]').forEach(el => {
            el.style.color = '';
          });
          e.currentTarget.querySelectorAll('[data-hover-icon]').forEach(el => {
            el.style.backgroundColor = '';
          });
        }}
      >
        {/* Icon */}
        <div
          data-hover-icon
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xl transition-colors"
          style={{ backgroundColor: '#7B2D3E' }}
        >
          <span style={{ color: '#fff' }}>✉</span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p
            data-hover-white
            className="text-sm font-bold transition-colors"
            style={{ color: '#7B2D3E' }}
          >
            Compose Acceptance Letter
          </p>
          <p
            data-hover-white
            className="text-xs mt-0.5 transition-colors text-gray-500"
          >
            Send the official acceptance to {applicant.full_name}
          </p>
        </div>

        {/* Arrow */}
        <span
          data-hover-white
          className="text-lg font-light transition-colors shrink-0"
          style={{ color: '#7B2D3E' }}
        >
          →
        </span>
      </button>
    </div>
  );
}
