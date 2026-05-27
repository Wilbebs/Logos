/**
 * AcceptanceLetter
 * Shown in ApplicantDetail sidebar when decision === 'approved'.
 * Next Step panel — navigate to the compose page.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AcceptanceLetter({ applicant }) {
  const navigate = useNavigate();
  return (
    <div className="border border-green-300 rounded overflow-hidden">
      <div className="px-4 py-2 bg-green-600 flex items-center gap-2">
        <span className="text-white text-sm font-bold">Next Step</span>
        <span className="text-green-200 text-xs">— Application approved</span>
      </div>
      <div className="px-4 pt-4 pb-1 bg-white">
        <div className="flex items-center text-xs mb-4">
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">✓</span>
            </div>
            <span className="text-green-700 font-semibold mt-1">Application</span>
          </div>
          <div className="flex-1 h-0.5 bg-green-400 mx-2 mb-4" />
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 rounded-full bg-green-100 border-2 border-green-500 flex items-center justify-center">
              <span className="text-green-600 font-bold text-xs">→</span>
            </div>
            <span className="text-green-700 font-semibold mt-1">Acceptance</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          <span className="font-medium text-gray-800">{applicant.full_name}</span> has been approved
          for <span className="font-medium text-gray-800">{applicant.program_applied || 'their program'}</span>.
          Send them a formal acceptance letter to complete the admissions process.
        </p>
      </div>
      <div className="px-4 pb-4 bg-white">
        <button
          onClick={() => navigate('/applicants/' + applicant.id + '/acceptance')}
          className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 px-4 rounded flex items-center justify-center gap-2"
        >
          <span>✉</span> Compose Acceptance Letter
        </button>
      </div>
    </div>
  );
}
