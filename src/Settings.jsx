import React, { useState } from 'react';
import { Switch } from '@headlessui/react';
import {
  RefreshCw,
  Volume2Icon,
  WrenchIcon,
  LanguagesIcon,
  WorkflowIcon,
  SparklesIcon,
  CircleDashedIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from './i18n';
import { patchSettings, readSettings } from './settingsStore';
import { CustomSelect } from './board/BoardControls.jsx';

const DEFAULT_EDGE_SETTINGS = {
  style: 'curved',
  width: 2,
  opacity: 0.78,
  glow: false,
  dashed: true
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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-xs text-gray-400">{label}</label>
        <div className="min-w-[44px] text-right text-xs text-gray-300">
          {displayValue}
        </div>
      </div>

      <div className="rounded-lg border border-gray-700 bg-[#121212] px-3 py-2">
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
    <div className="flex items-center justify-between rounded-lg border border-gray-700 bg-[#151515] px-3 py-2">
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
    if (window.api?.relaunch) {
      window.api.relaunch().catch(() => {
        window.location.reload();
      });
      return;
    }

    window.location.reload();
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
        <h2 className="text-2xl font-bold mb-4">{t('settings.title')}</h2>

        <div className="space-y-4 bg-[#1E1E1E] p-4 rounded-lg shadow-xl border border-gray-700/50">
          <div className="border-b border-gray-700/70 pb-3 space-y-3">
            <div className="flex items-center gap-2">
              <LanguagesIcon className="w-4 h-4 text-gray-300" />
              <span className="text-sm text-gray-200 font-medium">
                {t('settings.language.title')}
              </span>
            </div>

            <div className="rounded-lg border border-gray-700 bg-[#191919] p-3 space-y-2">
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

          <div className="border-t border-gray-700 pt-3 space-y-3">
            <div className="flex items-center gap-2">
              <WorkflowIcon className="w-4 h-4 text-gray-300" />
              <span className="text-sm text-gray-200 font-medium">
                {t('settings.boardEdges.title')}
              </span>
            </div>

            <div className="rounded-lg border border-gray-700 bg-[#191919] p-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                    onClick={(event) => {
                      event.preventDefault();
                      window.api?.openExternal?.('https://t.me/cyberstalker007').catch((error) => {
                        console.error('External link error:', error);
                      });
                    }}
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