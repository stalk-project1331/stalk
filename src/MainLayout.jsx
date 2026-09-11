import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Settings from './Settings.jsx';
import Board from './Board.jsx';
import ExifReader from './ExifReader.jsx';
import About from './About.jsx';
import Projects from './Projects.jsx';
import { useI18n } from './i18n';
import {
  NetworkIcon,
  SettingsIcon,
  FileScanIcon,
  InfoIcon,
  FolderKanbanIcon
} from 'lucide-react';
import {
  createProject,
  getActiveProjectId,
  readProjects,
  setActiveProjectId,
  updateProject,
  deleteProject,
  renameProject
} from './projectStore';

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
      className={`flex h-12 w-12 items-center justify-center rounded-lg ${
        active ? 'text-white' : 'text-gray-300 hover:bg-gray-700/60'
      } transition-colors duration-150 ease-in-out focus:outline-none select-none`}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
}

export default function MainLayout() {
  const { t } = useI18n();
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('welcome');
  const [projects, setProjects] = useState(readProjects);
  const [activeProjectId, setActiveProjectIdState] = useState(getActiveProjectId);
  const greetings = t('app.greetings');
  const [greetIndex, setGreetIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const syncProjects = () => {
      setProjects(readProjects());
      setActiveProjectIdState(getActiveProjectId());
    };
    window.addEventListener('stalk-project-changed', syncProjects);
    return () => window.removeEventListener('stalk-project-changed', syncProjects);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      const active = readProjects().find((project) => project.id === getActiveProjectId());
      if (active?.status === 'active') {
        event.preventDefault();
        event.returnValue = t('app.projects.leavePrompt');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [t]);

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

  const menuItems = useMemo(() => {
    const items = [
      {
        key: 'board',
        icon: <NetworkIcon className="text-gray-200 w-5 h-5" />,
        label: t('app.menu.board')
      },
      {
        key: 'exif',
        icon: <FileScanIcon className="text-gray-200 w-5 h-5" />,
        label: t('app.menu.exif')
      }
    ];

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
  }, [t]);

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
            className="relative flex h-full items-center justify-center overflow-hidden select-none"
          >
            <div className="welcome-particles absolute inset-0 pointer-events-none" />
            <div className="welcome-particles welcome-particles-drift absolute inset-0 pointer-events-none" />
            <motion.div
              key={greetIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="relative z-10 text-gray-500 text-6xl select-none"
            >
              {Array.isArray(greetings) ? greetings[greetIndex] : 'STALK'}
            </motion.div>
          </motion.div>
        );
      case 'board':
        return <Board key="board" />;
      case 'projects':
        return (
          <Projects
            key="projects"
            projects={projects}
            activeProjectId={activeProjectId}
            onCreate={(name) => {
              const project = createProject(name);
              setActiveProjectIdState(project.id);
              setProjects(readProjects());
            }}
            onSelect={(id) => {
              const active = projects.find((project) => project.id === activeProjectId);
              if (active?.status === 'active' && id !== activeProjectId &&
                  !window.confirm(t('app.projects.switchPrompt'))) return;
              if (active?.status === 'active' && id !== activeProjectId) {
                updateProject(activeProjectId, { status: 'completed' });
              }
              setActiveProjectId(id);
              setActiveProjectIdState(id);
              setActiveTab('board');
            }}
            onStatusChange={(id, status) => {
              updateProject(id, { status });
              setProjects(readProjects());
            }}
            onDelete={(id) => {
              if (!window.confirm(t('app.projects.deletePrompt'))) return;
              try {
                const deleted = deleteProject(id);
                if (!deleted) {
                  window.alert(t('app.projects.deleteError'));
                  return;
                }
              } catch (error) {
                console.error('Case deletion error:', error);
                window.alert(t('app.projects.deleteError'));
                return;
              }
              setProjects(readProjects());
              setActiveProjectIdState(getActiveProjectId());
            }}
            onRename={(id, name) => {
              renameProject(id, name);
              setProjects(readProjects());
            }}
            t={t}
          />
        );
      case 'exif':
        return <ExifReader key="exif" />;
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
    <div className="app-shell relative flex h-screen overflow-hidden rounded-[18px] bg-[#121212] text-gray-200 select-none">
      <TitleBar />
      <WindowControls />
      <motion.main
        layout
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="relative min-w-0 flex-1 overflow-hidden p-8 pb-20 pt-10"
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

      <nav
        className="absolute bottom-0 left-0 right-0 z-30 flex h-20 items-center justify-center gap-1 bg-transparent px-4"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        {loaded &&
                menuItems.map((item, index) => (
                  <motion.div
                    key={item.key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ delay: 0.03 + index * 0.035, duration: 0.16 }}
                  >
                    <MenuItem
                      icon={item.icon}
                      label={item.label}
                      active={activeTab === item.key}
                      onClick={() => setActiveTab(item.key)}
                    />
                  </motion.div>
                ))}
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${
            activeTab === 'projects' ? 'text-white' : 'text-gray-300 hover:bg-gray-700/60'
          }`}
          title={t('app.projects.title')}
          aria-label={t('app.projects.title')}
        >
          <FolderKanbanIcon className="h-5 w-5" />
        </button>
      </nav>
    </div>
  );
}
