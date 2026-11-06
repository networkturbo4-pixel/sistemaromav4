import React from 'react';
import {
  WorkspacePost,
  WorkspaceTask,
  WorkspaceProject,
  WorkspaceMonth,
  WorkspaceMonthStatus,
  SocialPostPlatform,
  SocialPostFormat,
  SocialPostStatus,
  TaskStatus,
  TaskPriority,
  Client,
  User as UserType,
} from '../../../shared/types';
import {
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Share2,
} from 'lucide-react';

export interface PostTheme {
  outerBg: string;
  outerBorder: string;
  postNumberColor: string;
  headerBadgeBg: string;
  headerBadgeText: string;
  headerBadgeBorder: string;
  imageOverlayBg: string;
  imageLabel: string;
  bottomTagBg: string;
  label: string;
}

export const POST_THEMES: Record<string, PostTheme> = {
  idea: {
    outerBg: 'bg-[#FEFCE8] dark:bg-amber-950/20',
    outerBorder: 'border-[#FEF08A] dark:border-amber-800/80',
    postNumberColor: 'text-amber-700 dark:text-amber-400',
    headerBadgeBg: 'bg-amber-100/90 dark:bg-amber-950/70',
    headerBadgeText: 'text-amber-800 dark:text-amber-300',
    headerBadgeBorder: 'border-amber-300 dark:border-amber-700',
    imageOverlayBg: 'bg-amber-500',
    imageLabel: 'Borrador',
    bottomTagBg: 'bg-amber-500',
    label: 'BORRADOR',
  },
  writing: {
    outerBg: 'bg-[#FAF5FF] dark:bg-purple-950/20',
    outerBorder: 'border-[#E9D5FF] dark:border-purple-800/80',
    postNumberColor: 'text-purple-700 dark:text-purple-400',
    headerBadgeBg: 'bg-purple-100/90 dark:bg-purple-950/70',
    headerBadgeText: 'text-purple-800 dark:text-purple-300',
    headerBadgeBorder: 'border-purple-300 dark:border-purple-700',
    imageOverlayBg: 'bg-purple-600',
    imageLabel: 'En Redacción',
    bottomTagBg: 'bg-purple-600',
    label: 'REDACCIÓN',
  },
  design: {
    outerBg: 'bg-[#EEF2FF] dark:bg-indigo-950/20',
    outerBorder: 'border-[#C7D2FE] dark:border-indigo-800/80',
    postNumberColor: 'text-indigo-700 dark:text-indigo-400',
    headerBadgeBg: 'bg-indigo-100/90 dark:bg-indigo-950/70',
    headerBadgeText: 'text-indigo-800 dark:text-indigo-300',
    headerBadgeBorder: 'border-indigo-300 dark:border-indigo-700',
    imageOverlayBg: 'bg-indigo-600',
    imageLabel: 'En Diseño',
    bottomTagBg: 'bg-indigo-600',
    label: 'EN DISEÑO',
  },
  review: {
    outerBg: 'bg-[#FFF7ED] dark:bg-orange-950/20',
    outerBorder: 'border-[#FED7AA] dark:border-orange-800/80',
    postNumberColor: 'text-orange-700 dark:text-orange-400',
    headerBadgeBg: 'bg-orange-100/90 dark:bg-orange-950/70',
    headerBadgeText: 'text-orange-800 dark:text-orange-300',
    headerBadgeBorder: 'border-orange-300 dark:border-orange-700',
    imageOverlayBg: 'bg-orange-500',
    imageLabel: 'En Revisión',
    bottomTagBg: 'bg-orange-500',
    label: 'REVISIÓN',
  },
  approved: {
    outerBg: 'bg-[#EEF7FE] dark:bg-emerald-950/20',
    outerBorder: 'border-[#CDE5FC] dark:border-emerald-800/80',
    postNumberColor: 'text-blue-700 dark:text-blue-400',
    headerBadgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    headerBadgeText: 'text-emerald-700 dark:text-emerald-300',
    headerBadgeBorder: 'border-emerald-300 dark:border-emerald-700',
    imageOverlayBg: 'bg-emerald-600',
    imageLabel: 'Aprobado',
    bottomTagBg: 'bg-blue-600',
    label: 'APROBADO',
  },
  published: {
    outerBg: 'bg-[#F0FDF4] dark:bg-teal-950/20',
    outerBorder: 'border-[#BBF7D0] dark:border-teal-800/80',
    postNumberColor: 'text-teal-700 dark:text-teal-400',
    headerBadgeBg: 'bg-teal-100/90 dark:bg-teal-950/70',
    headerBadgeText: 'text-teal-800 dark:text-teal-300',
    headerBadgeBorder: 'border-teal-300 dark:border-teal-700',
    imageOverlayBg: 'bg-teal-600',
    imageLabel: 'Publicado',
    bottomTagBg: 'bg-teal-600',
    label: 'PUBLICADO',
  },
  archived: {
    outerBg: 'bg-slate-100/70 dark:bg-slate-900',
    outerBorder: 'border-slate-300 dark:border-slate-800',
    postNumberColor: 'text-slate-600 dark:text-slate-400',
    headerBadgeBg: 'bg-slate-200 dark:bg-slate-800',
    headerBadgeText: 'text-slate-700 dark:text-slate-300',
    headerBadgeBorder: 'border-slate-300 dark:border-slate-700',
    imageOverlayBg: 'bg-slate-600',
    imageLabel: 'Archivado',
    bottomTagBg: 'bg-slate-600',
    label: 'ARCHIVADO',
  },
};

