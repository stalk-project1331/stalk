import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import {
  SETTINGS_CHANGED_EVENT,
  patchSettings,
  readSettings
} from '../settingsStore';

const DEFAULT_LANGUAGE = 'en';
const localeModules = import.meta.glob('./locales/*.json', { eager: true });
const I18nContext = createContext(null);

function getNestedValue(source, path) {
  return path.split('.').reduce((current, segment) => current?.[segment], source);
}

function interpolate(template, params) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    params[key] == null ? '' : String(params[key])
  );
}

function normalizeLocaleRegistry() {
  const registry = {};

  Object.entries(localeModules).forEach(([path, moduleValue]) => {
    const payload = moduleValue?.default ?? moduleValue;
    const fileName = path.split('/').pop()?.replace('.json', '') || DEFAULT_LANGUAGE;
    const code = payload?.meta?.code || fileName;

    registry[code] = payload;
  });

  return registry;
}

const localeRegistry = normalizeLocaleRegistry();
const availableLocaleCodes = Object.keys(localeRegistry);

function resolveLanguage(nextLanguage) {
  return availableLocaleCodes.includes(nextLanguage)
    ? nextLanguage
    : DEFAULT_LANGUAGE;
}

function getLocaleMeta(code) {
  const payload = localeRegistry[code] || localeRegistry[DEFAULT_LANGUAGE] || {};
  const meta = payload.meta || {};

  return {
    code,
    name: meta.name || code.toUpperCase(),
    nativeName: meta.nativeName || meta.name || code.toUpperCase(),
    intlLocale: meta.intlLocale || 'en-US'
  };
}

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() =>
    resolveLanguage(readSettings().language)
  );

  useEffect(() => {
    patchSettings({ language });
    document.documentElement.lang = getLocaleMeta(language).intlLocale;
  }, [language]);

  useEffect(() => {
    const syncFromSettings = () => {
      const nextLanguage = resolveLanguage(readSettings().language);
      setLanguageState((current) =>
        current === nextLanguage ? current : nextLanguage
      );
    };

    const handleStorage = (event) => {
      if (!event.key || event.key === 'STALK-settings') {
        syncFromSettings();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(SETTINGS_CHANGED_EVENT, syncFromSettings);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(SETTINGS_CHANGED_EVENT, syncFromSettings);
    };
  }, []);

  const t = useCallback(
    (key, params = {}) => {
      const currentMessages = localeRegistry[language] || {};
      const fallbackMessages = localeRegistry[DEFAULT_LANGUAGE] || {};
      const value =
        getNestedValue(currentMessages, key) ?? getNestedValue(fallbackMessages, key);

      if (typeof value === 'string') {
        return interpolate(value, params);
      }

      return value ?? key;
    },
    [language]
  );

  const setLanguage = useCallback((nextLanguage) => {
    setLanguageState(resolveLanguage(nextLanguage));
  }, []);

  const availableLocales = useMemo(() => {
    return availableLocaleCodes
      .map((code) => getLocaleMeta(code))
      .sort((left, right) => {
        if (left.code === DEFAULT_LANGUAGE) return -1;
        if (right.code === DEFAULT_LANGUAGE) return 1;
        return left.nativeName.localeCompare(right.nativeName);
      });
  }, []);

  const value = useMemo(() => {
    const meta = getLocaleMeta(language);

    return {
      language,
      setLanguage,
      t,
      intlLocale: meta.intlLocale,
      availableLocales
    };
  }, [availableLocales, language, setLanguage, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider');
  }

  return context;
}
