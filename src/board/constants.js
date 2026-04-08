import {
  UserIcon,
  SearchIcon,
  MailIcon,
  PhoneIcon,
  GlobeIcon,
  NetworkIcon,
  MapPinIcon,
  Building2Icon,
  CalendarIcon,
  ListTodoIcon,
  LightbulbIcon,
  ImageIcon,
  FileTextIcon,
  LayoutGridIcon
} from 'lucide-react';

export const STORAGE_KEY = 'stalk_board_session_v18';
export const EXPORT_PADDING = 80;

export const ENTITY_TYPES = [
  { value: 'person', labelKey: 'board.entities.person', fallbackLabel: 'Person', icon: UserIcon },
  { value: 'username', labelKey: 'board.entities.username', fallbackLabel: 'Username', icon: SearchIcon },
  { value: 'email', labelKey: 'board.entities.email', fallbackLabel: 'Email', icon: MailIcon },
  { value: 'phone', labelKey: 'board.entities.phone', fallbackLabel: 'Phone', icon: PhoneIcon },
  { value: 'domain', labelKey: 'board.entities.domain', fallbackLabel: 'Domain', icon: GlobeIcon },
  { value: 'ip', labelKey: 'board.entities.ip', fallbackLabel: 'IP', icon: NetworkIcon },
  { value: 'location', labelKey: 'board.entities.location', fallbackLabel: 'Location', icon: MapPinIcon },
  { value: 'company', labelKey: 'board.entities.company', fallbackLabel: 'Company', icon: Building2Icon },
  { value: 'event', labelKey: 'board.entities.event', fallbackLabel: 'Event', icon: CalendarIcon },
  { value: 'task', labelKey: 'board.entities.task', fallbackLabel: 'Task', icon: ListTodoIcon },
  { value: 'fact', labelKey: 'board.entities.fact', fallbackLabel: 'Fact', icon: LightbulbIcon },
  { value: 'image', labelKey: 'board.entities.image', fallbackLabel: 'Image', icon: ImageIcon },
  { value: 'note', labelKey: 'board.entities.note', fallbackLabel: 'Note', icon: FileTextIcon },
  { value: 'custom', labelKey: 'board.entities.custom', fallbackLabel: 'Custom', icon: LayoutGridIcon }
];

export const NODE_COLORS = [
  { value: '', labelKey: 'board.colors.byType', fallbackLabel: 'By type', hex: null },
  { value: '#3B82F6', fallbackLabel: 'Blue', hex: '#3B82F6' },
  { value: '#8B5CF6', fallbackLabel: 'Violet', hex: '#8B5CF6' },
  { value: '#10B981', fallbackLabel: 'Emerald', hex: '#10B981' },
  { value: '#F59E0B', fallbackLabel: 'Amber', hex: '#F59E0B' },
  { value: '#06B6D4', fallbackLabel: 'Cyan', hex: '#06B6D4' },
  { value: '#EF4444', fallbackLabel: 'Red', hex: '#EF4444' },
  { value: '#14B8A6', fallbackLabel: 'Teal', hex: '#14B8A6' },
  { value: '#EAB308', fallbackLabel: 'Yellow', hex: '#EAB308' },
  { value: '#EC4899', fallbackLabel: 'Pink', hex: '#EC4899' },
  { value: '#9CA3AF', fallbackLabel: 'Gray', hex: '#9CA3AF' }
];

export const NODE_STATUSES = [
  { value: '', labelKey: 'board.statuses.none', fallbackLabel: 'No status' },
  { value: 'new', labelKey: 'board.statuses.new', fallbackLabel: 'New' },
  { value: 'in_progress', labelKey: 'board.statuses.in_progress', fallbackLabel: 'In progress' },
  { value: 'verified', labelKey: 'board.statuses.verified', fallbackLabel: 'Verified' },
  { value: 'warning', labelKey: 'board.statuses.warning', fallbackLabel: 'Risk' },
  { value: 'done', labelKey: 'board.statuses.done', fallbackLabel: 'Done' },
  { value: 'archived', labelKey: 'board.statuses.archived', fallbackLabel: 'Archived' }
];
