import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ApiResponse, Role, Visit } from '../../core/types';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="page">
      <div class="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>{{ auth.user()?.department || 'Hospital operations' }}</p>
        </div>
      </div>

      @if (directorDashboard()) {
        <div class="grid">
          <article class="card metric span-4">
            <span>Today's patients</span>
            <strong>{{ directorDashboard()?.kpis?.todaysPatients || 0 }}</strong>
          </article>
          <article class="card metric span-4">
            <span>Revenue today</span>
            <strong>{{ (directorDashboard()?.kpis?.revenueToday || 0) | currency: 'NGN' : 'symbol-narrow' }}</strong>
          </article>
          <article class="card metric span-4">
            <span>Bed occupancy</span>
            <strong>{{ directorDashboard()?.kpis?.bedOccupancyRate || 0 }}%</strong>
          </article>
        </div>
      }

      <div class="grid">
        @if (canViewQueue()) {
          <article class="card span-8">
            <div class="row">
              <h2>Active Queue</h2>
              @if (hasExactRole('reception')) {
                <a class="ghost-button" routerLink="/reception">Reception</a>
              }
            </div>
            <div class="list">
              @for (visit of queue(); track visit._id) {
                <div class="list-item">
                  <div class="row">
                    <strong>#{{ visit.queueNumber }} {{ patientName(visit) }}</strong>
                    <span class="status">{{ visit.status }}</span>
                  </div>
                  <span class="muted">{{ visit.visitNumber }} &middot; {{ visit.department }} &middot; {{ visit.paymentStatus }}</span>
                </div>
              } @empty {
                <p class="muted">No active queue records.</p>
              }
            </div>
          </article>
        }

        @if (hasExactRole('pharmacy')) {
          <article class="card span-8">
            <div class="row">
              <h2>Pharmacy Work</h2>
              <a class="ghost-button" routerLink="/pharmacy">Open pharmacy</a>
            </div>
            <div class="grid">
              <div class="metric span-4">
                <span>Pending prescriptions</span>
                <strong>{{ pharmacyPrescriptions().length }}</strong>
              </div>
              <div class="metric span-4">
                <span>Low stock</span>
                <strong>{{ stockAlerts()?.lowStock?.length || 0 }}</strong>
              </div>
              <div class="metric span-4">
                <span>Near expiry</span>
                <strong>{{ stockAlerts()?.nearExpiry?.length || 0 }}</strong>
              </div>
            </div>
          </article>
        }

        @if (hasExactRole('laboratory')) {
          <article class="card span-8">
            <div class="row">
              <h2>Laboratory Work</h2>
              <a class="ghost-button" routerLink="/lab">Open lab</a>
            </div>
            <div class="metric">
              <span>Active lab requests</span>
              <strong>{{ labRequests().length }}</strong>
            </div>
          </article>
        }

        @if (hasExactRole('radiology')) {
          <article class="card span-8">
            <div class="row">
              <h2>Radiology Work</h2>
              <a class="ghost-button" routerLink="/radiology">Open radiology</a>
            </div>
            <div class="metric">
              <span>Active imaging requests</span>
              <strong>{{ imagingRequests().length }}</strong>
            </div>
          </article>
        }

        @if (hasExactRole('manager')) {
          <article class="card span-8">
            <div class="row">
              <h2>Management Summary</h2>
              <a class="ghost-button" routerLink="/management">Open management</a>
            </div>
            <div class="grid">
              <div class="metric span-4">
                <span>Gross revenue</span>
                <strong>{{ (managerSummary()?.grossRevenue || 0) | currency: 'NGN' : 'symbol-narrow' }}</strong>
              </div>
              <div class="metric span-4">
                <span>Expenses</span>
                <strong>{{ (managerSummary()?.totalExpenses || 0) | currency: 'NGN' : 'symbol-narrow' }}</strong>
              </div>
              <div class="metric span-4">
                <span>Net position</span>
                <strong>{{ (managerSummary()?.netPosition || 0) | currency: 'NGN' : 'symbol-narrow' }}</strong>
              </div>
            </div>
          </article>
        }

        <article class="card span-4">
          <h2>Role Workstations</h2>
          <div class="list">
            @for (link of links; track link.path) {
              @if (auth.hasAnyRole(link.roles)) {
                <a class="list-item" [routerLink]="link.path">
                  <strong>{{ link.label }}</strong>
                  <span class="muted">{{ link.caption }}</span>
                </a>
              }
            }
          </div>
        </article>
      </div>
    </section>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly queue = signal<Visit[]>([]);
  readonly directorDashboard = signal<any | null>(null);
  readonly pharmacyPrescriptions = signal<any[]>([]);
  readonly stockAlerts = signal<any | null>(null);
  readonly labRequests = signal<any[]>([]);
  readonly imagingRequests = signal<any[]>([]);
  readonly managerSummary = signal<any | null>(null);

  readonly links = [
    { label: 'Reception', caption: 'Registration, appointments, billing', path: '/reception', roles: ['reception'] },
    { label: 'Nursing', caption: 'Triage, vitals, nursing notes', path: '/nursing', roles: ['nurse'] },
    { label: 'Doctor', caption: 'SOAP, prescriptions, investigations', path: '/doctor', roles: ['doctor'] },
    { label: 'Pharmacy', caption: 'Dispensing and stock alerts', path: '/pharmacy', roles: ['pharmacy'] },
    { label: 'Laboratory', caption: 'Samples, results, authorization', path: '/lab', roles: ['laboratory'] },
    { label: 'Radiology', caption: 'Imaging requests and reports', path: '/radiology', roles: ['radiology'] },
    { label: 'Management', caption: 'Finance, staff, beds and assets', path: '/management', roles: ['manager'] },
    { label: 'Accounting', caption: 'Payments, receivables, claims, vouchers', path: '/accounting', roles: ['accountant', 'accounts_manager'] },
    { label: 'Director', caption: 'Executive KPIs and audit visibility', path: '/director', roles: ['director'] },
  ] as const;

  ngOnInit() {
    if (this.canViewQueue()) {
      this.api.get<ApiResponse<Visit[]>>('/visits/queue').subscribe({
        next: (response) => this.queue.set(response.data),
        error: () => this.queue.set([]),
      });
    }

    if (this.hasExactRole('pharmacy')) {
      this.api
        .get<ApiResponse<any[]>>('/pharmacy/prescriptions', { status: 'pending' })
        .subscribe((response) => this.pharmacyPrescriptions.set(response.data));
      this.api.get<ApiResponse<any>>('/pharmacy/stock-alerts').subscribe((response) => this.stockAlerts.set(response.data));
    }

    if (this.hasExactRole('laboratory')) {
      this.api.get<ApiResponse<any[]>>('/lab/requests').subscribe((response) => this.labRequests.set(response.data));
    }

    if (this.hasExactRole('radiology')) {
      this.api.get<ApiResponse<any[]>>('/radiology/requests').subscribe((response) => this.imagingRequests.set(response.data));
    }

    if (this.hasExactRole('manager')) {
      this.api.get<ApiResponse<any>>('/management/financial-summary').subscribe((response) => this.managerSummary.set(response.data));
    }

    if (this.hasExactRole('director')) {
      this.api.get<ApiResponse<any>>('/director/dashboard').subscribe({
        next: (response) => this.directorDashboard.set(response.data),
      });
    }
  }

  canViewQueue() {
    return (
      this.hasExactRole('director') ||
      this.hasExactRole('reception') ||
      this.hasExactRole('nurse') ||
      this.hasExactRole('doctor')
    );
  }

  hasExactRole(role: Role) {
    return Boolean(this.auth.user()?.roles.includes(role));
  }

  patientName(visit: Visit) {
    return typeof visit.patient === 'string'
      ? visit.patient
      : `${visit.patient.firstName} ${visit.patient.lastName}`;
  }
}
