import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type {
  AdminExhibition,
  AdminStats,
  Artwork,
  AuthResponse,
  ExhibitionDetail,
  ExhibitionListItem,
  Review,
  TicketDetail,
  TicketListItem,
  User,
} from '../shared/models';
import type { TariffType } from '../shared/models';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // Auth
  login(identifier: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API}/auth/login`, { identifier, password });
  }

  register(body: {
    username: string;
    email: string;
    name: string;
    password: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API}/auth/register`, body);
  }

  profile(): Observable<User> {
    return this.http.get<User>(`${API}/auth/profile`);
  }

  // Exhibitions
  listExhibitions(q: {
    type?: string;
    search?: string;
    featured?: string;
    withSlotsToday?: string;
    maxPriceCents?: string | number;
  } = {}): Observable<ExhibitionListItem[]> {
    let params = new HttpParams();
    if (q.type) params = params.set('type', q.type);
    if (q.search) params = params.set('search', q.search);
    if (q.featured) params = params.set('featured', String(q.featured));
    if (q.withSlotsToday) params = params.set('withSlotsToday', String(q.withSlotsToday));
    if (q.maxPriceCents != null && q.maxPriceCents !== '') {
      params = params.set('maxPriceCents', String(q.maxPriceCents));
    }
    return this.http.get<ExhibitionListItem[]>(`${API}/exhibitions`, { params });
  }

  exhibitionDetail(id: number, date?: string): Observable<ExhibitionDetail> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<ExhibitionDetail>(`${API}/exhibitions/${id}`, { params });
  }

  artwork(id: number): Observable<Artwork> {
    return this.http.get<Artwork>(`${API}/artworks/${id}`);
  }

  // Favorites
  toggleFavorite(exhibitionId: number): Observable<{ favorited: boolean }> {
    return this.http.post<{ favorited: boolean }>(`${API}/favorites/${exhibitionId}`, {});
  }

  listFavorites(): Observable<ExhibitionListItem[]> {
    return this.http.get<ExhibitionListItem[]>(`${API}/favorites`);
  }

  // Tickets
  listTickets(): Observable<TicketListItem[]> {
    return this.http.get<TicketListItem[]>(`${API}/tickets`);
  }

  ticketDetail(id: number): Observable<TicketDetail> {
    return this.http.get<TicketDetail>(`${API}/tickets/${id}`);
  }

  createTicket(body: {
    slotId: number;
    lines: { tariff: TariffType; qty: number }[];
    addOns?: { code: string; qty: number }[];
  }): Observable<TicketDetail> {
    return this.http.post<TicketDetail>(`${API}/tickets`, body);
  }

  confirmTicket(id: number): Observable<TicketDetail> {
    return this.http.post<TicketDetail>(`${API}/tickets/${id}/confirm`, {});
  }

  cancelTicket(id: number): Observable<TicketDetail> {
    return this.http.post<TicketDetail>(`${API}/tickets/${id}/cancel`, {});
  }

  // Reviews
  listReviews(exhibitionId: number): Observable<Review[]> {
    return this.http.get<Review[]>(`${API}/exhibitions/${exhibitionId}/reviews`);
  }

  createReview(
    exhibitionId: number,
    body: { rating: number; body: string },
  ): Observable<Review> {
    return this.http.post<Review>(`${API}/exhibitions/${exhibitionId}/reviews`, body);
  }

  // Admin
  adminStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${API}/admin/stats`);
  }

  adminExhibitions(): Observable<AdminExhibition[]> {
    return this.http.get<AdminExhibition[]>(`${API}/admin/exhibitions`);
  }

  adminCreateExhibition(body: {
    title: string;
    summary?: string;
    description?: string;
    type?: 'permanent' | 'temporary';
    startsOn?: string | null;
    endsOn?: string | null;
    coverHue?: string;
    hall?: string;
    basePriceCents?: number;
    published?: boolean;
    featured?: boolean;
  }): Observable<AdminExhibition> {
    return this.http.post<AdminExhibition>(`${API}/admin/exhibitions`, body);
  }

  adminCreateSlot(body: {
    exhibitionId: number;
    date: string;
    startTime: string;
    endTime: string;
    capacity: number;
  }): Observable<unknown> {
    return this.http.post(`${API}/admin/slots`, body);
  }
}
