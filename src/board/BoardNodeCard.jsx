import React, { memo } from 'react';
import { Link2Icon, TrashIcon, GripIcon } from 'lucide-react';
import {
  getTypeMeta,
  getStatusMeta,
  getDisplayTypeLabel,
  getNodeAccent
} from './utils';
import { useI18n } from '../i18n';

function BoardNodeCardComponent({
  node,
  forExport = false,
  isExportingPng = false,
  selectedNodeId,
  linkStartId,
  onNodeMouseDown,
  onLinkModeClick,
  onDeleteNode,
  onNodeResizeStart
}) {
  const { t } = useI18n();
  const meta = getTypeMeta(node.type);
  const Icon = meta.icon;
  const isSelected = selectedNodeId === node.id;
  const isLinkStart = linkStartId === node.id;
  const statusMeta = getStatusMeta(node.status, t);
  const typeLabel = getDisplayTypeLabel(node, t);
  const accent = getNodeAccent(node);
  const tags = String(node.tags || '')
    .split(/[\n,]/)
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean)
    .slice(0, 3);
  const previewText =
    node.description?.trim() || node.notes?.trim() || t('board.card.noDescription');

  const subtleSelectedStyle =
    isSelected && !forExport && !isExportingPng
      ? {
          borderColor: 'rgba(100,116,139,0.72)',
          boxShadow: '0 0 0 1px rgba(100,116,139,0.18), 0 14px 34px rgba(0,0,0,0.36)'
        }
      : undefined;

  const controlsVisibilityClass =
    isSelected || forExport || isExportingPng
      ? 'opacity-100 translate-y-0'
      : 'opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0';

  const resizeVisibilityClass =
    isSelected || forExport || isExportingPng
      ? 'opacity-100 scale-100'
      : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100';

  return (
    <div
      data-node-card="true"
      onMouseDown={!forExport ? (event) => onNodeMouseDown?.(event, node.id) : undefined}
      className={`group absolute rounded-xl border shadow-md select-none bg-[#1C1C1C] overflow-hidden ${
        !forExport
          ? 'board-card-enter pointer-events-auto cursor-grab active:cursor-grabbing transition-[box-shadow,border-color,background-color] duration-200 hover:border-gray-700/90 hover:shadow-[0_20px_48px_rgba(0,0,0,0.42)]'
          : ''
      } ${!isSelected || forExport || isExportingPng ? 'border-gray-800' : ''}`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        ...subtleSelectedStyle
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.018)_28%,rgba(255,255,255,0)_100%)]" />
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full blur-2xl opacity-20"
        style={{ backgroundColor: accent }}
      />

      <div
        className="relative h-1.5 w-full rounded-t-lg shrink-0"
        style={{ backgroundColor: accent }}
      />

      <div className="relative p-3 h-[calc(100%-6px)] flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-[#262626]/90 flex items-center justify-center shrink-0 border border-gray-700/80 mt-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <Icon className="w-4 h-4 text-gray-200" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white truncate leading-5">
                {node.title || typeLabel}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] leading-none text-gray-300 bg-[#252525] border border-gray-700">
                  {typeLabel}
                </span>

                {statusMeta && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] leading-none border ${statusMeta.className}`}
                  >
                    {statusMeta.label}
                  </span>
                )}

                {tags.length > 0 && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] leading-none text-gray-300 bg-[#1f2630] border border-[#2f3946]">
                    {tags[0]}
                    {tags.length > 1 ? ` +${tags.length - 1}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {!forExport && (
            <div
              className={`flex items-center gap-1 shrink-0 transition-all duration-150 ${controlsVisibilityClass}`}
            >
              <button
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onLinkModeClick?.(node.id);
                }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                  isLinkStart
                    ? 'bg-slate-500/10 border-slate-500'
                    : 'bg-[#232323] border-gray-700 hover:bg-[#2c2c2c] hover:border-gray-600'
                }`}
                title={t('board.card.link')}
              >
                <Link2Icon className="w-4 h-4 text-gray-200" />
              </button>

              <button
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteNode?.(node.id);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#232323] border border-gray-700 hover:bg-red-600/15 hover:border-red-500/40 transition-colors"
                title={t('board.card.delete')}
              >
                <TrashIcon className="w-4 h-4 text-gray-200" />
              </button>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto pr-1 no-scrollbar">
          {node.type === 'image' && node.imageSrc ? (
            <div>
              <img
                src={node.imageSrc}
                alt={node.title || 'image'}
                draggable={false}
                className="w-full h-[140px] object-cover rounded-md border border-gray-800 pointer-events-none select-none"
                style={{
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  WebkitUserDrag: 'none',
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden'
                }}
              />
              <div className="mt-3 text-xs text-gray-400 break-words whitespace-pre-wrap leading-6">
                {previewText}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-gray-400 break-words whitespace-pre-wrap leading-6">
                {previewText}
              </div>

              {!!node.notes?.trim() && !!node.description?.trim() && (
                <div className="text-[11px] text-gray-500 break-words whitespace-pre-wrap leading-5 border-t border-gray-800 pt-2">
                  {node.notes.trim()}
                </div>
              )}
            </div>
          )}
        </div>

        {!forExport && (
          <button
            type="button"
            data-node-resize-handle="true"
            onMouseDown={(event) => onNodeResizeStart?.(event, node.id)}
            className={`absolute right-1.5 bottom-1.5 w-5 h-5 rounded-md bg-[#232323]/90 border border-gray-700 hover:bg-[#2c2c2c] hover:border-gray-600 cursor-se-resize flex items-center justify-center transition-all duration-150 ${resizeVisibilityClass}`}
            title={t('board.card.resize')}
          >
            <GripIcon className="w-3.5 h-3.5 text-gray-400 rotate-45" />
          </button>
        )}
      </div>
    </div>
  );
}

const BoardNodeCard = memo(BoardNodeCardComponent);

export default BoardNodeCard;