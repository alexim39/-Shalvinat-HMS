import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ApiResponse } from '../../core/types';

@Component({
  selector: 'app-lab',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page">
      <div class="page-header">
        <div>
          <h1>Laboratory Worklist</h1>
          <p>Sample collection, result entry, validation and authorization</p>
        </div>
        <button class="ghost-button" type="button" (click)="load()">Refresh</button>
      </div>

      <div class="grid">
        <article class="card span-6">
          <h2>Requests</h2>
          <div class="list">
            @for (request of requests(); track request._id) {
              <button type="button" class="list-item" (click)="select(request)">
                <div class="row">
                  <strong>{{ request.tests?.join(', ') }}</strong>
                  <span class="status">{{ request.urgency }}</span>
                </div>
                <span class="muted">{{ request.patient?.patientNumber }} · {{ request.status }}</span>
              </button>
            } @empty {
              <p class="muted">No active lab requests.</p>
            }
          </div>
        </article>

        <article class="card span-6">
          <h2>Result Entry</h2>
          @if (selected()) {
            <div class="patient-banner">
              <strong>{{ selected()?.patient?.patientNumber }}</strong>
              <span>{{ selected()?.discipline }}</span>
              <span class="status">{{ selected()?.status }}</span>
            </div>

            <div class="actions">
              <button class="secondary-button" type="button" (click)="collectSample()">Collect sample</button>
              <button class="ghost-button" type="button" (click)="validateResult()">Validate</button>
              <button class="primary-button" type="button" (click)="authorizeResult()">Authorize</button>
            </div>

            <form [formGroup]="resultForm" (ngSubmit)="saveResults()" class="form-grid" style="margin-top: 14px">
              <label>
                Analyte
                <input formControlName="analyte" />
              </label>
              <label>
                Value
                <input formControlName="value" />
              </label>
              <label>
                Unit
                <input formControlName="unit" />
              </label>
              <label>
                Reference range
                <input formControlName="referenceRange" />
              </label>
              <label>
                Flag
                <select formControlName="flag">
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="low">Low</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
              <div class="actions full">
                <button class="primary-button" type="submit">Save result</button>
              </div>
            </form>
          } @else {
            <p class="muted">Select a request.</p>
          }
        </article>
      </div>
    </section>
  `
})
export class LabComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  readonly requests = signal<any[]>([]);
  readonly selected = signal<any | null>(null);

  readonly resultForm = this.fb.nonNullable.group({
    analyte: ['Haemoglobin', Validators.required],
    value: ['13.2', Validators.required],
    unit: ['g/dL'],
    referenceRange: ['12.0 - 16.0'],
    flag: ['normal']
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get<ApiResponse<any[]>>('/lab/requests').subscribe((response) => this.requests.set(response.data));
  }

  select(request: any) {
    this.selected.set(request);
  }

  collectSample() {
    const request = this.selected();
    if (!request) return;
    this.api
      .patch<ApiResponse<any>>(`/lab/requests/${request._id}/sample`, { sampleCondition: 'acceptable' })
      .subscribe((response) => this.selected.set(response.data));
  }

  saveResults() {
    const request = this.selected();
    if (!request) return;
    this.api
      .patch<ApiResponse<any>>(`/lab/requests/${request._id}/results`, { results: [this.resultForm.getRawValue()] })
      .subscribe((response) => this.selected.set(response.data));
  }

  validateResult() {
    const request = this.selected();
    if (!request) return;
    this.api.patch<ApiResponse<any>>(`/lab/requests/${request._id}/validate`, {}).subscribe((response) => this.selected.set(response.data));
  }

  authorizeResult() {
    const request = this.selected();
    if (!request) return;
    this.api.patch<ApiResponse<any>>(`/lab/requests/${request._id}/authorize`, {}).subscribe((response) => {
      this.selected.set(response.data);
      this.load();
    });
  }
}
