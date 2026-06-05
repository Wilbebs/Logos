/**
 * LanguageContext
 * Provides lang ('en' | 'es'), setLang, and t(key) to the entire app.
 * Language preference is persisted to localStorage.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { translations } from '../i18n/translations.js';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('logos_lang') || 'en'; } catch { return 'en'; }
  });

  const setLang = useCallback((newLang) => {
    setLangState(newLang);
    try { localStorage.setItem('logos_lang', newLang); } catch {}
  }, []);

  // t(key, vars?) — returns translated string, falls back to English, then key itself
  const t = useCallback((key, vars = {}) => {
    const str = translations[lang]?.[key] ?? translations.en?.[key] ?? key;
    return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), str);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}
