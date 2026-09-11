import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDownIcon,
  Loader2Icon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardIcon
} from 'lucide-react';

export default function DomainInfo({ initialDomain, clearInitialDomain }) {
  const [domain, setDomain] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(null);
  const [checking, setChecking] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [openWhois, setOpenWhois] = useState(true);
  const [openDns, setOpenDns] = useState(false);
  const [openGeo, setOpenGeo] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const debounceRef = useRef(null);

  const containerStyle = { maxHeight: 'calc(100vh - 200px)' };

  useEffect(() => {
    if (initialDomain) {
      setDomain(initialDomain);
      setData(null);
      setError('');
      setOpenWhois(true);
      setOpenDns(false);
      setOpenGeo(false);

      if (clearInitialDomain) {
        clearInitialDomain();
      }
    }
  }, [initialDomain, clearInitialDomain]);

  useEffect(() => {
    if (!initialDomain && domain.trim() === '') {
      setData(null);
      setError('');
      setIsValid(null);
      setChecking(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    if (domain.trim() !== initialDomain || !initialDomain) {
      setData(null);
      setError('');
      setIsValid(null);
      setChecking(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const val = domain.trim();
      if (!val) return;

      if (
        /[^A-Za-z0-9.:-]/.test(val) ||
        val.endsWith('.') ||
        val.startsWith('.') ||
        val.includes('..')
      ) {
        setIsValid(false);
        return;
      }

      const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}$/;
      if (ipRegex.test(val)) {
        const parts = val.split('.').map(Number);
        const ok = parts.length === 4 && parts.every((n) => n >= 0 && n <= 255);
        setIsValid(ok);
        return;
      }

      setChecking(true);

      debounceRef.current = setTimeout(() => {
        setChecking(false);

        const domainRegex =
          /^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Zа-яА-Я]{2,63}$/;

        setIsValid(domainRegex.test(val));
      }, 500);
    }
  }, [domain, initialDomain]);

  const handleCopyToClipboard = async (textToCopy, sectionName) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess(`"${sectionName}" скопировано`);
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      setCopySuccess(`Ошибка копирования: ${err.message}`);
      setTimeout(() => setCopySuccess(''), 2500);
    }
  };

  const lookup = async () => {
    if (!isValid || loadingData) return;

    setError('');
    setLoadingData(true);
    setData(null);

    try {
      if (!window.api?.lookupDomainInfo) {
        throw new Error('Метод lookupDomainInfo не найден в preload.js');
      }

      const result = await window.api.lookupDomainInfo(domain.trim());

      if (!result?.ok) {
        throw new Error(result?.error || 'Не удалось получить данные');
      }

      setData(result.data);
      setOpenWhois(true);
      setOpenDns(false);
      setOpenGeo(false);

      const entry = {
        query: domain.trim(),
        results: result.data,
        timestamp: Date.now(),
        type: 'domainInfo'
      };

      const prevHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');

      if (
        prevHistory.length === 0 ||
        prevHistory[0].query !== entry.query ||
        prevHistory[0].type !== entry.type
      ) {
        localStorage.setItem(
          'searchHistory',
          JSON.stringify([entry, ...prevHistory.slice(0, 49)])
        );
      }
    } catch (e) {
      setError(e.message || 'Ошибка получения данных');
      setData(null);
    } finally {
      setLoadingData(false);
    }
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: -6 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.18, ease: 'easeOut' }
    },
    exit: {
      opacity: 0,
      y: -6,
      transition: { duration: 0.12, ease: 'easeIn' }
    }
  };

  const componentVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.22, ease: 'easeOut' }
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: { duration: 0.16, ease: 'easeIn' }
    }
  };

  const renderBlock = (title, isOpen, setOpen, payload, copyName) => (
    <section className="relative">
      <button
        className="w-full flex justify-between items-center py-2 focus:outline-none"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-semibold">{title}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.16 }}
        >
          <ChevronDownIcon className="w-5 h-5" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="mt-1 bg-[#121212] p-4 rounded whitespace-pre-wrap break-words text-sm relative"
          >
            <button
              onClick={() =>
                handleCopyToClipboard(
                  JSON.stringify(payload, null, 2),
                  copyName
                )
              }
              className="absolute top-2 right-2 p-1 hover:bg-gray-700 rounded focus:outline-none focus:ring-0 z-10"
              title={`Копировать ${copyName}`}
            >
              <ClipboardIcon size={16} className="text-gray-400" />
            </button>

            <pre className="overflow-x-auto">
              <code>{JSON.stringify(payload, null, 2)}</code>
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );

  return (
    <motion.div
      style={containerStyle}
      variants={componentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="mt-8 mb-8 p-6 bg-[#1E1E1E] text-white rounded-lg shadow-xl flex flex-col overflow-hidden relative"
    >
      <AnimatePresence>
        {copySuccess && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`absolute top-4 right-6 p-2 text-xs sm:text-sm rounded-md shadow-lg z-20 ${
              copySuccess.startsWith('Ошибка') ? 'bg-red-600' : 'bg-green-600'
            } text-white`}
          >
            {copySuccess}
          </motion.div>
        )}
      </AnimatePresence>

      <h3 className="text-xl font-bold mb-4">Информация о домене и IP</h3>

      <div className="flex space-x-2 mb-4 items-center">
        <div className="relative flex-1">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="Введите домен или IP"
            className="w-full pr-10 p-2 h-[40px] bg-[#2A2A2A] border border-gray-600 rounded focus:outline-none focus:ring-0 text-gray-200"
            disabled={loadingData}
          />

          <div className="absolute inset-y-0 right-3 flex items-center">
            {checking && <Loader2Icon className="w-5 h-5 animate-spin text-gray-400" />}
            {!checking && isValid === true && (
              <CheckCircleIcon className="w-5 h-5 text-green-500" />
            )}
            {!checking && isValid === false && (
              <XCircleIcon className="w-5 h-5 text-red-500" />
            )}
          </div>
        </div>

        <AnimatePresence>
          {isValid && !data && (
            <motion.button
              onClick={lookup}
              disabled={loadingData}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.16 }}
              whileHover={{ scale: !loadingData ? 1.03 : 1 }}
              whileTap={{ scale: !loadingData ? 0.97 : 1 }}
              className="h-[40px] min-w-[90px] px-4 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center justify-center focus:outline-none focus:ring-0 disabled:opacity-50"
            >
              {loadingData ? (
                <motion.div className="flex space-x-1 items-center justify-center">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      initial={{ y: 0 }}
                      animate={{ y: [-2, 2, -2] }}
                      transition={{
                        repeat: Infinity,
                        duration: 0.55,
                        delay: i * 0.12,
                        ease: 'easeInOut'
                      }}
                      className="w-1.5 h-1.5 bg-white rounded-full"
                    />
                  ))}
                </motion.div>
              ) : (
                'Найти'
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <div className="text-red-400 mb-4 p-2 bg-red-900/30 rounded text-sm">
          {error}
        </div>
      )}

      <AnimatePresence initial={false}>
        {data && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="flex-1 overflow-y-auto overflow-x-hidden space-y-6 no-scrollbar pt-2"
          >
            {renderBlock(
              'WHOIS / RDAP',
              openWhois,
              setOpenWhois,
              data.whois || {},
              'WHOIS / RDAP'
            )}

            {renderBlock(
              'DNS-записи',
              openDns,
              setOpenDns,
              data.dns || {},
              'DNS'
            )}

            {renderBlock(
              'GeoIP',
              openGeo,
              setOpenGeo,
              data.geoip || {},
              'GeoIP'
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}