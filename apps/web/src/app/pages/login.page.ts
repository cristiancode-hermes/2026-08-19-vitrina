import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-layout">
      <aside class="auth-brand">
        <div class="auth-brand-inner">
          <span class="brand-mark" style="background:#F2F0EA;color:#0B5F52">V</span>
          <h1>Vitrina</h1>
          <p>Museo de colecciones. Entre con calma a sus salas y franjas.</p>
        </div>
        <div class="auth-brand-foot">Pátina de bronce · Madrid</div>
      </aside>
      <div class="auth-form-side">
        <div class="auth-form">
          <h2>Iniciar sesión</h2>
          <p class="lead text-muted">Acceda a sus visitas y favoritos.</p>
          <form (ngSubmit)="submit()" autocomplete="off">
            <div class="form-group">
              <label class="form-label" for="identifier">Usuario o email</label>
              <input
                id="identifier"
                class="input"
                name="identifier"
                type="text"
                autocomplete="off"
                [(ngModel)]="identifier"
                required
              />
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
              />
            </div>
            @if (error()) {
              <p class="form-error">{{ error() }}</p>
            }
            <button type="submit" class="btn btn-primary btn-block" [disabled]="busy()">
              {{ busy() ? 'Entrando…' : 'Entrar' }}
            </button>
          </form>
          <div class="auth-demo">
            <strong class="text-ink">Cuenta de prueba con datos</strong><br />
            <code>demo&#64;vitrina.dev</code> · <code>demo1234</code>
          </div>
          <p class="auth-switch">
            ¿Sin cuenta?
            <a routerLink="/registro">Registrarse</a>
            ·
            <a routerLink="/">Inicio</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginPageComponent {
  public readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected identifier = '';
  protected password = '';
  protected readonly error = signal('');
  protected readonly busy = signal(false);

  protected submit(): void {
    this.error.set('');
    this.busy.set(true);
    this.auth.login(this.identifier.trim(), this.password).subscribe({
      next: () => {
        this.busy.set(false);
        const ret = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
        void this.router.navigateByUrl(ret);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Credenciales inválidas');
        this.busy.set(false);
      },
    });
  }
}
