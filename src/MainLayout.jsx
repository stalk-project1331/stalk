import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Settings from './Settings.jsx';
import Board from './Board.jsx';
import Reports from './reports.jsx';
import ExifReader from './ExifReader.jsx';
import About from './About.jsx';
import Api from './Api.jsx';
import { useI18n } from './i18n';
import {
  NetworkIcon,
  FileTextIcon,
  SettingsIcon,
  FileScanIcon,
  InfoIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  KeyRoundIcon
} from 'lucide-react';

const API_KEYS_STORAGE_KEY = 'STALK-api-keys';

const readApiKeys = () => {
  try {
    return JSON.parse(localStorage.getItem(API_KEYS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

function TitleBar() {
  return (
    <div
      className="absolute top-0 left-0 right-0 h-8"
      style={{ WebkitAppRegion: 'drag', zIndex: 1 }}
    />
  );
}

function WindowControls() {
  const { t } = useI18n();
  const btnBaseClasses =
    'flex items-center justify-center cursor-pointer rounded-full';
  const btnSize = 'w-4 h-4';
  const api = window.api || {};

  const [isFullscreen, setIsFullscreen] = useState(false);
  const syncTimerRef = useRef(null);

  useEffect(() => {
    let unsub;

    const syncFullscreenState = async () => {
      try {
        const value = await api.isFullscreen?.();
        setIsFullscreen(Boolean(value));
      } catch {
        setIsFullscreen(false);
      }
    };

    syncFullscreenState();

    if (api.onFullscreenChange) {
      unsub = api.onFullscreenChange((value) => {
        setIsFullscreen(Boolean(value));
      });
    }

    const scheduleResync = () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }

      syncTimerRef.current = setTimeout(() => {
        syncFullscreenState();
      }, 120);
    };

    const onKeyDown = (event) => {
      if (event.key === 'F11') {
        event.preventDefault();
        api.toggleFullscreen?.();
        scheduleResync();
      }

      if (event.key === 'Escape') {
        api.isFullscreen?.().then((value) => {
          if (value) {
            event.preventDefault();
            api.exitFullscreen?.();
            scheduleResync();
          }
        });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('focus', syncFullscreenState);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('focus', syncFullscreenState);

      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }

      if (typeof unsub === 'function') {
        unsub();
      }
    };
  }, []);

  return (
    <div
      className={`absolute top-1.5 right-1.5 flex space-x-1.5 transition-opacity duration-150 ${
        isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ WebkitAppRegion: 'no-drag', zIndex: 40 }}
    >
      <div
        className={`${btnBaseClasses} ${btnSize} bg-[#ffbd2e] hover:opacity-80`}
        onClick={() => api.minimize?.()}
        title={t('app.window.minimize')}
      />
      <div
        className={`${btnBaseClasses} ${btnSize} bg-[#27c93f] hover:opacity-80`}
        onClick={() => api.maximize?.()}
        title={t('app.window.maximize')}
      />
      <div
        className={`${btnBaseClasses} ${btnSize} bg-[#ff5f56] hover:opacity-80`}
        onClick={() => api.close?.()}
        title={t('app.window.close')}
      />
    </div>
  );
}

function MenuItem({ icon, label, active, onClick }) {
  return (
    <button
      className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded text-left ${
        active ? 'bg-gray-700' : 'hover:bg-gray-700/50'
      } transition-colors duration-150 ease-in-out focus:outline-none select-none`}
      onClick={onClick}
    >
      {icon}
      <span className="text-lg font-medium">{label}</span>
    </button>
  );
}

export default function MainLayout() {
  const { t } = useI18n();
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('welcome');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hasAnyApiKey, setHasAnyApiKey] = useState(false);
  const greetings = t('app.greetings');
  const [greetIndex, setGreetIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setGreetIndex(0);
  }, [greetings]);

  useEffect(() => {
    if (activeTab !== 'welcome' || !Array.isArray(greetings) || greetings.length === 0) {
      return;
    }

    const interval = setInterval(
      () => setGreetIndex((index) => (index + 1) % greetings.length),
      2900
    );

    return () => clearInterval(interval);
  }, [activeTab, greetings]);

  useEffect(() => {
    if (activeTab === 'welcome') {
      setIsSidebarOpen(true);
    }
  }, [activeTab]);

  useEffect(() => {
    const syncApiKeys = () => {
      const keys = readApiKeys();
      const hasKey = Object.values(keys).some((value) =>
        Boolean(String(value || '').trim())
      );

      setHasAnyApiKey(hasKey);

      if (!hasKey && activeTab === 'api') {
        setActiveTab('welcome');
      }
    };

    syncApiKeys();

    const onStorage = (event) => {
      if (!event.key || event.key === API_KEYS_STORAGE_KEY) {
        syncApiKeys();
      }
    };

    const onCustomChange = () => {
      syncApiKeys();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('stalk-api-keys-changed', onCustomChange);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('stalk-api-keys-changed', onCustomChange);
    };
  }, [activeTab]);

  const menuItems = useMemo(() => {
    const items = [
      {
        key: 'board',
        icon: <NetworkIcon className="text-gray-200 w-5 h-5" />,
        label: t('app.menu.board')
      },
      {
        key: 'reports',
        icon: <FileTextIcon className="text-gray-200 w-5 h-5" />,
        label: t('app.menu.reports')
      },
      {
        key: 'exif',
        icon: <FileScanIcon className="text-gray-200 w-5 h-5" />,
        label: t('app.menu.exif')
      }
    ];

    if (hasAnyApiKey) {
      items.push({
        key: 'api',
        icon: <KeyRoundIcon className="text-gray-200 w-5 h-5" />,
        label: t('app.menu.api')
      });
    }

    items.push(
      {
        key: 'settings',
        icon: <SettingsIcon className="text-gray-200 w-5 h-5" />,
        label: t('app.menu.settings')
      },
      {
        key: 'about',
        icon: <InfoIcon className="text-gray-200 w-5 h-5" />,
        label: t('app.menu.about')
      }
    );

    return items;
  }, [hasAnyApiKey, t]);

  const showSidebarToggle = activeTab !== 'welcome';

  const handleStalkLogoClick = () => {
    setActiveTab('welcome');
    setIsSidebarOpen(true);
  };

  const renderActiveComponent = () => {
    if (!loaded) return null;

    switch (activeTab) {
      case 'welcome':
        return (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex h-full items-center justify-center select-none"
          >
            <motion.div
              key={greetIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="text-gray-500 text-6xl select-none"
            >
              {Array.isArray(greetings) ? greetings[greetIndex] : 'STALK'}
            </motion.div>
          </motion.div>
        );
      case 'board':
        return <Board key="board" />;
      case 'reports':
        return <Reports key="reports" />;
      case 'exif':
        return <ExifReader key="exif" />;
      case 'api':
        return hasAnyApiKey ? <Api key="api" /> : null;
      case 'settings':
        return <Settings key="settings" />;
      case 'about':
        return <About key="about" />;
      default:
        return (
          <motion.div
            key="unknown"
            className="flex h-full items-center justify-center text-gray-500 select-none"
          >
            {t('app.errors.componentNotFound')}
          </motion.div>
        );
    }
  };

  return (
    <div className="relative flex h-screen bg-[#121212] text-gray-200 select-none overflow-hidden">
      <TitleBar />
      <WindowControls />

      <motion.div
        animate={{
          width: isSidebarOpen ? 256 : showSidebarToggle ? 56 : 256
        }}
        transition={{
          duration: 0.28,
          ease: [0.22, 1, 0.36, 1]
        }}
        className="relative shrink-0 overflow-hidden bg-[#1E1E1E]"
      >
        <div className="absolute top-0 right-0 h-full w-px bg-white/[0.03] pointer-events-none" />

        <AnimatePresence mode="wait" initial={false}>
          {isSidebarOpen ? (
            <motion.aside
              key="sidebar-open"
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="absolute inset-0 pt-10 p-4 flex flex-col"
            >
              <div
                className="text-3xl font-bold select-none mb-6 px-2 cursor-pointer"
                onClick={handleStalkLogoClick}
                title={t('app.actions.home')}
              >
                STALK
              </div>

              <div className="flex-1 space-y-1">
                {loaded && (
                  <AnimatePresence initial={false}>
                    {menuItems.map((item, index) => (
                      <motion.div
                        key={item.key}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{
                          delay: 0.04 + index * 0.035,
                          duration: 0.18,
                          ease: 'easeOut'
                        }}
                        className="w-full"
                      >
                        <MenuItem
                          icon={item.icon}
                          label={item.label}
                          active={activeTab === item.key}
                          onClick={() => setActiveTab(item.key)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>

              <AnimatePresence>
                {showSidebarToggle && (
                  <motion.div
                    key="sidebar-hide-button"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.16 }}
                    className="pt-3"
                  >
                    <button
                      onClick={() => setIsSidebarOpen(false)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-[#222] border border-gray-700 hover:bg-[#2b2b2b] text-sm text-gray-300 select-none"
                      style={{ WebkitAppRegion: 'no-drag' }}
                      title={t('app.actions.hideMenu')}
                    >
                      <PanelLeftCloseIcon className="w-4 h-4" />
                      <span>{t('app.actions.hideMenu')}</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.aside>
          ) : showSidebarToggle ? (
            <motion.div
              key="sidebar-collapsed"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="absolute inset-0 flex items-end justify-center pb-4 bg-[#171717]"
            >
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="w-10 h-10 rounded-md bg-[#222] border border-gray-700 hover:bg-[#2b2b2b] flex items-center justify-center text-gray-300"
                style={{ WebkitAppRegion: 'no-drag' }}
                title={t('app.actions.showMenu')}
              >
                <PanelLeftOpenIcon className="w-4 h-4" />
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      <motion.main
        layout
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="flex-1 p-8 pt-10 relative overflow-hidden min-w-0"
      >
        <AnimatePresence mode="wait">
          {!loaded && (
            <motion.div
              key="main-loader-overlay"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className="absolute inset-0 bg-[#121212] z-10 pointer-events-none"
            />
          )}
          {renderActiveComponent()}
        </AnimatePresence>
      </motion.main>
    </div>
  );
}
