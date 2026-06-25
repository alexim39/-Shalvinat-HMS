import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ApiResponse, Patient } from '../../core/types';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="page">
      @if (patient()) {
        <div class="patient-banner">
          <strong>{{ patient()?.firstName }} {{ patient()?.lastName }}</strong>
          <span>{{ patient()?.patientNumber }}</span>
          <span>{{ patient()?.gender }} &middot; {{ patient()?.age || 'Age unavailable' }}</span>
          @if (patient()?.allergies?.length) {
            <span class="critical">Allergy: {{ patient()?.allergies?.join(', ') }}</span>
          }
        </div>

        <div class="grid">
          <article class="card span-6">
            <h2>Visits</h2>
            <div class="list">
              @for (visit of timeline()?.visits || []; track visit._id) {
                <div class="list-item">
                  <div class="row">
                    <strong>{{ visit.visitNumber }}</strong>
                    <span class="status">{{ visit.status }}</span>
                  </div>
                  <span class="muted">{{ visit.department }} &middot; {{ visit.createdAt | date: 'medium' }}</span>
                </div>
              } @empty {
                <p class="muted">No visit history available.</p>
              }
            </div>
          </article>

          @if (canViewClinical()) {
            <article class="card span-6">
              <h2>Clinical Timeline</h2>
              <div class="list">
                @for (note of timeline()?.clinicalNotes || []; track note._id) {
                  <div class="list-item">
                    <strong>{{ note.diagnoses?.[0]?.description || 'SOAP note' }}</strong>
                    <span class="muted">{{ note.plan }}</span>
                  </div>
                } @empty {
                  <p class="muted">No clinical notes visible for this role.</p>
                }
              </div>
            </article>
          } @else {
            <article class="card span-6">
              <h2>Administrative Access</h2>
              <p class="muted">
                Reception can view demographics, visits, queue status and billing. Clinical notes,
                prescriptions, lab results and imaging remain restricted.
              </p>
            </article>
          }
        </div>

        <div class="grid">
          @if (canViewClinical()) {
            <article class="card span-4">
              <h2>Prescriptions</h2>
              <div class="list">
                @for (rx of timeline()?.prescriptions || []; track rx._id) {
                  <div class="list-item">
                    <strong>{{ rx.drugName }}</strong>
                    <span class="muted">{{ rx.dose }} &middot; {{ rx.status }}</span>
                  </div>
                } @empty {
                  <p class="muted">No prescriptions.</p>
                }
              </div>
            </article>

            <article class="card span-4">
              <h2>Lab</h2>
              <div class="list">
                @for (lab of timeline()?.labRequests || []; track lab._id) {
                  <div class="list-item">
                    <strong>{{ lab.tests?.join(', ') }}</strong>
                    <span class="muted">{{ lab.status }}</span>
                  </div>
                } @empty {
                  <p class="muted">No lab requests.</p>
                }
              </div>
            </article>
          }

          <article class="card" [class.span-4]="canViewClinical()" [class.span-12]="!canViewClinical()">
            <h2>Billing</h2>
            <div class="list">
              @for (invoice of timeline()?.invoices || []; track invoice._id) {
                <div class="list-item">
                  <strong>{{ invoice.invoiceNumber }}</strong>
                  <span class="muted">{{ invoice.balance | currency: 'NGN' : 'symbol-narrow' }} balance</span>
                </div>
              } @empty {
                <p class="muted">No billing records.</p>
              }
            </div>
          </article>
        </div>
      }
    </section>
  `,
})
export class PatientProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly patient = signal<Patient | null>(null);
  readonly timeline = signal<any | null>(null);
  readonly canViewClinical = computed(() => this.auth.hasAnyRole(['nurse', 'doctor', 'director']));

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.api.get<ApiResponse<Patient>>(`/patients/${id}`).subscribe((response) => this.patient.set(response.data));

    const summaryPath = this.canViewClinical() ? `/patients/${id}/timeline` : `/patients/${id}/reception-summary`;
    this.api.get<ApiResponse<any>>(summaryPath).subscribe({
      next: (response) => this.timeline.set(response.data),
      error: () => this.timeline.set({}),
    });
  }
}
