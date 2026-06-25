import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { ApiResponse, Patient, Visit } from '../../core/types';

@Component({
  selector: 'app-doctor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page">
      <div class="page-header">
        <div>
          <h1>Doctor Consultation</h1>
          <p>SOAP documentation, eRx and investigation ordering</p>
        </div>
        <button class="ghost-button" type="button" (click)="loadWorklist()">Refresh</button>
            </div>

            @if ((context()?.labRequests?.length || context()?.imagingRequests?.length)) {
              <div class="grid" style="margin-top:14px">
                @for (req of context()?.labRequests || []; track req._id) {
                  <div class="card span-6">
                    <h3 style="display:flex;justify-content:space-between;align-items:center">
                      Lab: {{ req.discipline }}
                      <span class="tag">{{ req.status }}</span>
                    </h3>
                    <span class="muted">{{ req.tests?.join(', ') }} &middot; {{ req.specimenType || 'No specimen' }}</span>
                    @if (req.results?.length) {
                      <div class="list" style="margin-top:8px">
                        @for (r of req.results; track r.analyte) {
                          <div class="list-item">
                            <strong>{{ r.analyte }}</strong>: {{ r.value }} {{ r.unit }}
                            <span [class.critical]="r.flag==='critical'" [class.warning]="r.flag==='high'||r.flag==='low'" [class.success]="r.flag==='normal'" style="margin-left:8px">{{ r.flag }}</span>
                          </div>
                        }
                      </div>
                    }
                    @if (req.resultFiles?.length) {
                      <div class="list" style="margin-top:8px">
                        @for (file of req.resultFiles; track file.fileName) {
                          <div class="list-item" style="display:flex;align-items:center;justify-content:space-between">
                            <span>{{ file.originalName }} <span class="muted">({{ (file.fileSize / 1024) | number:'1.0-0' }} KB)</span></span>
                            <span class="tag" [style.color]="'var(--teal)'">{{ file.released ? 'Released' : 'Pending' }}</span>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
                @for (req of context()?.imagingRequests || []; track req._id) {
                  <div class="card span-6">
                    <h3 style="display:flex;justify-content:space-between;align-items:center">
                      Imaging: {{ req.modality }}
                      <span class="tag">{{ req.status }}</span>
                    </h3>
                    <span class="muted">{{ req.bodyRegion }} &middot; {{ req.clinicalIndication }}</span>
                    @if (req.reportText) {
                      <p style="margin-top:8px"><strong>Report:</strong> {{ req.reportText }}</p>
                    }
                    @if (req.resultFiles?.length) {
                      <div class="list" style="margin-top:8px">
                        @for (file of req.resultFiles; track file.fileName) {
                          <div class="list-item" style="display:flex;align-items:center;justify-content:space-between">
                            <span>{{ file.originalName }} <span class="muted">({{ (file.fileSize / 1024) | number:'1.0-0' }} KB)</span></span>
                            <span class="tag" [style.color]="'var(--teal)'">{{ file.released ? 'Released' : 'Pending' }}</span>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <div class="grid">
        <article class="card span-4">
          <h2>Consultation Queue</h2>
          <div class="list">
            @for (visit of worklist(); track visit._id) {
              <button type="button" class="list-item" (click)="selectVisit(visit)">
                <div class="row">
                  <strong>#{{ visit.queueNumber }} {{ patientName(visit) }}</strong>
                  <span class="status">{{ visit.triageLevel || visit.status }}</span>
                </div>
                <span class="muted">{{ visit.visitNumber }} &middot; {{ visit.paymentStatus }}</span>
              </button>
            } @empty {
              <p class="muted">No patients ready for consultation.</p>
            }
          </div>
        </article>

        <article class="span-8 page">
          @if (selectedVisit()) {
            <div class="patient-banner">
              <strong>{{ patientName(selectedVisit()!) }}</strong>
              <span>{{ selectedVisit()?.visitNumber }}</span>
              <span class="status">{{ selectedVisit()?.paymentStatus }}</span>
              @if (patientAllergies().length) {
                <span class="critical">Allergy: {{ patientAllergies().join(', ') }}</span>
              }
            </div>

            <div class="card">
              <div class="row">
                <h2>Nursing Handoff</h2>
                <span class="tag">{{ latestTriage()?.category || 'Awaiting triage' }}</span>
              </div>

              <div class="grid">
                <div class="span-6">
                  <h3>Triage</h3>
                  @if (latestTriage()) {
                    <div class="list-item">
                      <strong>{{ latestTriage()?.presentingComplaint }}</strong>
                      <span class="muted">{{ latestTriage()?.notes || 'No extra triage notes' }}</span>
                    </div>
                  } @else {
                    <p class="muted">No triage record yet.</p>
                  }
                </div>

                <div class="span-6">
                  <h3>Latest Vitals</h3>
                  @if (latestVitals()) {
                    <div class="vitals-grid">
                      <span>BP <strong>{{ bpText() }}</strong></span>
                      <span>Pulse <strong>{{ latestVitals()?.pulse || '-' }}</strong></span>
                      <span>Temp <strong>{{ latestVitals()?.temperatureC || '-' }} C</strong></span>
                      <span>RR <strong>{{ latestVitals()?.respiratoryRate || '-' }}</strong></span>
                      <span>SpO2 <strong>{{ latestVitals()?.spo2 || '-' }}%</strong></span>
                      <span>BMI <strong>{{ latestVitals()?.bmi || '-' }}</strong></span>
                      <span>Pain <strong>{{ latestVitals()?.painScore ?? '-' }}/10</strong></span>
                      <span>GRBS <strong>{{ latestVitals()?.randomBloodGlucose || '-' }}</strong></span>
                    </div>
                    @if (latestVitals()?.flags?.length) {
                      <p class="critical" style="margin: 10px 0 0">{{ latestVitals()?.flags?.join(', ') }}</p>
                    }
                  } @else {
                    <p class="muted">No vitals recorded yet.</p>
                  }
                </div>
              </div>

              <div class="grid" style="margin-top: 16px">
                <div class="span-6">
                  <h3>Nursing Notes & Care Plan</h3>
                  <div class="list">
                    @for (note of context()?.nursingNotes || []; track note._id) {
                      <div class="list-item">
                        <strong>{{ note.assessment }}</strong>
                        @if (note.diagnoses?.length) {
                          <span class="muted">Dx: {{ note.diagnoses.join(', ') }}</span>
                        }
                        @if (note.interventions?.length) {
                          <span class="muted">Interventions: {{ note.interventions.join(', ') }}</span>
                        }
                        @if (note.shiftHandover) {
                          <span class="muted">Handover: {{ note.shiftHandover }}</span>
                        }
                      </div>
                    } @empty {
                      <p class="muted">No nursing notes yet.</p>
                    }
                  </div>
                </div>

                <div class="span-6">
                  <h3>MAR & Fluid Balance</h3>
                  <div class="list">
                    @for (mar of context()?.medicationAdministrations || []; track mar._id) {
                      <div class="list-item">
                        <strong>{{ mar.prescription?.drugName || 'Medication' }} {{ mar.doseGiven }}</strong>
                        <span class="muted">{{ mar.status }} &middot; {{ mar.administeredAt | date: 'short' }}</span>
                      </div>
                    } @empty {
                      <p class="muted">No medication administrations yet.</p>
                    }
                    @for (fluid of context()?.fluidBalances || []; track fluid._id) {
                      <div class="list-item">
                        <strong>Balance {{ fluid.balanceMl }} ml</strong>
                        <span class="muted">Input {{ fluid.inputMl }} ml &middot; Output {{ fluid.outputMl }} ml</span>
                      </div>
                    } @empty {
                      <p class="muted">No fluid balance entries yet.</p>
                    }
                  </div>
                </div>
              </div>
            </div>

            <div class="card">
              <h2>SOAP Note</h2>
              <form [formGroup]="soapForm" (ngSubmit)="saveSoap()" class="form-grid">
                <label class="full">
                  Subjective
                  <textarea formControlName="subjective"></textarea>
                </label>
                <label class="full">
                  Objective
                  <textarea formControlName="objective"></textarea>
                </label>
                <label>
                  ICD-10 code
                  <input formControlName="diagnosisCode" />
                </label>
                <label>
                  Diagnosis
                  <input formControlName="diagnosis" />
                </label>
                <label class="full">
                  Assessment
                  <textarea formControlName="assessment"></textarea>
                </label>
                <label class="full">
                  Plan
                  <textarea formControlName="plan"></textarea>
                </label>
                <div class="actions full">
                  <button class="primary-button" type="submit">Save SOAP</button>
                </div>
              </form>
            </div>

            <div class="grid">
              <div class="card span-6">
                <h2>eRx</h2>
                <form [formGroup]="rxForm" (ngSubmit)="sendPrescription()" class="form-grid">
                  <label class="full">
                    Drug
                    <input formControlName="drugName" />
                  </label>
                  <label>
                    Dose
                    <input formControlName="dose" />
                  </label>
                  <label>
                    Frequency
                    <input formControlName="frequency" />
                  </label>
                  <label>
                    Route
                    <input formControlName="route" />
                  </label>
                  <label>
                    Duration
                    <input formControlName="duration" />
                  </label>
                  <label>
                    Quantity
                    <input type="number" formControlName="quantity" />
                  </label>
                  <label class="full">
                    Instructions
                    <input formControlName="specialInstructions" />
                  </label>
                  <div class="actions full">
                    <button class="secondary-button" type="submit">Send to pharmacy</button>
                  </div>
                </form>
              </div>

              <div class="card span-6">
                <h2>Investigations</h2>
                <form [formGroup]="labForm" (ngSubmit)="orderLab()" class="form-grid">
                  <label class="full">
                    Lab tests
                    <input formControlName="tests" />
                  </label>
                  <label>
                    Discipline
                    <select formControlName="discipline">
                      <option value="haematology">Haematology</option>
                      <option value="chemistry">Chemistry</option>
                      <option value="microbiology">Microbiology</option>
                      <option value="serology">Serology</option>
                      <option value="urinalysis">Urinalysis</option>
                      <option value="histology">Histology</option>
                    </select>
                  </label>
                  <label>
                    Urgency
                    <select formControlName="urgency">
                      <option value="routine">Routine</option>
                      <option value="urgent">Urgent</option>
                      <option value="stat">STAT</option>
                    </select>
                  </label>
                  <div class="actions full">
                    <button class="ghost-button" type="submit">Order lab</button>
                  </div>
                </form>

                <form [formGroup]="imagingForm" (ngSubmit)="orderImaging()" class="form-grid" style="margin-top: 14px">
                  <label>
                    Modality
                    <select formControlName="modality">
                      <option value="xray">X-Ray</option>
                      <option value="ultrasound">Ultrasound</option>
                      <option value="ecg">ECG</option>
                      <option value="echocardiography">Echo</option>
                    </select>
                  </label>
                  <label>
                    Body region
                    <input formControlName="bodyRegion" />
                  </label>
                  <label class="full">
                    Indication
                    <input formControlName="clinicalIndication" />
                  </label>
                  <div class="actions full">
                    <button class="ghost-button" type="submit">Order imaging</button>
                  </div>
                </form>
              </div>
            </div>

            <div class="grid">
              <div class="card span-6">
                <h2>Patient Status</h2>
                <form [formGroup]="statusForm" (ngSubmit)="updatePatientStatus()" class="form-grid">
                  <label class="full">
                    Current Status
                    <select formControlName="patientCurrentStatus">
                      <option value="active_inpatient">Active/Inpatient</option>
                      <option value="ready_for_discharge">Ready for Discharge</option>
                      <option value="discharged">Discharged</option>
                      <option value="deceased">Deceased</option>
                      <option value="transferred">Transferred</option>
                    </select>
                  </label>
                  <label class="full">
                    Reason
                    <input formControlName="reason" placeholder="Optional reason" />
                  </label>
                  <div class="actions full">
                    <button class="ghost-button" type="submit">Update status</button>
                  </div>
                </form>
              </div>

              <div class="card span-6">
                <h2>Bed Allocation</h2>
                <form [formGroup]="bedForm" (ngSubmit)="allocateBed()" class="form-grid">
                  <label class="full">
                    Select vacant bed
                    <select formControlName="bed_id">
                      <option value="">-- Choose a bed --</option>
                      @for (bed of beds(); track bed._id) {
                        <option [value]="bed._id">{{ bed.ward }} - {{ bed.bedNumber }} ({{ bed.category }})</option>
                      }
                    </select>
                  </label>
                  <label class="full">
                    Reason
                    <input formControlName="reason" placeholder="Admission reason (optional)" />
                  </label>
                  <div class="actions full">
                    <button class="primary-button" type="submit" [disabled]="bedForm.invalid">
                      {{ bedsLoading() ? 'Loading beds...' : 'Allocate Bed' }}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          } @else {
            <div class="card">
              <p class="muted">Select a patient to begin consultation.</p>
            </div>
          }
        </article>
      </div>
    </section>
  `,
})
export class DoctorComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  readonly worklist = signal<Visit[]>([]);
  readonly selectedVisit = signal<Visit | null>(null);
  readonly context = signal<any | null>(null);

  readonly soapForm = this.fb.nonNullable.group({
    subjective: ['', Validators.required],
    objective: ['', Validators.required],
    diagnosisCode: [''],
    diagnosis: ['', Validators.required],
    assessment: ['', Validators.required],
    plan: ['', Validators.required],
  });

  readonly rxForm = this.fb.nonNullable.group({
    drugName: ['Paracetamol', Validators.required],
    dose: ['500mg', Validators.required],
    frequency: ['TDS', Validators.required],
    route: ['Oral', Validators.required],
    duration: ['5 days', Validators.required],
    quantity: [15, [Validators.required, Validators.min(1)]],
    specialInstructions: ['Take after food'],
  });

  readonly labForm = this.fb.nonNullable.group({
    tests: ['FBC, Malaria parasite', Validators.required],
    discipline: ['haematology', Validators.required],
    urgency: ['routine', Validators.required],
  });

  readonly imagingForm = this.fb.nonNullable.group({
    modality: ['xray', Validators.required],
    bodyRegion: ['Chest', Validators.required],
    clinicalIndication: ['Clinical review requested', Validators.required],
    urgency: ['routine'],
  });

  readonly bedForm = this.fb.nonNullable.group({
    bed_id: ['', Validators.required],
    reason: [''],
  });

  readonly statusForm = this.fb.nonNullable.group({
    patientCurrentStatus: ['active_inpatient', Validators.required],
    reason: [''],
  });

  readonly beds = signal<any[]>([]);
  readonly bedsLoading = signal(false);

  ngOnInit() {
    this.loadWorklist();
  }

  loadWorklist() {
    this.api.get<ApiResponse<Visit[]>>('/clinical/worklist').subscribe((response) => this.worklist.set(response.data));
  }

  selectVisit(visit: Visit) {
    this.selectedVisit.set(visit);
    this.context.set(null);
    this.api
      .get<ApiResponse<any>>(`/clinical/visits/${visit._id}/context`)
      .subscribe((response) => this.context.set(response.data));
    this.loadBeds();
  }

  saveSoap() {
    const visit = this.selectedVisit();
    if (!visit) return;
    const raw = this.soapForm.getRawValue();
    this.api
      .post<ApiResponse<any>>(`/clinical/visits/${visit._id}/soap`, {
        subjective: raw.subjective,
        objective: raw.objective,
        assessment: raw.assessment,
        plan: raw.plan,
        diagnoses: [{ code: raw.diagnosisCode, description: raw.diagnosis, type: 'primary' }],
      })
      .subscribe(() => this.refreshContext());
  }

  sendPrescription() {
    const visit = this.selectedVisit();
    if (!visit) return;
    this.api
      .post<ApiResponse<any>>(`/clinical/visits/${visit._id}/prescriptions`, this.rxForm.getRawValue())
      .subscribe(() => {
        this.loadWorklist();
        this.refreshContext();
      });
  }

  orderLab() {
    const visit = this.selectedVisit();
    if (!visit) return;
    const raw = this.labForm.getRawValue();
    this.api
      .post<ApiResponse<any>>(`/clinical/visits/${visit._id}/lab-requests`, {
        ...raw,
        tests: raw.tests
          .split(',')
          .map((test) => test.trim())
          .filter(Boolean),
      })
      .subscribe(() => this.refreshContext());
  }

  orderImaging() {
    const visit = this.selectedVisit();
    if (!visit) return;
    this.api
      .post<ApiResponse<any>>(`/clinical/visits/${visit._id}/imaging-requests`, this.imagingForm.getRawValue())
      .subscribe(() => this.refreshContext());
  }

  loadBeds() {
    this.bedsLoading.set(true);
    this.api.get<ApiResponse<any[]>>('/beds', { status: 'vacant', limit: 50 }).subscribe({
      next: (r) => {
        this.beds.set(r.data);
        this.bedsLoading.set(false);
      },
      error: () => this.bedsLoading.set(false),
    });
  }

  allocateBed() {
    const visit = this.selectedVisit();
    if (!visit || this.bedForm.invalid) return;
    this.api.post<ApiResponse<any>>('/beds/allocate', {
      visit_id: visit._id,
      bed_id: this.bedForm.getRawValue().bed_id,
      reason: this.bedForm.getRawValue().reason || undefined,
    }).subscribe(() => {
      this.loadBeds();
      this.refreshContext();
    });
  }

  updatePatientStatus() {
    const visit = this.selectedVisit();
    if (!visit || this.statusForm.invalid) return;
    this.api.patch<ApiResponse<any>>(`/clinical/visits/${visit._id}/patient-status`, this.statusForm.getRawValue())
      .subscribe(() => this.refreshContext());
  }

  patientName(visit: Visit) {
    const patient = visit.patient as Patient;
    return typeof visit.patient === 'string' ? visit.patient : `${patient.firstName} ${patient.lastName}`;
  }

  patientAllergies() {
    const patient = this.context()?.visit?.patient || this.selectedVisit()?.patient;
    return typeof patient === 'string' ? [] : patient?.allergies || [];
  }

  latestTriage() {
    return this.context()?.triageRecords?.[0];
  }

  latestVitals() {
    return this.context()?.vitals?.[0];
  }

  bpText() {
    const vitals = this.latestVitals();
    if (!vitals?.systolicBp && !vitals?.diastolicBp) return '-';
    return `${vitals.systolicBp || '-'}/${vitals.diastolicBp || '-'}`;
  }

  private refreshContext() {
    const visit = this.selectedVisit();
    if (!visit) return;
    this.api
      .get<ApiResponse<any>>(`/clinical/visits/${visit._id}/context`)
      .subscribe((response) => this.context.set(response.data));
  }
}
