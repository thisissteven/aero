import {
  Book,
  Briefcase,
  Camera,
  Code,
  Database,
  FaceSmile,
  Flask,
  Globe,
  Heart,
  House,
  LayoutCells,
  Rocket,
  Shield,
  Smartphone,
  Terminal,
} from '@gravity-ui/icons';

export const ACCENT_COLORS_MAP = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  foreground: 'var(--foreground)',
  accent: 'var(--accent)',
  'accent-soft-foreground': 'var(--accent-soft-foreground)',
  custom: '#555000',
};

export const ACCENT_COLORS = [
  { id: 'success', bgClass: 'bg-success' },
  { id: 'warning', bgClass: 'bg-warning' },
  { id: 'danger', bgClass: 'bg-danger' },
  { id: 'foreground', bgClass: 'bg-foreground' },
  { id: 'accent', bgClass: 'bg-accent' },
  { id: 'accent-soft-foreground', bgClass: 'bg-accent-soft-foreground' },
] as const;

export const PROJECT_ICON_MAP = {
  code: Code,
  terminal: Terminal,
  rocket: Rocket,
  flask: Flask,
  smile: FaceSmile,
  briefcase: Briefcase,
  house: House,
  globe: Globe,
  shield: Shield,
  layout: LayoutCells,
  smartphone: Smartphone,
  database: Database,
  camera: Camera,
  book: Book,
  heart: Heart,
};

export const PROJECT_ICONS = [
  { id: 'code', icon: Code },
  { id: 'terminal', icon: Terminal },
  { id: 'rocket', icon: Rocket },
  { id: 'flask', icon: Flask },
  { id: 'smile', icon: FaceSmile },
  { id: 'briefcase', icon: Briefcase },
  { id: 'house', icon: House },
  { id: 'globe', icon: Globe },
  { id: 'shield', icon: Shield },
  { id: 'layout', icon: LayoutCells },
  { id: 'smartphone', icon: Smartphone },
  { id: 'database', icon: Database },
  { id: 'camera', icon: Camera },
  { id: 'book', icon: Book },
  { id: 'heart', icon: Heart },
];
