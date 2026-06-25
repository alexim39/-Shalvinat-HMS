import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../core/api.service';
import { AppConfigService } from '../../core/app-config.service';
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

            <div class="card" style="margin-top:14px; padding:12px">
              <h3>Upload Imaging File</h3>
              <label style="margin-bottom:8px">
                Select file (JPEG, PNG, PDF, DOC, DOCX)
                <input type="file" #fileInput (change)="onFileSelected($event)" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx" style="padding:8px 0" />
              </label>
              <label style="margin-bottom:8px">
                Summary
                <input [value]="uploadSummary" (input)="uploadSummary = $any($event.target).value" placeholder="Brief result summary" />
              </label>
              <label style="margin-bottom:8px">
                <span class="checkbox-row">
                  <input type="checkbox" [checked]="releaseOnUpload" (change)="releaseOnUpload = $any($event.target).checked" />
                  Release to doctor immediately
                </span>
              </label>
              <button class="primary-button" type="button" (click)="uploadFile()" [disabled]="!selectedFile() || uploading()">
                {{ uploading() ? 'Uploading...' : 'Upload File' }}
              </button>
              @if (uploadMessage()) {
                <p class="success" style="margin-top:8px">{{ uploadMessage() }}</p>
              }
            </div>
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
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  readonly requests = signal<any[]>([]);
  readonly selected = signal<any | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly uploading = signal(false);
  readonly uploadMessage = signal('');
  uploadSummary = '';
  releaseOnUpload = false;

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

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile.set(input.files[0]);
    }
  }

  uploadFile() {
    const request = this.selected();
    const file = this.selectedFile();
    if (!request || !file) return;

    this.uploading.set(true);
    this.uploadMessage.set('');

    const formData = new FormData();
    formData.append('files', file);
    formData.append('summary', this.uploadSummary);
    formData.append('released', String(this.releaseOnUpload));

    this.http.post<ApiResponse<any>>(`${AppConfigService.apiBaseUrl}/radiology/requests/${request._id}/upload`, formData)
      .subscribe({
        next: (response) => {
          this.uploadMessage.set(`File uploaded (${response.meta?.['files_uploaded'] || 1} files). ${this.releaseOnUpload ? 'Released.' : ''}`);
          this.selectedFile.set(null);
          this.uploadSummary = '';
          this.releaseOnUpload = false;
          this.uploading.set(false);
          this.select(response.data);
          this.load();
        },
        error: () => {
          this.uploadMessage.set('Upload failed.');
          this.uploading.set(false);
        },
      });
  }
}
