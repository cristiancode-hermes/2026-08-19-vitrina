import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import type { TicketDetail } from '../shared/models';
import { FormatBase, mmss } from '../shared/format';

@Component({
  selector: 'app-visit-detail-page',
  imports: [RouterLink],
  template: `
    <div class="container page">
      <a routerLink="/mis-visitas" class="text-sm text-muted">← Mis visitas</a>

      @if (loading()) {
        <p class="mt-4 text-muted">Cargando…</p>
      } @else if (!ticket()) {
        <div class="alert alert-danger mt-4">Entrada no encontrada</div>
      } @else {
        <div class="ticket-detail mt-4">
          <div class="row-between">
            <h1>{{ ticket()!.exhibition?.title }}</h1>
            <span [class]="statusBadgeClass(ticket()!.status)">{{ statusLabel(ticket()!.status) }}</span>
          </div>

          <div class="ticket-stub card mt-3">
            <div class="ticket-meta">
              <div>
                <span class="label">Código</span>
                <p class="mono">{{ ticket()!.code || '—' }}</p>
              </div>
              <div>
                <span class="label">Franja</span>
                <p>
                  {{ formatDate(ticket()!.slot?.date) }}<br />
                  {{ ticket()!.slot?.startTime }}–{{ ticket()!.slot?.endTime }}
                </p>
              </div>
              <div>
                <span class="label">Total</span>
                <p class="price">{{ eur(ticket()!.totalCents) }}</p>
              </div>
            </div>

            @if (ticket()!.status === 'pending' && remaining() > 0) {
              <p class="hold-note">Retención: <strong class="mono">{{ mmss(remaining()) }}</strong></p>
              <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="confirm()">
                Pagar y confirmar
              </button>
            }

            @if (ticket()!.qrSvg && (ticket()!.status === 'confirmed' || ticket()!.status === 'used')) {
              <div class="qr-box mt-4" [innerHTML]="qrHtml()"></div>
              <button type="button" class="btn btn-secondary btn-sm mt-2" (click)="downloadQr()">Descargar QR</button>
            }

            <h3 class="mt-4">Desglose</h3>
            <ul class="summary-list">
              @for (l of ticket()!.lines; track l.id) {
                <li>{{ l.label }} × {{ l.qty }} — {{ eur(l.subtotalCents) }}</li>
              }
              @for (a of ticket()!.addOns; track a.code) {
                <li>{{ a.label }} × {{ a.qty }} — {{ eur(a.unitCents * a.qty) }}</li>
              }
            </ul>
            <p class="text-sm text-muted">
              Suma líneas: {{ eur(ticket()!.linesTotalCents) }} · Ticket: {{ eur(ticket()!.totalCents) }}
            </p>

            @if (canCancel()) {
              <button type="button" class="btn btn-danger-text mt-4" [disabled]="busy()" (click)="cancel()">
                Cancelar entrada
              </button>
            }
            @if (msg()) {
              <p class="form-error mt-2">{{ msg() }}</p>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class VisitDetailPageComponent extends FormatBase implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly ticket = signal<TicketDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly msg = signal('');
  protected readonly remaining = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;
  private onVis = () => this.tick();

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.ticketDetail(id).subscribe({
      next: (t) => {
        this.ticket.set(t);
        this.loading.set(false);
        if (t.status === 'pending' && t.expiresAt) {
          this.tick();
          this.timer = setInterval(() => this.tick(), 1000);
        }
      },
      error: () => this.loading.set(false),
    });
    document.addEventListener('visibilitychange', this.onVis);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this.onVis);
  }

  protected qrHtml(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.ticket()?.qrSvg || '');
  }

  protected canCancel(): boolean {
    const t = this.ticket();
    return !!t && (t.status === 'pending' || t.status === 'confirmed');
  }

  protected confirm(): void {
    const t = this.ticket();
    if (!t) return;
    this.busy.set(true);
    this.api.confirmTicket(t.id).subscribe({
      next: (done) => {
        this.ticket.set(done);
        this.busy.set(false);
        this.auth.refreshProfile();
        if (this.timer) clearInterval(this.timer);
      },
      error: (err) => {
        this.msg.set(err?.error?.message || 'Error al confirmar');
        this.busy.set(false);
      },
    });
  }

  protected cancel(): void {
    const t = this.ticket();
    if (!t) return;
    this.busy.set(true);
    this.api.cancelTicket(t.id).subscribe({
      next: (done) => {
        this.ticket.set(done);
        this.busy.set(false);
        this.auth.refreshProfile();
      },
      error: (err) => {
        this.msg.set(err?.error?.message || 'No se pudo cancelar');
        this.busy.set(false);
      },
    });
  }

  protected downloadQr(): void {
    const svg = this.ticket()?.qrSvg;
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.ticket()?.code || 'ticket'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private tick(): void {
    const exp = this.ticket()?.expiresAt;
    if (!exp) return;
    this.remaining.set(Math.max(0, Math.floor((new Date(exp).getTime() - Date.now()) / 1000)));
  }
}
