import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ADDON_OPTIONS, type ExhibitionDetail, type Slot, type TariffType, type TicketDetail } from '../shared/models';
import { FormatBase, mmss } from '../shared/format';

@Component({
  selector: 'app-checkout-page',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container page">
      <a routerLink="/exposiciones" class="text-sm text-muted">← Exposiciones</a>
      <h1 class="mt-3">Comprar entrada</h1>

      @if (loading()) {
        <p class="text-muted">Cargando franja…</p>
      } @else if (error() && !ticket()) {
        <div class="alert alert-danger">{{ error() }}</div>
      } @else if (ticket()?.status === 'confirmed') {
        <div class="ticket-stub card mt-4">
          <h2>Entrada confirmada</h2>
          <p class="mono">{{ ticket()!.code }}</p>
          <p>{{ ticket()!.exhibition?.title }}</p>
          <p class="text-muted">
            {{ formatDate(ticket()!.slot?.date) }} ·
            {{ ticket()!.slot?.startTime }}–{{ ticket()!.slot?.endTime }}
          </p>
          <p class="price">{{ eur(ticket()!.totalCents) }}</p>
          @if (ticket()!.qrSvg) {
            <div class="qr-box" [innerHTML]="safeQr()"></div>
          }
          <a class="btn btn-primary mt-4" [routerLink]="['/mis-visitas', ticket()!.id]">Ver en Mis visitas</a>
        </div>
      } @else {
        @if (exhibition() && slot()) {
          <div class="checkout-grid mt-4">
            <section class="card">
              <h2>{{ exhibition()!.title }}</h2>
              <p class="text-muted">
                {{ formatDate(slot()!.date) }} · {{ slot()!.startTime }}–{{ slot()!.endTime }}
              </p>
              <p class="text-sm">Plazas libres: <strong>{{ slot()!.freeSeats }}</strong></p>

              <h3 class="mt-4">Tarifas</h3>
              @for (t of exhibition()!.tariffs; track t.tariff) {
                <div class="tariff-row">
                  <div>
                    <strong>{{ t.label }}</strong>
                    <span class="text-muted text-sm"> · {{ eur(t.unitPriceCents) }}</span>
                  </div>
                  <div class="qty-ctrl">
                    <button type="button" class="btn btn-secondary btn-sm" (click)="bump(t.tariff, -1)">−</button>
                    <span>{{ qty()[t.tariff] || 0 }}</span>
                    <button type="button" class="btn btn-secondary btn-sm" (click)="bump(t.tariff, 1)">+</button>
                  </div>
                </div>
              }

              <h3 class="mt-4">Opcionales</h3>
              @for (a of addons; track a.code) {
                <label class="check-row">
                  <input type="checkbox" [checked]="!!addonQty()[a.code]" (change)="toggleAddon(a.code, $event)" />
                  <span>{{ a.label }} · {{ eur(a.unitCents) }} / persona</span>
                </label>
              }

              @if (error()) {
                <p class="form-error mt-3">{{ error() }}</p>
              }

              @if (!ticket()) {
                <button type="button" class="btn btn-primary btn-block mt-4" [disabled]="busy() || totalQty() < 1" (click)="hold()">
                  {{ busy() ? 'Reservando…' : 'Reservar 15 min · ' + eur(estimate()) }}
                </button>
              } @else if (ticket()!.status === 'pending') {
                <div class="hold-box mt-4">
                  <p>Reserva temporal · expira en <strong class="mono">{{ mmss(remaining()) }}</strong></p>
                  <p class="price">{{ eur(ticket()!.totalCents) }}</p>
                  <button type="button" class="btn btn-primary btn-block" [disabled]="busy()" (click)="pay()">
                    {{ busy() ? 'Confirmando…' : 'Pagar y confirmar' }}
                  </button>
                  <button type="button" class="btn btn-ghost btn-block mt-2" (click)="cancelHold()">Liberar reserva</button>
                </div>
              }
            </section>
            <aside class="card surface-2">
              <h3>Resumen</h3>
              <p class="text-sm text-muted">Máximo 6 plazas. La retención se calcula en el servidor.</p>
              <ul class="summary-list">
                <li>Plazas: {{ totalQty() }}</li>
                <li>Estimado: {{ eur(estimate()) }}</li>
                <li>Puntos al confirmar: {{ totalQty() * 10 }}</li>
              </ul>
            </aside>
          </div>
        }
      }
    </div>
  `,
})
export class CheckoutPageComponent extends FormatBase implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly addons = ADDON_OPTIONS;
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly exhibition = signal<ExhibitionDetail | null>(null);
  protected readonly slot = signal<Slot | null>(null);
  protected readonly ticket = signal<TicketDetail | null>(null);
  protected readonly qty = signal<Record<string, number>>({});
  protected readonly addonQty = signal<Record<string, number>>({});
  protected readonly remaining = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;
  private onVis = () => this.resyncTimer();

  protected readonly totalQty = computed(() =>
    Object.values(this.qty()).reduce((a, n) => a + (n || 0), 0),
  );

  ngOnInit(): void {
    const slotId = Number(this.route.snapshot.paramMap.get('slotId'));
    if (!slotId) {
      this.error.set('Franja no válida');
      this.loading.set(false);
      return;
    }
    // Load exhibitions until we find the slot
    this.api.listExhibitions().subscribe({
      next: (list) => {
        this.findSlot(list.map((e) => e.id), slotId, 0);
      },
      error: () => {
        this.error.set('No se pudo cargar la franja');
        this.loading.set(false);
      },
    });
    document.addEventListener('visibilitychange', this.onVis);
    window.addEventListener('focus', this.onVis);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this.onVis);
    window.removeEventListener('focus', this.onVis);
  }

  private findSlot(ids: number[], slotId: number, i: number): void {
    if (i >= ids.length) {
      this.error.set('Franja no encontrada');
      this.loading.set(false);
      return;
    }
    this.api.exhibitionDetail(ids[i]).subscribe({
      next: (ex) => {
        const s = ex.slots.find((x) => x.id === slotId);
        if (s) {
          this.exhibition.set(ex);
          this.slot.set(s);
          this.loading.set(false);
        } else {
          this.findSlot(ids, slotId, i + 1);
        }
      },
      error: () => this.findSlot(ids, slotId, i + 1),
    });
  }

  protected bump(tariff: TariffType, delta: number): void {
    const q = { ...this.qty() };
    const next = Math.max(0, (q[tariff] || 0) + delta);
    const others = Object.entries(q)
      .filter(([k]) => k !== tariff)
      .reduce((a, [, v]) => a + v, 0);
    if (others + next > 6) return;
    q[tariff] = next;
    this.qty.set(q);
  }

  protected toggleAddon(code: string, ev: Event): void {
    const on = (ev.target as HTMLInputElement).checked;
    const a = { ...this.addonQty() };
    a[code] = on ? this.totalQty() || 1 : 0;
    this.addonQty.set(a);
  }

  protected estimate(): number {
    const ex = this.exhibition();
    if (!ex) return 0;
    let total = 0;
    for (const t of ex.tariffs) {
      total += (this.qty()[t.tariff] || 0) * t.unitPriceCents;
    }
    const people = this.totalQty() || 1;
    for (const a of this.addons) {
      if (this.addonQty()[a.code]) total += a.unitCents * people;
    }
    return total;
  }

  protected hold(): void {
    const s = this.slot();
    if (!s || this.totalQty() < 1) return;
    this.busy.set(true);
    this.error.set('');
    const lines = Object.entries(this.qty())
      .filter(([, n]) => n > 0)
      .map(([tariff, qty]) => ({ tariff: tariff as TariffType, qty }));
    const people = this.totalQty();
    const addOns = Object.entries(this.addonQty())
      .filter(([, n]) => n > 0)
      .map(([code]) => ({ code, qty: people }));
    this.api.createTicket({ slotId: s.id, lines, addOns }).subscribe({
      next: (t) => {
        this.ticket.set(t);
        this.busy.set(false);
        this.startTimer(t.expiresAt);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'No se pudo reservar');
        this.busy.set(false);
      },
    });
  }

  protected pay(): void {
    const t = this.ticket();
    if (!t) return;
    this.busy.set(true);
    this.error.set('');
    this.api.confirmTicket(t.id).subscribe({
      next: (done) => {
        this.ticket.set(done);
        this.busy.set(false);
        this.auth.refreshProfile();
        if (this.timer) clearInterval(this.timer);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Pago no completado');
        this.busy.set(false);
      },
    });
  }

  protected cancelHold(): void {
    const t = this.ticket();
    if (!t) return;
    this.api.cancelTicket(t.id).subscribe({
      next: () => {
        this.ticket.set(null);
        if (this.timer) clearInterval(this.timer);
        void this.router.navigate(['/exposiciones', this.exhibition()?.id]);
      },
    });
  }

  protected safeQr(): SafeHtml {
    // Angular strips <svg> from raw [innerHTML] — must bypass for QR receipt.
    return this.sanitizer.bypassSecurityTrustHtml(this.ticket()?.qrSvg || '');
  }

  private startTimer(expiresAt: string | null): void {
    if (this.timer) clearInterval(this.timer);
    this.resyncTimer(expiresAt);
    this.timer = setInterval(() => this.resyncTimer(), 1000);
  }

  private resyncTimer(expiresAt?: string | null): void {
    const exp = expiresAt ?? this.ticket()?.expiresAt;
    if (!exp) {
      this.remaining.set(0);
      return;
    }
    const sec = Math.floor((new Date(exp).getTime() - Date.now()) / 1000);
    this.remaining.set(Math.max(0, sec));
    if (sec <= 0 && this.ticket()?.status === 'pending') {
      this.error.set('La reserva expiró');
    }
  }
}
