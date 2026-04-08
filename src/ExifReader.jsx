import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  AlertTriangle,
  Copy,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import * as exifr from 'exifr';
import { useI18n } from './i18n';

const ITEMS_PER_PAGE = 6;
const MAX_FILE_SIZE_MB = 15;
const SUPPORTED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'tif',
  'tiff',
  'png',
  'heic',
  'heif',
  'hif',
  'avif',
  'webp'
];
const PREVIEW_SAFE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
const PREVIEW_SAFE_MIME_PREFIXES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif'
];

export default function ExifReader() {
  const { t, intlLocale } = useI18n();
  const [fileName, setFileName] = useState('');
  const [rawTags, setRawTags] = useState(null);
  const [exifData, setExifData] = useState(null);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [previewNote, setPreviewNote] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [direction, setDirection] = useState(0);
  const [paginatedExif, setPaginatedExif] = useState([]);
  const [totalPages, setTotalPages] = useState(0);

  const fileInputRef = useRef(null);

  const resetState = () => {
    setFileName('');
    setRawTags(null);
    setExifData(null);
    setError('');
    setImagePreview(null);
    setPreviewNote('');
    setCopySuccess('');
    setLoading(false);
    setCurrentPage(1);
    setDirection(0);
    setPaginatedExif([]);
    setTotalPages(0);
  };

  useEffect(() => {
    if (!exifData) {
      setPaginatedExif([]);
      setTotalPages(0);
      return;
    }

    const entries = Object.entries(exifData);
    const pages = Math.ceil(entries.length / ITEMS_PER_PAGE);
    setTotalPages(pages);

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setPaginatedExif(entries.slice(startIndex, endIndex));
  }, [exifData, currentPage]);

  const getFileExtension = (name = '') => {
    const parts = name.toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() : '';
  };

  const isSupportedImageFile = (file) => {
    if (!file) return false;

    const mime = (file.type || '').toLowerCase();
    const ext = getFileExtension(file.name);

    if (/image\/(jpeg|jpg|png|webp|avif|tiff|heic|heif)/i.test(mime)) {
      return true;
    }

    return SUPPORTED_EXTENSIONS.includes(ext);
  };

  const canRenderPreview = (file) => {
    if (!file) return false;

    const mime = (file.type || '').toLowerCase();
    const ext = getFileExtension(file.name);

    if (PREVIEW_SAFE_MIME_PREFIXES.includes(mime)) return true;
    return PREVIEW_SAFE_EXTENSIONS.includes(ext);
  };

  const safeToLocaleString = (date) => {
    try {
      return date.toLocaleString(intlLocale);
    } catch {
      return String(date);
    }
  };

  const formatExposureTime = (value) => {
    if (value == null) return t('exif.notFound');

    if (typeof value === 'number') {
      if (value > 0 && value < 1) {
        const inv = Math.round(1 / value);
        return inv > 1 ? `1/${inv} sec` : `${value} sec`;
      }
      return `${value} sec`;
    }

    return String(value);
  };

  const formatFocalLength = (value) => {
    if (value == null) return t('exif.notFound');
    if (typeof value === 'number') return `${value} mm`;
    return String(value);
  };

  const formatAperture = (value) => {
    if (value == null) return t('exif.notFound');
    return `f/${value}`;
  };

  const simplifyTags = (tags) => {
    const simplified = {};

    for (const [key, value] of Object.entries(tags)) {
      if (value === undefined || value === null) continue;

      if (value instanceof Date) {
        simplified[key] = safeToLocaleString(value);
      } else if (
        value &&
        typeof value === 'object' &&
        'numerator' in value &&
        'denominator' in value
      ) {
        simplified[key] = `${value.numerator}/${value.denominator}`;
      } else if (
        Array.isArray(value) &&
        value.every((item) => typeof item === 'number' || typeof item === 'string')
      ) {
        simplified[key] = value.join(', ');
      } else if ((key === 'latitude' || key === 'longitude') && typeof value === 'number') {
        simplified[key] = value.toFixed(6);
      } else if (
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'string'
      ) {
        simplified[key] = String(value);
      }
    }

    return simplified;
  };

  const formatLensValue = (tags) => {
    if (!tags) return t('exif.notFound');
    if (typeof tags.LensModel === 'string' && tags.LensModel.trim()) return tags.LensModel;
    if (Array.isArray(tags.LensInfo)) return tags.LensInfo.join(', ');
    if (typeof tags.LensInfo === 'string' && tags.LensInfo.trim()) return tags.LensInfo;
    return t('exif.notFound');
  };

  const buildSummary = (tags) => {
    if (!tags) return [];

    const camera = [tags.Make, tags.Model].filter(Boolean).join(' ');
    const lens = formatLensValue(tags);
    const originalDate = tags.DateTimeOriginal || tags.CreateDate || null;
    const software =
      tags.Software ||
      tags.ProcessingSoftware ||
      tags.CreatorTool ||
      tags.XMPToolkit ||
      null;

    return [
      { label: t('exif.camera'), value: camera || t('exif.notFound') },
      { label: t('exif.lens'), value: lens },
      {
        label: t('exif.shotDate'),
        value:
          originalDate instanceof Date
            ? safeToLocaleString(originalDate)
            : originalDate || t('exif.notFound')
      },
      { label: t('exif.iso'), value: tags.ISO ?? t('exif.notFound') },
      { label: t('exif.exposure'), value: formatExposureTime(tags.ExposureTime) },
      { label: t('exif.aperture'), value: formatAperture(tags.FNumber) },
      { label: t('exif.focalLength'), value: formatFocalLength(tags.FocalLength) },
      { label: t('exif.software'), value: software || t('exif.notFound') }
    ];
  };

  const buildFlags = (tags) => {
    if (!tags) return [];

    const flags = [];
    const hasCamera = Boolean(tags.Make || tags.Model);
    const hasGps = typeof tags.latitude === 'number' && typeof tags.longitude === 'number';
    const softwareValue =
      tags.Software ||
      tags.ProcessingSoftware ||
      tags.CreatorTool ||
      tags.XMPToolkit ||
      null;
    const hasSoftware = Boolean(softwareValue);
    const dtOriginal =
      tags.DateTimeOriginal instanceof Date ? tags.DateTimeOriginal.getTime() : null;
    const dtModify = tags.ModifyDate instanceof Date ? tags.ModifyDate.getTime() : null;

    if (hasGps) {
      flags.push({ type: 'info', text: t('exif.gpsPresent') });
    }

    if (hasSoftware) {
      flags.push({
        type: 'warn',
        text: t('exif.processingDetected', { value: softwareValue })
      });
    }

    if (dtOriginal && dtModify && dtOriginal !== dtModify) {
      flags.push({ type: 'warn', text: t('exif.modifyMismatch') });
    }

    if (!hasCamera) {
      flags.push({ type: 'warn', text: t('exif.cameraMissing') });
    }

    if (!hasGps && !hasCamera && !hasSoftware) {
      flags.push({ type: 'info', text: t('exif.partialMetadata') });
    }

    return flags;
  };

  const processFile = async (file) => {
    if (!file) return;
    resetState();

    if (!isSupportedImageFile(file)) {
      setError(t('exif.errors.unsupported'));
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(t('exif.errors.tooLarge', { size: MAX_FILE_SIZE_MB }));
      return;
    }

    setLoading(true);
    setFileName(file.name);

    if (canRenderPreview(file)) {
      const previewReader = new FileReader();
      previewReader.onload = (event) => setImagePreview(event.target.result);
      previewReader.onerror = () => setImagePreview(null);
      previewReader.readAsDataURL(file);
    } else {
      setImagePreview(null);
      setPreviewNote(t('exif.previewUnsupported'));
    }

    try {
      const tags = await exifr.parse(file, { gps: true });

      if (tags && Object.keys(tags).length > 0) {
        setRawTags(tags);
        setExifData(simplifyTags(tags));
        setCurrentPage(1);
      } else {
        setError(t('exif.errors.exifMissing'));
      }
    } catch (err) {
      console.error('EXIF parsing error:', err);
      setError(
        t('exif.errors.parse', {
          message: err?.message || 'unknown error'
        })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event) => {
    processFile(event.target.files[0]);
    if (event.target) event.target.value = null;
  };

  const handleDragOver = (event) => event.preventDefault();

  const handleDrop = (event) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      processFile(event.dataTransfer.files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const formatKey = (key) =>
    key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());

  const handleCopyToClipboard = (text, key) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopySuccess(t('exif.copyFieldSuccess', { key: formatKey(key) }));
        setTimeout(() => setCopySuccess(''), 2000);
      })
      .catch((err) => {
        setCopySuccess(t('exif.errors.copy', { message: err.message }));
        setTimeout(() => setCopySuccess(''), 3000);
      });
  };

  const handleCopyAll = () => {
    if (!exifData) return;

    navigator.clipboard
      .writeText(JSON.stringify(exifData, null, 2))
      .then(() => {
        setCopySuccess(t('exif.copyAllSuccess'));
        setTimeout(() => setCopySuccess(''), 2000);
      })
      .catch((err) => {
        setCopySuccess(t('exif.errors.copy', { message: err.message }));
        setTimeout(() => setCopySuccess(''), 3000);
      });
  };

  const summary = buildSummary(rawTags);
  const flags = buildFlags(rawTags);
  const hasGps =
    rawTags &&
    typeof rawTags.latitude === 'number' &&
    typeof rawTags.longitude === 'number';
  const mapUrl = hasGps
    ? `https://maps.google.com/?q=${rawTags.latitude},${rawTags.longitude}`
    : null;

  const dropzoneVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3, delay: 0.1, ease: 'easeOut' }
    }
  };

  const resultsVariants = {
    initial: { opacity: 0, height: 0 },
    animate: {
      opacity: 1,
      height: 'auto',
      transition: { duration: 0.3, delay: 0.1, ease: 'easeOut' }
    },
    exit: {
      opacity: 0,
      height: 0,
      transition: { duration: 0.2, ease: 'easeIn' }
    }
  };

  const pageVariants = {
    initial: (dir) => ({
      x: dir > 0 ? 40 : -40,
      opacity: 0
    }),
    animate: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.22, ease: 'easeOut' }
    },
    exit: (dir) => ({
      x: dir > 0 ? -40 : 40,
      opacity: 0,
      transition: { duration: 0.18, ease: 'easeIn' }
    })
  };

  return (
    <div className="flex flex-col items-start space-y-4 p-1 w-full h-full overflow-hidden">
      <motion.div
        variants={dropzoneVariants}
        initial="initial"
        animate="animate"
        className="w-full h-48 border-2 border-dashed border-gray-600 hover:border-sky-400 flex flex-col items-center justify-center cursor-pointer bg-[#1E1E1E] p-4 text-center rounded-lg transition-colors duration-200"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
      >
        <UploadCloud size={40} className="text-gray-500 mb-2" />
        <p className="text-gray-300 text-sm">{t('exif.dropzone.title')}</p>
        <p className="text-xs text-gray-500 mt-1">
          (JPEG, TIFF, PNG, HEIC/HEIF, AVIF, WEBP)
        </p>
        <p className="text-xs text-gray-500">{t('exif.dropzone.orClick')}</p>
        <p className="text-[11px] text-gray-600 mt-2">
          {t('exif.dropzone.maxSize', { size: MAX_FILE_SIZE_MB })}
        </p>
        <input
          type="file"
          ref={fileInputRef}
          accept=".jpg,.jpeg,.tif,.tiff,.png,.heic,.heif,.hif,.avif,.webp,image/jpeg,image/tiff,image/png,image/heic,image/heif,image/avif,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
      </motion.div>

      {(fileName || error || loading || previewNote) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full text-xs"
        >
          {fileName && !error && (
            <p className="text-gray-400">
              {t('exif.file')}: <span className="font-medium text-sky-400">{fileName}</span>
            </p>
          )}

          {loading && (
            <div className="mt-2 p-2.5 bg-sky-900/20 text-sky-300 rounded-md flex items-center space-x-2 border border-sky-700/40">
              <UploadCloud size={16} className="animate-pulse" />
              <span>{t('exif.analyzing')}</span>
            </div>
          )}

          {previewNote && !loading && !error && (
            <div className="mt-2 p-2.5 bg-sky-900/15 text-sky-200 rounded-md flex items-center space-x-2 border border-sky-700/30">
              <AlertTriangle size={16} />
              <span>{previewNote}</span>
            </div>
          )}

          {error && (
            <div className="p-2.5 bg-red-800/30 text-red-300 rounded-md flex items-center space-x-2 border border-red-700/50">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {imagePreview && !exifData && !error && !loading && (
          <motion.div
            key="preview"
            variants={resultsVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="mt-1 p-2 bg-[#121212] rounded-md border border-gray-700 self-center"
          >
            <img
              src={imagePreview}
              alt={t('exif.preview')}
              className="max-w-xs max-h-48 sm:max-h-60 rounded object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {exifData && Object.keys(exifData).length > 0 && (
        <motion.div
          key="exif-data-container"
          variants={resultsVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full flex-1 flex flex-col overflow-hidden bg-[#1A1A1A] p-4 rounded-lg border border-gray-700/50"
        >
          <div className="flex justify-between items-center mb-3 gap-3">
            <h3 className="text-lg font-semibold text-gray-100">
              {t('exif.title', { count: Object.keys(exifData).length })}
            </h3>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyAll}
                className="px-2 py-1 text-xs rounded-md border border-gray-700 bg-[#121212] text-gray-300 hover:text-sky-300 hover:border-sky-500 transition-colors"
                title={t('exif.copyAllTitle')}
              >
                {t('exif.copyAll')}
              </button>

              {copySuccess && (
                <motion.span
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`text-xs px-2 py-1 rounded ${
                    copySuccess.includes('error') || copySuccess.includes('Ошибка')
                      ? 'bg-red-500'
                      : 'bg-green-500'
                  } text-white`}
                >
                  {copySuccess}
                </motion.span>
              )}
            </div>
          </div>

          {summary.length > 0 && (
            <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {summary.map((item) => (
                <div
                  key={item.label}
                  className="bg-[#121212] p-2.5 rounded-md border border-gray-700/70 text-xs"
                >
                  <p className="font-medium text-sky-400/80 mb-0.5">{item.label}</p>
                  <p className="text-gray-300 break-all">{String(item.value)}</p>
                </div>
              ))}
            </div>
          )}

          {flags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {flags.map((flag, index) => (
                <div
                  key={`${flag.text}-${index}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs leading-none w-fit max-w-full ${
                    flag.type === 'warn'
                      ? 'bg-amber-900/15 border-amber-700/35 text-amber-200'
                      : 'bg-sky-900/15 border-sky-700/35 text-sky-200'
                  }`}
                >
                  <AlertTriangle size={13} className="shrink-0" />
                  <span className="leading-tight break-words">{flag.text}</span>
                </div>
              ))}
            </div>
          )}

          {hasGps && mapUrl && (
            <div className="mb-3">
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md border border-sky-700/40 bg-sky-900/20 text-sky-300 hover:text-sky-200 transition-colors"
              >
                <AlertTriangle size={14} />
                {t('exif.openMap')}
              </a>
            </div>
          )}

          <div className="flex-1 overflow-y-auto pr-1 no-scrollbar">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentPage}
                custom={direction}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="grid grid-cols-1 md:grid-cols-2 gap-2"
              >
                {paginatedExif.map(([key, value]) => (
                  <div
                    key={key}
                    className="bg-[#121212] px-3 py-2 rounded-md border border-gray-700/70 text-xs min-h-[64px]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sky-400/80 mb-1 leading-tight break-words">
                          {formatKey(key)}
                        </p>
                        <p className="text-gray-300 leading-snug break-all">{String(value)}</p>
                      </div>

                      <button
                        onClick={() => handleCopyToClipboard(String(value), key)}
                        className="p-1 hover:bg-gray-700 rounded text-gray-500 hover:text-sky-300 transition-colors shrink-0"
                        title={t('exif.copyFieldTitle', { key: formatKey(key) })}
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          {totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center items-center space-x-3 pt-4 mt-auto border-t border-gray-700/50"
            >
              <button
                onClick={() => {
                  setDirection(-1);
                  setCurrentPage((page) => Math.max(1, page - 1));
                }}
                disabled={currentPage === 1}
                className="p-1.5 hover:bg-gray-700 rounded disabled:opacity-50 text-gray-400 hover:text-sky-400 focus:outline-none transition-colors"
                aria-label={t('exif.prevPage')}
              >
                <ChevronLeft size={18} />
              </button>

              <span className="text-xs text-gray-400">
                {t('exif.page', { current: currentPage, total: totalPages })}
              </span>

              <button
                onClick={() => {
                  setDirection(1);
                  setCurrentPage((page) => Math.min(totalPages, page + 1));
                }}
                disabled={currentPage === totalPages}
                className="p-1.5 hover:bg-gray-700 rounded disabled:opacity-50 text-gray-400 hover:text-sky-400 focus:outline-none transition-colors"
                aria-label={t('exif.nextPage')}
              >
                <ChevronRight size={18} />
              </button>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
