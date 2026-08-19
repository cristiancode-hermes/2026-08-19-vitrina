import type { TariffType } from '../entities/entities';

/** Multiplicadores sobre basePriceCents de la exposición */
export const TARIFF_MULT: Record<TariffType, number> = {
  general: 1,
  reduced: 0.7,
  child: 0.5,
  member: 0.6,
};

export const TARIFF_LABELS: Record<TariffType, string> = {
  general: 'General',
  reduced: 'Reducida',
  child: 'Infantil',
  member: 'Socio',
};

export const ADDON_CATALOG: Record<string, { label: string; unitCents: number }> = {
  audioguide: { label: 'Audioguía', unitCents: 350 },
  guided: { label: 'Visita guiada', unitCents: 800 },
};

export const POINTS_PER_TICKET = 10;
export const HOLD_MINUTES = 15;
export const MAX_QTY = 6;
export const CANCEL_HOURS_BEFORE = 24;

export function unitPrice(baseCents: number, tariff: TariffType): number {
  return Math.round(baseCents * TARIFF_MULT[tariff]);
}
