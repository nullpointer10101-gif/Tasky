import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../locales/en.json';
import ru from '../locales/ru.json';
import hi from '../locales/hi.json';
import ar from '../locales/ar.json';
import tr from '../locales/tr.json';
import es from '../locales/es.json';
import pt from '../locales/pt.json';
import id from '../locales/id.json';

const dictionaries = { en, ru, hi, ar, tr, es, pt, id };

const I18nContext = createContext(null);

export const useTranslation = () => useContext(I18nContext);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('tasky_lang') || 'en';
  });

  const changeLanguage = (newLang) => {
    if (dictionaries[newLang]) {
      setLang(newLang);
      localStorage.setItem('tasky_lang', newLang);
    }
  };

  const t = (key) => {
    const keys = key.split('.');
    let value = dictionaries[lang];
    for (const k of keys) {
      if (value === undefined || value === null) break;
      value = value[k];
    }
    // Fallback to English if key doesn't exist in selected language
    if (value === undefined || value === null) {
      let fallback = dictionaries['en'];
      for (const k of keys) {
        if (fallback === undefined || fallback === null) break;
        fallback = fallback[k];
      }
      return fallback || key; // Return key if not even in English
    }
    return value;
  };

  return (
    <I18nContext.Provider value={{ lang, changeLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}
