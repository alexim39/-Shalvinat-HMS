import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ApiResponse } from '../../core/types';

@Component({
  selector: 'app-radiology',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page">
      <div class="page-header">
        <div>
          <h1>Radiology</h1>
          <p>Imaging worklist, procedure capture and report release</p>
        </div>
        <button class="ghost-button" type="button" (click)="load()">Refresh</button>
      </div>

      <div class="grid">
        <article class="card span-5">
          <h2>Imaging Requests</h2>
          <div class="list">
            @for (request of requests(); track request._id) {
              <button type="button" class="list-item" (click)="select(request)">
                <div class="row">
                  <strong>{{ request.modality }} · {{ request.bodyRegion }}</strong>
                  <span class="status">{{ request.urgency }}</span>
                </div>
                <span class="muted">{{ request.patient?.patientNumber }} · {{ request.status }}</span>
              </button>
            } @empty {
              <p class="muted">No active imaging requests.</p>
            }
          </div>
        </article>

        <article class="card span-7">
          <h2>Report</h2>
          @if (selected()) {
            <div class="patient-banner">
              <strong>{{ selected()?.patient?.patientNumber }}</strong>
              <span>{{ selected()?.clinicalIndication }}</span>
              <span class="status">{{ selected()?.status }}</span>
            </div>

            <div class="actions">
              <button class="secondary-button" type="button" (click)="markPerformed()">Mark performed</button>
            </div>

            <form [formGroup]="reportForm" (ngSubmit)="saveReport()" class="form-grid" style="margin-top: 14px">
              <label class="full">
                Image URL
                <input formControlName="imageUrl" />
              </label>
              <label class="full">
                Report text
                <textarea formControlName="reportText"></textarea>
              </label>
              <label>
                Urgent finding
                <select formControlName="urgentFinding">
                  <option [ngValue]="false">No</option>
                  <option [ngValue]="true">Yes</option>
                </select>
              </label>
              <div class="actions full">
                <button class="primary-button" type="submit">Release report</button>
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
export class RadiologyComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  readonly requests = signal<any[]>([]);
  readonly selected = signal<any | null>(null);

  readonly reportForm = this.fb.nonNullable.group({
    imageUrl: [''],
    reportText: ['', Validators.required],
    urgentFinding: [false]
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get<ApiResponse<any[]>>('/radiology/requests').subscribe((response) => this.requests.set(response.data));
  }

  select(request: any) {
    this.selected.set(request);
  }

  markPerformed() {
    const request = this.selected();
    if (!request) return;
    this.api
      .patch<ApiResponse<any>>(`/radiology/requests/${request._id}/procedure`, { performedAt: new Date() })
      .subscribe((response) => this.selected.set(response.data));
  }

  saveReport() {
    const request = this.selected();
    if (!request) return;
    const raw = this.reportForm.getRawValue();
    this.api
      .patch<ApiResponse<any>>(`/radiology/requests/${request._id}/report`, {
        reportText: raw.reportText,
        imageUrls: raw.imageUrl ? [raw.imageUrl] : [],
        urgentFinding: raw.urgentFinding
      })
      .subscribe((response) => {
        this.selected.set(response.data);
        this.load();
      });
  }
}
