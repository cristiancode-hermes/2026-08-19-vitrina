import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import type { ExhibitionDetail, Review, Slot } from '../shared/models';
import { FormatBase, todayISO } from '../shared/format';

@Component({
  selector: 'app-exhibition-detail-page',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="container">
        @if (loading()) {
          <div class="loading-state"><div class="skeleton" style="height:2rem;width:40%;margin:0 auto"></div></div>
        } @else if (error()) {
          <div class="error-state">
            <h3>No se encontró la exposición</h3>
            <p>{{ error() }}</p>
            <a routerLink="/exposiciones" class="btn btn-primary">Volver al catálogo</a>
          </div>
        } @else if (ex()) {
          @let e = ex()!;
          <div class="page-header">
            <div>
              <div class="row mb-3">
                <span class="badge" [class.badge-primary]="e.type === 'permanent'" [class.badge-accent]="e.type === 'temporary'">
                  {{ typeLabel(e.type) }}
                </span>
                <span class="text-sm text-muted">{{ e.hall }}</span>
              </div>
              <h1>{{ e.title }}</h1>
              <p class="page-subtitle">{{ e.summary }}</p>
            </div>
            <div class="row">
              @if (auth.isAuthenticated()) {
                <button type="button" class="btn btn-secondary" (click)="toggleFav()" [disabled]="favBusy()">
                  {{ favorited() ? '★ En favoritos' : '☆ Favorito' }}
                </button>
              }
            </div>
          </div>

          <div class="detail-grid">
            <div class="stack">
              <div class="cover-swatch" style="aspect-ratio:21/9;border-radius:var(--radius-md)" [style.--hue]="coverHueStyle(e.coverHue)"></div>
              <div class="card">
                <h2>Sobre la muestra</h2>
                <p style="white-space:pre-wrap;color:var(--color-ink)">{{ e.description }}</p>
                @if (e.startsOn || e.endsOn) {
                  <p class="text-sm text-muted mb-0">
                    @if (e.startsOn) { Del {{ formatDate(e.startsOn) }} }
                    @if (e.endsOn) { al {{ formatDate(e.endsOn) }} }
                  </p>
                }
              </div>

              @if (e.artworks.length) {
                <div>
                  <h2>Obras</h2>
                  <div class="artwork-grid">
                    @for (a of e.artworks; track a.id) {
                      <a class="artwork-tile" [routerLink]="['/obras', a.id]">
                        <div class="swatch cover-swatch" [style.--hue]="coverHueStyle(a.coverHue)" style="border-radius:0"></div>
                        <div class="body">
                          <h4>{{ a.title }}</h4>
                          <p class="artist">{{ a.artist }}@if (a.yearLabel) { · {{ a.yearLabel }} }</p>
                        </div>
                      </a>
                    }
                  </div>
                </div>
              }

              <div class="card">
                <h2>Opiniones</h2>
                @if (reviews().length === 0) {
                  <p class="text-muted text-sm">Aún no hay reseñas.</p>
                } @else {
                  <div class="review-list">
                    @for (r of reviews(); track r.id) {
                      <div class="review-item">
                        <div class="between">
                          <span class="stars">{{ stars(r.rating) }}</span>
                          <span class="text-xs text-muted">{{ formatDateShort(r.createdAt) }}</span>
                        </div>
                        <p class="text-sm text-ink mb-0 mt-2">{{ r.body }}</p>
                        @if (r.user) {
                          <p class="text-xs text-muted mt-2 mb-0">{{ r.user.name }}</p>
                        }
                      </div>
                    }
                  </div>
                }
                @if (auth.isAuthenticated()) {
                  <div class="divider"></div>
                  <form (ngSubmit)="submitReview()" class="stack">
                    <div class="form-group mb-0">
                      <label class="form-label" for="rating">Valoración</label>
                      <select id="rating" class="select" [(ngModel)]="reviewRating" name="rating">
                        <option [ngValue]="5">5 — Excelente</option>
                        <option [ngValue]="4">4 — Muy bien</option>
                        <option [ngValue]="3">3 — Bien</option>
                        <option [ngValue]="2">2 — Regular</option>
                        <option [ngValue]="1">1 — Floja</option>
                      </select>
                    </div>
                    <div class="form-group mb-0">
                      <label class="form-label" for="rbody">Comentario</label>
                      <textarea id="rbody" class="textarea" rows="3" [(ngModel)]="reviewBody" name="body" required minlength="3"></textarea>
                    </div>
                    @if (reviewError()) {
                      <p class="form-error">{{ reviewError() }}</p>
                    }
                    <button type="submit" class="btn btn-secondary btn-sm" [disabled]="reviewBusy()">Publicar reseña</button>
                  </form>
                }
              </div>
            </div>

            <aside class="detail-sidebar">
              <div class="card stack">
                <div class="between">
                  <h2 class="mb-0">Entradas</h2>
                  <span class="price">desde {{ eur(e.basePriceCents) }}</span>
                </div>
                <div class="form-group mb-0">
                  <label class="form-label" for="date">Fecha</label>
                  <input
                    id="date"
                    type="date"
                    class="input"
                    [ngModel]="date()"
                    (ngModelChange)="onDateChange($event)"
                  />
                </div>
                <div>
                  <p class="form-label">Franja horaria</p>
                  @if (e.slots.length === 0) {
                    <p class="text-sm text-muted">No hay franjas para esta fecha.</p>
                  } @else {
                    <div class="slot-grid">
                      @for (s of e.slots; track s.id) {
                        <button
                          type="button"
                          class="slot-btn"
                          [class.selected]="selectedSlot()?.id === s.id"
                          [class.low]="s.availability === 'low'"
                          [class.full]="s.availability === 'full'"
                          [disabled]="s.availability === 'full'"
                          (click)="selectedSlot.set(s)"
                        >
                          <span class="time">{{ s.startTime }}</span>
                          <span class="seats">
                            @if (s.availability === 'full') { Completo }
                            @else { {{ s.freeSeats }} libres }
                          </span>
                        </button>
                      }
                    </div>
                  }
                </div>
                <div>
                  <p class="form-label">Tarifas</p>
                  @for (t of e.tariffs; track t.tariff) {
                    <div class="between text-sm" style="padding:0.25rem 0">
                      <span>{{ t.label }}</span>
                      <span class="price">{{ eur(t.unitPriceCents) }}</span>
                    </div>
                  }
                </div>
                <button
                  type="button"
                  class="btn btn-primary btn-block"
                  [disabled]="!selectedSlot()"
                  (click)="goCheckout()"
                >
                  Continuar a compra
                </button>
                @if (!auth.isAuthenticated()) {
                  <p class="text-xs text-muted mb-0">Necesitará iniciar sesión para reservar.</p>
                }
              </div>
            </aside>
          </div>
        }
      </div>
    </div>
  `,
})
export class ExhibitionDetailPageComponent extends FormatBase implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  public readonly auth = inject(AuthService);

  protected readonly ex = signal<ExhibitionDetail | null>(null);
  protected readonly reviews = signal<Review[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly date = signal(todayISO());
  protected readonly selectedSlot = signal<Slot | null>(null);
  protected readonly favorited = signal(false);
  protected readonly favBusy = signal(false);
  protected readonly reviewBusy = signal(false);
  protected readonly reviewError = signal('');
  protected reviewRating = 5;
  protected reviewBody = '';

  private id = 0;

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.id) {
      this.error.set('Identificador inválido');
      this.loading.set(false);
      return;
    }
    this.load();
    this.loadReviews();
  }

  protected stars(n: number): string {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  protected onDateChange(v: string): void {
    this.date.set(v);
    this.selectedSlot.set(null);
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.exhibitionDetail(this.id, this.date()).subscribe({
      next: (d) => {
        this.ex.set(d);
        this.date.set(d.selectedDate || this.date());
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'No encontrada');
        this.loading.set(false);
      },
    });
  }

  protected loadReviews(): void {
    this.api.listReviews(this.id).subscribe({
      next: (r) => this.reviews.set(r),
      error: () => this.reviews.set([]),
    });
  }

  protected toggleFav(): void {
    this.favBusy.set(true);
    this.api.toggleFavorite(this.id).subscribe({
      next: (r) => {
        this.favorited.set(r.favorited);
        this.favBusy.set(false);
      },
      error: () => this.favBusy.set(false),
    });
  }

  protected goCheckout(): void {
    const s = this.selectedSlot();
    if (!s) return;
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/checkout/${s.id}` },
      });
      return;
    }
    void this.router.navigate(['/checkout', s.id]);
  }

  protected submitReview(): void {
    this.reviewError.set('');
    if (!this.reviewBody.trim() || this.reviewBody.trim().length < 3) {
      this.reviewError.set('Escriba al menos 3 caracteres');
      return;
    }
    this.reviewBusy.set(true);
    this.api
      .createReview(this.id, { rating: this.reviewRating, body: this.reviewBody.trim() })
      .subscribe({
        next: () => {
          this.reviewBody = '';
          this.reviewBusy.set(false);
          this.loadReviews();
        },
        error: (err) => {
          this.reviewError.set(err?.error?.message || 'No se pudo publicar');
          this.reviewBusy.set(false);
        },
      });
  }
}
