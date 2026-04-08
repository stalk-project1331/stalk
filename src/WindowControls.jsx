import React, { useEffect, useRef, useState } from 'react';

export default function WindowControls() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInFullscreen, setShowInFullscreen] = useState(false);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    let unsub;

    if (window.api?.isFullscreen) {
      window.api.isFullscreen().then((value) => {
        setIsFullscreen(Boolean(value));
      });
    }

    if (window.api?.onFullscreenChange) {
      unsub = window.api.onFullscreenChange((value) => {
        const active = Boolean(value);
        setIsFullscreen(active);
        if (!active) {
          setShowInFullscreen(false);
        }
      });
    }

    const onKeyDown = (e) => {
      if (e.key === 'F11') {
        e.preventDefault();
        window.api?.toggleFullscreen?.();
      }

      if (e.key === 'Escape') {
        if (isFullscreen) {
          e.preventDefault();
          window.api?.exitFullscreen?.();
        }
      }
    };

    const onMouseMove = (e) => {
      if (!isFullscreen) return;

      if (e.clientY <= 14) {
        setShowInFullscreen(true);

        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
        }

        hideTimerRef.current = setTimeout(() => {
          setShowInFullscreen(false);
        }, 1800);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousemove', onMouseMove);

      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }

      if (typeof unsub === 'function') {
        unsub();
      }
    };
  }, [isFullscreen]);

  const visible = !isFullscreen || showInFullscreen;

  if (!visible) return null;

  return (
    <div
      className={`fixed top-0 right-0 z-[99999] transition-all duration-200 ${
        isFullscreen ? 'pt-2 pr-2 opacity-100' : 'pt-3 pr-3 opacity-100'
      }`}
      onMouseEnter={() => {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
        }
        if (isFullscreen) {
          setShowInFullscreen(true);
        }
      }}
      onMouseLeave={() => {
        if (isFullscreen) {
          hideTimerRef.current = setTimeout(() => {
            setShowInFullscreen(false);
          }, 500);
        }
      }}
    >
      <div className="flex items-center gap-2 rounded-xl bg-[#111111]/90 backdrop-blur-md border border-white/10 px-2 py-2 shadow-2xl">
        <button
          onClick={() => window.api.minimize()}
          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition"
          title="Свернуть"
        >
          —
        </button>

        <button
          onClick={() => window.api.maximize()}
          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition"
          title="Развернуть"
        >
          □
        </button>

        <button
          onClick={() => window.api.toggleFullscreen()}
          className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition"
          title="Полный экран (F11)"
        >
          ⛶
        </button>

        <button
          onClick={() => window.api.close()}
          className="w-8 h-8 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-sm transition"
          title="Закрыть"
        >
          ×
        </button>
      </div>
    </div>
  );
}