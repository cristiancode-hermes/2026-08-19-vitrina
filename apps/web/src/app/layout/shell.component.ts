import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell">
      <header class="topnav">
        <div class="container topnav-inner">
          <a routerLink="/" class="brand" (click)="menuOpen.set(false)">
            <span class="brand-mark">V</span>
            <span>Vitrina</span>
          </a>

          <button
            type="button"
            class="nav-toggle"
            (click)="menuOpen.update((v) => !v)"
            [attr.aria-expanded]="menuOpen()"
            aria-label="Menú"
          >
            ☰
          </button>

          <ul class="nav-links" [class.open]="menuOpen()">
            <li>
              <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeMenu()">Inicio</a>
            </li>
            <li>
              <a routerLink="/exposiciones" routerLinkActive="active" (click)="closeMenu()">Exposiciones</a>
            </li>
            @if (auth.isAuthenticated()) {
              <li>
                <a routerLink="/mis-visitas" routerLinkActive="active" (click)="closeMenu()">Mis visitas</a>
              </li>
              <li>
                <a routerLink="/favoritos" routerLinkActive="active" (click)="closeMenu()">Favoritos</a>
              </li>
            }
            @if (auth.isAdmin()) {
              <li>
                <a routerLink="/admin" routerLinkActive="active" (click)="closeMenu()">Admin</a>
              </li>
            }
          </ul>

          <div class="nav-actions">
            <button type="button" class="btn btn-ghost btn-sm" (click)="theme.toggle()" [attr.aria-label]="theme.isDark() ? 'Modo claro' : 'Modo oscuro'">
              {{ theme.isDark() ? '☀' : '☾' }}
            </button>
            @if (auth.isAuthenticated()) {
              <span class="user-chip hide-sm">
                <strong>{{ auth.user()?.name }}</strong>
                <span>· {{ auth.user()?.points ?? 0 }} pts</span>
              </span>
              <button type="button" class="btn btn-secondary btn-sm" (click)="auth.logout()">Salir</button>
            } @else {
              <a routerLink="/login" class="btn btn-secondary btn-sm" (click)="closeMenu()">Entrar</a>
              <a routerLink="/registro" class="btn btn-primary btn-sm hide-sm" (click)="closeMenu()">Registro</a>
            }
          </div>
        </div>
      </header>

      <main class="app-main">
        <router-outlet />
      </main>

      <footer class="site-footer">
        <div class="container">
          <span>© Museo Vitrina — colecciones y franjas horarias</span>
          <span class="text-sm">Pátina de bronce · Madrid</span>
        </div>
      </footer>
    </div>
  `,
})
export class ShellComponent implements OnInit {
  public readonly auth = inject(AuthService);
  public readonly theme = inject(ThemeService);
  protected readonly menuOpen = signal(false);

  ngOnInit(): void {
    this.auth.bootstrap();
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
