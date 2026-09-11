import { useEffect, useState } from 'react';
import { useI18n } from './i18n';

export default function UpdateBanner() {
  const { t } = useI18n();
  const [state, setState] = useState({
    visible: false,
    type: null,
    version: null,
    percent: 0,
    message: ''
  });

  useEffect(() => {
    if (!window.api?.updater?.onEvent) return;

    const unsub = window.api.updater.onEvent((event) => {
      if (event.type === 'available') {
        setState({
          visible: true,
          type: 'available',
          version: event.version,
          percent: 0,
          message: ''
        });
        return;
      }

      if (event.type === 'download-progress') {
        setState((prev) => ({
          ...prev,
          visible: true,
          type: 'downloading',
          percent: Math.round(event.percent || 0)
        }));
        return;
      }

      if (event.type === 'downloaded') {
        setState((prev) => ({
          ...prev,
          visible: true,
          type: 'downloaded'
        }));
        return;
      }

      if (event.type === 'error') {
        setState({
          visible: true,
          type: 'error',
          version: null,
          percent: 0,
          message: event.message || t('updates.errorFallback')
        });
      }
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [t]);

  if (!state.visible) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] w-[360px] rounded-2xl border border-white/10 bg-black/80 backdrop-blur-md p-4 shadow-2xl">
      {state.type === 'available' && (
        <>
          <div className="text-white font-semibold">{t('updates.available.title')}</div>
          <div className="text-white/60 text-sm mt-1">
            {t('updates.available.version', {
              version: state.version || 'new'
            })}
          </div>
          <button
            className="mt-3 w-full rounded-xl bg-white text-black py-2 font-medium"
            onClick={() => window.api.updater.download()}
          >
            {t('updates.available.button')}
          </button>
        </>
      )}

      {state.type === 'downloading' && (
        <>
          <div className="text-white font-semibold">{t('updates.downloading.title')}</div>
          <div className="text-white/60 text-sm mt-1">{state.percent}%</div>
          <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-white transition-all"
              style={{ width: `${state.percent}%` }}
            />
          </div>
        </>
      )}

      {state.type === 'downloaded' && (
        <>
          <div className="text-white font-semibold">{t('updates.downloaded.title')}</div>
          <div className="text-white/60 text-sm mt-1">
            {t('updates.downloaded.description')}
          </div>
          <button
            className="mt-3 w-full rounded-xl bg-white text-black py-2 font-medium"
            onClick={() => window.api.updater.install()}
          >
            {t('updates.downloaded.button')}
          </button>
        </>
      )}

      {state.type === 'error' && (
        <>
          <div className="text-white font-semibold">{t('updates.error.title')}</div>
          <div className="text-white/60 text-sm mt-1 break-words">{state.message}</div>
        </>
      )}
    </div>
  );
}
