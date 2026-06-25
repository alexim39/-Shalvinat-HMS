import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ApiResponse, Pagination, Role } from '../../core/types';

type StaffAccountRole = Role;

@Component({
  selector: 'app-director',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page">
      <div class="page-header">
        <div>
          <h1>Director Dashboard</h1>
          <p>Executive visibility, staff onboarding and account governance</p>
        </div>
        <button class="ghost-button" type="button" (click)="load()">Refresh</button>
      </div>

      <div class="grid">
        @for (metric of metrics(); track metric.label) {
          <article class="card metric span-4">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
          </article>
        }
      </div>

      <div class="grid">
        <article class="card span-5">
          <h2>Onboard Staff User</h2>
          <form class="form-grid" [formGroup]="userForm" (ngSubmit)="onboardUser()">
            <label>
              Full name
              <input formControlName="fullName" />
            </label>
            <label>
              Role
              <select formControlName="role" (change)="applyRoleDefaults()">
                @for (role of roleOptions; track role.value) {
                  <option [value]="role.value">{{ role.label }}</option>
                }
              </select>
            </label>
            <label>
              Email
              <input type="email" formControlName="email" />
            </label>
            <label>
              Phone
              <input formControlName="phone" />
            </label>
            <label>
              Department
              <input formControlName="department" />
            </label>
            <label>
              Designation
              <input formControlName="designation" />
            </label>
            <label>
              Temporary password
              <input type="text" formControlName="password" />
            </label>
            <label>
              Status
              <select formControlName="status">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
            <label>
              Employment type
              <select formControlName="employmentType">
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
                <option value="contract">Contract</option>
                <option value="locum">Locum</option>
              </select>
            </label>
            <label>
              Start date
              <input type="date" formControlName="startDate" />
            </label>
            <label>
              Leave days
              <input type="number" formControlName="leaveBalanceDays" />
            </label>
            <label>
              Qualification
              <input formControlName="qualification" />
            </label>
            <label>
              Registration number
              <input formControlName="professionalRegistrationNumber" />
            </label>
            <label class="full checkbox-row">
              <input type="checkbox" formControlName="mustChangePassword" />
              Require password change at first sign in
            </label>
            <label class="full checkbox-row">
              <input type="checkbox" formControlName="createStaffRecord" />
              Add to staff registry
            </label>
            <div class="actions full">
              <button class="primary-button" type="submit" [disabled]="userForm.invalid">Create user</button>
            </div>
          </form>
        </article>

        <article class="card span-7">
          <h2>User Accounts</h2>
          <form class="list-tools" [formGroup]="userFilterForm" (ngSubmit)="loadUsers(1)">
            <input placeholder="Search name, email, department" formControlName="search" />
            <select formControlName="role">
              <option value="">All roles</option>
              @for (role of roleOptions; track role.value) {
                <option [value]="role.value">{{ role.label }}</option>
              }
            </select>
            <select formControlName="status">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="locked">Locked</option>
            </select>
            <button class="ghost-button" type="submit">Filter</button>
          </form>
          <div class="list">
            @for (user of users(); track user._id) {
              <div class="list-item">
                <div class="row">
                  <strong>{{ user.fullName }}</strong>
                  <span class="status">{{ user.status }}</span>
                </div>
                <span class="muted">
                  {{ user.email }} - {{ primaryRole(user) }} - {{ user.department || 'No department' }}
                </span>
                <div class="actions">
                  @if (user.status !== 'active') {
                    <button class="secondary-button" type="button" (click)="updateUserStatus(user, 'active')">Activate</button>
                  }
                  @if (user.status === 'active') {
                    <button class="ghost-button" type="button" (click)="updateUserStatus(user, 'suspended')">Suspend</button>
                  }
                  @if (user.status === 'locked') {
                    <button class="secondary-button" type="button" (click)="unlockUser(user)">Unlock</button>
                  }
                  <button class="ghost-button" type="button" (click)="resetPassword(user)">Reset password</button>
                </div>
              </div>
            } @empty {
              <p class="muted">No user accounts found.</p>
            }
          </div>
          <div class="pager">
            <span>{{ pageInfo(userPagination()) }}</span>
            <button class="ghost-button" type="button" [disabled]="userPagination().page <= 1" (click)="loadUsers(userPagination().page - 1)">Previous</button>
            <button class="ghost-button" type="button" [disabled]="userPagination().page >= userPagination().totalPages" (click)="loadUsers(userPagination().page + 1)">Next</button>
          </div>
        </article>
      </div>

      <div class="grid">
        <article class="card span-6">
          <h2>Department Volume</h2>
          <div class="list">
            @for (item of dashboard()?.departmentVolume || []; track item._id) {
              <div class="list-item">
                <div class="row">
                  <strong>{{ item._id || 'Unassigned' }}</strong>
                  <span class="tag">{{ item.count }}</span>
                </div>
              </div>
            } @empty {
              <p class="muted">No monthly activity yet.</p>
            }
          </div>
        </article>

        <article class="card span-6">
          <h2>Top Diagnoses</h2>
          <div class="list">
            @for (item of dashboard()?.topDiagnoses || []; track item._id) {
              <div class="list-item">
                <div class="row">
                  <strong>{{ item._id }}</strong>
                  <span class="tag">{{ item.count }}</span>
                </div>
              </div>
            } @empty {
              <p class="muted">No coded diagnoses yet.</p>
            }
          </div>
        </article>
      </div>

      <article class="card">
        <h2>Recent Audit Activity</h2>
        <div class="list">
          @for (log of auditLogs(); track log._id) {
            <div class="list-item">
              <div class="row">
                <strong>{{ log.actorEmail || 'system' }}</strong>
                <span class="status">{{ log.method }} {{ log.statusCode }}</span>
              </div>
              <span class="muted">{{ log.path }} - {{ log.createdAt | date: 'medium' }}</span>
            </div>
          } @empty {
            <p class="muted">No audit entries yet.</p>
          }
        </div>
      </article>
    </section>
  `
})
export class DirectorComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  readonly defaultPassword = 'Shalvinat@2026!';
  readonly dashboard = signal<any | null>(null);
  readonly auditLogs = signal<any[]>([]);
  readonly users = signal<any[]>([]);
  readonly userPagination = signal<Pagination>(this.emptyPagination());

  readonly roleOptions: Array<{ value: StaffAccountRole; label: string; department: string }> = [
    { value: 'reception', label: 'Reception', department: 'Reception' },
    { value: 'nurse', label: 'Nurse', department: 'Nursing' },
    { value: 'doctor', label: 'Doctor', department: 'OPD' },
    { value: 'pharmacy', label: 'Pharmacy', department: 'Pharmacy' },
    { value: 'laboratory', label: 'Laboratory', department: 'Laboratory' },
    { value: 'radiology', label: 'Radiology', department: 'Radiology' },
    { value: 'manager', label: 'Manager', department: 'Administration' },
    { value: 'accountant', label: 'Accountant', department: 'Accounting' },
    { value: 'accounts_manager', label: 'Accounts Manager', department: 'Accounting' },
    { value: 'director', label: 'Director', department: 'Executive' }
  ];

  readonly userForm = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    department: ['Reception'],
    designation: [''],
    role: ['reception' as StaffAccountRole, Validators.required],
    password: [this.defaultPassword, [Validators.required, Validators.minLength(8)]],
    status: ['active', Validators.required],
    mustChangePassword: [true],
    createStaffRecord: [true],
    employmentType: ['full_time', Validators.required],
    startDate: [this.todayInput(), Validators.required],
    leaveBalanceDays: [20, [Validators.required, Validators.min(0)]],
    qualification: [''],
    professionalRegistrationNumber: ['']
  });

  readonly userFilterForm = this.fb.nonNullable.group({
    search: [''],
    role: [''],
    status: ['']
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get<ApiResponse<any>>('/director/dashboard').subscribe((response) => this.dashboard.set(response.data));
    this.api.get<ApiResponse<any[]>>('/director/audit-logs', { limit: 25 }).subscribe((response) => this.auditLogs.set(response.data));
    this.loadUsers();
  }

  loadUsers(page = 1) {
    const filters = this.userFilterForm.getRawValue();
    this.api
      .get<ApiResponse<any[]>>('/admin/users', { ...filters, page, limit: 10 })
      .subscribe((response) => {
        this.users.set(response.data);
        this.userPagination.set(response.pagination ?? this.emptyPagination());
      });
  }

  onboardUser() {
    const raw = this.userForm.getRawValue();
    this.api
      .post<ApiResponse<any>>('/admin/users', {
        fullName: raw.fullName,
        email: raw.email,
        phone: raw.phone || undefined,
        department: raw.department || undefined,
        designation: raw.designation || undefined,
        roles: [raw.role],
        password: raw.password,
        status: raw.status,
        mustChangePassword: raw.mustChangePassword,
        twoFactorEnabled: false,
        createStaffRecord: raw.createStaffRecord,
        employmentType: raw.employmentType,
        startDate: raw.startDate,
        leaveBalanceDays: raw.leaveBalanceDays,
        qualification: raw.qualification || undefined,
        professionalRegistrationNumber: raw.professionalRegistrationNumber || undefined
      })
      .subscribe(() => {
        this.userForm.reset({
          fullName: '',
          email: '',
          phone: '',
          department: 'Reception',
          designation: '',
          role: 'reception',
          password: this.defaultPassword,
          status: 'active',
          mustChangePassword: true,
          createStaffRecord: true,
          employmentType: 'full_time',
          startDate: this.todayInput(),
          leaveBalanceDays: 20,
          qualification: '',
          professionalRegistrationNumber: ''
        });
        this.loadUsers();
      });
  }

  updateUserStatus(user: any, status: 'active' | 'inactive' | 'suspended' | 'locked') {
    this.api.patch<ApiResponse<any>>(`/admin/users/${user._id}`, { status }).subscribe(() => this.loadUsers());
  }

  unlockUser(user: any) {
    this.api.patch<ApiResponse<any>>(`/admin/users/${user._id}/unlock`, {}).subscribe(() => this.loadUsers());
  }

  resetPassword(user: any) {
    this.api
      .patch<ApiResponse<any>>(`/admin/users/${user._id}`, {
        password: this.defaultPassword,
        mustChangePassword: true,
        status: 'active'
      })
      .subscribe(() => this.loadUsers());
  }

  pageInfo(pagination: Pagination) {
    if (!pagination.total) {
      return 'No records';
    }

    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    return `${start}-${end} of ${pagination.total}`;
  }

  applyRoleDefaults() {
    const role = this.userForm.controls.role.value;
    const department = this.roleOptions.find((option) => option.value === role)?.department;

    if (department) {
      this.userForm.patchValue({ department });
    }
  }

  primaryRole(user: any) {
    return this.labelize(user.roles?.[0] ?? 'user');
  }

  labelize(value: string) {
    return value.replace(/_/g, ' ');
  }

  metrics() {
    const kpis = this.dashboard()?.kpis ?? {};
    return [
      { label: "Today's patients", value: kpis.todaysPatients ?? 0 },
      { label: 'Admissions', value: kpis.admissions ?? 0 },
      {
        label: 'Revenue today',
        value: new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(kpis.revenueToday ?? 0)
      },
      { label: 'Pending bills', value: kpis.pendingBills ?? 0 },
      { label: 'Bed occupancy', value: `${kpis.bedOccupancyRate ?? 0}%` },
      { label: 'Pending lab', value: kpis.pendingLab ?? 0 }
    ];
  }

  private todayInput() {
    return new Date().toISOString().slice(0, 10);
  }

  private emptyPagination(): Pagination {
    return {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1
    };
  }
}