export const POST_STATUS_MAP: Record<
  SocialPostStatus,
  { label: string; bg: string; text: string; next: SocialPostStatus }
> = {
  idea: {
    label: 'Idea',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-300',
    next: 'writing',
  },
  writing: {
    label: 'En Redacción',
    bg: 'bg-amber-100 dark:bg-amber-950/60',
    text: 'text-amber-700 dark:text-amber-400',
    next: 'design',
  },
  design: {
    label: 'En Diseño',
    bg: 'bg-blue-100 dark:bg-blue-950/60',
    text: 'text-blue-700 dark:text-blue-400',
    next: 'review',
  },
  review: {
    label: 'Por Aprobar',
    bg: 'bg-purple-100 dark:bg-purple-950/60',
    text: 'text-purple-700 dark:text-purple-400',
    next: 'approved',
  },
  approved: {
    label: 'Aprobado',
    bg: 'bg-emerald-100 dark:bg-emerald-950/60',
    text: 'text-emerald-700 dark:text-emerald-400',
    next: 'published',
  },
  published: {
    label: 'Publicado',
    bg: 'bg-teal-100 dark:bg-teal-950/60',
    text: 'text-teal-700 dark:text-teal-400',
    next: 'idea',
  },
};

export const TASK_STATUS_MAP: Record<
  TaskStatus,
  { label: string; bg: string; text: string; dot: string; border: string }
> = {
  pending: {
    label: 'Nuevo',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500',
    border: 'border-blue-200 dark:border-blue-900',
  },
  in_progress: {
    label: 'Pendiente / En Curso',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
    border: 'border-amber-200 dark:border-amber-900',
  },
  completed: {
    label: 'Terminado',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200 dark:border-emerald-900',
  },
  approved: {
    label: 'Aprobado',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-400',
    dot: 'bg-teal-500',
    border: 'border-teal-200 dark:border-teal-900',
  },
  in_review: {
    label: 'En Revisión',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-400',
    dot: 'bg-purple-500',
    border: 'border-purple-200 dark:border-purple-900',
  },
};

export const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Setiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const DEFAULT_MONTH_SUBFOLDERS = [
  'AUDIOVISUAL',
  'DISEÑO GRAFICO',
  'EDITABLES',
  'EXTRAS',
  'FORM',
  'POST TERMINADOS',
  'REFERENCIAS',
];

export const getPlatformIcon = (platform: SocialPostPlatform, className = 'w-3.5 h-3.5') => {
  switch (platform) {
    case 'instagram':
      return <Instagram className={`${className} text-pink-500`} />;
    case 'facebook':
      return <Facebook className={`${className} text-blue-600`} />;
    case 'linkedin':
      return <Linkedin className={`${className} text-sky-600`} />;
    case 'youtube':
      return <Youtube className={`${className} text-red-600`} />;
    case 'tiktok':
      return (
        <svg className={`${className} text-slate-800 dark:text-slate-100`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.3 6.3 0 0 0 1.87-4.49V8.5a8.28 8.28 0 0 0 4.9 1.6V6.69z" />
        </svg>
      );
    case 'x':
      return (
        <svg className={`${className} text-slate-800 dark:text-slate-100`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    default:
      return <Share2 className={`${className} text-slate-400`} />;
  }
};

export const getMonthDateDefaults = (month: number, year: number) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const startDate = `${year}-${pad(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${pad(month)}-${pad(lastDay)}`;
  const name = `${MONTH_NAMES[month - 1]} ${year}`;
  return { startDate, endDate, name };
};

export const calculateCountdown = (endDateStr: string, currentTime: number = Date.now()) => {
  if (!endDateStr) return '0d 00:00:00';
  const end = new Date(`${endDateStr}T23:59:59`).getTime();
  const diff = end - currentTime;
  if (diff <= 0) return '0d 00:00:00';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return `${days}d ${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const formatMonthDateRange = (startDateStr: string, endDateStr: string) => {
  try {
    const s = new Date(startDateStr + 'T00:00:00');
    const e = new Date(endDateStr + 'T00:00:00');
    const sDay = s.getDate().toString().padStart(2, '0');
    const eDay = e.getDate().toString().padStart(2, '0');
    const sMonth = MONTH_NAMES[s.getMonth()]?.substring(0, 3)?.toLowerCase() || '';
    const eMonth = MONTH_NAMES[e.getMonth()]?.substring(0, 3)?.toLowerCase() || '';
    const year = e.getFullYear();
    return `${sDay} ${sMonth} - ${eDay} ${eMonth} ${year}`;
  } catch {
    return `${startDateStr} - ${endDateStr}`;
  }
};

export const formatCreatedDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, '0');
    const month = MONTH_NAMES[d.getMonth()]?.substring(0, 3)?.toLowerCase() || '';
    let hours = d.getHours();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${day} ${month}, ${hours.toString().padStart(2, '0')}:${mins} ${ampm}`;
  } catch {
    return dateStr;
  }
};

export const formatChipDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const monthsEs = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Oct',
    'Nov',
    'Dic',
  ];

  if (dateStr.includes('/')) {
    const parts = dateStr.split(' ')[0].split('/');
    if (parts.length >= 2) {
      const day = parseInt(parts[0], 10);
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${day} ${monthsEs[mIdx] || ''}`.trim();
    }
  }

  if (dateStr.includes('-')) {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length >= 3) {
      const day = parseInt(parts[2], 10);
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${day} ${monthsEs[mIdx] || ''}`.trim();
    }
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return `${d.getDate()} ${monthsEs[d.getMonth()] || ''}`;
  }

  return dateStr;
};
