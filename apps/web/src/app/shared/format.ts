import type { TicketStatus } from './models';
import { STATUS_LABELS } from './models';

export function eur(cents: number | null | undefined): string {
  const n = (cents ?? 0) / 100;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(n);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  // YYYY-MM-DD or full ISO
  const d = iso.length <= 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = iso.length <= 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function statusLabel(s: TicketStatus): string {
  return STATUS_LABELS[s] || s;
}

export function statusBadgeClass(s: TicketStatus): string {
  switch (s) {
    case 'confirmed':
      return 'badge badge-success';
    case 'pending':
      return 'badge badge-warning';
    case 'used':
      return 'badge badge-primary';
    case 'cancelled':
    case 'expired':
      return 'badge badge-danger';
    default:
      return 'badge';
  }
}

export function typeLabel(t: string): string {
  return t === 'permanent' ? 'Permanente' : t === 'temporary' ? 'Temporal' : t;
}

export function coverHueStyle(hue: string): string {
  // API stores like "160 30% 40%" for hsl components
  if (!hue) return '160 30% 40%';
  if (hue.includes('hsl') || hue.startsWith('#')) return hue;
  return hue;
}

export function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

/** Abstract base so pages can use format helpers in templates */
export abstract class FormatBase {
  readonly eur = eur;
  readonly formatDate = formatDate;
  readonly formatDateShort = formatDateShort;
  readonly formatDateTime = formatDateTime;
  readonly statusLabel = statusLabel;
  readonly statusBadgeClass = statusBadgeClass;
  readonly typeLabel = typeLabel;
  readonly mmss = mmss;
  readonly coverHueStyle = coverHueStyle;
}
