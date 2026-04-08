import React from 'react';
import {
  FolderCogIcon,
  ImageIcon,
  FileArchiveIcon,
  UploadIcon,
  SearchIcon,
  LayoutGridIcon,
  PlusIcon,
  RotateCcwIcon
} from 'lucide-react';
import { SidebarSection } from './BoardControls.jsx';
import { ENTITY_TYPES } from './constants';
import { getTypeMeta, getDisplayTypeLabel, getStatusMeta } from './utils';
import { useI18n } from '../i18n';

export default function BoardSidebar({
  activeSidebarSection,
  onToggleSidebarSection,
  onAddNode,
  onExportPng,
  onExportStalk,
  stalkImportInputRef,
  onImportStalk,
  onResetBoard,
  searchQuery,
  onSearchQueryChange,
  nodes,
  filteredNodes,
  selectedNodeId,
  onCenterOnNode
}) {
  const { t } = useI18n();

  return (
    <div className="w-[290px] border-r border-gray-800/80 bg-[#171717]/75 backdrop-blur-md p-4 flex flex-col gap-3 shrink-0">
      <SidebarSection
        title={t('board.sidebar.create.title')}
        subtitle={t('board.sidebar.create.subtitle')}
        icon={PlusIcon}
        open={activeSidebarSection === 'create'}
        onToggle={() => onToggleSidebarSection('create')}
      >
        <div className="grid grid-cols-2 gap-2">
          {ENTITY_TYPES.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.value}
                onClick={() => onAddNode(item.value)}
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#1b1b1b]/72 hover:bg-[#242424]/88 border border-gray-700/70 text-sm text-gray-200 transition-colors"
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{t(item.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </SidebarSection>

      <SidebarSection
        title={t('board.sidebar.objects.title')}
        subtitle={t('board.sidebar.objects.subtitle', { count: nodes.length })}
        icon={LayoutGridIcon}
        open={activeSidebarSection === 'entities'}
        onToggle={() => onToggleSidebarSection('entities')}
      >
        <div className="space-y-3">
          <div className="relative">
            <SearchIcon className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

            <input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              className="w-full bg-[#1F1F1F] border border-transparent rounded-md pl-9 pr-9 py-2.5 text-sm text-gray-200 outline-none shadow-none transition-colors hover:bg-[#242424] hover:border-transparent focus:bg-[#242424] focus:border-transparent focus:outline-none focus:ring-0 focus:ring-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-transparent"
              style={{
                boxShadow: 'none',
                outline: 'none',
                WebkitAppearance: 'none',
                appearance: 'none',
                colorScheme: 'dark'
              }}
              placeholder={t('board.sidebar.objects.searchPlaceholder')}
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md text-gray-400 hover:text-white hover:bg-[#2c2c2c]/90"
                title={t('board.sidebar.objects.clearSearch')}
              >
                ×
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-auto no-scrollbar space-y-2">
            {nodes.length === 0 && (
              <div className="text-sm text-gray-500">
                {t('board.sidebar.objects.empty')}
              </div>
            )}

            {nodes.length > 0 && filteredNodes.length === 0 && (
              <div className="text-sm text-gray-500">
                {t('board.sidebar.objects.nothingFound')}
              </div>
            )}

            {filteredNodes.map((node) => {
              const meta = getTypeMeta(node.type);
              const Icon = meta.icon;
              const active = node.id === selectedNodeId;
              const typeLabel = getDisplayTypeLabel(node, t);
              const statusMeta = getStatusMeta(node.status, t);

              return (
                <button
                  key={node.id}
                  onClick={() => onCenterOnNode(node.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-md border transition-colors ${
                    active
                      ? 'border-slate-500/70 bg-slate-500/12'
                      : 'border-gray-700/70 bg-[#1b1b1b]/70 hover:bg-[#222]/84'
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm text-white min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{node.title || typeLabel}</span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-gray-500">{typeLabel}</span>
                    {statusMeta && (
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] border ${statusMeta.className}`}
                      >
                        {statusMeta.label}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </SidebarSection>

      <SidebarSection
        title={t('board.sidebar.project.title')}
        subtitle={t('board.sidebar.project.subtitle')}
        icon={FolderCogIcon}
        open={activeSidebarSection === 'project'}
        onToggle={() => onToggleSidebarSection('project')}
      >
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={onExportPng}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-[#1b1b1b]/72 border border-gray-700/70 hover:bg-[#242424]/88 text-sm text-white"
          >
            <ImageIcon className="w-4 h-4" />
            <span>{t('board.sidebar.project.exportPng')}</span>
          </button>

          <button
            onClick={onExportStalk}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-[#1b1b1b]/72 border border-gray-700/70 hover:bg-[#242424]/88 text-sm text-white"
          >
            <FileArchiveIcon className="w-4 h-4" />
            <span>{t('board.sidebar.project.exportStalk')}</span>
          </button>

          <button
            onClick={() => stalkImportInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-[#1b1b1b]/72 border border-gray-700/70 hover:bg-[#242424]/88 text-sm text-white"
          >
            <UploadIcon className="w-4 h-4" />
            <span>{t('board.sidebar.project.importStalk')}</span>
          </button>

          <button
            onClick={onResetBoard}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-[#1b1b1b]/72 border border-gray-700/70 hover:bg-[#242424]/88 text-sm text-gray-300"
          >
            <RotateCcwIcon className="w-4 h-4" />
            <span>{t('board.sidebar.project.resetBoard')}</span>
          </button>
        </div>
      </SidebarSection>

      <input
        ref={stalkImportInputRef}
        type="file"
        accept=".stalk,.zip,application/zip"
        className="hidden"
        onChange={onImportStalk}
      />
    </div>
  );
}