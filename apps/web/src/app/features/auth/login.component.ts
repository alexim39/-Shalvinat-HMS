import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="login-page">
      <div class="login-panel card">
        <div class="brand" style="color: var(--ink); margin-bottom: 18px">
          <img src="/logo.jpeg" alt="Shalvinat logo" />
          <span>
            <strong>SHALVINAT HMS</strong>
            <small style="color: var(--muted)">Hospital Management System</small>
          </span>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
          <label class="full">
            Email
            <input type="email" formControlName="email" autocomplete="username" />
          </label>
          <label class="full">
            Password
            <input type="password" formControlName="password" autocomplete="current-password" />
          </label>

          @if (error()) {
            <p class="critical full">{{ error() }}</p>
          }

          <div class="actions full">
            <button class="primary-button" type="submit" [disabled]="form.invalid || loading()">
              {{ loading() ? 'Signing in...' : 'Sign in' }}
            </button>
          </div>
        </form>
      </div>
    </section>
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['director@shalvinat.local', [Validators.required, Validators.email]],
    password: ['Shalvinat@2026!', [Validators.required, Validators.minLength(8)]]
  });

  submit() {
    if (this.form.invalid) {
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => void this.router.navigate(['/dashboard']),
      error: (error) => {
        this.error.set(error?.error?.error?.message ?? 'Unable to sign in.');
        this.loading.set(false);
      }
    });
  }
}
