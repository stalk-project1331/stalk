import React, { useMemo, useState, useEffect } from 'react';
import {
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  TagsIcon,
  Clock3Icon,
  PaletteIcon,
  UploadIcon,
  TrashIcon,
  Link2Icon,
  LocateFixedIcon,
  TypeIcon,
  FileTextIcon,
  ImageIcon,
  SparklesIcon,
  WifiIcon,
  WifiOffIcon,
  ArrowLeftIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomSelect } from './BoardControls.jsx';
import { ENTITY_TYPES, NODE_COLORS, NODE_STATUSES } from './constants';
import {
  formatMetaDate,
  getDisplayTypeLabel,
  getNodeAccent,
  getStatusMeta
} from './utils';
import { getNodeActions } from './enrichment/actions.js';
import { useI18n } from '../i18n';

function FieldBlock({ label, children, hint = '' }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {hint ? <div className="text-[11px] text-gray-500">{hint}</div> : null}
    </div>
  );
}

function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
        active
          ? 'border-cyan-500/50 bg-cyan-500/10 text-white'
          : 'border-gray-700/70 bg-[#1A1A1A]/80 text-gray-300 hover:bg-[#202020]/90 hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function ConnectionsList({ title, emptyText, items, onCenterOnNode, t }) {
  return (
    <div className="rounded-xl border border-gray-800/80 bg-[#141414]/78 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="rounded-full border border-gray-700/70 bg-[#202020]/86 px-2 py-0.5 text-[11px] text-gray-400">
          {items.length}
        </div>
      </div>

      <div className="mt-3 space-y-2 max-h-[260px] overflow-auto no-scrollbar">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-800/80 px-3 py-4 text-center text-xs text-gray-500">
            {emptyText}
          </div>
        ) : (
          items.map(({ edge, node }) => (
            <button
              key={edge.id}
              type="button"
              onClick={() => onCenterOnNode(node.id)}
              className="w-full rounded-lg border border-gray-800/80 bg-[#1A1A1A]/76 px-3 py-2.5 text-left transition-colors hover:bg-[#222]/88"
            >
              <div className="truncate text-sm text-gray-100">
                {node.title || getDisplayTypeLabel(node, t)}
              </div>
              <div className="mt-1 truncate text-[11px] text-gray-500">
                {getDisplayTypeLabel(node, t)}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function EnrichmentValue({ label, value }) {
  const normalized =
    value === null || value === undefined || value === ''
      ? '—'
      : Array.isArray(value)
        ? value.join(', ')
        : String(value);

  return (
    <div className="rounded-lg border border-gray-800/80 bg-[#1A1A1A]/76 px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-sm text-gray-200 break-words">{normalized}</div>
    </div>
  );
}

function SuggestionsList({ suggestions, t }) {
  if (!suggestions?.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-800/80 px-3 py-4 text-center text-xs text-gray-500">
        {t('board.intelligence.suggestions.empty')}
      </div>
    );
  }

  const getSuggestionLabel = (item) => {
    if (item.labelKey) {
      return t(item.labelKey, item.labelParams || {});
    }

    if (item.label) {
      return item.label;
    }

    if (item.type === 'create-node') {
      return t('board.intelligence.suggestions.fallbackCreateNode', {
        nodeType: item.nodeType || 'node',
        value: item.value || '—'
      });
    }

    if (item.type === 'set-metadata') {
      return t('board.intelligence.suggestions.fallbackSetMetadata', {
        key: item.key || 'field',
        value: item.value || '—'
      });
    }

    return t('board.intelligence.suggestions.unknown');
  };

  const getSuggestionMeta = (item) => {
    if (item.type === 'create-node') {
      return t('board.intelligence.suggestions.metaCreateNode', {
        nodeType: item.nodeType || 'node'
      });
    }

    if (item.type === 'set-metadata') {
      return t('board.intelligence.suggestions.metaSetMetadata', {
        key: item.key || 'field'
      });
    }

    return item.type || t('board.intelligence.suggestions.unknown');
  };

  return (
    <div className="space-y-2">
      {suggestions.map((item, index) => (
        <div
          key={`${item.type}-${item.labelKey || item.label || item.value || index}-${index}`}
          className="rounded-lg border border-gray-800/80 bg-[#1A1A1A]/76 px-3 py-2.5"
        >
          <div className="text-sm text-gray-200">{getSuggestionLabel(item)}</div>
          <div className="mt-1 text-[11px] text-gray-500">
            {getSuggestionMeta(item)}
          </div>
        </div>
      ))}
    </div>
  );
}

const inputClass =
  'w-full bg-[#1F1F1F] border border-transparent rounded-lg px-3 py-2.5 text-gray-200 outline-none shadow-none transition-colors hover:bg-[#242424] hover:border-transparent focus:bg-[#242424] focus:border-transparent focus:outline-none focus:ring-0';

const textareaClass =
  'w-full resize-y bg-[#1F1F1F] border border-transparent rounded-lg px-3 py-2.5 text-gray-200 outline-none shadow-none transition-colors hover:bg-[#242424] hover:border-transparent focus:bg-[#242424] focus:border-transparent focus:outline-none focus:ring-0';

export default function BoardPropertiesPanel({
  isPropertiesOpen,
  onTogglePropertiesPanel,
  saveStatus,
  selectedNode,
  onUpdateSelectedType,
  onUpdateSelectedNode,
  selectedNodeBacklinks,
  onCenterOnNode,
  imageInputRef,
  onImageUpload,
  onDeleteNode,
  hasInternet = false,
  onRunSelectedNodeAction,
  mode = 'details',
  onOpenIntelligence,
  onBackToDetails
}) {
  const { t, intlLocale } = useI18n();

  const typeLabel = selectedNode ? getDisplayTypeLabel(selectedNode, t) : '';
  const statusMeta = selectedNode ? getStatusMeta(selectedNode.status, t) : null;
  const accent = selectedNode ? getNodeAccent(selectedNode) : '#06B6D4';
  const incomingCount = selectedNodeBacklinks?.incoming?.length || 0;
  const outgoingCount = selectedNodeBacklinks?.outgoing?.length || 0;
  const enrichment = selectedNode?.enrichment || {
    status: 'idle',
    data: {},
    suggestions: [],
    errors: []
  };

  const [activeTab, setActiveTab] = useState('main');

  useEffect(() => {
    setActiveTab('main');
  }, [selectedNode?.id]);

  const nodeActions = useMemo(() => {
    if (!selectedNode?.type) return [];
    return getNodeActions(selectedNode.type);
  }, [selectedNode?.type]);

  const tabs = useMemo(() => {
    const base = [
      { key: 'main', label: t('board.properties.sections.main'), icon: TypeIcon },
      { key: 'meta', label: t('board.properties.sections.meta'), icon: TagsIcon },
      { key: 'backlinks', label: t('board.properties.sections.backlinks'), icon: Link2Icon },
      { key: 'notes', label: t('board.properties.sections.notes'), icon: FileTextIcon },
      { key: 'appearance', label: t('board.properties.sections.appearance'), icon: PaletteIcon }
    ];

    if (selectedNode?.type === 'image') {
      base.push({
        key: 'image',
        label: t('board.properties.sections.image'),
        icon: ImageIcon
      });
    }

    return base;
  }, [selectedNode?.type, t]);

  const getActionLabel = (action) => {
    if (action.labelKey) return t(action.labelKey, action.labelParams || {});
    return action.label;
  };

  const getActionDescription = (action) => {
    if (action.descriptionKey) {
      return t(action.descriptionKey, action.descriptionParams || {});
    }
    return action.description;
  };

  const getStatusLabel = (status) => {
    return t(`board.intelligence.status.${status}`, {}, status);
  };

  const renderMainTab = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-800/80 bg-[#141414]/78 p-4 space-y-4">
        <FieldBlock label={t('board.properties.fields.type')}>
          <CustomSelect
            value={selectedNode.type}
            onChange={onUpdateSelectedType}
            options={ENTITY_TYPES.map((type) => ({
              value: type.value,
              label: t(type.labelKey)
            }))}
          />
        </FieldBlock>

        {selectedNode.type === 'custom' && (
          <FieldBlock label={t('board.properties.fields.customLabel')}>
            <input
              value={selectedNode.customLabel || ''}
              onChange={(event) =>
                onUpdateSelectedNode('customLabel', event.target.value)
              }
              className={inputClass}
              placeholder={t('board.properties.placeholders.customLabel')}
            />
          </FieldBlock>
        )}

        <FieldBlock label={t('board.properties.fields.value')}>
          <input
            value={selectedNode.title}
            onChange={(event) => onUpdateSelectedNode('title', event.target.value)}
            className={inputClass}
            placeholder={t('board.properties.placeholders.value')}
          />
        </FieldBlock>

        <FieldBlock label={t('board.properties.fields.description')}>
          <textarea
            value={selectedNode.description}
            onChange={(event) =>
              onUpdateSelectedNode('description', event.target.value)
            }
            className={`${textareaClass} min-h-[140px]`}
            placeholder={t('board.properties.placeholders.description')}
          />
        </FieldBlock>
      </div>
    </div>
  );

  const renderMetaTab = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-800/80 bg-[#141414]/78 p-4 space-y-4">
        <FieldBlock label={t('board.properties.fields.tags')}>
          <input
            value={selectedNode.tags || ''}
            onChange={(event) => onUpdateSelectedNode('tags', event.target.value)}
            className={inputClass}
            placeholder="#osint, #dns, #important"
          />
        </FieldBlock>

        <FieldBlock label={t('board.properties.fields.source')}>
          <input
            value={selectedNode.source || ''}
            onChange={(event) => onUpdateSelectedNode('source', event.target.value)}
            className={inputClass}
            placeholder={t('board.properties.placeholders.source')}
          />
        </FieldBlock>

        <div className="grid grid-cols-1 gap-3">
          <div className="rounded-xl border border-gray-800/80 bg-[#1A1A1A]/76 px-3 py-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-500">
              <Clock3Icon className="w-3.5 h-3.5" />
              <span>{t('board.properties.fields.createdAt')}</span>
            </div>
            <div className="mt-1.5 text-sm text-gray-200">
              {formatMetaDate(selectedNode.createdAt, intlLocale)}
            </div>
          </div>

          <div className="rounded-xl border border-gray-800/80 bg-[#1A1A1A]/76 px-3 py-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-gray-500">
              <Clock3Icon className="w-3.5 h-3.5" />
              <span>{t('board.properties.fields.updatedAt')}</span>
            </div>
            <div className="mt-1.5 text-sm text-gray-200">
              {formatMetaDate(selectedNode.updatedAt, intlLocale)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBacklinksTab = () => (
    <div className="space-y-4">
      <ConnectionsList
        title={t('board.properties.fields.incoming')}
        emptyText={t('board.properties.fields.incomingEmpty')}
        items={selectedNodeBacklinks.incoming}
        onCenterOnNode={onCenterOnNode}
        t={t}
      />

      <ConnectionsList
        title={t('board.properties.fields.outgoing')}
        emptyText={t('board.properties.fields.outgoingEmpty')}
        items={selectedNodeBacklinks.outgoing}
        onCenterOnNode={onCenterOnNode}
        t={t}
      />
    </div>
  );

  const renderNotesTab = () => (
    <div className="rounded-xl border border-gray-800/80 bg-[#141414]/78 p-4 space-y-3">
      <FieldBlock
        label={t('board.properties.sections.notes')}
        hint={t('board.properties.noteHint')}
      >
        <textarea
          value={selectedNode.notes || ''}
          onChange={(event) => onUpdateSelectedNode('notes', event.target.value)}
          className={`${textareaClass} min-h-[260px]`}
          placeholder={t('board.properties.placeholders.note')}
        />
      </FieldBlock>
    </div>
  );

  const renderAppearanceTab = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-800/80 bg-[#141414]/78 p-4 space-y-4">
        <FieldBlock label={t('board.properties.fields.cardColor')}>
          <div className="grid grid-cols-5 gap-2">
            {NODE_COLORS.map((colorItem) => {
              const isActive = (selectedNode.color || '') === colorItem.value;
              const label = colorItem.labelKey
                ? t(colorItem.labelKey)
                : colorItem.fallbackLabel;

              return (
                <button
                  key={colorItem.value || 'default'}
                  type="button"
                  onClick={() => onUpdateSelectedNode('color', colorItem.value)}
                  className={`h-10 rounded-lg border flex items-center justify-center text-[10px] text-gray-200 transition-all ${
                    isActive
                      ? 'border-cyan-500 ring-1 ring-cyan-500/40'
                      : 'border-gray-700/70'
                  } ${!colorItem.hex ? 'bg-[#232323]/82' : ''}`}
                  style={colorItem.hex ? { backgroundColor: colorItem.hex } : undefined}
                  title={label}
                >
                  {!colorItem.hex ? 'AUTO' : ''}
                </button>
              );
            })}
          </div>
        </FieldBlock>

        <FieldBlock label={t('board.properties.fields.status')}>
          <CustomSelect
            value={selectedNode.status || ''}
            onChange={(next) => onUpdateSelectedNode('status', next)}
            options={NODE_STATUSES.map((status) => ({
              value: status.value,
              label: t(status.labelKey)
            }))}
          />
        </FieldBlock>
      </div>
    </div>
  );

  const renderImageTab = () => (
    <div className="rounded-xl border border-gray-800/80 bg-[#141414]/78 p-4 space-y-4">
      <button
        onClick={() => imageInputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#222]/86 border border-gray-700/70 hover:bg-[#2b2b2b]/92 text-sm text-white"
      >
        <UploadIcon className="w-4 h-4" />
        <span>{t('board.properties.fields.uploadImage')}</span>
      </button>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onImageUpload}
      />

      {selectedNode.imageSrc && (
        <div className="rounded-xl border border-gray-800/80 bg-[#111]/86 p-2">
          <img
            src={selectedNode.imageSrc}
            alt={selectedNode.title || 'preview'}
            className="w-full rounded-lg border border-gray-800/80"
          />
        </div>
      )}
    </div>
  );

  const renderIntelligenceScreen = () => (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="sticky top-0 z-20 border-b border-gray-800/80 bg-[#171717]/84 backdrop-blur-md">
        <div className="p-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onBackToDetails}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-700/70 bg-[#1F1F1F]/84 px-3 py-2 text-sm text-gray-200 hover:bg-[#262626]/92"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>{t('board.intelligence.back')}</span>
            </button>

            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
                hasInternet
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-gray-700/70 bg-[#1F1F1F]/84 text-gray-400'
              }`}
            >
              {hasInternet ? (
                <WifiIcon className="w-3.5 h-3.5" />
              ) : (
                <WifiOffIcon className="w-3.5 h-3.5" />
              )}
              <span>
                {hasInternet
                  ? t('board.intelligence.internet.available')
                  : t('board.intelligence.internet.offline')}
              </span>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-gray-800/80 bg-[#141414]/78 shadow-[0_14px_34px_rgba(0,0,0,0.24)]">
            <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />

            <div className="p-3 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] leading-none text-gray-300 bg-[#252525]/86 border border-gray-700/70">
                  {typeLabel}
                </span>

                <span className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-300">
                  {getStatusLabel(enrichment.status || 'idle')}
                </span>
              </div>

              <div className="text-base font-semibold text-white break-words">
                {selectedNode.title?.trim() || typeLabel}
              </div>

              {!!selectedNode.description?.trim() && (
                <div className="text-sm text-gray-400 break-words leading-6">
                  {selectedNode.description.trim()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-4">
        <div className="rounded-xl border border-gray-800/80 bg-[#141414]/78 p-4 space-y-4">
          <div>
            <div className="text-sm font-medium text-white">
              {t('board.intelligence.actions.title')}
            </div>
            <div className="mt-1 text-[11px] text-gray-500">
              {t('board.intelligence.actions.subtitle')}
            </div>
          </div>

          <div className="space-y-2">
            {nodeActions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-800/80 px-3 py-4 text-center text-xs text-gray-500">
                {t('board.intelligence.actions.empty')}
              </div>
            ) : (
              nodeActions.map((action) => {
                const disabled =
                  enrichment.status === 'loading' ||
                  (action.mode === 'internet' && !hasInternet);

                return (
                  <button
                    key={action.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onRunSelectedNodeAction?.(action.id)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                      disabled
                        ? 'border-gray-800/80 bg-[#181818]/70 text-gray-500 cursor-not-allowed'
                        : 'border-gray-700/70 bg-[#1F1F1F]/84 text-gray-200 hover:bg-[#252525]/92'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{getActionLabel(action)}</div>
                        <div className="mt-1 text-[11px] text-gray-500">
                          {getActionDescription(action)}
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${
                          action.mode === 'local'
                            ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                            : 'border-violet-500/30 bg-violet-500/10 text-violet-300'
                        }`}
                      >
                        {t(`board.intelligence.mode.${action.mode}`)}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-800/80 bg-[#141414]/78 p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium text-white">
                {t('board.intelligence.result.title')}
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                {t('board.intelligence.result.status', {
                  status: getStatusLabel(enrichment.status || 'idle')
                })}
              </div>
            </div>

            {enrichment.lastActionId ? (
              <div className="text-[11px] text-gray-500">
                {t('board.intelligence.result.lastAction', {
                  actionId: enrichment.lastActionId
                })}
              </div>
            ) : null}
          </div>

          {enrichment.status === 'loading' ? (
            <div className="rounded-lg border border-gray-800/80 bg-[#1A1A1A]/76 px-3 py-4 text-sm text-gray-300">
              {t('board.intelligence.result.loading')}
            </div>
          ) : null}

          {enrichment.errors?.length > 0 ? (
            <div className="space-y-2">
              {enrichment.errors.slice(-2).map((errorItem, index) => (
                <div
                  key={`${errorItem.actionId}-${errorItem.at}-${index}`}
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5"
                >
                  <div className="text-sm text-red-200">{errorItem.message}</div>
                  {errorItem.actionId ? (
                    <div className="mt-1 text-[11px] text-red-300/80">
                      {t('board.intelligence.result.errorAction', {
                        actionId: errorItem.actionId
                      })}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {Object.keys(enrichment.data || {}).length === 0 ? (
            enrichment.status !== 'loading' && (
              <div className="rounded-lg border border-dashed border-gray-800/80 px-3 py-4 text-center text-xs text-gray-500">
                {t('board.intelligence.result.empty')}
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(enrichment.data).map(([key, value]) => (
                <EnrichmentValue key={key} label={key} value={value} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-800/80 bg-[#141414]/78 p-4 space-y-4">
          <div>
            <div className="text-sm font-medium text-white">
              {t('board.intelligence.suggestions.title')}
            </div>
            <div className="mt-1 text-[11px] text-gray-500">
              {t('board.intelligence.suggestions.subtitle')}
            </div>
          </div>

          <SuggestionsList suggestions={enrichment.suggestions || []} t={t} />
        </div>
      </div>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'main':
        return renderMainTab();
      case 'meta':
        return renderMetaTab();
      case 'backlinks':
        return renderBacklinksTab();
      case 'notes':
        return renderNotesTab();
      case 'appearance':
        return renderAppearanceTab();
      case 'image':
        return renderImageTab();
      default:
        return renderMainTab();
    }
  };

  return (
    <div
      className={`border-l border-gray-800/80 bg-[#171717]/75 backdrop-blur-md flex flex-col shrink-0 transition-[width] duration-200 ${
        isPropertiesOpen ? 'w-[360px]' : 'w-[56px]'
      }`}
    >
      <div className="p-2.5 border-b border-gray-800/80 flex items-center justify-between min-h-[58px]">
        <AnimatePresence initial={false}>
          {isPropertiesOpen && (
            <motion.div
              key="panel-header"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.14 }}
              className="min-w-0 pr-2"
            >
              <h3 className="text-base font-semibold text-white">
                {mode === 'intelligence'
                  ? t('board.intelligence.title')
                  : t('board.properties.title')}
              </h3>
              <div className="mt-0.5 text-[11px] text-cyan-400 truncate">{saveStatus}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={onTogglePropertiesPanel}
          className="w-9 h-9 shrink-0 rounded-md bg-[#222]/86 border border-gray-700/70 hover:bg-[#2b2b2b]/92 flex items-center justify-center text-white"
          title={
            isPropertiesOpen
              ? t('board.properties.hide')
              : t('board.properties.show')
          }
        >
          {isPropertiesOpen ? (
            <PanelRightCloseIcon className="w-4 h-4" />
          ) : (
            <PanelRightOpenIcon className="w-4 h-4" />
          )}
        </button>
      </div>

      <div className="flex-1 min-h-0 relative overflow-hidden">
        {!isPropertiesOpen ? null : (
          <motion.div
            key="panel-content"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0"
          >
            {!selectedNode ? (
              <div className="h-full p-4">
                <div className="h-full rounded-xl border border-dashed border-gray-700/80 flex items-center justify-center text-center text-gray-500 text-sm px-6">
                  {t('board.properties.empty')}
                </div>
              </div>
            ) : mode === 'intelligence' ? (
              renderIntelligenceScreen()
            ) : (
              <div className="h-full overflow-y-auto no-scrollbar">
                <div className="sticky top-0 z-20 border-b border-gray-800/80 bg-[#171717]/84 backdrop-blur-md">
                  <div className="p-3">
                    <div className="overflow-hidden rounded-2xl border border-gray-800/80 bg-[#141414]/78 shadow-[0_14px_34px_rgba(0,0,0,0.24)]">
                      <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />

                      <div className="p-3 space-y-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] leading-none text-gray-300 bg-[#252525]/86 border border-gray-700/70">
                              {typeLabel}
                            </span>

                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${
                                statusMeta
                                  ? statusMeta.className
                                  : 'border-gray-700/70 bg-[#232323]/82 text-gray-300'
                              }`}
                            >
                              {statusMeta?.label || t('board.statuses.none')}
                            </span>

                            {selectedNode?.enrichment?.status &&
                            selectedNode.enrichment.status !== 'idle' ? (
                              <span className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-300">
                                {getStatusLabel(selectedNode.enrichment.status)}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-2 text-base font-semibold text-white break-words">
                            {selectedNode.title?.trim() || typeLabel}
                          </div>

                          {!!selectedNode.description?.trim() && (
                            <div className="mt-2 text-sm text-gray-400 break-words leading-6 line-clamp-2">
                              {selectedNode.description.trim()}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-gray-800/80 bg-[#191919]/78 px-3 py-2.5">
                            <div className="text-[11px] uppercase tracking-wide text-gray-500">
                              {t('board.properties.fields.incoming')}
                            </div>
                            <div className="mt-1 text-sm font-medium text-white">
                              {incomingCount}
                            </div>
                          </div>

                          <div className="rounded-xl border border-gray-800/80 bg-[#191919]/78 px-3 py-2.5">
                            <div className="text-[11px] uppercase tracking-wide text-gray-500">
                              {t('board.properties.fields.outgoing')}
                            </div>
                            <div className="mt-1 text-sm font-medium text-white">
                              {outgoingCount}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => onCenterOnNode(selectedNode.id)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-700/70 bg-[#1F1F1F]/84 px-3 py-2 text-sm text-gray-200 hover:bg-[#262626]/92"
                          >
                            <LocateFixedIcon className="w-4 h-4" />
                            <span>{t('board.sidebar.view.center')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteNode(selectedNode.id)}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/15"
                          >
                            <TrashIcon className="w-4 h-4" />
                            <span>{t('board.properties.fields.deleteObject')}</span>
                          </button>

                          {nodeActions.length > 0 && (
                            <button
                              type="button"
                              onClick={onOpenIntelligence}
                              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/15"
                            >
                              <SparklesIcon className="w-4 h-4" />
                              <span>{t('board.intelligence.open')}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {tabs.map((tab) => (
                        <TabButton
                          key={tab.key}
                          icon={tab.icon}
                          label={tab.label}
                          active={activeTab === tab.key}
                          onClick={() => setActiveTab(tab.key)}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-3 pt-3">{renderActiveTab()}</div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}