import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { AdminExhibition } from '../shared/models';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-admin-exhibitions-page',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="container page">
      <div class="row-between">
        <h1>Exposiciones</h1>
        <a routerLink="/admin" class="btn btn-ghost btn-sm">← Stats</a>
      </div>

      <section class="card mt-4">
        <h2>Nueva exposición</h2>
        <form class="form-grid" (ngSubmit)="create()">
          <div class="form-group">
            <label class="form-label">Título</label>
            <input class="input" [(ngModel)]="title" name="title" required />
          </div>
          <div class="form-group">
            <label class="form-label">Tipo</label>
            <select class="input" [(ngModel)]="type" name="type">
              <option value="temporary">Temporal</option>
              <option value="permanent">Permanente</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Sala</label>
            <input class="input" [(ngModel)]="hall" name="hall" />
          </div>
          <div class="form-group">
            <label class="form-label">Precio base (€)</label>
            <input class="input" type="number" step="0.5" [(ngModel)]="priceEur" name="price" />
          </div>
          <div class="form-group full">
            <label class="form-label">Resumen</label>
            <textarea class="input" rows="2" [(ngModel)]="summary" name="summary"></textarea>
          </div>
          <button class="btn btn-primary" type="submit" [disabled]="busy()">Crear</button>
        </form>
        @if (msg()) {
          <p class="text-sm mt-2">{{ msg() }}</p>
        }
      </section>

      <section class="card mt-4">
        <h2>Listado</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Tipo</th>
              <th>Sala</th>
              <th>Precio</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (e of items(); track e.id) {
              <tr>
                <td>
                  <a [routerLink]="['/exposiciones', e.id]">{{ e.title }}</a>
                </td>
                <td>{{ typeLabel(e.type) }}</td>
                <td>{{ e.hall }}</td>
                <td>{{ eur(e.basePriceCents) }}</td>
                <td>{{ e.published ? 'Publicada' : 'Borrador' }}{{ e.featured ? ' · ★' : '' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </section>

      <section class="card mt-4">
        <h2>Añadir franja</h2>
        <form class="form-grid" (ngSubmit)="addSlot()">
          <div class="form-group">
            <label class="form-label">Exposición</label>
            <select class="input" [(ngModel)]="slotExId" name="slotEx">
              @for (e of items(); track e.id) {
                <option [ngValue]="e.id">{{ e.title }}</option>
              }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Fecha</label>
            <input class="input" type="date" [(ngModel)]="slotDate" name="slotDate" />
          </div>
          <div class="form-group">
            <label class="form-label">Inicio</label>
            <input class="input" type="time" [(ngModel)]="slotStart" name="slotStart" />
          </div>
          <div class="form-group">
            <label class="form-label">Fin</label>
            <input class="input" type="time" [(ngModel)]="slotEnd" name="slotEnd" />
          </div>
          <div class="form-group">
            <label class="form-label">Cupo</label>
            <input class="input" type="number" [(ngModel)]="slotCap" name="slotCap" min="1" />
          </div>
          <button class="btn btn-secondary" type="submit" [disabled]="busy()">Crear franja</button>
        </form>
      </section>
    </div>
  `,
})
export class AdminExhibitionsPageComponent extends FormatBase implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly items = signal<AdminExhibition[]>([]);
  protected readonly busy = signal(false);
  protected readonly msg = signal('');

  protected title = '';
  protected type: 'temporary' | 'permanent' = 'temporary';
  protected hall = 'Sala A';
  protected priceEur = 12;
  protected summary = '';
  protected slotExId = 0;
  protected slotDate = '';
  protected slotStart = '10:00';
  protected slotEnd = '11:30';
  protected slotCap = 28;

  ngOnInit(): void {
    this.reload();
  }

  private reload(): void {
    this.api.adminExhibitions().subscribe({
      next: (rows) => {
        this.items.set(rows);
        if (!this.slotExId && rows[0]) this.slotExId = rows[0].id;
      },
    });
  }

  protected create(): void {
    this.busy.set(true);
    this.api
      .adminCreateExhibition({
        title: this.title,
        type: this.type,
        hall: this.hall,
        summary: this.summary,
        description: this.summary,
        basePriceCents: Math.round(this.priceEur * 100),
        published: true,
      })
      .subscribe({
        next: () => {
          this.msg.set('Creada');
          this.title = '';
          this.busy.set(false);
          this.reload();
        },
        error: (err) => {
          this.msg.set(err?.error?.message || 'Error');
          this.busy.set(false);
        },
      });
  }

  protected addSlot(): void {
    this.busy.set(true);
    this.api
      .adminCreateSlot({
        exhibitionId: this.slotExId,
        date: this.slotDate,
        startTime: this.slotStart,
        endTime: this.slotEnd,
        capacity: this.slotCap,
      })
      .subscribe({
        next: () => {
          this.msg.set('Franja creada');
          this.busy.set(false);
        },
        error: (err) => {
          this.msg.set(err?.error?.message || 'Error franja');
          this.busy.set(false);
        },
      });
  }
}
