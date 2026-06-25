import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ApiResponse, Pagination, Patient, Visit } from '../../core/types';

@Component({
  selector: 'app-reception',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="page">
      <div class="page-header">
        <div>
          <h1>Reception</h1>
          <p>Patient registration, OPD queue, billing and payments</p>
        </div>
      </div>

      <div class="grid">
        <article class="card span-7">
          <h2>Register Patient</h2>
          <form [formGroup]="patientForm" (ngSubmit)="registerPatient()" class="form-grid">
            <label>
              First name
              <input formControlName="firstName" />
            </label>
            <label>
              Last name
              <input formControlName="lastName" />
            </label>
            <label>
              Date of birth
              <input type="date" formControlName="dateOfBirth" />
            </label>
            <label>
              Gender
              <select formControlName="gender">
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Phone
              <input formControlName="phone" />
            </label>
            <label>
              Category
              <select formControlName="category">
                <option value="individual">Individual</option>
                <option value="hmo">HMO</option>
                <option value="company">Company</option>
                <option value="family">Family</option>
              </select>
            </label>
            <label>
              Blood group
              <select formControlName="bloodGroup">
                <option value="">Unknown</option>
                <option>A+</option>
                <option>A-</option>
                <option>B+</option>
                <option>B-</option>
                <option>O+</option>
                <option>O-</option>
                <option>AB+</option>
                <option>AB-</option>
              </select>
            </label>
            <label>
              Genotype
              <select formControlName="genotype">
                <option value="">Unknown</option>
                <option>AA</option>
                <option>AS</option>
                <option>SS</option>
                <option>AC</option>
                <option>SC</option>
              </select>
            </label>
            <label class="full">
              Residential address
              <textarea formControlName="residentialAddress"></textarea>
            </label>
            <label>
              Next of kin
              <input formControlName="nextOfKinName" />
            </label>
            <label>
              Next of kin phone
              <input formControlName="nextOfKinPhone" />
            </label>
            <div class="actions full">
              <button class="primary-button" type="submit" [disabled]="patientForm.invalid">Save patient</button>
              <span class="success" *ngIf="message()">{{ message() }}</span>
            </div>
          </form>
        </article>

        <article class="card span-5">
          <h2>Find Patient</h2>
          <form [formGroup]="searchForm" (ngSubmit)="searchPatients()" class="form-grid">
            <label class="full">
              Search
              <input formControlName="search" />
            </label>
            <div class="actions full">
              <button class="secondary-button" type="submit">Search</button>
            </div>
          </form>

          <div class="list">
            @for (patient of patients(); track patient._id) {
              <div class="list-item">
                <div class="row">
                  <strong>{{ patient.firstName }} {{ patient.lastName }}</strong>
                  <span class="tag">{{ patient.patientNumber }}</span>
                </div>
                <span class="muted">{{ patient.phone }} · {{ patient.gender }}</span>
                <div class="actions">
                  <button class="primary-button" type="button" (click)="startVisit(patient)">Check in</button>
                  <a class="ghost-button" [routerLink]="['/patients', patient._id]">Profile</a>
                </div>
              </div>
            } @empty {
              <p class="muted">No patients loaded.</p>
            }
          </div>
          <div class="pager">
            <span>{{ pageInfo(patientPagination()) }}</span>
            <button class="ghost-button" type="button" [disabled]="patientPagination().page <= 1" (click)="searchPatients(patientPagination().page - 1)">Previous</button>
            <button class="ghost-button" type="button" [disabled]="patientPagination().page >= patientPagination().totalPages" (click)="searchPatients(patientPagination().page + 1)">Next</button>
          </div>
        </article>
      </div>

      <div class="grid">
        <article class="card span-6">
          <h2>Visit Billing</h2>
          @if (selectedVisit()) {
            <div class="patient-banner">
              <strong>{{ selectedVisit()?.visitNumber }}</strong>
              <span>{{ selectedVisit()?.department }} queue #{{ selectedVisit()?.queueNumber }}</span>
              <span class="status">{{ selectedVisit()?.paymentStatus }}</span>
            </div>
            <form [formGroup]="invoiceForm" (ngSubmit)="createInvoice()" class="form-grid" style="margin-top: 14px">
              <label>
                Service
                <input formControlName="description" />
              </label>
              <label>
                Amount
                <input type="number" formControlName="unitPrice" />
              </label>
              <div class="actions full">
                <button class="secondary-button" type="submit">Generate invoice</button>
              </div>
            </form>
          } @else {
            <p class="muted">Check in a patient to create a visit invoice.</p>
          }
        </article>

        <article class="card span-6">
          <h2>Payment</h2>
          @if (selectedInvoice()) {
            <div class="list-item">
              <strong>{{ selectedInvoice()?.invoiceNumber }}</strong>
              <span class="muted">Balance: {{ selectedInvoice()?.balance | currency: 'NGN' : 'symbol-narrow' }}</span>
            </div>
            <form [formGroup]="paymentForm" (ngSubmit)="collectPayment()" class="form-grid" style="margin-top: 14px">
              <label>
                Amount
                <input type="number" formControlName="amount" />
              </label>
              <label>
                Method
                <select formControlName="method">
                  <option value="cash">Cash</option>
                  <option value="pos">POS/Card</option>
                  <option value="hmo">HMO</option>
                  <option value="nhia">NHIA</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </label>
              <div class="actions full">
                <button class="primary-button" type="submit">Collect payment</button>
              </div>
            </form>
          } @else {
            <p class="muted">Generate an invoice to collect payment.</p>
          }
        </article>

        <article class="card span-4">
          <h2>Change Patient Record Type</h2>
          <div class="list">
            @for (patient of patients(); track patient._id) {
              <button type="button" class="list-item" (click)="selectedPatientForCategory.set(patient); categoryChangeMeta.set(null)">
                <strong>{{ patient.firstName }} {{ patient.lastName }}</strong>
                <span class="muted">{{ patient.patientNumber }}</span>
              </button>
            }
          </div>
          @if (selectedPatientForCategory()) {
            <form [formGroup]="categoryForm" (ngSubmit)="changeCategory()" class="form-grid" style="margin-top:14px">
              <div class="patient-banner">
                <strong>{{ selectedPatientForCategory()?.firstName }} {{ selectedPatientForCategory()?.lastName }}</strong>
                <span>Current: {{ selectedPatientForCategory()?.category }}</span>
              </div>
              @if (categoryChangeMeta()) {
                <p class="full" [class.warning]="categoryChangeMeta()?.hasActiveVisits" [class.success]="!categoryChangeMeta()?.hasActiveVisits">
                  Changed from {{ categoryChangeMeta()?.previousCategory }} to {{ categoryChangeMeta()?.newCategory }}
                  @if (categoryChangeMeta()?.hasActiveVisits) { (active visits exist &mdash; billing not migrated) }
                </p>
              }
              <label class="full">
                New Category
                <select formControlName="category" (change)="categoryForm.patchValue({familyId:'',organizationName:'',employerId:''})">
                  <option value="individual">Individual</option>
                  <option value="family">Family</option>
                  <option value="company">Company/Organization</option>
                  <option value="hmo">HMO</option>
                </select>
              </label>
              <label class="full">
                Billing Policy
                <select formControlName="billingPolicy">
                  <option value="individual_billed">Individual Billed</option>
                  <option value="family_billed">Family Billed</option>
                  <option value="organization_billed">Organization Billed</option>
                </select>
              </label>
              @if ($any(categoryForm.get('category')?.value) === 'family') {
                <label class="full">
                  Family Head ID
                  <input formControlName="familyId" placeholder="Patient ID of family head" />
                </label>
              }
              @if ($any(categoryForm.get('category')?.value) === 'company') {
                <label class="full">
                  Organization Name
                  <input formControlName="organizationName" placeholder="Company name" />
                </label>
                <label class="full">
                  Employer ID
                  <input formControlName="employerId" placeholder="Optional" />
                </label>
              }
              <div class="actions full">
                <button class="primary-button" type="submit" [disabled]="categoryForm.invalid">Update Record Type</button>
              </div>
            </form>
          }
        </article>
      </div>
    </section>
  `
})
export class ReceptionComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);

  readonly patients = signal<Patient[]>([]);
  readonly patientPagination = signal<Pagination>(this.emptyPagination());
  readonly selectedVisit = signal<Visit | null>(null);
  readonly selectedInvoice = signal<any | null>(null);
  readonly message = signal('');

  readonly searchForm = this.fb.nonNullable.group({
    search: ['']
  });

  readonly patientForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    dateOfBirth: ['', Validators.required],
    gender: ['female', Validators.required],
    phone: ['', Validators.required],
    category: ['individual', Validators.required],
    bloodGroup: [''],
    genotype: [''],
    residentialAddress: ['', Validators.required],
    nextOfKinName: [''],
    nextOfKinPhone: ['']
  });

  readonly invoiceForm = this.fb.nonNullable.group({
    description: ['OPD Consultation', Validators.required],
    unitPrice: [5000, [Validators.required, Validators.min(0)]]
  });

  readonly paymentForm = this.fb.nonNullable.group({
    amount: [5000, [Validators.required, Validators.min(1)]],
    method: ['cash', Validators.required]
  });

  readonly categoryForm = this.fb.nonNullable.group({
    category: ['individual' as const, Validators.required],
    billingPolicy: ['individual_billed' as const],
    familyId: [''],
    organizationName: [''],
    employerId: [''],
  });

  readonly selectedPatientForCategory = signal<any | null>(null);
  readonly categoryChangeMeta = signal<any | null>(null);

  ngOnInit() {
    this.searchPatients();
  }

  searchPatients(page = 1) {
    this.api
      .get<ApiResponse<Patient[]>>('/patients', { search: this.searchForm.value.search || '', page, limit: 10 })
      .subscribe((response) => {
        this.patients.set(response.data);
        this.patientPagination.set(response.pagination ?? this.emptyPagination());
      });
  }

  registerPatient() {
    const raw = this.patientForm.getRawValue();
    const body = {
      ...raw,
      bloodGroup: raw.bloodGroup || undefined,
      genotype: raw.genotype || undefined,
      nextOfKin: {
        name: raw.nextOfKinName,
        phone: raw.nextOfKinPhone
      }
    };

    this.api.post<ApiResponse<Patient>>('/patients', body).subscribe((response) => {
      this.message.set(`Created ${response.data.patientNumber}`);
      this.patientForm.reset({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'female',
        phone: '',
        category: 'individual',
        bloodGroup: '',
        genotype: '',
        residentialAddress: '',
        nextOfKinName: '',
        nextOfKinPhone: ''
      });
      this.searchPatients();
    });
  }

  startVisit(patient: Patient) {
    this.api
      .post<ApiResponse<Visit>>('/visits', {
        patient: patient._id,
        visitType: 'opd',
        department: 'OPD',
        paymentStatus: patient.patientNumber ? 'pending' : 'pending'
      })
      .subscribe((response) => this.selectedVisit.set(response.data));
  }

  createInvoice() {
    const visit = this.selectedVisit();
    if (!visit) {
      return;
    }

    const item = this.invoiceForm.getRawValue();
    this.api
      .post<ApiResponse<any>>('/billing/invoices', {
        patient: typeof visit.patient === 'string' ? visit.patient : visit.patient._id,
        visit: visit._id,
        payerType: 'self',
        discount: 0,
        items: [{ ...item, department: visit.department, quantity: 1 }]
      })
      .subscribe((response) => {
        this.selectedInvoice.set(response.data);
        this.paymentForm.patchValue({ amount: response.data.balance });
      });
  }

  collectPayment() {
    const invoice = this.selectedInvoice();
    if (!invoice) {
      return;
    }

    this.api
      .post<ApiResponse<any>>(`/billing/invoices/${invoice._id}/payments`, this.paymentForm.getRawValue())
      .subscribe((response) => this.selectedInvoice.set(response.data));
  }

  changeCategory() {
    const patient = this.selectedPatientForCategory();
    if (!patient || this.categoryForm.invalid) return;
    this.api.patch<ApiResponse<any>>(`/patients/${patient._id}/category`, this.categoryForm.getRawValue())
      .subscribe((response) => {
        this.categoryChangeMeta.set(response.meta);
        this.selectedPatientForCategory.set(response.data);
        this.searchPatients();
      });
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
}
