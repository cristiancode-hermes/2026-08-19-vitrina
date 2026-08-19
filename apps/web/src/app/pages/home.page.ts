import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { ExhibitionListItem } from '../shared/models';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  template: `
    <div class="page">
      <div class="container">
        <section class="hero">
          <div class="hero-copy">
            <p class="eyebrow">Museo Vitrina</p>
            <h1>Colecciones con la calma de una sala bien iluminada</h1>
            <p class="lead">
              Exposiciones permanentes y temporales, franjas horarias y entradas
              con código. Reserve su visita sin prisas.
            </p>
            <div class="hero-actions">
              <a routerLink="/exposiciones" class="btn btn-primary btn-lg">Ver exposiciones</a>
              <a routerLink="/registro" class="btn btn-secondary btn-lg">Crear cuenta</a>
            </div>
          </div>
          <aside class="hero-panel">
            <h3>Horario de visita</h3>
            <ul class="hours-list">
              <li><span class="day">Martes — viernes</span><span class="time">10:00 – 20:00</span></li>
              <li><span class="day">Sábados</span><span class="time">10:00 – 21:00</span></li>
              <li><span class="day">Domingos</span><span class="time">10:00 – 15:00</span></li>
              <li><span class="day">Lunes</span><span class="time">Cerrado</span></li>
            </ul>
            <p class="text-sm text-muted mt-3 mb-0">
              Última entrada 45 minutos antes del cierre. Aforo por franja.
            </p>
          </aside>
        </section>

        <section class="section">
          <div class="section-head">
            <h2>Destacadas</h2>
            <a routerLink="/exposiciones">Catálogo completo →</a>
          </div>

          @if (loading()) {
            <div class="card-grid">
              @for (i of [1, 2, 3]; track i) {
                <div class="card"><div class="skeleton" style="height:140px"></div></div>
              }
            </div>
          } @else if (error()) {
            <div class="error-state">
              <h3>No se pudieron cargar las exposiciones</h3>
              <p>{{ error() }}</p>
              <button type="button" class="btn btn-primary" (click)="load()">Reintentar</button>
            </div>
          } @else if (featured().length === 0) {
            <div class="empty-state">
              <h3>Sin destacadas por ahora</h3>
              <a routerLink="/exposiciones" class="btn btn-primary">Explorar catálogo</a>
            </div>
          } @else {
            <div class="card-grid">
              @for (e of featured(); track e.id) {
                <a class="card exh-card" [routerLink]="['/exposiciones', e.id]">
                  <div class="cover-swatch" [style.--hue]="coverHueStyle(e.coverHue)"></div>
                  <div class="exh-card-body">
                    <div class="exh-meta">
                      <span class="badge" [class.badge-primary]="e.type === 'permanent'" [class.badge-accent]="e.type === 'temporary'">
                        {{ typeLabel(e.type) }}
                      </span>
                      <span>{{ e.hall }}</span>
                    </div>
                    <h3>{{ e.title }}</h3>
                    <p>{{ e.summary }}</p>
                    <div class="exh-card-foot">
                      <span class="price">{{ eur(e.basePriceCents) }}</span>
                      <span class="text-sm text-muted">{{ e.freeSeatsToday }} plazas hoy</span>
                    </div>
                  </div>
                </a>
              }
            </div>
          }
        </section>

        <section class="section">
          <div class="card card-muted">
            <div class="between">
              <div>
                <h2 class="mb-0">Reserve su franja</h2>
                <p class="mb-0 mt-2">Elija exposición, fecha y horario. La reserva se mantiene 15 minutos.</p>
              </div>
              <a routerLink="/exposiciones" class="btn btn-primary">Comprar entrada</a>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
})
export class HomePageComponent extends FormatBase implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly featured = signal<ExhibitionListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.listExhibitions({ featured: 'true' }).subscribe({
      next: (items) => {
        this.featured.set(items.slice(0, 6));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Error de red');
        this.loading.set(false);
      },
    });
  }
}
