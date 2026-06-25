import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ApiResponse, Patient, Visit } from '../../core/types';

@Component({
  selector: 'app-nursing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page">
      <div class="page-header">
        <div>
          <h1>Nurse Workstation</h1>
          <p>Triage, vital signs, nursing assessments and care notes</p>
        </div>
        <button class="ghost-button" type="button" (click)="loadWorklist()">Refresh</button>
      </div>

      <div class="grid">
        <article class="card span-5">
          <h2>Queue</h2>
          <div class="list">
            @for (visit of worklist(); track visit._id) {
              <button type="button" class="list-item" (click)="selectVisit(visit)">
                <div class="row">
                  <strong>#{{ visit.queueNumber }} {{ patientName(visit) }}</strong>
                  <span class="status">{{ visit.status }}</span>
                </div>
                <span class="muted">{{ visit.visitNumber }} · {{ visit.department }}</span>
              </button>
            } @empty {
              <p class="muted">No patients waiting for nursing.</p>
            }
          </div>
        </article>

        <article class="card span-7">
          <h2>Triage & Vitals</h2>
          @if (selectedVisit()) {
            <div class="patient-banner">
              <strong>{{ patientName(selectedVisit()!) }}</strong>
              <span>Queue #{{ selectedVisit()?.queueNumber }}</span>
              <span class="status">{{ selectedVisit()?.triageLevel || 'not triaged' }}</span>
            </div>

            <form [formGroup]="triageForm" (ngSubmit)="saveTriage()" class="form-grid" style="margin-top: 14px">
              <label>
                Triage category
                <select formControlName="category">
                  <option value="resuscitation">Resuscitation</option>
                  <option value="emergent">Emergent</option>
                  <option value="urgent">Urgent</option>
                  <option value="less_urgent">Less Urgent</option>
                  <option value="non_urgent">Non-Urgent</option>
                </select>
              </label>
              <label>
                Presenting complaint
                <input formControlName="presentingComplaint" />
              </label>
              <label class="full">
                Notes
                <textarea formControlName="notes"></textarea>
              </label>
              <div class="actions full">
                <button class="secondary-button" type="submit">Save triage</button>
              </div>
            </form>

            <form [formGroup]="vitalsForm" (ngSubmit)="saveVitals()" class="form-grid" style="margin-top: 14px">
              <label>
                Systolic BP
                <input type="number" formControlName="systolicBp" />
              </label>
              <label>
                Diastolic BP
                <input type="number" formControlName="diastolicBp" />
              </label>
              <label>
                Pulse
                <input type="number" formControlName="pulse" />
              </label>
              <label>
                Temp °C
                <input type="number" formControlName="temperatureC" />
              </label>
              <label>
                Resp. rate
                <input type="number" formControlName="respiratoryRate" />
              </label>
              <label>
                SpO2
                <input type="number" formControlName="spo2" />
              </label>
              <label>
                Weight kg
                <input type="number" formControlName="weightKg" />
              </label>
              <label>
                Height cm
                <input type="number" formControlName="heightCm" />
              </label>
              <label>
                Pain score
                <input type="number" formControlName="painScore" />
              </label>
              <div class="actions full">
                <button class="primary-button" type="submit">Record vitals</button>
              </div>
            </form>

            <form [formGroup]="noteForm" (ngSubmit)="saveNote()" class="form-grid" style="margin-top: 14px">
              <label class="full">
                Nursing assessment
                <textarea formControlName="assessment"></textarea>
              </label>
              <label class="full">
                Interventions
                <textarea formControlName="interventions"></textarea>
              </label>
              <div class="actions full">
                <button class="ghost-button" type="submit">Save nursing note</button>
              </div>
            </form>
          } @else {
            <p class="muted">Select a queued patient.</p>
          }
        </article>
      </div>
    </section>
  `
})
export class NursingComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  readonly worklist = signal<Visit[]>([]);
  readonly selectedVisit = signal<Visit | null>(null);

  readonly triageForm = this.fb.nonNullable.group({
    category: ['urgent', Validators.required],
    presentingComplaint: ['', Validators.required],
    notes: ['']
  });

  readonly vitalsForm = this.fb.nonNullable.group({
    systolicBp: [120],
    diastolicBp: [80],
    pulse: [78],
    temperatureC: [37],
    respiratoryRate: [18],
    spo2: [98],
    weightKg: [70],
    heightCm: [170],
    painScore: [0]
  });

  readonly noteForm = this.fb.nonNullable.group({
    assessment: [''],
    interventions: ['']
  });

  ngOnInit() {
    this.loadWorklist();
  }

  loadWorklist() {
    this.api.get<ApiResponse<Visit[]>>('/nursing/worklist').subscribe((response) => this.worklist.set(response.data));
  }

  selectVisit(visit: Visit) {
    this.selectedVisit.set(visit);
  }

  saveTriage() {
    const visit = this.selectedVisit();
    if (!visit) return;
    this.api
      .post<ApiResponse<any>>(`/nursing/visits/${visit._id}/triage`, this.triageForm.getRawValue())
      .subscribe(() => this.loadWorklist());
  }

  saveVitals() {
    const visit = this.selectedVisit();
    if (!visit) return;
    this.api
      .post<ApiResponse<any>>(`/nursing/visits/${visit._id}/vitals`, this.vitalsForm.getRawValue())
      .subscribe();
  }

  saveNote() {
    const visit = this.selectedVisit();
    if (!visit) return;
    const raw = this.noteForm.getRawValue();
    this.api
      .post<ApiResponse<any>>(`/nursing/visits/${visit._id}/notes`, {
        assessment: raw.assessment,
        interventions: raw.interventions ? [raw.interventions] : []
      })
      .subscribe(() => this.noteForm.reset({ assessment: '', interventions: '' }));
  }

  patientName(visit: Visit) {
    const patient = visit.patient as Patient;
    return typeof visit.patient === 'string' ? visit.patient : `${patient.firstName} ${patient.lastName}`;
  }
}
