import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import type { Artwork } from '../shared/models';
import { FormatBase } from '../shared/format';

@Component({
  selector: 'app-artwork-detail-page',
  imports: [RouterLink],
  template: `
    <div class="page">
      <div class="container" style="max-width:760px">
        @if (loading()) {
          <div class="loading-state"><div class="skeleton" style="height:2rem;width:50%;margin:0 auto"></div></div>
        } @else if (error()) {
          <div class="error-state">
            <h3>Obra no encontrada</h3>
            <p>{{ error() }}</p>
            <a routerLink="/exposiciones" class="btn btn-primary">Catálogo</a>
          </div>
        } @else if (art()) {
          @let a = art()!;
          <p class="text-sm mb-3">
            @if (a.exhibition) {
              <a [routerLink]="['/exposiciones', a.exhibition.id]">← {{ a.exhibition.title }}</a>
            } @else {
              <a routerLink="/exposiciones">← Exposiciones</a>
            }
          </p>
          <div class="cover-swatch mb-4" style="aspect-ratio:16/9;border-radius:var(--radius-lg)" [style.--hue]="coverHueStyle(a.coverHue)"></div>
          <h1>{{ a.title }}</h1>
          <p class="page-subtitle">
            {{ a.artist }}
            @if (a.yearLabel) { · {{ a.yearLabel }} }
          </p>
          <div class="row mb-4">
            @if (a.technique) {
              <span class="badge">{{ a.technique }}</span>
            }
            @if (a.room) {
              <span class="badge">{{ a.room }}</span>
            }
            @for (t of a.tags; track t) {
              <span class="badge">{{ t }}</span>
            }
          </div>
          <div class="card">
            <h2>Nota curatorial</h2>
            <p style="white-space:pre-wrap;color:var(--color-ink);margin:0">{{ a.curatorialNote }}</p>
          </div>
          @if (a.exhibition) {
            <div class="mt-4">
              <a class="btn btn-primary" [routerLink]="['/exposiciones', a.exhibition.id]">
                Reservar visita a la exposición
              </a>
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class ArtworkDetailPageComponent extends FormatBase implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly art = signal<Artwork | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error.set('Identificador inválido');
      this.loading.set(false);
      return;
    }
    this.api.artwork(id).subscribe({
      next: (a) => {
        this.art.set(a);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'No encontrada');
        this.loading.set(false);
      },
    });
  }
}
