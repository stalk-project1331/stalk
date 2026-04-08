export const SETTINGS_STORAGE_KEY = 'STALK-settings';
export const SETTINGS_CHANGED_EVENT = 'stalk-settings-changed';

export const DEFAULT_SETTINGS = {
  enableSound: true,
  language: 'en',
  boardEdges: {
    style: 'curved', // curved | straight
    width: 2,
    opacity: 0.78,
    glow: true,
    dashed: false
  }
};

function normalizeBoardEdges(value = {}) {
  return {
    style: value.style === 'straight' ? 'straight' : 'curved',
    width: Math.min(6, Math.max(1, Number(value.width ?? DEFAULT_SETTINGS.boardEdges.width))),
    opacity: Math.min(
      1,
      Math.max(0.15, Number(value.opacity ?? DEFAULT_SETTINGS.boardEdges.opacity))
    ),
    glow:
      typeof value.glow === 'boolean'
        ? value.glow
        : DEFAULT_SETTINGS.boardEdges.glow,
    dashed:
      typeof value.dashed === 'boolean'
        ? value.dashed
        : DEFAULT_SETTINGS.boardEdges.dashed
  };
}

function normalizeLanguage(value) {
  return typeof value === 'string' && value.trim()
    ? value
    : DEFAULT_SETTINGS.language;
}

export function normalizeSettings(raw = {}) {
  return {
    enableSound:
      typeof raw.enableSound === 'boolean'
        ? raw.enableSound
        : DEFAULT_SETTINGS.enableSound,
    language: normalizeLanguage(raw.language),
    boardEdges: normalizeBoardEdges(raw.boardEdges)
  };
}

export function readSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
    return normalizeSettings(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(nextSettings) {
  const normalized = normalizeSettings(nextSettings);
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(
    new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: normalized })
  );
}

export function patchSettings(partialSettings) {
  const currentSettings = readSettings();

  const nextSettings = normalizeSettings({
    ...currentSettings,
    ...partialSettings,
    boardEdges: {
      ...currentSettings.boardEdges,
      ...(partialSettings?.boardEdges || {})
    }
  });

  writeSettings(nextSettings);
  return nextSettings;
}