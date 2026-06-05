/**
 * Settings page  /settings
 * Language toggle — English / Español
 * More settings can be added here over time.
 */
import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';

const BRAND = '#7B2D3E';

export default function Settings() {
  const { lang, setLang, t } = useLanguage();
  const [saved, setSaved] = useState(false);

  function handleLangChange(newLang) {
    setLang(newLang);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">

        {/* Page header */}
        <h1 className="text-2xl font-bold text-gray-800 mb-8">{t('settings.title')}</h1>

        {/* Language card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-700">{t('settings.language.label')}</h2>
            <p className="text-xs text-gray-400 mt-1">{t('settings.language.desc')}</p>
          </div>

          <div className="px-6 py-5 flex items-center gap-4">
            {/* Toggle pill */}
            <div className="flex bg-gray-100 rounded-full p-1 gap-1">
              {[
                { code: 'en', label: t('settings.language.en'), flag: '🇺🇸' },
                { code: 'es', label: t('settings.language.es'), flag: '🇵🇷' },
              ].map(({ code, label, flag }) => (
                <button
                  key={code}
                  onClick={() => handleLangChange(code)}
                  className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all"
                  style={lang === code
                    ? { backgroundColor: BRAND, color: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }
                    : { color: '#6b7280' }
                  }
                >
                  <span>{flag}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Saved indicator */}
            {saved && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                ✓ {t('settings.language.saved')}
              </span>
            )}
          </div>

          {/* Preview of current language */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {lang === 'en'
                ? 'All AI-generated letters, emails, and notes will be written in English.'
                : 'Todas las cartas, correos y notas generadas por IA se escribirán en Español.'}
            </p>
          </div>
        </div>

        {/* Future settings placeholder */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-5 opacity-50">
          <h2 className="text-sm font-bold text-gray-700 mb-1">
            {lang === 'en' ? 'More settings coming soon…' : 'Más configuraciones próximamente…'}
          </h2>
          <p className="text-xs text-gray-400">
            {lang === 'en'
              ? 'Notification preferences, email signatures, and more.'
              : 'Preferencias de notificación, firmas de correo y más.'}
          </p>
        </div>

      </div>
    </div>
  );
}
