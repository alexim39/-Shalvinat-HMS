import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ApiResponse } from '../../core/types';

@Component({
  selector: 'app-pharmacy',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page">
      <div class="page-header">
        <div>
          <h1>Pharmacy Queue</h1>
          <p>Prescription review, dispensing and inventory visibility</p>
        </div>
        <button class="ghost-button" type="button" (click)="load()">Refresh</button>
      </div>

      <div class="grid">
        <article class="card span-7">
          <h2>Pending Prescriptions</h2>
          <div class="list">
            @for (rx of prescriptions(); track rx._id) {
              <button type="button" class="list-item" (click)="select(rx)">
                <div class="row">
                  <strong>{{ rx.drugName }} {{ rx.dose }}</strong>
                  <span class="status">{{ rx.status }}</span>
                </div>
                <span class="muted">
                  {{ rx.patient?.patientNumber }} · {{ rx.frequency }} · {{ rx.route }} · Qty {{ rx.quantity }}
                </span>
                @if (rx.interactionFlags?.length) {
                  <span class="warning">{{ rx.interactionFlags.join(', ') }}</span>
                }
              </button>
            } @empty {
              <p class="muted">No pending prescriptions.</p>
            }
          </div>
        </article>

        <article class="card span-5">
          <h2>Dispense</h2>
          @if (selected()) {
            <div class="patient-banner">
              <strong>{{ selected()?.drugName }}</strong>
              <span>{{ selected()?.patient?.patientNumber }}</span>
            </div>
            <form [formGroup]="dispenseForm" (ngSubmit)="dispense()" class="form-grid" style="margin-top: 14px">
              <label>
                Quantity
                <input type="number" formControlName="quantityDispensed" />
              </label>
              <label class="full">
                Counselling notes
                <textarea formControlName="counsellingNotes"></textarea>
              </label>
              <div class="actions full">
                <button class="primary-button" type="submit">Confirm dispense</button>
              </div>
            </form>
          } @else {
            <p class="muted">Select a prescription.</p>
          }
        </article>
      </div>

      <div class="grid">
        <article class="card span-6">
          <h2>Near Expiry</h2>
          <div class="list">
            @for (batch of stockAlerts()?.nearExpiry || []; track batch._id) {
              <div class="list-item">
                <strong>{{ batch.drug?.genericName }}</strong>
                <span class="muted">Batch {{ batch.batchNumber }} · {{ batch.expiryDate | date }}</span>
              </div>
            } @empty {
              <p class="muted">No near-expiry alerts.</p>
            }
          </div>
        </article>
        <article class="card span-6">
          <h2>Low Stock</h2>
          <div class="list">
            @for (batch of stockAlerts()?.lowStock || []; track batch._id) {
              <div class="list-item">
                <strong>{{ batch.drug?.genericName }}</strong>
                <span class="muted">On hand {{ batch.quantityOnHand }}</span>
              </div>
            } @empty {
              <p class="muted">No low-stock alerts.</p>
            }
          </div>
        </article>
      </div>
    </section>
  `
})
export class PharmacyComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  readonly prescriptions = signal<any[]>([]);
  readonly selected = signal<any | null>(null);
  readonly stockAlerts = signal<any | null>(null);

  readonly dispenseForm = this.fb.nonNullable.group({
    quantityDispensed: [1, [Validators.required, Validators.min(1)]],
    counsellingNotes: ['']
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.api
      .get<ApiResponse<any[]>>('/pharmacy/prescriptions', { status: 'pending' })
      .subscribe((response) => this.prescriptions.set(response.data));
    this.api.get<ApiResponse<any>>('/pharmacy/stock-alerts').subscribe((response) => this.stockAlerts.set(response.data));
  }

  select(rx: any) {
    this.selected.set(rx);
    this.dispenseForm.patchValue({ quantityDispensed: rx.quantity });
  }

  dispense() {
    const rx = this.selected();
    if (!rx) return;
    this.api
      .post<ApiResponse<any>>(`/pharmacy/prescriptions/${rx._id}/dispense`, this.dispenseForm.getRawValue())
      .subscribe(() => {
        this.selected.set(null);
        this.load();
      });
  }
}
