import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { ExhibitionListItem } from '../shared/models';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-favorites-page',
  imports: [RouterLink],
  template: `
    <div class="container page">
      <h1>Favoritos</h1>
      <p class="lead text-muted">Exposiciones guardadas.</p>

      @if (loading()) {
        <p class="text-muted">Cargando…</p>
      } @else if (!items().length) {
        <div class="empty-state card">
          <p>No hay favoritos todavía.</p>
          <a routerLink="/exposiciones" class="btn btn-primary">Explorar</a>
        </div>
      } @else {
        <div class="card-grid">
          @for (e of items(); track e.id) {
            <a class="card expo-card" [routerLink]="['/exposiciones', e.id]">
              <div class="expo-cover" [style.--hue]="coverHueStyle(e.coverHue)"></div>
              <div class="card-body">
                <span class="badge" [class.badge-accent]="e.type === 'temporary'" [class.badge-secondary]="e.type === 'permanent'">
                  {{ typeLabel(e.type) }}
                </span>
                <h3>{{ e.title }}</h3>
                <p class="text-sm text-muted">{{ e.hall }} · desde {{ eur(e.basePriceCents) }}</p>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class FavoritesPageComponent extends FormatBase implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly items = signal<ExhibitionListItem[]>([]);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    this.api.listFavorites().subscribe({
      next: (rows) => {
        this.items.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
