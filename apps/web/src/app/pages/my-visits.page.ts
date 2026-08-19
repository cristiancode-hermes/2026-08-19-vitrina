import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { TicketListItem } from '../shared/models';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-my-visits-page',
  imports: [RouterLink],
  template: `
    <div class="container page">
      <h1>Mis visitas</h1>
      <p class="lead text-muted">Entradas y reservas del museo.</p>

      @if (loading()) {
        <p class="text-muted">Cargando…</p>
      } @else if (!items().length) {
        <div class="empty-state card">
          <h2>Aún no hay visitas</h2>
          <p class="text-muted">Explore el catálogo y reserve una franja.</p>
          <a routerLink="/exposiciones" class="btn btn-primary">Ver exposiciones</a>
        </div>
      } @else {
        <div class="visit-list">
          @for (t of items(); track t.id) {
            <a class="card visit-card" [routerLink]="['/mis-visitas', t.id]">
              <div class="visit-cover" [style.--hue]="coverHueStyle(t.exhibition?.coverHue || '')"></div>
              <div class="visit-body">
                <div class="row-between">
                  <h3>{{ t.exhibition?.title || 'Exposición' }}</h3>
                  <span [class]="statusBadgeClass(t.status)">{{ statusLabel(t.status) }}</span>
                </div>
                <p class="text-muted text-sm">
                  @if (t.slot) {
                    {{ formatDateShort(t.slot.date) }} · {{ t.slot.startTime }}–{{ t.slot.endTime }}
                  }
                </p>
                <div class="row-between">
                  <span class="mono text-sm">{{ t.code || '—' }}</span>
                  <strong>{{ eur(t.totalCents) }}</strong>
                </div>
                <p class="text-sm text-muted">{{ t.quantity }} plaza(s) · total líneas {{ eur(t.linesTotalCents) }}</p>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class MyVisitsPageComponent extends FormatBase implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly items = signal<TicketListItem[]>([]);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    this.api.listTickets().subscribe({
      next: (rows) => {
        this.items.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
