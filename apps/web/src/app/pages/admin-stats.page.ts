import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { AdminStats } from '../shared/models';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-admin-stats-page',
  imports: [RouterLink],
  template: `
    <div class="container page">
      <div class="row-between">
        <h1>Panel del museo</h1>
        <a routerLink="/admin/exposiciones" class="btn btn-secondary btn-sm">Exposiciones</a>
      </div>
      <p class="lead text-muted">Ocupación e ingresos (datos reales del seed y compras).</p>

      @if (loading()) {
        <p class="text-muted">Cargando estadísticas…</p>
      } @else if (stats()) {
        <div class="kpi-row">
          <div class="card kpi"><span class="label">Ingresos</span><strong>{{ eur(stats()!.kpis.revenueCents) }}</strong></div>
          <div class="card kpi"><span class="label">Visitantes</span><strong>{{ stats()!.kpis.visitors }}</strong></div>
          <div class="card kpi"><span class="label">Entradas OK</span><strong>{{ stats()!.kpis.confirmedTickets }}</strong></div>
          <div class="card kpi"><span class="label">Retenciones</span><strong>{{ stats()!.kpis.pendingHolds }}</strong></div>
        </div>

        <section class="card mt-4">
          <h2>Ingresos por día</h2>
          <p class="text-sm text-muted">Eje X = fechas · Y = euros · pase el cursor para tooltip</p>
          <svg class="chart" viewBox="0 0 640 240" role="img" aria-label="Gráfico de ingresos">
            <!-- axes -->
            <line x1="48" y1="16" x2="48" y2="200" stroke="currentColor" stroke-opacity="0.35" />
            <line x1="48" y1="200" x2="620" y2="200" stroke="currentColor" stroke-opacity="0.35" />
            @for (tick of yTicks(); track tick.y) {
              <text [attr.x]="40" [attr.y]="tick.y + 4" text-anchor="end" font-size="10" fill="currentColor" opacity="0.7">{{ tick.label }}</text>
              <line [attr.x1]="48" [attr.x2]="620" [attr.y1]="tick.y" [attr.y2]="tick.y" stroke="currentColor" stroke-opacity="0.08" />
            }
            @if (points().length > 1) {
              <polyline [attr.points]="poly()" fill="none" stroke="var(--color-primary)" stroke-width="2.5" />
            }
            @for (p of points(); track p.date) {
              <circle
                [attr.cx]="p.x"
                [attr.cy]="p.y"
                r="5"
                fill="var(--color-primary)"
                (mouseenter)="tip.set(p)"
                (mouseleave)="tip.set(null)"
              />
              <text [attr.x]="p.x" y="216" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.75">{{ p.short }}</text>
            }
          </svg>
          @if (tip()) {
            <div class="chart-tip">
              {{ tip()!.date }} · {{ eur(tip()!.revenueCents) }} · {{ tip()!.visitors }} visitantes · {{ tip()!.tickets }} tickets
            </div>
          }
        </section>

        <section class="card mt-4">
          <h2>Ocupación hoy</h2>
          <div class="bar-chart">
            @for (o of stats()!.occupancyToday; track o.slotId) {
              <div class="bar-row">
                <div class="bar-label">
                  <span class="text-sm">{{ o.exhibitionTitle }}</span>
                  <span class="mono text-sm">{{ o.startTime }}</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill" [style.width.%]="o.occupancyPct" [title]="o.reservedCount + '/' + o.capacity"></div>
                </div>
                <span class="mono text-sm">{{ o.occupancyPct }}%</span>
              </div>
            } @empty {
              <p class="text-muted">Sin franjas hoy.</p>
            }
          </div>
        </section>

        <section class="card mt-4">
          <h2>Por exposición</h2>
          <table class="table">
            <thead>
              <tr><th>Exposición</th><th>Visitantes</th><th>Ingresos</th></tr>
            </thead>
            <tbody>
              @for (e of stats()!.byExhibition; track e.id) {
                <tr>
                  <td>{{ e.title }}</td>
                  <td>{{ e.visitors }}</td>
                  <td>{{ eur(e.revenueCents) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }
    </div>
  `,
})
export class AdminStatsPageComponent extends FormatBase implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly stats = signal<AdminStats | null>(null);
  protected readonly loading = signal(true);
  protected readonly tip = signal<{
    date: string;
    short: string;
    x: number;
    y: number;
    revenueCents: number;
    visitors: number;
    tickets: number;
  } | null>(null);

  protected readonly points = computed(() => {
    const s = this.stats()?.revenueSeries || [];
    if (!s.length) return [];
    const max = Math.max(...s.map((r) => r.revenueCents), 1);
    const w = 560;
    const h = 160;
    const left = 56;
    const top = 24;
    return s.map((r, i) => {
      const x = left + (s.length === 1 ? w / 2 : (i / (s.length - 1)) * w);
      const y = top + h - (r.revenueCents / max) * h;
      return {
        ...r,
        x,
        y,
        short: r.date.slice(5),
      };
    });
  });

  protected readonly poly = computed(() =>
    this.points()
      .map((p) => `${p.x},${p.y}`)
      .join(' '),
  );

  protected readonly yTicks = computed(() => {
    const s = this.stats()?.revenueSeries || [];
    const max = Math.max(...s.map((r) => r.revenueCents), 1);
    const ticks = [0, 0.5, 1].map((f) => {
      const val = Math.round(max * f);
      const y = 24 + 160 - f * 160;
      return { y, label: (val / 100).toFixed(0) + '€' };
    });
    return ticks;
  });

  ngOnInit(): void {
    this.api.adminStats().subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
