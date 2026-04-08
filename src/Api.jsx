import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRoundIcon,
  SearchIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  DatabaseIcon,
  CopyIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DownloadIcon,
  CheckIcon
} from 'lucide-react';
import { useI18n } from './i18n';

const API_KEYS_STORAGE_KEY = 'STALK-api-keys';
const REPORTS_STORAGE_KEY = 'stalk_reports_v1';
const SEARCH_TYPE_VALUES = [
  'phone',
  'email',
  'fio',
  'vk',
  'tg',
  'ip',
  'snils',
  'inn',
  'nick',
  'car',
  'ok',
  'fb'
];

function makeReportId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const readApiKeys = () => {
  try {
    return JSON.parse(localStorage.getItem(API_KEYS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const escapeHtml = (value) => {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

function normalizeField(field, t) {
  const key =
    String(field?.key ?? t('api.fallbackFieldKey')).trim() || t('api.fallbackFieldKey');
  const value = String(field?.value ?? '—').trim() || '—';
  return { key, value };
}

function dedupeResults(rawResults, t) {
  if (!Array.isArray(rawResults)) return [];

  return rawResults.map((item, index) => {
    const fieldsArray = Array.isArray(item?.fields) ? item.fields : [];
    const seen = new Set();
    const uniqueFields = [];

    for (const field of fieldsArray) {
      const normalized = normalizeField(field, t);
      const dedupeKey = `${normalized.key}:::${normalized.value}`;

      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      uniqueFields.push(normalized);
    }

    return {
      id: `${item?.database || 'db'}-${index}`,
      database: item?.database || t('api.fallbackDatabase'),
      description: item?.description || t('api.fallbackDescription'),
      fields: uniqueFields
    };
  });
}

function saveSearchToReports({ query, searchTypeLabel, results, t }) {
  try {
    const stored = JSON.parse(localStorage.getItem(REPORTS_STORAGE_KEY) || '[]');
    const reports = Array.isArray(stored) ? stored : [];
    const lines = [];

    lines.push(`${t('api.report.query')}: ${query}`);
    lines.push(`${t('api.report.searchType')}: ${searchTypeLabel}`);
    lines.push(`${t('api.report.results')}: ${results.length}`);
    lines.push('');

    if (results.length === 0) {
      lines.push(t('api.report.noResults'));
    } else {
      results.forEach((item, index) => {
        lines.push(`=== ${t('api.report.databaseTitle')} ${index + 1} ===`);
        lines.push(`${t('api.report.databaseName')}: ${item.database || t('api.fallbackDatabase')}`);
        lines.push(`${t('api.report.description')}: ${item.description || t('api.fallbackDescription')}`);

        if (Array.isArray(item.fields) && item.fields.length > 0) {
          lines.push(`${t('api.report.fields')}:`);
          item.fields.forEach((field) => {
            const key = String(field?.key ?? t('api.fallbackFieldKey')).trim() || t('api.fallbackFieldKey');
            const value = String(field?.value ?? '—').trim() || '—';
            lines.push(`- ${key}: ${value}`);
          });
        } else {
          lines.push(`${t('api.report.fields')}: ${t('api.report.fieldsEmpty')}`);
        }

        lines.push('');
      });
    }

    const report = {
      id: makeReportId(),
      title: `${searchTypeLabel}: ${query}`,
      content: lines.join('\n').trim(),
      createdAt: Date.now()
    };

    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify([report, ...reports]));
    window.dispatchEvent(new Event('stalk-reports-changed'));
  } catch (error) {
    console.error(t('api.errors.historySave'), error);
  }
}

function buildHtmlReport({ query, searchType, results, t, language, intlLocale }) {
  const date = new Date().toLocaleString(intlLocale);
  const blocks = results
    .map((result) => {
      const fieldsHtml = result.fields
        .map(
          (field) => `
            <div class="field-row">
              <div class="field-key">${escapeHtml(field.key)}</div>
              <div class="field-value">${escapeHtml(field.value)}</div>
            </div>
          `
        )
        .join('');

      return `
        <section class="result-card">
          <div class="result-head">
            <div class="result-title">${escapeHtml(result.database)}</div>
            <div class="result-desc">${escapeHtml(result.description)}</div>
          </div>
          <div class="fields-grid">
            ${fieldsHtml}
          </div>
        </section>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>STALK Report</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      padding: 32px;
      background: #0f0f10;
      color: #e5e7eb;
      font-family: Inter, Arial, sans-serif;
      line-height: 1.5;
    }
    .wrapper {
      max-width: 1100px;
      margin: 0 auto;
    }
    .hero {
      border: 1px solid rgba(255,255,255,0.08);
      background: linear-gradient(180deg, #171717 0%, #121212 100%);
      border-radius: 18px;
      padding: 24px;
      margin-bottom: 22px;
    }
    .brand {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: #ffffff;
    }
    .sub {
      margin-top: 6px;
      color: #93c5fd;
      font-size: 14px;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-top: 18px;
    }
    .meta-card {
      background: #111214;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 12px 14px;
    }
    .meta-label {
      color: #7dd3fc;
      font-size: 12px;
      margin-bottom: 4px;
    }
    .meta-value {
      color: #e5e7eb;
      font-size: 14px;
      word-break: break-word;
    }
    .result-card {
      border: 1px solid rgba(255,255,255,0.08);
      background: #151515;
      border-radius: 16px;
      padding: 18px;
      margin-bottom: 16px;
    }
    .result-title {
      font-size: 18px;
      font-weight: 700;
      color: #f3f4f6;
    }
    .result-desc {
      margin-top: 4px;
      color: #9ca3af;
      font-size: 13px;
    }
    .fields-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 10px;
      margin-top: 16px;
    }
    .field-row {
      background: #101011;
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 10px 12px;
    }
    .field-key {
      color: #7dd3fc;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 5px;
    }
    .field-value {
      color: #e5e7eb;
      font-size: 14px;
      word-break: break-word;
    }
    .footer {
      margin-top: 28px;
      border-top: 1px solid rgba(255,255,255,0.08);
      padding-top: 18px;
      color: #9ca3af;
      font-size: 13px;
    }
    .footer a {
      color: #93c5fd;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <section class="hero">
      <div class="brand">STALK</div>
      <div class="sub">NightSearch export report</div>

      <div class="meta">
        <div class="meta-card">
          <div class="meta-label">${escapeHtml(t('api.report.query'))}</div>
          <div class="meta-value">${escapeHtml(query)}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">${escapeHtml(t('api.report.searchType'))}</div>
          <div class="meta-value">${escapeHtml(searchType)}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">${escapeHtml(t('api.report.results'))}</div>
          <div class="meta-value">${escapeHtml(results.length)}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">${escapeHtml(t('api.report.exportDate'))}</div>
          <div class="meta-value">${escapeHtml(date)}</div>
        </div>
      </div>
    </section>

    ${blocks}

    <div class="footer">
      <div>${escapeHtml(t('api.report.generatedBy'))} <strong>STALK</strong></div>
      <div>
        Telegram:
        <a href="https://t.me/cyberstalker007">t.me/cyberstalker007</a>
        &nbsp;•&nbsp;
        ${escapeHtml(t('api.report.source'))}:
        <a href="https://nightsearch.life">NightSearch.life</a>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export default function Api() {
  const { t, intlLocale, language } = useI18n();
  const [apiKey, setApiKey] = useState('');
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('phone');
  const [rawResults, setRawResults] = useState([]);
  const [requestInfo, setRequestInfo] = useState(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [openItems, setOpenItems] = useState({});
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);

  const typeMenuRef = useRef(null);

  useEffect(() => {
    const syncKeys = () => {
      const keys = readApiKeys();
      setApiKey(keys.nightsearch || '');
    };

    syncKeys();

    window.addEventListener('storage', syncKeys);
    window.addEventListener('stalk-api-keys-changed', syncKeys);

    return () => {
      window.removeEventListener('storage', syncKeys);
      window.removeEventListener('stalk-api-keys-changed', syncKeys);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!typeMenuRef.current) return;
      if (!typeMenuRef.current.contains(event.target)) {
        setIsTypeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const hasApiKey = Boolean(String(apiKey || '').trim());
  const results = useMemo(() => dedupeResults(rawResults, t), [rawResults, t]);
  const searchTypes = useMemo(
    () =>
      SEARCH_TYPE_VALUES.map((value) => ({
        value,
        label: t(`api.searchTypes.${value}`)
      })),
    [t]
  );
  const selectedTypeLabel =
    searchTypes.find((item) => item.value === searchType)?.label || searchType;

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text));
      setCopyMessage(t('api.copy.success'));
      setTimeout(() => setCopyMessage(''), 1500);
    } catch {
      setCopyMessage(t('api.copy.error'));
      setTimeout(() => setCopyMessage(''), 1500);
    }
  };

  const toggleItem = (id) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const openAllItems = () => {
    const next = {};
    for (const item of results) next[item.id] = true;
    setOpenItems(next);
  };

  const closeAllItems = () => {
    setOpenItems({});
  };

  const exportHtml = () => {
    if (!results.length) return;

    const html = buildHtmlReport({
      query,
      searchType: selectedTypeLabel,
      results,
      t,
      language,
      intlLocale
    });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const safeQuery = (query || 'report')
      .replace(/[^\p{L}\p{N}_-]+/gu, '_')
      .slice(0, 40);

    anchor.href = url;
    anchor.download = `STALK_NightSearch_${safeQuery || 'report'}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleSearch = async () => {
    if (!hasApiKey) {
      setError(t('api.errors.missingKey'));
      return;
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setError(t('api.errors.emptyQuery'));
      return;
    }

    setLoadingSearch(true);
    setError('');
    setRawResults([]);
    setRequestInfo(null);
    setOpenItems({});

    try {
      const result = await window.api.nightSearchSearch({
        apiKey,
        query: trimmedQuery,
        searchType
      });

      if (!result?.ok) {
        throw new Error(result?.error || t('api.errors.search'));
      }

      const data = result.data || {};
      const nextResults = Array.isArray(data?.results) ? data.results : [];

      setRequestInfo({
        status: data?.status || 'success',
        quest: data?.quest || trimmedQuery,
        total: nextResults.length
      });

      setRawResults(nextResults);

      const normalizedResults = dedupeResults(nextResults, t);
      saveSearchToReports({
        query: trimmedQuery,
        searchTypeLabel: selectedTypeLabel,
        results: normalizedResults,
        t
      });

      const opened = {};
      normalizedResults.forEach((item) => {
        opened[item.id] = false;
      });
      if (normalizedResults[0]?.id) {
        opened[normalizedResults[0].id] = true;
      }
      setOpenItems(opened);
    } catch (err) {
      setError(err.message || t('api.errors.search'));
    } finally {
      setLoadingSearch(false);
    }
  };

  return (
    <div className="relative text-white space-y-6 p-6 h-full overflow-y-auto no-scrollbar">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="space-y-6"
      >
        <div className="rounded-lg border border-gray-700/50 bg-[#1E1E1E] p-5 space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-gray-200 font-medium">
                <KeyRoundIcon className="w-4 h-4 text-gray-300" />
                NightSearch
              </div>
              <div className="text-sm text-gray-500">{t('api.intro.subtitle')}</div>
              <div className="mt-1 text-sm text-gray-500">{t('api.intro.description')}</div>
            </div>

            <div>
              {hasApiKey ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-700/40 bg-emerald-900/20 px-2.5 py-1 text-xs text-emerald-300">
                  <ShieldCheckIcon className="w-3.5 h-3.5" />
                  {t('api.status.keyFound')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-red-700/40 bg-red-900/20 px-2.5 py-1 text-xs text-red-300">
                  <AlertTriangleIcon className="w-3.5 h-3.5" />
                  {t('api.status.keyMissing')}
                </span>
              )}
            </div>
          </div>

          {!hasApiKey && (
            <div className="rounded-md border border-amber-700/40 bg-amber-900/15 px-3 py-2 text-sm text-amber-200">
              {t('api.status.warningAddKey')}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[180px_1fr_auto] gap-3">
            <div ref={typeMenuRef} className="relative">
              <label className="block text-xs text-gray-400 mb-1">
                {t('api.form.searchType')}
              </label>

              <button
                type="button"
                onClick={() => setIsTypeMenuOpen((prev) => !prev)}
                className={`w-full rounded-md border bg-[#121212] px-3 py-2 text-sm text-gray-200 outline-none ring-0 transition-colors flex items-center justify-between ${
                  isTypeMenuOpen
                    ? 'border-gray-600'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <span>{selectedTypeLabel}</span>
                <ChevronDownIcon
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    isTypeMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {isTypeMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                    className="absolute left-0 right-0 top-full mt-2 z-30 rounded-md border border-gray-700 bg-[#111111] shadow-2xl overflow-hidden"
                  >
                    <div className="max-h-72 overflow-y-auto no-scrollbar py-1">
                      {searchTypes.map((item) => {
                        const active = item.value === searchType;

                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => {
                              setSearchType(item.value);
                              setIsTypeMenuOpen(false);
                            }}
                            className={`w-full px-3 py-2.5 text-sm text-left flex items-center justify-between transition-colors ${
                              active
                                ? 'bg-[#1a1a1a] text-white'
                                : 'text-gray-200 hover:bg-[#161616]'
                            }`}
                          >
                            <span>{item.label}</span>
                            {active && <CheckIcon className="w-4 h-4 shrink-0 text-gray-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">{t('api.form.query')}</label>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('api.form.queryPlaceholder')}
                className="w-full rounded-md border border-gray-700 bg-[#121212] px-3 py-2 text-sm text-gray-200 outline-none ring-0 placeholder:text-gray-600 focus:border-gray-600 focus:ring-0 focus:outline-none"
                autoComplete="off"
                spellCheck={false}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !loadingSearch && hasApiKey) {
                    handleSearch();
                  }
                }}
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={handleSearch}
                disabled={!hasApiKey || loadingSearch}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm transition-colors"
              >
                <SearchIcon className="w-4 h-4" />
                {loadingSearch ? t('api.form.searching') : t('api.form.search')}
              </button>
            </div>
          </div>

          {copyMessage && (
            <span className="inline-flex items-center rounded-md bg-emerald-600 px-2 py-1 text-xs text-white">
              {copyMessage}
            </span>
          )}

          {error && (
            <div className="rounded-md border border-red-700/40 bg-red-900/20 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          {requestInfo && (
            <div className="rounded-md border border-sky-700/30 bg-sky-900/10 p-3 text-sm text-sky-200 grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                {t('api.requestInfo.status')}: {requestInfo.status}
              </div>
              <div>
                {t('api.requestInfo.query')}: {requestInfo.quest}
              </div>
              <div>
                {t('api.requestInfo.matches')}: {results.length}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={openAllItems}
                  className="px-3 py-2 rounded-md border border-gray-700 bg-[#121212] hover:bg-[#171717] text-xs text-gray-200 transition-colors"
                >
                  {t('api.actions.openAll')}
                </button>

                <button
                  onClick={closeAllItems}
                  className="px-3 py-2 rounded-md border border-gray-700 bg-[#121212] hover:bg-[#171717] text-xs text-gray-200 transition-colors"
                >
                  {t('api.actions.closeAll')}
                </button>

                <button
                  onClick={exportHtml}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-sky-700/40 bg-sky-900/20 hover:bg-sky-900/30 text-xs text-sky-200 transition-colors"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  {t('api.actions.downloadHtml')}
                </button>
              </div>

              <div className="space-y-3">
                {results.map((item) => {
                  const isOpen = Boolean(openItems[item.id]);

                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-gray-700/50 bg-[#181818] overflow-hidden"
                    >
                      <button
                        onClick={() => toggleItem(item.id)}
                        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
                      >
                        <div className="min-w-0">
                          <div className="inline-flex items-center gap-2 text-gray-200 font-medium">
                            <DatabaseIcon className="w-4 h-4 text-gray-400 shrink-0" />
                            <span className="truncate">{item.database}</span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500 break-words">
                            {item.description}
                          </div>
                          <div className="mt-2 text-[11px] text-gray-600">
                            {t('api.fieldsCount', { count: item.fields.length })}
                          </div>
                        </div>

                        <div className="shrink-0 text-gray-400">
                          {isOpen ? (
                            <ChevronDownIcon className="w-4 h-4" />
                          ) : (
                            <ChevronRightIcon className="w-4 h-4" />
                          )}
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4">
                              <div className="flex justify-end mb-3">
                                <button
                                  onClick={() => copyText(JSON.stringify(item, null, 2))}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-700 bg-[#121212] hover:bg-[#171717] text-xs text-gray-300 transition-colors"
                                >
                                  <CopyIcon className="w-3.5 h-3.5" />
                                  {t('api.actions.copy')}
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {item.fields.map((field, fieldIndex) => (
                                  <div
                                    key={`${field.key}-${field.value}-${fieldIndex}`}
                                    className="rounded-md border border-gray-700/50 bg-[#121212] px-3 py-2"
                                  >
                                    <div className="text-xs text-sky-400/80 font-medium">
                                      {field.key}
                                    </div>
                                    <div className="mt-1 text-sm text-gray-300 break-all">
                                      {field.value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {!loadingSearch && requestInfo && results.length === 0 && !error && (
            <div className="rounded-md border border-gray-700/50 bg-[#151515] px-3 py-3 text-sm text-gray-400">
              {t('api.emptyResults')}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
