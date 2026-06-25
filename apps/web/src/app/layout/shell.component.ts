import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Role } from '../core/types';
import { UiFeedbackService } from '../core/ui-feedback.service';
import { FeedbackToastComponent } from './feedback-toast.component';

type NavItem = {
  label: string;
  path: string;
  roles: Role[];
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FeedbackToastComponent],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <a class="brand" routerLink="/dashboard" aria-label="Shalvinat dashboard">
          <img src="/logo.jpeg" alt="Shalvinat logo" />
          <span>
            <strong>SHALVINAT</strong>
            <small>Healthcare HMS</small>
          </span>
        </a>

        <nav aria-label="Main navigation">
          @for (item of visibleNav(); track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active">{{ item.label }}</a>
          }
        </nav>
      </aside>

      <section class="workspace">
        @if (feedback.isBusy()) {
          <div class="request-bar" aria-hidden="true"></div>
        }

        <header class="topbar">
          <div class="topbar-left">
            @if (showBack()) {
              <button type="button" class="back-button" aria-label="Go back" (click)="goBack()">
                <span aria-hidden="true">&larr;</span>
                Back
              </button>
            }
            <div>
              <strong>Shalvinat Healthcare Limited</strong>
              <span>Bonny Island, Rivers State</span>
            </div>
          </div>
          <div class="account">
            @if (feedback.statusText()) {
              <span class="saving-status" role="status">{{ feedback.statusText() }}</span>
            }
            <span class="role">{{ auth.user()?.roles?.join(', ') }}</span>
            <span>{{ auth.user()?.fullName }}</span>
            <button type="button" class="ghost-button" (click)="logout()">Logout</button>
          </div>
        </header>

        <main>
          <router-outlet />
        </main>

        <app-feedback-toast />
      </section>
    </div>
  `,
  styles: [`
  .brand img {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    object-fit: cover;
  }
  `]
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly feedback = inject(UiFeedbackService);
  private readonly router = inject(Router);
  private readonly currentUrl = signal(this.router.url);
  private readonly previousUrl = signal<string | null>(null);

  private readonly navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', roles: ['reception', 'nurse', 'doctor', 'pharmacy', 'laboratory', 'radiology', 'manager', 'director'] },
    { label: 'Reception', path: '/reception', roles: ['reception'] },
    { label: 'Nursing', path: '/nursing', roles: ['nurse'] },
    { label: 'Doctor', path: '/doctor', roles: ['doctor'] },
    { label: 'Pharmacy', path: '/pharmacy', roles: ['pharmacy'] },
    { label: 'Laboratory', path: '/lab', roles: ['laboratory'] },
    { label: 'Radiology', path: '/radiology', roles: ['radiology'] },
    { label: 'Management', path: '/management', roles: ['manager'] },
    { label: 'Director', path: '/director', roles: ['director'] }
  ];

  readonly visibleNav = computed(() => this.navItems.filter((item) => this.auth.hasAnyRole(item.roles)));
  readonly showBack = computed(() => !['/', '/dashboard'].includes(this.currentUrl().split('?')[0]));

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const current = this.currentUrl();
        const next = event.urlAfterRedirects;

        if (current !== next && current !== '/login') {
          this.previousUrl.set(current);
        }

        this.currentUrl.set(next);
      }
    });
  }

  goBack() {
    const previous = this.previousUrl();

    if (previous && previous !== this.currentUrl() && previous !== '/login') {
      void this.router.navigateByUrl(previous);
      return;
    }

    void this.router.navigate(['/dashboard']);
  }

  logout() {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
