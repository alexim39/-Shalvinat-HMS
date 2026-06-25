import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ApiResponse, Pagination } from '../../core/types';

@Component({
  selector: 'app-accounting',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page">
      <div class="page-header">
        <div>
          <h1>Accounting</h1>
          <p>Financial operations, receivables, claims &amp; reports</p>
        </div>
      </div>

      <div class="tabs">
        @for (tab of tabs; track tab.key) {
          <button [class.active]="activeTab() === tab.key" (click)="activeTab.set(tab.key)">{{ tab.label }}</button>
        }
      </div>

      @switch (activeTab()) {
        @case ('payments') {
          <div class="grid">
            <article class="card span-7">
              <h2>Record Payment</h2>
              <form [formGroup]="paymentForm" (ngSubmit)="submitPayment()" class="form-grid">
                <label class="full">
                  Patient ID
                  <input formControlName="patient" placeholder="Patient ID" />
                </label>
                <label>
                  Amount (NGN)
                  <input type="number" formControlName="amount" />
                </label>
                <label>
                  Method
                  <select formControlName="method">
                    <option value="cash">Cash</option>
                    <option value="pos">POS</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="hmo">HMO</option>
                    <option value="nhia">NHIA</option>
                    <option value="online">Online</option>
                  </select>
                </label>
                <label class="full">
                  Reference
                  <input formControlName="reference" placeholder="Optional" />
                </label>
                <label class="full">
                  Invoice (optional)
                  <input formControlName="invoice" placeholder="Invoice ID" />
                </label>
                <label class="full">
                  Notes
                  <input formControlName="notes" placeholder="Optional notes" />
                </label>
                <div class="actions full">
                  <button class="primary-button" type="submit" [disabled]="paymentForm.invalid || saving()">Record Payment</button>
                </div>
              </form>
              @if (lastPaymentResponse()) {
                <p [class.success]="!lastPaymentResponse()?.authorization_required" [class.warning]="lastPaymentResponse()?.authorization_required" style="margin-top:10px">
                  Payment {{ lastPaymentResponse()?.authorization_required ? 'pending director authorization (amount > ₦100,000)' : 'recorded successfully' }}
                </p>
              }
            </article>

            <article class="card span-5">
              <h2>Recent Payments</h2>
              <div class="list">
                @for (p of payments(); track p._id) {
                  <div class="list-item">
                    <div class="row">
                      <strong>{{ p.receiptNumber }}</strong>
                      <span class="status">{{ p.status }}</span>
                    </div>
                    <span class="muted">NGN {{ p.amount?.toLocaleString() }} &middot; {{ p.method }} &middot; {{ p.createdAt | date:'short' }}</span>
                  </div>
                } @empty {
                  <p class="muted">No payments recorded.</p>
                }
              </div>
            </article>
          </div>
        }

        @case ('invoices') {
          <article class="card">
            <h2>Invoice Queue</h2>
            <div class="list-tools">
              <input placeholder="Search invoice number..." />
              <select>
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="draft">Draft</option>
              </select>
              <button class="ghost-button" (click)="loadInvoices()">Refresh</button>
            </div>
            <div class="list">
              @for (inv of invoices(); track inv._id) {
                <div class="list-item">
                  <div class="row">
                    <strong>{{ inv.invoiceNumber }}</strong>
                    <span class="status">{{ inv.status }}</span>
                  </div>
                  <span class="muted">Total: NGN {{ inv.total?.toLocaleString() }} &middot; Paid: NGN {{ inv.amountPaid?.toLocaleString() }} &middot; Balance: NGN {{ inv.balance?.toLocaleString() }}</span>
                </div>
              } @empty {
                <p class="muted">No invoices found.</p>
              }
            </div>
            <div class="pager">
              <span>{{ pageInfo(invoicesPagination()) }}</span>
            </div>
          </article>
        }

        @case ('receivables') {
          <div class="grid">
            <article class="card span-6">
              <h2>Aging Report</h2>
              <div class="list">
                @for (bucket of agingReport(); track bucket._id) {
                  <div class="list-item">
                    <strong>{{ bucket._id === '0_30' ? '0-30 days' : bucket._id === '31_60' ? '31-60 days' : bucket._id === '61_90' ? '61-90 days' : '91+ days' }}</strong>
                    <span class="muted">{{ bucket.count }} receivables &middot; NGN {{ bucket.totalOutstanding?.toLocaleString() }}</span>
                  </div>
                } @empty {
                  <p class="muted">No outstanding receivables.</p>
                }
              </div>
            </article>
            <article class="card span-6">
              <h2>Outstanding Receivables</h2>
              <div class="list">
                @for (r of receivables(); track r._id) {
                  <div class="list-item">
                    <div class="row">
                      <strong>{{ r.patient?.firstName }} {{ r.patient?.lastName }}</strong>
                      <span>NGN {{ r.amountOutstanding?.toLocaleString() }}</span>
                    </div>
                    <span class="muted">{{ r.daysOutstanding }} days &middot; Invoice {{ r.invoice?.invoiceNumber }}</span>
                  </div>
                } @empty {
                  <p class="muted">No receivables.</p>
                }
              </div>
            </article>
          </div>
        }

        @case ('claims') {
          <div class="grid">
            <article class="card span-7">
              <h2>HMO Claims</h2>
              <div class="list">
                @for (claim of claims(); track claim._id) {
                  <div class="list-item">
                    <div class="row">
                      <strong>{{ claim.claimNumber }}</strong>
                      <span class="status">{{ claim.status }}</span>
                    </div>
                    <span class="muted">{{ claim.hmoProvider }} &middot; NGN {{ claim.claimedAmount?.toLocaleString() }} &middot; {{ claim.patient?.firstName }} {{ claim.patient?.lastName }}</span>
                    @if (claim.status === 'draft') {
                      <button class="primary-button" style="margin-top:6px" (click)="submitClaim(claim._id)">Submit to Manager</button>
                    }
                  </div>
                } @empty {
                  <p class="muted">No claims.</p>
                }
              </div>
            </article>
            <article class="card span-5">
              <h2>New Claim</h2>
              <form [formGroup]="claimForm" (ngSubmit)="createClaim()" class="form-grid">
                <label class="full">
                  Patient ID
                  <input formControlName="patient" />
                </label>
                <label class="full">
                  Visit ID
                  <input formControlName="visit" />
                </label>
                <label class="full">
                  HMO Provider
                  <input formControlName="hmoProvider" />
                </label>
                <label>
                  Claim Amount (NGN)
                  <input type="number" formControlName="claimedAmount" />
                </label>
                <label>
                  HMO Plan
                  <input formControlName="hmoPlan" placeholder="Optional" />
                </label>
                <label class="full">
                  Notes
                  <input formControlName="notes" placeholder="Optional" />
                </label>
                <div class="actions full">
                  <button class="primary-button" type="submit" [disabled]="claimForm.invalid">Create Claim</button>
                </div>
              </form>
            </article>
          </div>
        }

        @case ('vouchers') {
          <div class="grid">
            <article class="card span-7">
              <h2>Payment Vouchers</h2>
              <div class="list">
                @for (v of vouchers(); track v._id) {
                  <div class="list-item">
                    <div class="row">
                      <strong>{{ v.voucherNumber }}</strong>
                      <span class="status">{{ v.status }}</span>
                    </div>
                    <span class="muted">{{ v.type }} &middot; {{ v.payee }} &middot; NGN {{ v.amount?.toLocaleString() }} &middot; {{ v.description }}</span>
                  </div>
                } @empty {
                  <p class="muted">No vouchers.</p>
                }
              </div>
            </article>
            <article class="card span-5">
              <h2>Create Voucher</h2>
              <form [formGroup]="voucherForm" (ngSubmit)="createVoucher()" class="form-grid">
                <label>
                  Type
                  <select formControlName="type">
                    <option value="petty_cash">Petty Cash</option>
                    <option value="vendor_payment">Vendor Payment</option>
                    <option value="refund">Refund</option>
                  </select>
                </label>
                <label>
                  Amount (NGN)
                  <input type="number" formControlName="amount" />
                </label>
                <label class="full">
                  Payee
                  <input formControlName="payee" />
                </label>
                <label class="full">
                  Description
                  <input formControlName="description" />
                </label>
                <label>
                  Category
                  <input formControlName="category" placeholder="Optional" />
                </label>
                <label>
                  Receipt URL
                  <input formControlName="receiptAttachmentUrl" placeholder="Optional" />
                </label>
                <div class="actions full">
                  <button class="primary-button" type="submit" [disabled]="voucherForm.invalid">Create Voucher</button>
                </div>
              </form>
            </article>
          </div>
        }

        @case ('reports') {
          <div class="grid">
            <article class="card span-6">
              <h2>Daily Collections</h2>
              <div class="list">
                @for (r of dailyCollections(); track r._id) {
                  <div class="list-item">
                    <div class="row">
                      <strong>{{ r._id }}</strong>
                      <span>NGN {{ r.total?.toLocaleString() }}</span>
                    </div>
                    <span class="muted">{{ r.count }} transactions</span>
                  </div>
                } @empty {
                  <p class="muted">No collections today.</p>
                }
              </div>
            </article>
            <article class="card span-6">
              <h2>P&amp;L Summary</h2>
              @if (pnlSummary()) {
                <div class="grid">
                  <div class="metric span-4">
                    <span>Revenue</span>
                    <strong>{{ (pnlSummary()?.totalRevenue || 0) | currency:'NGN':'symbol-narrow' }}</strong>
                  </div>
                  <div class="metric span-4">
                    <span>Collected</span>
                    <strong>{{ (pnlSummary()?.collected || 0) | currency:'NGN':'symbol-narrow' }}</strong>
                  </div>
                  <div class="metric span-4">
                    <span>Outstanding</span>
                    <strong>{{ (pnlSummary()?.outstandingReceivables || 0) | currency:'NGN':'symbol-narrow' }}</strong>
                  </div>
                  <div class="metric span-4">
                    <span>Expenses</span>
                    <strong>{{ (pnlSummary()?.expenses || 0) | currency:'NGN':'symbol-narrow' }}</strong>
                  </div>
                  <div class="metric span-4">
                    <span>Net Position</span>
                    <strong>{{ (pnlSummary()?.netPosition || 0) | currency:'NGN':'symbol-narrow' }}</strong>
                  </div>
                </div>
              }
            </article>
          </div>
        }
      }
    </section>
  `
})
export class AccountingComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  readonly activeTab = signal('payments');
  readonly saving = signal(false);
  readonly lastPaymentResponse = signal<any | null>(null);

  readonly tabs = [
    { key: 'payments', label: 'Payments' },
    { key: 'invoices', label: 'Invoices' },
    { key: 'receivables', label: 'Receivables' },
    { key: 'claims', label: 'HMO Claims' },
    { key: 'vouchers', label: 'Vouchers' },
    { key: 'reports', label: 'Reports' },
  ];

  readonly paymentForm = this.fb.nonNullable.group({
    patient: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(1)]],
    method: ['cash' as const, Validators.required],
    reference: [''],
    invoice: [''],
    notes: [''],
  });

  readonly claimForm = this.fb.nonNullable.group({
    patient: ['', Validators.required],
    visit: ['', Validators.required],
    hmoProvider: ['', Validators.required],
    claimedAmount: [0, [Validators.required, Validators.min(1)]],
    hmoPlan: [''],
    notes: [''],
  });

  readonly voucherForm = this.fb.nonNullable.group({
    type: ['petty_cash' as const, Validators.required],
    amount: [0, [Validators.required, Validators.min(1)]],
    payee: ['', Validators.required],
    description: ['', Validators.required],
    category: [''],
    receiptAttachmentUrl: [''],
  });

  readonly payments = signal<any[]>([]);
  readonly invoices = signal<any[]>([]);
  readonly invoicesPagination = signal<Pagination>(this.emptyPagination());
  readonly receivables = signal<any[]>([]);
  readonly agingReport = signal<any[]>([]);
  readonly claims = signal<any[]>([]);
  readonly vouchers = signal<any[]>([]);
  readonly dailyCollections = signal<any[]>([]);
  readonly pnlSummary = signal<any | null>(null);

  ngOnInit() {
    this.loadPayments();
    this.loadInvoices();
    this.loadReceivables();
    this.loadAging();
    this.loadClaims();
    this.loadVouchers();
    this.loadReports();
  }

  loadPayments() {
    this.api.get<ApiResponse<any[]>>('/accounting/payments', { limit: 20 }).subscribe({
      next: (r) => this.payments.set(r.data),
      error: () => this.payments.set([]),
    });
  }

  loadInvoices() {
    this.api.get<ApiResponse<any[]>>('/billing/invoices', { limit: 20 }).subscribe({
      next: (r) => {
        this.invoices.set(r.data);
        this.invoicesPagination.set(r.pagination ?? this.emptyPagination());
      },
      error: () => this.invoices.set([]),
    });
  }

  loadReceivables() {
    this.api.get<ApiResponse<any[]>>('/accounting/receivables', { limit: 20 }).subscribe({
      next: (r) => this.receivables.set(r.data),
      error: () => this.receivables.set([]),
    });
  }

  loadAging() {
    this.api.get<ApiResponse<any[]>>('/accounting/receivables/aging').subscribe({
      next: (r) => this.agingReport.set(r.data),
      error: () => this.agingReport.set([]),
    });
  }

  loadClaims() {
    this.api.get<ApiResponse<any[]>>('/accounting/claims', { limit: 20 }).subscribe({
      next: (r) => this.claims.set(r.data),
      error: () => this.claims.set([]),
    });
  }

  loadVouchers() {
    this.api.get<ApiResponse<any[]>>('/accounting/vouchers', { limit: 20 }).subscribe({
      next: (r) => this.vouchers.set(r.data),
      error: () => this.vouchers.set([]),
    });
  }

  loadReports() {
    this.api.get<ApiResponse<any[]>>('/accounting/reports/daily-collections').subscribe({
      next: (r) => this.dailyCollections.set(r.data),
      error: () => this.dailyCollections.set([]),
    });
    this.api.get<ApiResponse<any>>('/accounting/reports/pnl-summary').subscribe({
      next: (r) => this.pnlSummary.set(r.data),
    });
  }

  submitPayment() {
    if (this.paymentForm.invalid) return;
    this.saving.set(true);
    this.lastPaymentResponse.set(null);
    this.api.post<ApiResponse<any>>('/accounting/payments', this.paymentForm.getRawValue()).subscribe({
      next: (r) => {
        this.lastPaymentResponse.set(r.data);
        this.paymentForm.reset({ patient: '', amount: 0, method: 'cash', reference: '', invoice: '', notes: '' });
        this.loadPayments();
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  createClaim() {
    if (this.claimForm.invalid) return;
    this.api.post<ApiResponse<any>>('/accounting/claims', this.claimForm.getRawValue()).subscribe({
      next: () => {
        this.claimForm.reset({ patient: '', visit: '', hmoProvider: '', claimedAmount: 0, hmoPlan: '', notes: '' });
        this.loadClaims();
      },
    });
  }

  submitClaim(id: string) {
    this.api.patch<ApiResponse<any>>(`/accounting/claims/${id}/submit`, {}).subscribe({
      next: () => this.loadClaims(),
    });
  }

  createVoucher() {
    if (this.voucherForm.invalid) return;
    this.api.post<ApiResponse<any>>('/accounting/vouchers', this.voucherForm.getRawValue()).subscribe({
      next: () => {
        this.voucherForm.reset({ type: 'petty_cash', amount: 0, payee: '', description: '', category: '', receiptAttachmentUrl: '' });
        this.loadVouchers();
      },
    });
  }

  pageInfo(p: Pagination): string {
    if (!p.total) return 'No records';
    const start = (p.page - 1) * p.limit + 1;
    const end = Math.min(p.page * p.limit, p.total);
    return `${start}-${end} of ${p.total}`;
  }

  private emptyPagination(): Pagination {
    return { page: 1, limit: 10, total: 0, totalPages: 1 };
  }
}
