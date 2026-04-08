import React, { useMemo, useState } from 'react';
import { Switch } from '@headlessui/react';
import {
  RefreshCw,
  Volume2Icon,
  WrenchIcon,
  KeyRoundIcon,
  CheckCircle2Icon,
  Trash2Icon,
  EyeIcon,
  EyeOffIcon,
  LanguagesIcon,
  WorkflowIcon,
  SparklesIcon,
  CircleDashedIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from './i18n';
import { patchSettings, readSettings } from './settingsStore';
import { CustomSelect } from './board/BoardControls.jsx';

const API_KEYS_STORAGE_KEY = 'STALK-api-keys';

const DEFAULT_EDGE_SETTINGS = {
  style: 'curved',
  width: 2,
  opacity: 0.78,
  glow: true,
  dashed: false
};

const readApiKeys = () => {
  try {
    return JSON.parse(localStorage.getItem(API_KEYS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const normalizeBoardEdges = (value) => {
  const source = value && typeof value === 'object' ? value : {};

  const width = Number(source.width);
  const opacity = Number(source.opacity);

  return {
    style:
      source.style === 'straight' || source.style === 'curved'
        ? source.style
        : DEFAULT_EDGE_SETTINGS.style,
    width:
      Number.isFinite(width) && width >= 1 && width <= 6
        ? width
        : DEFAULT_EDGE_SETTINGS.width,
    opacity:
      Number.isFinite(opacity) && opacity >= 0.15 && opacity <= 1
        ? opacity
        : DEFAULT_EDGE_SETTINGS.opacity,
    glow:
      typeof source.glow === 'boolean'
        ? source.glow
        : DEFAULT_EDGE_SETTINGS.glow,
    dashed:
      typeof source.dashed === 'boolean'
        ? source.dashed
        : DEFAULT_EDGE_SETTINGS.dashed
  };
};

const getInitialSettings = () => {
  const saved = readSettings();

  return {
    enableSound: saved.enableSound ?? true,
    boardEdges: normalizeBoardEdges(saved.boardEdges)
  };
};

function RangeField({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-xs text-gray-400">{label}</label>
        <div className="min-w-[44px] text-right text-xs text-gray-300">
          {displayValue}
        </div>
      </div>

      <div className="rounded-xl border border-gray-700 bg-[#121212] px-3 py-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          className="settings-range w-full"
        />
      </div>
    </div>
  );
}

function ToggleRow({ icon: Icon, label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-700 bg-[#151515] px-3 py-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-300" />
        <span className="text-sm text-gray-300">{label}</span>
      </div>

      <Switch
        checked={checked}
        onChange={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-0 ${
          checked ? 'bg-green-500' : 'bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </Switch>
    </div>
  );
}

export default function Settings() {
  const { t, language, setLanguage, availableLocales } = useI18n();
  const [settings, setSettings] = useState(getInitialSettings);

  const [nightSearchKeyInput, setNightSearchKeyInput] = useState(() => {
    const savedKeys = readApiKeys();
    return savedKeys.nightsearch || '';
  });
  const [nightSearchSaved, setNightSearchSaved] = useState(() => {
    const savedKeys = readApiKeys();
    return Boolean(savedKeys.nightsearch);
  });
  const [savedNightSearchKey, setSavedNightSearchKey] = useState(() => {
    const savedKeys = readApiKeys();
    return savedKeys.nightsearch || '';
  });
  const [showNightSearchKey, setShowNightSearchKey] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleSettingChange = (key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      patchSettings(next);
      return next;
    });
  };

  const handleBoardEdgesChange = (key, value) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        boardEdges: {
          ...prev.boardEdges,
          [key]: value
        }
      };

      patchSettings(next);
      return next;
    });
  };

  const handleReload = () => {
    window.location.reload();
  };

  const emitApiKeysChanged = () => {
    window.dispatchEvent(new CustomEvent('stalk-api-keys-changed'));
  };

  const currentTrimmedKey = useMemo(
    () => nightSearchKeyInput.trim(),
    [nightSearchKeyInput]
  );
  const savedTrimmedKey = useMemo(
    () => String(savedNightSearchKey || '').trim(),
    [savedNightSearchKey]
  );

  const hasUnsavedNightSearchChanges = currentTrimmedKey !== savedTrimmedKey;
  const canSaveNightSearchKey =
    currentTrimmedKey.length > 0 && hasUnsavedNightSearchChanges;

  const handleSaveNightSearchKey = () => {
    const trimmed = currentTrimmedKey;

    try {
      const savedKeys = readApiKeys();
      const next = {
        ...savedKeys,
        nightsearch: trimmed
      };

      localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(next));
      setNightSearchSaved(Boolean(trimmed));
      setSavedNightSearchKey(trimmed);
      setSaveMessage(
        trimmed
          ? t('settings.nightSearch.savedMessage')
          : t('settings.nightSearch.emptyMessage')
      );

      setTimeout(() => {
        setSaveMessage('');
      }, 2200);

      emitApiKeysChanged();
    } catch {
      setSaveMessage(t('settings.nightSearch.saveError'));
      setTimeout(() => {
        setSaveMessage('');
      }, 2200);
    }
  };

  const handleDeleteNightSearchKey = () => {
    try {
      const savedKeys = readApiKeys();
      const next = { ...savedKeys };

      delete next.nightsearch;

      localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(next));
      setNightSearchKeyInput('');
      setSavedNightSearchKey('');
      setNightSearchSaved(false);
      setShowNightSearchKey(false);
      setSaveMessage(t('settings.nightSearch.deletedMessage'));

      setTimeout(() => {
        setSaveMessage('');
      }, 2200);

      emitApiKeysChanged();
    } catch {
      setSaveMessage(t('settings.nightSearch.deleteError'));
      setTimeout(() => {
        setSaveMessage('');
      }, 2200);
    }
  };

  const contentBlockVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.25, ease: 'easeOut' }
    }
  };

  const edgeOpacityPercent = Math.round(settings.boardEdges.opacity * 100);

  const languageOptions = availableLocales.map((locale) => ({
    value: locale.code,
    label: locale.nativeName
  }));

  const edgeStyleOptions = [
    {
      value: 'curved',
      label: t('settings.boardEdges.styles.curved')
    },
    {
      value: 'straight',
      label: t('settings.boardEdges.styles.straight')
    }
  ];

  return (
    <div className="relative text-white space-y-6 p-6 h-full overflow-y-auto no-scrollbar select-none">
      <style>
        {`
          .settings-input,
          .settings-textarea,
          .settings-select {
            box-shadow: none !important;
            outline: none !important;
          }

          .settings-input:focus,
          .settings-input:focus-visible,
          .settings-textarea:focus,
          .settings-textarea:focus-visible,
          .settings-select:focus,
          .settings-select:focus-visible {
            box-shadow: none !important;
            outline: none !important;
            border-color: rgb(75 85 99) !important;
          }

          .settings-range {
            -webkit-appearance: none;
            appearance: none;
            background: transparent;
            outline: none;
            box-shadow: none;
          }

          .settings-range:focus,
          .settings-range:focus-visible {
            outline: none;
            box-shadow: none;
          }

          .settings-range::-webkit-slider-runnable-track {
            height: 6px;
            border-radius: 999px;
            background: linear-gradient(90deg, rgba(82,82,82,0.95) 0%, rgba(64,64,64,0.95) 100%);
            border: 1px solid rgba(75,85,99,0.55);
          }

          .settings-range::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 999px;
            background: #e5e7eb;
            border: 2px solid #111111;
            box-shadow: 0 0 0 1px rgba(255,255,255,0.04), 0 4px 12px rgba(0,0,0,0.38);
            margin-top: -6px;
            cursor: pointer;
          }

          .settings-range::-moz-range-track {
            height: 6px;
            border-radius: 999px;
            background: linear-gradient(90deg, rgba(82,82,82,0.95) 0%, rgba(64,64,64,0.95) 100%);
            border: 1px solid rgba(75,85,99,0.55);
          }

          .settings-range::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 999px;
            background: #e5e7eb;
            border: 2px solid #111111;
            box-shadow: 0 0 0 1px rgba(255,255,255,0.04), 0 4px 12px rgba(0,0,0,0.38);
            cursor: pointer;
          }
        `}
      </style>

      <motion.div
        variants={contentBlockVariants}
        initial="hidden"
        animate="visible"
      >
        <h2 className="text-2xl font-bold mb-6">{t('settings.title')}</h2>

        <div className="space-y-6 bg-[#1E1E1E] p-6 rounded-lg shadow-xl border border-gray-700/50">
          <div className="border-b border-gray-700/70 pb-4 space-y-4">
            <div className="flex items-center gap-2">
              <LanguagesIcon className="w-4 h-4 text-gray-300" />
              <span className="text-sm text-gray-200 font-medium">
                {t('settings.language.title')}
              </span>
            </div>

            <div className="rounded-xl border border-gray-700 bg-[#191919] p-4 space-y-3">
              <label className="block text-xs text-gray-400">
                {t('settings.language.label')}
              </label>

              <div className="settings-select">
                <CustomSelect
                  value={language}
                  onChange={(value) => setLanguage(value)}
                  options={languageOptions}
                />
              </div>

              <div className="text-xs text-gray-500 leading-relaxed">
                {t('settings.language.hint')}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Volume2Icon className="w-4 h-4 text-gray-300" />
              <span className="text-sm text-gray-300">
                {t('settings.sound.label')}
              </span>
            </div>

            <Switch
              checked={settings.enableSound}
              onChange={(value) => handleSettingChange('enableSound', value)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-0 ${
                settings.enableSound ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enableSound ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </Switch>
          </div>

          <div className="border-t border-gray-700 pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <WorkflowIcon className="w-4 h-4 text-gray-300" />
              <span className="text-sm text-gray-200 font-medium">
                {t('settings.boardEdges.title')}
              </span>
            </div>

            <div className="rounded-xl border border-gray-700 bg-[#191919] p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs text-gray-400">
                    {t('settings.boardEdges.style')}
                  </label>

                  <div className="settings-select">
                    <CustomSelect
                      value={settings.boardEdges.style}
                      onChange={(value) =>
                        handleBoardEdgesChange('style', value)
                      }
                      options={edgeStyleOptions}
                    />
                  </div>
                </div>

                <RangeField
                  label={t('settings.boardEdges.width')}
                  value={settings.boardEdges.width}
                  min="1"
                  max="6"
                  step="1"
                  displayValue={settings.boardEdges.width}
                  onChange={(event) =>
                    handleBoardEdgesChange('width', Number(event.target.value))
                  }
                />
              </div>

              <RangeField
                label={t('settings.boardEdges.opacity')}
                value={settings.boardEdges.opacity}
                min="0.15"
                max="1"
                step="0.01"
                displayValue={`${edgeOpacityPercent}%`}
                onChange={(event) =>
                  handleBoardEdgesChange('opacity', Number(event.target.value))
                }
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ToggleRow
                  icon={SparklesIcon}
                  label={t('settings.boardEdges.glow')}
                  checked={settings.boardEdges.glow}
                  onChange={(value) => handleBoardEdgesChange('glow', value)}
                />

                <ToggleRow
                  icon={CircleDashedIcon}
                  label={t('settings.boardEdges.dashed')}
                  checked={settings.boardEdges.dashed}
                  onChange={(value) => handleBoardEdgesChange('dashed', value)}
                />
              </div>

              <div className="rounded-xl border border-gray-700 bg-[#151515] px-4 py-3">
                <div className="text-xs text-gray-400 mb-2">
                  {t('settings.boardEdges.preview')}
                </div>

                <div className="h-16 rounded-lg border border-gray-800 bg-[#111111] flex items-center justify-center overflow-hidden">
                  <svg width="220" height="48" viewBox="0 0 220 48" fill="none">
                    {settings.boardEdges.glow && (
                      <path
                        d={
                          settings.boardEdges.style === 'straight'
                            ? 'M 18 24 L 202 24'
                            : 'M 18 24 C 70 24, 94 10, 122 10 C 150 10, 172 24, 202 24'
                        }
                        stroke="rgba(96,165,250,0.22)"
                        strokeWidth={Math.max(settings.boardEdges.width + 5, 6)}
                        strokeLinecap="round"
                        strokeDasharray={
                          settings.boardEdges.dashed ? '8 6' : undefined
                        }
                      />
                    )}

                    <path
                      d={
                        settings.boardEdges.style === 'straight'
                          ? 'M 18 24 L 202 24'
                          : 'M 18 24 C 70 24, 94 10, 122 10 C 150 10, 172 24, 202 24'
                      }
                      stroke={`rgba(148,163,184,${settings.boardEdges.opacity})`}
                      strokeWidth={settings.boardEdges.width}
                      strokeLinecap="round"
                      strokeDasharray={
                        settings.boardEdges.dashed ? '8 6' : undefined
                      }
                    />

                    <circle cx="18" cy="24" r="4" fill="#64748B" />
                    <circle cx="202" cy="24" r="4" fill="#64748B" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <KeyRoundIcon className="w-4 h-4 text-gray-300" />
              <span className="text-sm text-gray-200 font-medium">
                {t('settings.apiServices')}
              </span>
            </div>

            <div className="rounded-xl border border-gray-700 bg-[#191919] p-4 space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-sm font-medium text-gray-200">
                    {t('settings.nightSearch.title')}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 leading-relaxed max-w-[700px]">
                    {t('settings.nightSearch.descriptionBeforeLink')}{' '}
                    <a
                      href="https://nightsearch.life"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-200 underline underline-offset-2 transition-colors"
                    >
                      NightSearch
                    </a>
                    {t('settings.nightSearch.descriptionAfterLink')}
                  </div>
                </div>

                <div className="text-xs">
                  {nightSearchSaved ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-700/40 bg-emerald-900/20 px-2 py-1 text-emerald-300">
                      <CheckCircle2Icon className="w-3.5 h-3.5" />
                      {t('settings.nightSearch.statusSaved')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md border border-gray-700 bg-[#141414] px-2 py-1 text-gray-400">
                      {t('settings.nightSearch.statusEmpty')}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-gray-400">
                  {t('settings.nightSearch.apiKeyLabel')}
                </label>

                <div className="relative">
                  <input
                    type={showNightSearchKey ? 'text' : 'password'}
                    value={nightSearchKeyInput}
                    onChange={(event) => setNightSearchKeyInput(event.target.value)}
                    placeholder={t('settings.nightSearch.apiKeyPlaceholder')}
                    className="settings-input w-full rounded-xl border border-gray-700 bg-[#121212] px-3 py-2.5 pr-11 text-sm text-gray-200 ring-0 transition-colors placeholder:text-gray-600 hover:border-gray-600 focus:border-gray-600"
                    autoComplete="off"
                    spellCheck={false}
                  />

                  <button
                    type="button"
                    onClick={() => setShowNightSearchKey((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-[#1c1c1c] transition-colors"
                    title={
                      showNightSearchKey
                        ? t('settings.nightSearch.hideKey')
                        : t('settings.nightSearch.showKey')
                    }
                  >
                    {showNightSearchKey ? (
                      <EyeOffIcon className="w-4 h-4" />
                    ) : (
                      <EyeIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {canSaveNightSearchKey && (
                  <button
                    onClick={handleSaveNightSearchKey}
                    className="px-4 py-2 text-sm rounded-xl bg-[#1a1a1a] border border-gray-700 text-gray-200 transition-colors hover:bg-[#222] hover:border-gray-600"
                  >
                    {t('settings.nightSearch.save')}
                  </button>
                )}

                {nightSearchSaved && (
                  <button
                    onClick={handleDeleteNightSearchKey}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl bg-[#232323] hover:bg-[#2c2c2c] border border-gray-700 text-red-300 transition-colors"
                  >
                    <Trash2Icon className="w-4 h-4" />
                    {t('settings.nightSearch.delete')}
                  </button>
                )}
              </div>

              {saveMessage && <div className="text-xs text-gray-400">{saveMessage}</div>}
            </div>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <div className="flex items-start gap-3 rounded-xl border border-dashed border-gray-700 bg-[#191919] px-4 py-4">
              <div className="mt-0.5">
                <WrenchIcon className="w-5 h-5 text-gray-400" />
              </div>

              <div>
                <div className="text-sm font-medium text-gray-200">
                  {t('settings.future.title')}
                </div>
                <div className="mt-1 text-sm text-gray-500 leading-relaxed">
                  {t('settings.future.description')}
                  <a
                    href="https://t.me/cyberstalker007"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-200 transition-colors ml-1"
                  >
                    @cyberstalker007
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end border-t border-gray-700">
            <button
              onClick={handleReload}
              className="flex items-center px-4 py-2 text-sm rounded-xl bg-[#1a1a1a] border border-gray-700 text-gray-200 transition-colors hover:bg-[#222] hover:border-gray-600 focus:outline-none focus:ring-0"
            >
              <RefreshCw size={14} className="mr-1.5" />
              {t('settings.reload')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}