import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-register-page',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-layout">
      <aside class="auth-brand">
        <div class="auth-brand-inner">
          <span class="brand-mark" style="background:#F2F0EA;color:#0B5F52">V</span>
          <h1>Vitrina</h1>
          <p>Cree su cuenta de visitante y acumule puntos de socio.</p>
        </div>
        <div class="auth-brand-foot">Pátina de bronce · Madrid</div>
      </aside>
      <div class="auth-form-side">
        <div class="auth-form">
          <h2>Registro</h2>
          <p class="lead text-muted">Unos datos y ya puede reservar franjas.</p>
          <form (ngSubmit)="submit()" autocomplete="off">
            <div class="form-group">
              <label class="form-label" for="name">Nombre</label>
              <input id="name" class="input" name="name" autocomplete="off" [(ngModel)]="name" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="username">Usuario</label>
              <input id="username" class="input" name="username" autocomplete="off" [(ngModel)]="username" required minlength="3" />
            </div>
            <div class="form-group">
              <label class="form-label" for="email">Email</label>
              <input id="email" class="input" name="email" type="email" autocomplete="off" [(ngModel)]="email" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="password">Contraseña</label>
              <input
                id="password"
                class="input"
                name="password"
                type="password"
                autocomplete="new-password"
                [(ngModel)]="password"
                required
                minlength="6"
              />
            </div>
            @if (error()) {
              <p class="form-error">{{ error() }}</p>
            }
            <button type="submit" class="btn btn-primary btn-block" [disabled]="busy()">
              {{ busy() ? 'Creando…' : 'Crear cuenta' }}
            </button>
          </form>
          <div class="auth-demo">
            <strong class="text-ink">¿Solo explorar?</strong><br />
            Use la demo en el login:
            <code>demo&#64;vitrina.dev</code> · <code>demo1234</code>
          </div>
          <p class="auth-switch">
            ¿Ya tiene cuenta?
            <a routerLink="/login">Entrar</a>
            ·
            <a routerLink="/">Inicio</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterPageComponent {
  public readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected name = '';
  protected username = '';
  protected email = '';
  protected password = '';
  protected readonly error = signal('');
  protected readonly busy = signal(false);

  protected submit(): void {
    this.error.set('');
    this.busy.set(true);
    this.auth
      .register({
        name: this.name.trim(),
        username: this.username.trim(),
        email: this.email.trim(),
        password: this.password,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          void this.router.navigateByUrl('/');
        },
        error: (err) => {
          this.error.set(err?.error?.message || 'No se pudo registrar');
          this.busy.set(false);
        },
      });
  }
}
