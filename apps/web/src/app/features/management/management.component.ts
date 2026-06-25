import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ApiResponse, Pagination, Role } from '../../core/types';

type ManagerTab = 'finance' | 'staff' | 'beds' | 'assets';

@Component({
  selector: 'app-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page">
      <div class="page-header">
        <div>
          <h1>Management</h1>
          <p>Finance oversight, staff registry, beds, assets and operational controls</p>
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

      <div class="tabs" role="tablist" aria-label="Management sections">
        <button type="button" [class.active]="activeTab() === 'finance'" (click)="activeTab.set('finance')">Finance</button>
        <button type="button" [class.active]="activeTab() === 'staff'" (click)="activeTab.set('staff')">Staff</button>
        <button type="button" [class.active]="activeTab() === 'beds'" (click)="activeTab.set('beds')">Beds</button>
        <button type="button" [class.active]="activeTab() === 'assets'" (click)="activeTab.set('assets')">Assets</button>
      </div>

      @if (activeTab() === 'finance') {
        <div class="grid">
          <article class="card span-5">
            <h2>Record Expense</h2>
            <form class="form-grid" [formGroup]="expenseForm" (ngSubmit)="recordExpense()">
              <label>
                Category
                <select formControlName="category">
                  <option value="salaries">Salaries</option>
                  <option value="drugs_consumables">Drugs and consumables</option>
                  <option value="utilities">Utilities</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="vendor_payment">Vendor payment</option>
                  <option value="miscellaneous">Miscellaneous</option>
                </select>
              </label>
              <label>
                Amount
                <input type="number" formControlName="amount" />
              </label>
              <label>
                Date incurred
                <input type="date" formControlName="incurredAt" />
              </label>
              <label>
                Receipt URL
                <input formControlName="receiptUrl" />
              </label>
              <label class="full">
                Description
                <textarea formControlName="description"></textarea>
              </label>
              <div class="actions full">
                <button class="primary-button" type="submit" [disabled]="expenseForm.invalid">Save expense</button>
              </div>
            </form>
          </article>

          <article class="card span-7">
            <h2>Recent Expenses</h2>
            <form class="list-tools" [formGroup]="expenseFilterForm" (ngSubmit)="loadExpenses(1)">
              <input placeholder="Search expenses" formControlName="search" />
              <select formControlName="category">
                <option value="">All categories</option>
                <option value="salaries">Salaries</option>
                <option value="drugs_consumables">Drugs and consumables</option>
                <option value="utilities">Utilities</option>
                <option value="maintenance">Maintenance</option>
                <option value="vendor_payment">Vendor payment</option>
                <option value="miscellaneous">Miscellaneous</option>
              </select>
              <button class="ghost-button" type="submit">Filter</button>
            </form>
            <div class="list">
              @for (expense of expenses(); track expense._id) {
                <div class="list-item">
                  <div class="row">
                    <strong>{{ labelize(expense.category) }}</strong>
                    <span class="status">{{ expense.amount | currency: 'NGN' : 'symbol-narrow' }}</span>
                  </div>
                  <span class="muted">{{ expense.description }} - {{ expense.incurredAt | date: 'mediumDate' }}</span>
                </div>
              } @empty {
                <p class="muted">No expenses recorded yet.</p>
              }
            </div>
            <div class="pager">
              <span>{{ pageInfo(expensePagination()) }}</span>
              <button class="ghost-button" type="button" [disabled]="expensePagination().page <= 1" (click)="loadExpenses(expensePagination().page - 1)">Previous</button>
              <button class="ghost-button" type="button" [disabled]="expensePagination().page >= expensePagination().totalPages" (click)="loadExpenses(expensePagination().page + 1)">Next</button>
            </div>
          </article>

          <article class="card span-12">
            <h2>Billing Oversight</h2>
            <form class="list-tools" [formGroup]="invoiceFilterForm" (ngSubmit)="loadInvoices(1)">
              <input placeholder="Search invoice number" formControlName="search" />
              <select formControlName="status">
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="void">Void</option>
              </select>
              <button class="ghost-button" type="submit">Filter</button>
            </form>
            <div class="list">
              @for (invoice of invoices(); track invoice._id) {
                <div class="list-item">
                  <div class="row">
                    <strong>{{ invoice.invoiceNumber }}</strong>
                    <span class="status">{{ invoice.status }}</span>
                  </div>
                  <span class="muted">
                    {{ patientName(invoice.patient) }} - balance
                    {{ invoice.balance | currency: 'NGN' : 'symbol-narrow' }}
                  </span>
                </div>
              } @empty {
                <p class="muted">No invoices match the current filter.</p>
              }
            </div>
            <div class="pager">
              <span>{{ pageInfo(invoicePagination()) }}</span>
              <button class="ghost-button" type="button" [disabled]="invoicePagination().page <= 1" (click)="loadInvoices(invoicePagination().page - 1)">Previous</button>
              <button class="ghost-button" type="button" [disabled]="invoicePagination().page >= invoicePagination().totalPages" (click)="loadInvoices(invoicePagination().page + 1)">Next</button>
            </div>
          </article>
        </div>
      }

      @if (activeTab() === 'staff') {
        <div class="grid">
          <article class="card span-5">
            <h2>Add Staff Record</h2>
            <form class="form-grid" [formGroup]="staffForm" (ngSubmit)="addStaff()">
              <label>
                Full name
                <input formControlName="fullName" />
              </label>
              <label>
                Role
                <select formControlName="role" (change)="applyStaffRoleDefaults()">
                  @for (role of staffRoles; track role.value) {
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
              @if (canEnablePlatformAccess()) {
                <label class="full checkbox-row">
                  <input type="checkbox" formControlName="createPlatformUser" />
                  Enable platform login
                </label>
                @if (staffForm.controls.createPlatformUser.value) {
                  <label>
                    Temporary password
                    <input type="text" formControlName="password" />
                  </label>
                  <label class="checkbox-row">
                    <input type="checkbox" formControlName="mustChangePassword" />
                    Require password change
                  </label>
                }
              }
              <div class="actions full">
                <button class="primary-button" type="submit" [disabled]="!canSaveStaff()">Save staff record</button>
              </div>
            </form>
          </article>

          <article class="card span-7">
            <h2>Staff Registry</h2>
            <form class="list-tools" [formGroup]="staffFilterForm" (ngSubmit)="loadStaff(1)">
              <input placeholder="Search name, email, department" formControlName="search" />
              <select formControlName="role">
                <option value="">All roles</option>
                @for (role of staffRoles; track role.value) {
                  <option [value]="role.value">{{ role.label }}</option>
                }
              </select>
              <select formControlName="status">
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="on_leave">On leave</option>
                <option value="inactive">Inactive</option>
              </select>
              <button class="ghost-button" type="submit">Filter</button>
            </form>
            <div class="list">
              @for (member of staff(); track member._id) {
                <div class="list-item">
                  <div class="row">
                    <strong>{{ member.fullName }}</strong>
                    <span class="status">{{ member.status }}</span>
                  </div>
                  <span class="muted">
                    {{ labelize(member.role) }} - {{ member.department }} - {{ labelize(member.employmentType) }}
                  </span>
                  @if (member.email) {
                    <span class="muted">{{ member.email }} - {{ member.platformAccessEnabled ? 'platform access enabled' : 'staff record only' }}</span>
                  }
                  <div class="actions">
                    @if (member.status === 'active') {
                      <button class="ghost-button" type="button" (click)="updateStaffStatus(member, 'on_leave')">Mark on leave</button>
                    }
                    @if (member.status === 'on_leave') {
                      <button class="secondary-button" type="button" (click)="updateStaffStatus(member, 'active')">Return active</button>
                    }
                    @if (isDirector() && member.status !== 'inactive') {
                      <button class="danger-button" type="button" (click)="updateStaffStatus(member, 'inactive')">Deactivate staff</button>
                    }
                    @if (isDirector() && member.status === 'inactive') {
                      <button class="secondary-button" type="button" (click)="updateStaffStatus(member, 'active')">Reactivate staff</button>
                    }
                  </div>
                </div>
              } @empty {
                <p class="muted">No staff records yet.</p>
              }
            </div>
            <div class="pager">
              <span>{{ pageInfo(staffPagination()) }}</span>
              <button class="ghost-button" type="button" [disabled]="staffPagination().page <= 1" (click)="loadStaff(staffPagination().page - 1)">Previous</button>
              <button class="ghost-button" type="button" [disabled]="staffPagination().page >= staffPagination().totalPages" (click)="loadStaff(staffPagination().page + 1)">Next</button>
            </div>
          </article>
        </div>
      }

      @if (activeTab() === 'beds') {
        <div class="grid">
          <article class="card span-5">
            <h2>Add Bed</h2>
            <form class="form-grid" [formGroup]="bedForm" (ngSubmit)="addBed()">
              <label>
                Ward
                <input formControlName="ward" />
              </label>
              <label>
                Bed number
                <input formControlName="bedNumber" />
              </label>
              <label>
                Category
                <select formControlName="category">
                  <option value="general">General</option>
                  <option value="private">Private</option>
                  <option value="semi_private">Semi private</option>
                  <option value="icu">ICU</option>
                  <option value="maternity">Maternity</option>
                  <option value="paediatric">Paediatric</option>
                </select>
              </label>
              <label>
                Status
                <select formControlName="status">
                  <option value="vacant">Vacant</option>
                  <option value="occupied">Occupied</option>
                  <option value="under_cleaning">Under cleaning</option>
                  <option value="reserved">Reserved</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </label>
              <div class="actions full">
                <button class="primary-button" type="submit" [disabled]="bedForm.invalid">Save bed</button>
              </div>
            </form>
          </article>

          <article class="card span-7">
            <h2>Bed Board</h2>
            <form class="list-tools" [formGroup]="bedFilterForm" (ngSubmit)="loadBeds(1)">
              <input placeholder="Search ward or bed" formControlName="search" />
              <select formControlName="status">
                <option value="">All statuses</option>
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
                <option value="under_cleaning">Under cleaning</option>
                <option value="reserved">Reserved</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <button class="ghost-button" type="submit">Filter</button>
            </form>
            <div class="list">
              @for (bed of beds(); track bed._id) {
                <div class="list-item">
                  <div class="row">
                    <strong>{{ bed.ward }} {{ bed.bedNumber }}</strong>
                    <span class="status">{{ labelize(bed.status) }}</span>
                  </div>
                  <span class="muted">
                    {{ labelize(bed.category) }}
                    @if (bed.currentPatient) {
                      - {{ patientName(bed.currentPatient) }}
                    }
                  </span>
                </div>
              } @empty {
                <p class="muted">No beds configured yet.</p>
              }
            </div>
            <div class="pager">
              <span>{{ pageInfo(bedPagination()) }}</span>
              <button class="ghost-button" type="button" [disabled]="bedPagination().page <= 1" (click)="loadBeds(bedPagination().page - 1)">Previous</button>
              <button class="ghost-button" type="button" [disabled]="bedPagination().page >= bedPagination().totalPages" (click)="loadBeds(bedPagination().page + 1)">Next</button>
            </div>
          </article>
        </div>
      }

      @if (activeTab() === 'assets') {
        <div class="grid">
          <article class="card span-5">
            <h2>Add Asset</h2>
            <form class="form-grid" [formGroup]="assetForm" (ngSubmit)="addAsset()">
              <label>
                Name
                <input formControlName="name" />
              </label>
              <label>
                Category
                <input formControlName="category" />
              </label>
              <label>
                Location
                <input formControlName="location" />
              </label>
              <label>
                Serial number
                <input formControlName="serialNumber" />
              </label>
              <label>
                Purchase date
                <input type="date" formControlName="purchaseDate" />
              </label>
              <label>
                Warranty expiry
                <input type="date" formControlName="warrantyExpiry" />
              </label>
              <label>
                Status
                <select formControlName="status">
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
              </label>
              <div class="actions full">
                <button class="primary-button" type="submit" [disabled]="assetForm.invalid">Save asset</button>
              </div>
            </form>
          </article>

          <article class="card span-7">
            <h2>Asset Register</h2>
            <form class="list-tools" [formGroup]="assetFilterForm" (ngSubmit)="loadAssets(1)">
              <input placeholder="Search assets" formControlName="search" />
              <select formControlName="status">
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select>
              <button class="ghost-button" type="submit">Filter</button>
            </form>
            <div class="list">
              @for (asset of assets(); track asset._id) {
                <div class="list-item">
                  <div class="row">
                    <strong>{{ asset.name }}</strong>
                    <span class="status">{{ asset.status }}</span>
                  </div>
                  <span class="muted">
                    {{ asset.category }} - {{ asset.location }}
                    @if (asset.warrantyExpiry) {
                      - warranty {{ asset.warrantyExpiry | date: 'mediumDate' }}
                    }
                  </span>
                </div>
              } @empty {
                <p class="muted">No assets recorded yet.</p>
              }
            </div>
            <div class="pager">
              <span>{{ pageInfo(assetPagination()) }}</span>
              <button class="ghost-button" type="button" [disabled]="assetPagination().page <= 1" (click)="loadAssets(assetPagination().page - 1)">Previous</button>
              <button class="ghost-button" type="button" [disabled]="assetPagination().page >= assetPagination().totalPages" (click)="loadAssets(assetPagination().page + 1)">Next</button>
            </div>
          </article>
        </div>
      }
    </section>
  `
})
export class ManagementComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  readonly defaultPassword = 'Shalvinat@2026!';

  readonly activeTab = signal<ManagerTab>('finance');
  readonly financialSummary = signal<any | null>(null);
  readonly billingSummary = signal<any | null>(null);
  readonly invoices = signal<any[]>([]);
  readonly staff = signal<any[]>([]);
  readonly expenses = signal<any[]>([]);
  readonly beds = signal<any[]>([]);
  readonly assets = signal<any[]>([]);
  readonly staffPagination = signal<Pagination>(this.emptyPagination());
  readonly invoicePagination = signal<Pagination>(this.emptyPagination());
  readonly expensePagination = signal<Pagination>(this.emptyPagination());
  readonly bedPagination = signal<Pagination>(this.emptyPagination());
  readonly assetPagination = signal<Pagination>(this.emptyPagination());

  readonly staffRoles: Array<{ value: Role; label: string; department: string }> = [
    { value: 'reception', label: 'Reception', department: 'Reception' },
    { value: 'nurse', label: 'Nurse', department: 'Nursing' },
    { value: 'doctor', label: 'Doctor', department: 'OPD' },
    { value: 'pharmacy', label: 'Pharmacy', department: 'Pharmacy' },
    { value: 'laboratory', label: 'Laboratory', department: 'Laboratory' },
    { value: 'radiology', label: 'Radiology', department: 'Radiology' },
    { value: 'manager', label: 'Manager', department: 'Administration' },
    { value: 'director', label: 'Director', department: 'Executive' }
  ];

  readonly expenseForm = this.fb.nonNullable.group({
    category: ['utilities', Validators.required],
    description: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(1)]],
    incurredAt: [this.todayInput(), Validators.required],
    receiptUrl: ['']
  });

  readonly staffFilterForm = this.fb.nonNullable.group({
    search: [''],
    role: [''],
    status: ['']
  });

  readonly invoiceFilterForm = this.fb.nonNullable.group({
    search: [''],
    status: ['']
  });

  readonly expenseFilterForm = this.fb.nonNullable.group({
    search: [''],
    category: ['']
  });

  readonly bedFilterForm = this.fb.nonNullable.group({
    search: [''],
    status: ['']
  });

  readonly assetFilterForm = this.fb.nonNullable.group({
    search: [''],
    status: ['']
  });

  readonly staffForm = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    role: ['nurse' as Role, Validators.required],
    email: ['', Validators.email],
    phone: [''],
    department: ['Nursing', Validators.required],
    designation: [''],
    qualification: [''],
    professionalRegistrationNumber: [''],
    employmentType: ['full_time', Validators.required],
    startDate: [this.todayInput(), Validators.required],
    leaveBalanceDays: [0, [Validators.required, Validators.min(0)]],
    createPlatformUser: [false],
    password: [this.defaultPassword, Validators.minLength(8)],
    mustChangePassword: [true]
  });

  readonly bedForm = this.fb.nonNullable.group({
    ward: ['General Ward', Validators.required],
    bedNumber: ['', Validators.required],
    category: ['general', Validators.required],
    status: ['vacant', Validators.required]
  });

  readonly assetForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    category: ['', Validators.required],
    location: ['', Validators.required],
    serialNumber: [''],
    purchaseDate: [''],
    warrantyExpiry: [''],
    status: ['active', Validators.required]
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.loadFinance();
    this.loadStaff();
    this.loadBeds();
    this.loadAssets();
  }

  loadFinance() {
    this.api.get<ApiResponse<any>>('/management/financial-summary').subscribe((response) => this.financialSummary.set(response.data));
    this.api.get<ApiResponse<any>>('/billing/summary').subscribe((response) => this.billingSummary.set(response.data));
    this.loadInvoices();
    this.loadExpenses();
  }

  loadStaff(page = 1) {
    const filters = this.staffFilterForm.getRawValue();
    this.api
      .get<ApiResponse<any[]>>('/management/staff', { ...filters, page, limit: 10 })
      .subscribe((response) => {
        this.staff.set(response.data);
        this.staffPagination.set(response.pagination ?? this.emptyPagination());
      });
  }

  loadInvoices(page = 1) {
    const filters = this.invoiceFilterForm.getRawValue();
    this.api
      .get<ApiResponse<any[]>>('/billing/invoices', { ...filters, page, limit: 10 })
      .subscribe((response) => {
        this.invoices.set(response.data);
        this.invoicePagination.set(response.pagination ?? this.emptyPagination());
      });
  }

  loadExpenses(page = 1) {
    const filters = this.expenseFilterForm.getRawValue();
    this.api
      .get<ApiResponse<any[]>>('/management/expenses', { ...filters, page, limit: 10 })
      .subscribe((response) => {
        this.expenses.set(response.data);
        this.expensePagination.set(response.pagination ?? this.emptyPagination());
      });
  }

  loadBeds(page = 1) {
    const filters = this.bedFilterForm.getRawValue();
    this.api
      .get<ApiResponse<any[]>>('/management/beds', { ...filters, page, limit: 12 })
      .subscribe((response) => {
        this.beds.set(response.data);
        this.bedPagination.set(response.pagination ?? this.emptyPagination());
      });
  }

  loadAssets(page = 1) {
    const filters = this.assetFilterForm.getRawValue();
    this.api
      .get<ApiResponse<any[]>>('/management/assets', { ...filters, page, limit: 12 })
      .subscribe((response) => {
        this.assets.set(response.data);
        this.assetPagination.set(response.pagination ?? this.emptyPagination());
      });
  }

  recordExpense() {
    const raw = this.expenseForm.getRawValue();
    this.api
      .post<ApiResponse<any>>('/management/expenses', {
        ...raw,
        receiptUrl: raw.receiptUrl || undefined
      })
      .subscribe(() => {
        this.expenseForm.reset({
          category: 'utilities',
          description: '',
          amount: 0,
          incurredAt: this.todayInput(),
          receiptUrl: ''
        });
        this.loadFinance();
      });
  }

  addStaff() {
    const raw = this.staffForm.getRawValue();
    const createPlatformUser = raw.createPlatformUser && this.canEnablePlatformAccess();

    this.api
      .post<ApiResponse<any>>('/management/staff', {
        ...raw,
        createPlatformUser,
        qualification: raw.qualification || undefined,
        professionalRegistrationNumber: raw.professionalRegistrationNumber || undefined,
        email: raw.email || undefined,
        phone: raw.phone || undefined,
        designation: raw.designation || undefined,
        password: createPlatformUser ? raw.password : undefined,
        mustChangePassword: raw.mustChangePassword
      })
      .subscribe(() => {
        this.staffForm.reset({
          fullName: '',
          role: 'nurse',
          email: '',
          phone: '',
          department: 'Nursing',
          designation: '',
          qualification: '',
          professionalRegistrationNumber: '',
          employmentType: 'full_time',
          startDate: this.todayInput(),
          leaveBalanceDays: 0,
          createPlatformUser: false,
          password: this.defaultPassword,
          mustChangePassword: true
        });
        this.loadStaff();
      });
  }

  updateStaffStatus(member: any, status: 'active' | 'on_leave' | 'inactive') {
    this.api
      .patch<ApiResponse<any>>(`/management/staff/${member._id}/status`, {
        status,
        disablePlatformAccess: status === 'inactive'
      })
      .subscribe(() => this.loadStaff(this.staffPagination().page));
  }

  applyStaffRoleDefaults() {
    const role = this.staffForm.controls.role.value;
    const department = this.staffRoles.find((option) => option.value === role)?.department;

    if (department) {
      this.staffForm.patchValue({ department });
    }

    if (!this.canEnablePlatformAccess()) {
      this.staffForm.patchValue({ createPlatformUser: false });
    }
  }

  canEnablePlatformAccess() {
    const selectedRole = this.staffForm.controls.role.value;
    return selectedRole !== 'director' || Boolean(this.auth.user()?.roles.includes('director'));
  }

  canSaveStaff() {
    const raw = this.staffForm.getRawValue();
    return (
      this.staffForm.valid &&
      (!raw.createPlatformUser ||
        (this.canEnablePlatformAccess() && Boolean(raw.email) && Boolean(raw.password) && raw.password.length >= 8))
    );
  }

  isDirector() {
    return Boolean(this.auth.user()?.roles.includes('director'));
  }

  pageInfo(pagination: Pagination) {
    if (!pagination.total) {
      return 'No records';
    }

    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = Math.min(pagination.page * pagination.limit, pagination.total);
    return `${start}-${end} of ${pagination.total}`;
  }

  private emptyPagination(): Pagination {
    return {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1
    };
  }

  addBed() {
    this.api.post<ApiResponse<any>>('/management/beds', this.bedForm.getRawValue()).subscribe(() => {
      this.bedForm.reset({
        ward: 'General Ward',
        bedNumber: '',
        category: 'general',
        status: 'vacant'
      });
      this.loadBeds();
    });
  }

  addAsset() {
    const raw = this.assetForm.getRawValue();
    this.api
      .post<ApiResponse<any>>('/management/assets', {
        ...raw,
        serialNumber: raw.serialNumber || undefined,
        purchaseDate: raw.purchaseDate || undefined,
        warrantyExpiry: raw.warrantyExpiry || undefined
      })
      .subscribe(() => {
        this.assetForm.reset({
          name: '',
          category: '',
          location: '',
          serialNumber: '',
          purchaseDate: '',
          warrantyExpiry: '',
          status: 'active'
        });
        this.loadAssets();
      });
  }

  metrics() {
    const financial = this.financialSummary() ?? {};
    const billing = this.billingSummary() ?? {};
    return [
      {
        label: 'Month revenue',
        value: new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(financial.grossRevenue ?? 0)
      },
      {
        label: 'Month expenses',
        value: new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(financial.totalExpenses ?? 0)
      },
      {
        label: 'Net position',
        value: new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(financial.netPosition ?? 0)
      },
      { label: 'Pending bills', value: billing.pendingBills ?? 0 },
      { label: 'Vacant beds', value: this.beds().filter((bed) => bed.status === 'vacant').length },
      { label: 'Active staff', value: this.staff().filter((member) => member.status === 'active').length }
    ];
  }

  openInvoices() {
    return this.invoices().filter((invoice) => ['pending', 'partial'].includes(invoice.status));
  }

  patientName(patient: any) {
    if (!patient) {
      return 'No patient';
    }

    if (typeof patient === 'string') {
      return patient;
    }

    return patient.patientNumber
      ? `${patient.patientNumber} ${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim()
      : `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim();
  }

  labelize(value: string) {
    return value.replace(/_/g, ' ');
  }

  private todayInput() {
    return new Date().toISOString().slice(0, 10);
  }
}
