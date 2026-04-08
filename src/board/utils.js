import { ENTITY_TYPES, EXPORT_PADDING } from './constants';

export function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getTypeMeta(type) {
  return ENTITY_TYPES.find((item) => item.value === type) || ENTITY_TYPES[0];
}

export function getTypeLabel(type, t) {
  const meta = getTypeMeta(type);
  return t ? t(meta.labelKey) : meta.fallbackLabel;
}

export function getNodeSize(type) {
  if (type === 'image') {
    return { width: 280, height: 240 };
  }

  if (type === 'note') {
    return { width: 280, height: 190 };
  }

  if (type === 'task') {
    return { width: 240, height: 140 };
  }

  return { width: 220, height: 110 };
}

export function getNodeMinWidth(type) {
  return type === 'image' ? 240 : type === 'note' ? 240 : 180;
}

export function getNodeMinHeight(type) {
  return type === 'image' ? 190 : type === 'note' ? 130 : 110;
}

export function createNode(type = 'person', x = 120, y = 120) {
  const now = Date.now();
  const size = getNodeSize(type);

  return {
    id: makeId(),
    type,
    title: '',
    description: '',
    notes: '',
    tags: '',
    source: '',
    imageSrc: '',
    x,
    y,
    width: size.width,
    height: size.height,
    color: '',
    status: '',
    customLabel: '',
    createdAt: now,
    updatedAt: now
  };
}

export function normalizeNode(node) {
  const now = Date.now();

  return {
    notes: '',
    tags: '',
    source: '',
    color: '',
    status: '',
    customLabel: '',
    createdAt: node?.createdAt || now,
    updatedAt: node?.updatedAt || node?.createdAt || now,
    ...node
  };
}

export function formatMetaDate(value, intlLocale = 'en-US') {
  if (!value) return '—';

  try {
    return new Date(value).toLocaleString(intlLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
}

export function getTypeAccent(type) {
  switch (type) {
    case 'person':
      return '#3B82F6';
    case 'username':
      return '#8B5CF6';
    case 'email':
      return '#10B981';
    case 'phone':
      return '#F59E0B';
    case 'domain':
      return '#06B6D4';
    case 'ip':
      return '#EF4444';
    case 'location':
      return '#14B8A6';
    case 'company':
      return '#6366F1';
    case 'event':
      return '#F97316';
    case 'task':
      return '#22C55E';
    case 'fact':
      return '#EAB308';
    case 'image':
      return '#EC4899';
    case 'note':
      return '#9CA3AF';
    case 'custom':
      return '#A855F7';
    default:
      return '#9CA3AF';
  }
}

export function getNodeAccent(node) {
  return node.color || getTypeAccent(node.type);
}

export function getGraphBounds(nodes) {
  if (!nodes.length) {
    return {
      minX: 0,
      minY: 0,
      maxX: 800,
      maxY: 600,
      width: 800,
      height: 600
    };
  }

  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxX = Math.max(...nodes.map((node) => node.x + node.width));
  const maxY = Math.max(...nodes.map((node) => node.y + node.height));

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(800, maxX - minX + EXPORT_PADDING * 2),
    height: Math.max(600, maxY - minY + EXPORT_PADDING * 2)
  };
}

export function getStatusMeta(status, t) {
  switch (status) {
    case 'new':
      return {
        label: t ? t('board.statuses.new') : 'New',
        className: 'bg-sky-500/10 text-sky-300 border-sky-500/30'
      };
    case 'in_progress':
      return {
        label: t ? t('board.statuses.in_progress') : 'In progress',
        className: 'bg-violet-500/10 text-violet-300 border-violet-500/30'
      };
    case 'verified':
      return {
        label: t ? t('board.statuses.verified') : 'Verified',
        className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
      };
    case 'warning':
      return {
        label: t ? t('board.statuses.warning') : 'Risk',
        className: 'bg-red-500/10 text-red-300 border-red-500/30'
      };
    case 'done':
      return {
        label: t ? t('board.statuses.done') : 'Done',
        className: 'bg-lime-500/10 text-lime-300 border-lime-500/30'
      };
    case 'archived':
      return {
        label: t ? t('board.statuses.archived') : 'Archived',
        className: 'bg-gray-500/10 text-gray-300 border-gray-500/30'
      };
    default:
      return null;
  }
}

export function getDisplayTypeLabel(node, t) {
  if (node.type === 'custom' && node.customLabel?.trim()) {
    return node.customLabel.trim();
  }

  return getTypeLabel(node.type, t);
}
