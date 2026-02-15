'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { preferencesApi } from '../api';
import en from './locales/en.json';
import nl from './locales/nl.json';

type Language = 'en' | 'nl';
type Translations = typeof en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  syncLanguageWithBackend: () => Promise<void>;
}

const translations: Record<Language, Translations> = {
  en,
  nl,
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Helper functions for cookie management
function setCookie(name: string, value: string, days: number = 365) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name: string): string | null {
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// Get browser language (first 2 chars)
function getBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en';
  const browserLang = navigator.language.substring(0, 2).toLowerCase();
  return (browserLang === 'nl' || browserLang === 'en') ? browserLang as Language : 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [initialized, setInitialized] = useState(false);

  // Bootstrap language from browser storage (anonymous user)
  useEffect(() => {
    // Priority: localStorage → cookie → browser → default
    const storedLang = localStorage.getItem('lang') as Language;
    const cookieLang = getCookie('lang') as Language;
    const browserLang = getBrowserLanguage();
    
    const initialLang = storedLang || cookieLang || browserLang || 'en';
    
    if (initialLang === 'en' || initialLang === 'nl') {
      setLanguageState(initialLang);
    }
    
    setInitialized(true);
  }, []);

  // Sync language with backend (authenticated user)
  const syncLanguageWithBackend = async () => {
    try {
      // Try to fetch backend preferences — if not authenticated, this will fail gracefully
      const preferences: any = await preferencesApi.get();
      const backendLang = preferences.language as Language;
      
      if (backendLang && (backendLang === 'en' || backendLang === 'nl')) {
        setLanguageState(backendLang);
        localStorage.setItem('lang', backendLang);
        setCookie('lang', backendLang);
      }
    } catch (error) {
      console.error('Failed to fetch language preference from backend:', error);
    }
  };

  // Save language (works for both anonymous and authenticated)
  const setLanguage = async (lang: Language) => {
    // Update UI immediately
    setLanguageState(lang);
    
    // Save to browser storage (works for anonymous users)
    localStorage.setItem('lang', lang);
    setCookie('lang', lang);
    
    // If authenticated, persist to backend (will fail gracefully if not logged in)
    try {
      await preferencesApi.updateLanguage(lang);
    } catch (error) {
      // Not authenticated or backend error — browser storage update still succeeded
    }
  };

  // Translation function - supports nested keys like "sidebar.dashboard"
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, syncLanguageWithBackend }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
