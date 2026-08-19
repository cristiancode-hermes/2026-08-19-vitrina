import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { ExhibitionListItem } from '../shared/models';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-exhibitions-list-page',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="container">
        <div class="page-header">
          <div>
            <h1>Exposiciones</h1>
            <p class="page-subtitle">Catálogo de salas y muestras temporales</p>
          </div>
        </div>

        <div class="filters-bar">
          <div class="form-group">
            <label class="form-label" for="search">Buscar</label>
            <input
              id="search"
              class="input"
              type="search"
              placeholder="Título, sala…"
              [ngModel]="search()"
              (ngModelChange)="search.set($event); scheduleLoad()"
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="type">Tipo</label>
            <select
              id="type"
              class="select"
              [ngModel]="type()"
              (ngModelChange)="type.set($event); load()"
            >
              <option value="">Todas</option>
              <option value="permanent">Permanentes</option>
              <option value="temporary">Temporales</option>
            </select>
          </div>
          <div class="form-group" style="flex:0;min-width:auto">
            <label class="form-label">&nbsp;</label>
            <label class="row text-sm" style="padding:0.55rem 0;cursor:pointer">
              <input
                type="checkbox"
                [ngModel]="withSlotsToday()"
                (ngModelChange)="withSlotsToday.set($event); load()"
              />
              Con plazas hoy
            </label>
          </div>
        </div>

        @if (loading()) {
          <div class="card-grid">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="card"><div class="skeleton" style="height:180px"></div></div>
            }
          </div>
        } @else if (error()) {
          <div class="error-state">
            <h3>Error al cargar</h3>
            <p>{{ error() }}</p>
            <button type="button" class="btn btn-primary" (click)="load()">Reintentar</button>
          </div>
        } @else if (items().length === 0) {
          <div class="empty-state">
            <h3>Sin resultados</h3>
            <p>Pruebe otros filtros o limpie la búsqueda.</p>
          </div>
        } @else {
          <div class="card-grid">
            @for (e of items(); track e.id) {
              <a class="card exh-card" [routerLink]="['/exposiciones', e.id]">
                <div class="cover-swatch" [style.--hue]="coverHueStyle(e.coverHue)"></div>
                <div class="exh-card-body">
                  <div class="exh-meta">
                    <span class="badge" [class.badge-primary]="e.type === 'permanent'" [class.badge-accent]="e.type === 'temporary'">
                      {{ typeLabel(e.type) }}
                    </span>
                    @if (e.featured) {
                      <span class="badge badge-warning">Destacada</span>
                    }
                    <span>{{ e.hall }}</span>
                  </div>
                  <h3>{{ e.title }}</h3>
                  <p>{{ e.summary }}</p>
                  <div class="exh-card-foot">
                    <span class="price">desde {{ eur(e.basePriceCents) }}</span>
                    <span class="text-sm text-muted">{{ e.freeSeatsToday }} libres hoy</span>
                  </div>
                </div>
              </a>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class ExhibitionsListPageComponent extends FormatBase implements OnInit {
  private readonly api = inject(ApiService);
  private debounce: ReturnType<typeof setTimeout> | null = null;

  protected readonly items = signal<ExhibitionListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly search = signal('');
  protected readonly type = signal('');
  protected readonly withSlotsToday = signal(false);

  ngOnInit(): void {
    this.load();
  }

  protected scheduleLoad(): void {
    if (this.debounce) clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.load(), 280);
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.api
      .listExhibitions({
        type: this.type() || undefined,
        search: this.search().trim() || undefined,
        withSlotsToday: this.withSlotsToday() ? 'true' : undefined,
      })
      .subscribe({
        next: (items) => {
          this.items.set(items);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'Error de red');
          this.loading.set(false);
        },
      });
  }
}
