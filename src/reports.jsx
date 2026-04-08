import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  HistoryIcon,
  SearchIcon,
  CalendarIcon,
  Trash2,
  FileSearchIcon,
  CopyIcon,
  DownloadIcon
} from 'lucide-react';
import { useI18n } from './i18n';

const REPORTS_STORAGE_KEY = 'stalk_reports_v1';

function normalizeReports(raw) {
  return Array.isArray(raw)
    ? raw
        .filter(Boolean)
        .map((report) => ({
          id: report.id || `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          title: String(report.title || '').trim(),
          content: String(report.content || ''),
          createdAt: report.createdAt || Date.now()
        }))
        .filter((report) => report.title || report.content)
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    : [];
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export default function Reports() {
  const { t, intlLocale, language } = useI18n();
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  const formatDate = (value) => {
    if (!value) return '—';

    try {
      return new Date(value).toLocaleString(intlLocale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  useEffect(() => {
    const loadReports = () => {
      try {
        const stored = JSON.parse(localStorage.getItem(REPORTS_STORAGE_KEY) || '[]');
        const normalized = normalizeReports(stored);

        setReports(normalized);
        setSelectedReportId((prev) => {
          if (prev && normalized.some((report) => report.id === prev)) {
            return prev;
          }
          return normalized[0]?.id || null;
        });
      } catch (error) {
        console.error('Reports read error:', error);
        setReports([]);
        setSelectedReportId(null);
      }
    };

    loadReports();

    const handleReportsChanged = () => loadReports();
    const handleStorage = (event) => {
      if (!event.key || event.key === REPORTS_STORAGE_KEY) {
        loadReports();
      }
    };

    window.addEventListener('stalk-reports-changed', handleReportsChanged);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('stalk-reports-changed', handleReportsChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const filteredReports = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return reports;

    return reports.filter((report) => {
      const haystack = `${report.title} ${report.content}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [reports, searchQuery]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) || null,
    [reports, selectedReportId]
  );

  const handleClearHistory = () => {
    localStorage.removeItem(REPORTS_STORAGE_KEY);
    setReports([]);
    setSelectedReportId(null);
    window.dispatchEvent(new Event('stalk-reports-changed'));
  };

  const copyReport = async () => {
    if (!selectedReport) return;

    const text = `${selectedReport.title}\n\n${selectedReport.content || ''}`.trim();

    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage(t('reports.copied'));
      setTimeout(() => setCopyMessage(''), 1500);
    } catch (error) {
      console.error('Report copy error:', error);
      setCopyMessage(t('reports.copyError'));
      setTimeout(() => setCopyMessage(''), 1500);
    }
  };

  const exportReportHtml = () => {
    if (!selectedReport) return;

    const html = `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(selectedReport.title || 'STALK Report')}</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      padding: 32px;
      background: #0f0f10;
      color: #e5e7eb;
      font-family: Inter, Arial, sans-serif;
      line-height: 1.6;
    }
    .wrapper {
      max-width: 980px;
      margin: 0 auto;
    }
    .card {
      border: 1px solid rgba(255,255,255,0.08);
      background: #151515;
      border-radius: 18px;
      padding: 24px;
    }
    .brand {
      font-size: 28px;
      font-weight: 800;
      color: #fff;
      margin-bottom: 8px;
    }
    .meta {
      font-size: 13px;
      color: #9ca3af;
      margin-bottom: 20px;
    }
    .title {
      font-size: 22px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 18px;
      word-break: break-word;
    }
    .content {
      white-space: pre-wrap;
      word-break: break-word;
      color: #e5e7eb;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="brand">STALK</div>
      <div class="meta">${escapeHtml(t('reports.html.exportedAt'))}: ${escapeHtml(
        formatDate(Date.now())
      )}</div>
      <div class="title">${escapeHtml(selectedReport.title || t('reports.untitled'))}</div>
      <div class="meta">${escapeHtml(t('reports.html.savedAt'))}: ${escapeHtml(
        formatDate(selectedReport.createdAt)
      )}</div>
      <div class="content">${escapeHtml(
        selectedReport.content || t('reports.html.emptyRecord')
      )}</div>
    </div>
  </div>
</body>
</html>
    `.trim();

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const safeName = (selectedReport.title || 'report')
      .replace(/[^\p{L}\p{N}_-]+/gu, '_')
      .slice(0, 50);

    anchor.href = url;
    anchor.download = `${safeName || 'report'}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="p-6 text-gray-200 h-full overflow-y-auto no-scrollbar"
    >
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t('reports.title')}</h1>
          <p className="text-sm text-gray-400 mt-1">{t('reports.subtitle')}</p>
        </div>

        {reports.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-2 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md transition-colors focus:outline-none focus:ring-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t('reports.clearHistory')}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6 min-h-[520px]">
        <div className="rounded-lg border border-gray-800 bg-[#1A1A1A] overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <div className="relative">
              <SearchIcon className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('reports.searchPlaceholder')}
                className="w-full bg-[#232323] border border-gray-700 rounded-md pl-9 pr-3 py-2.5 text-sm text-gray-200 outline-none transition-colors duration-150 hover:border-gray-600 focus:border-gray-600 focus:outline-none focus:ring-0"
                style={{ boxShadow: 'none' }}
              />
            </div>
          </div>

          <div className="max-h-[calc(100vh-290px)] overflow-y-auto no-scrollbar p-3 space-y-2">
            {reports.length === 0 && (
              <div className="px-4 py-14 text-center text-sm text-gray-500">
                {t('reports.empty')}
              </div>
            )}

            {reports.length > 0 && filteredReports.length === 0 && (
              <div className="px-4 py-14 text-center text-sm text-gray-500">
                {t('reports.nothingFound')}
              </div>
            )}

            {filteredReports.map((report) => {
              const active = report.id === selectedReportId;

              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedReportId(report.id)}
                  className={`w-full text-left rounded-md border px-3 py-3 transition-colors focus:outline-none focus:ring-0 ${
                    active
                      ? 'border-slate-500/70 bg-slate-500/10'
                      : 'border-gray-800 bg-[#171717] hover:bg-[#1d1d1d]'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-md bg-[#232323] border border-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                      <HistoryIcon className="w-4 h-4 text-gray-300" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-white truncate">
                        {report.title || t('reports.untitled')}
                      </div>

                      <div className="mt-1 text-xs text-gray-500 line-clamp-3 whitespace-pre-wrap break-words">
                        {report.content || t('reports.emptyRecord')}
                      </div>

                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        <span>{formatDate(report.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-gray-800 bg-[#1A1A1A] overflow-hidden min-h-[520px]">
          {selectedReport ? (
            <div className="h-full flex flex-col">
              <div className="p-5 border-b border-gray-800">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#232323] border border-gray-800 flex items-center justify-center shrink-0">
                    <FileSearchIcon className="w-5 h-5 text-gray-300" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold text-white break-words">
                      {selectedReport.title || t('reports.untitled')}
                    </h2>

                    <div className="mt-2 text-xs text-gray-500">
                      {t('reports.savedAt')}: {formatDate(selectedReport.createdAt)}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        onClick={copyReport}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-700 bg-[#232323] hover:bg-[#2a2a2a] text-sm text-gray-200 transition-colors focus:outline-none focus:ring-0"
                      >
                        <CopyIcon className="w-4 h-4" />
                        {t('reports.copy')}
                      </button>

                      <button
                        onClick={exportReportHtml}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-sky-700/40 bg-sky-900/20 hover:bg-sky-900/30 text-sm text-sky-200 transition-colors focus:outline-none focus:ring-0"
                      >
                        <DownloadIcon className="w-4 h-4" />
                        {t('reports.downloadHtml')}
                      </button>

                      {copyMessage && (
                        <span className="text-xs text-emerald-400">{copyMessage}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 overflow-y-auto no-scrollbar flex-1">
                <div className="text-sm text-gray-300 whitespace-pre-wrap break-words leading-7">
                  {selectedReport.content || t('reports.recordEmpty')}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-center text-gray-500">
              {t('reports.chooseRecord')}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
