import React, { useState } from 'react';
import { Archive, CheckCircle2, FolderKanban, Plus, RotateCcw } from 'lucide-react';

function statusIcon(status) {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4" />;
  if (status === 'archived') return <Archive className="h-4 w-4" />;
  return <FolderKanban className="h-4 w-4" />;
}

export default function Projects({
  projects,
  activeProjectId,
  onCreate,
  onSelect,
  onStatusChange,
  onDelete,
  onRename,
  t
}) {
  const [dialog, setDialog] = useState(null);
  const [name, setName] = useState('');
  const [contextMenu, setContextMenu] = useState(null);

  const openCreate = () => {
    setContextMenu(null);
    setName('');
    setDialog({ type: 'create' });
  };

  const openRename = (project) => {
    setContextMenu(null);
    setName(project.name);
    setDialog({ type: 'rename', project });
  };

  const submitDialog = (event) => {
    event.preventDefault();
    const value = name.trim();
    if (!value) return;
    if (dialog.type === 'create') onCreate(value);
    else onRename(dialog.project.id, value);
    setDialog(null);
  };

  return (
    <section className="relative flex h-full w-full flex-col overflow-hidden" onClick={() => setContextMenu(null)}>
      <div className="welcome-particles projects-particles absolute inset-0 pointer-events-none" />
      <div className="welcome-particles welcome-particles-drift projects-particles-drift absolute inset-0 pointer-events-none" />
      <header className="relative z-10 mx-auto flex w-full max-w-5xl shrink-0 items-end justify-between gap-4 border-b border-white/[0.07] pb-6">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-gray-500">
            {t('app.projects.workspace')}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {t('app.projects.title')}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {projects.length} {t('app.projects.count')}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-white/[0.08] px-4 py-2.5 text-sm text-gray-200 transition-colors hover:bg-white/[0.14]"
        >
          <Plus className="h-4 w-4" />
          {t('app.projects.newCase')}
        </button>
      </header>

      <div className="relative z-10 mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-y-auto py-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((project) => {
            const isActive = project.id === activeProjectId;
            return (
              <article
                key={project.id}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setContextMenu({ x: event.clientX, y: event.clientY, project });
                }}
                className={`rounded-xl border p-4 transition-colors ${
                  isActive
                    ? 'border-white/[0.16] bg-white/[0.07]'
                    : 'border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.05]'
                }`}
              >
                <button onClick={() => onSelect(project.id)} className="w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/20 text-gray-400">
                        {statusIcon(project.status)}
                      </span>
                      <span className="truncate text-sm font-medium text-white">{project.name}</span>
                    </div>
                    <span className="shrink-0 rounded-full bg-black/20 px-2 py-1 text-[10px] tracking-wide text-gray-400">
                      {t(`app.projects.status.${project.status}`)}
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-gray-500">
                    {t('app.projects.updated')}: {new Date(project.updatedAt).toLocaleString()}
                  </p>
                </button>
                <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
                  {isActive && (
                    <span className="text-[11px] text-gray-500">{t('app.projects.current')}</span>
                  )}
                  {!isActive && <span />}
                  {project.status !== 'archived' && (
                    <button
                      onClick={() =>
                        onStatusChange(
                          project.id,
                          project.status === 'completed' ? 'archived' : 'completed'
                        )
                      }
                      className="flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-white"
                    >
                      {project.status === 'completed' ? (
                        <Archive className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      {project.status === 'completed'
                        ? t('app.projects.archive')
                        : t('app.projects.markCompleted')}
                    </button>
                  )}
                  {project.status === 'archived' && (
                    <button
                      onClick={() => onStatusChange(project.id, 'active')}
                      className="flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-white"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {t('app.projects.restore')}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
      {contextMenu && (
        <div
          className="fixed z-[100] min-w-44 overflow-hidden rounded-lg border border-white/[0.12] bg-[#1b1b1b] py-1 shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button onClick={() => openRename(contextMenu.project)} className="block w-full px-3 py-2 text-left text-xs text-gray-200 hover:bg-white/[0.08]">
            {t('app.projects.rename')}
          </button>
          <button onClick={() => { setContextMenu(null); onDelete(contextMenu.project.id); }} className="block w-full px-3 py-2 text-left text-xs text-red-300 hover:bg-red-500/10">
            {t('app.projects.delete')}
          </button>
        </div>
      )}
      {dialog && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4" onClick={() => setDialog(null)}>
          <form className="w-full max-w-sm rounded-xl border border-white/[0.12] bg-[#181818] p-5 shadow-2xl" onSubmit={submitDialog} onClick={(event) => event.stopPropagation()}>
            <h2 className="text-base font-semibold text-white">
              {dialog.type === 'create' ? t('app.projects.newCase') : t('app.projects.rename')}
            </h2>
            <input autoFocus value={name} onChange={(event) => setName(event.target.value)} className="mt-4 w-full rounded-lg border border-white/[0.12] bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-white/30" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setDialog(null)} className="rounded-lg px-3 py-2 text-xs text-gray-400 hover:bg-white/[0.06]">{t('app.projects.cancel')}</button>
              <button type="submit" className="rounded-lg bg-white/[0.1] px-3 py-2 text-xs text-white hover:bg-white/[0.16]">{t('app.projects.save')}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
