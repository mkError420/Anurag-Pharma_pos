import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function LanguageToggle({ variant = 'segmented', className = '' }) {
  const { language, setLanguage, toggleLanguage, t } = useLanguage();

  if (variant === 'button') {
    return (
      <button
        onClick={toggleLanguage}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all hover:scale-105 active:scale-95 shadow-xs ${
          language === 'bn'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700'
            : 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-700'
        } ${className}`}
        title={t('switch_language', 'Switch Language')}
      >
        <span className="text-sm">{language === 'bn' ? '🇧🇩' : '🇬🇧'}</span>
        <span>{language === 'bn' ? 'বাংলা' : 'EN'}</span>
      </button>
    );
  }

  // Default segmented pill toggle
  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 shadow-inner ${className}`}
      title={t('switch_language', 'Switch Language')}
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
          language === 'en'
            ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <span className="text-[11px]">🇬🇧</span>
        <span>EN</span>
      </button>
      <button
        type="button"
        onClick={() => setLanguage('bn')}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
          language === 'bn'
            ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-300 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <span className="text-[11px]">🇧🇩</span>
        <span>বাংলা</span>
      </button>
    </div>
  );
}
