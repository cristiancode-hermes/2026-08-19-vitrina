export type UserRole = 'visitor' | 'admin';
export type ExhibitionType = 'permanent' | 'temporary';
export type TicketStatus = 'pending' | 'confirmed' | 'used' | 'cancelled' | 'expired';
export type TariffType = 'general' | 'reduced' | 'child' | 'member';
export type SlotAvailability = 'free' | 'low' | 'full';

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  points: number;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface ExhibitionListItem {
  id: number;
  title: string;
  summary: string;
  type: ExhibitionType;
  startsOn: string | null;
  endsOn: string | null;
  coverHue: string;
  hall: string;
  basePriceCents: number;
  featured: boolean;
  freeSeatsToday: number;
}

export interface Artwork {
  id: number;
  exhibitionId: number;
  title: string;
  artist: string;
  yearLabel: string | null;
  technique: string | null;
  room: string | null;
  curatorialNote: string;
  coverHue: string;
  tags: string[];
  exhibition?: { id: number; title: string; type: ExhibitionType; hall: string } | null;
}

export interface Slot {
  id: number;
  exhibitionId: number;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  reservedCount: number;
  freeSeats: number;
  availability: SlotAvailability;
}

export interface Tariff {
  tariff: TariffType;
  label: string;
  unitPriceCents: number;
}

export interface ExhibitionDetail extends ExhibitionListItem {
  description: string;
  artworks: Artwork[];
  slots: Slot[];
  tariffs: Tariff[];
  selectedDate: string;
}

export interface TicketLine {
  id: number;
  tariff: TariffType;
  label: string;
  qty: number;
  unitPriceCents: number;
  subtotalCents: number;
}

export interface TicketAddOn {
  code: string;
  label: string;
  unitCents: number;
  qty: number;
}

export interface TicketListItem {
  id: number;
  status: TicketStatus;
  totalCents: number;
  linesTotalCents: number;
  quantity: number;
  code: string | null;
  expiresAt: string | null;
  createdAt: string | null;
  exhibition: { id: number; title: string; coverHue: string } | null;
  slot: { id: number; date: string; startTime: string; endTime: string } | null;
}

export interface TicketDetail extends TicketListItem {
  qrToken: string | null;
  confirmedAt: string | null;
  addOns: TicketAddOn[];
  lines: TicketLine[];
  qrSvg: string | null;
}

export interface Review {
  id: number;
  rating: number;
  body: string;
  createdAt: string;
  user?: { id: number; name: string; username: string };
}

export interface AdminStats {
  kpis: {
    revenueCents: number;
    visitors: number;
    confirmedTickets: number;
    pendingHolds: number;
    exhibitions: number;
  };
  revenueSeries: { date: string; tickets: number; revenueCents: number; visitors: number }[];
  occupancyToday: {
    slotId: number;
    exhibitionTitle: string;
    startTime: string;
    capacity: number;
    reservedCount: number;
    occupancyPct: number;
  }[];
  byExhibition: { id: number; title: string; visitors: number; revenueCents: number }[];
}

export interface AdminExhibition {
  id: number;
  title: string;
  type: ExhibitionType;
  published: boolean;
  featured: boolean;
  basePriceCents: number;
  startsOn: string | null;
  endsOn: string | null;
  hall: string;
}

export const TARIFF_ORDER: TariffType[] = ['general', 'reduced', 'child', 'member'];

export const ADDON_OPTIONS = [
  { code: 'audioguide', label: 'Audioguía', unitCents: 350 },
  { code: 'guided', label: 'Visita guiada', unitCents: 800 },
] as const;

export const STATUS_LABELS: Record<TicketStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  used: 'Usada',
  cancelled: 'Cancelada',
  expired: 'Expirada',
};
