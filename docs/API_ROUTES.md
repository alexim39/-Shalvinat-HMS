# API Routes

Base URL: `/api`

All protected routes require `Authorization: Bearer <accessToken>`. Director accounts can read across all modules. Mutations are audited with user, path, method, status, IP, user-agent, and request ID.

Large registry/list endpoints return a `pagination` object with `page`, `limit`, `total`, and `totalPages`.

## Auth

| Method | Route | Roles | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/login` | Public | Login with email/password |
| POST | `/auth/refresh` | Public | Rotate refresh token and issue access token |
| GET | `/auth/me` | Authenticated | Current user profile |
| POST | `/auth/logout` | Authenticated | Clear refresh token |

## Reception, Patients, Visits

| Method | Route | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/patients?search=` | Reception, Nurse, Doctor, Manager | Search patient registry |
| POST | `/patients` | Reception | Create patient record |
| GET | `/patients/:id` | Reception, Nurse, Doctor, Manager | Read patient demographics |
| PATCH | `/patients/:id` | Reception, Nurse | Update demographics, allergies, alerts |
| GET | `/patients/:id/reception-summary` | Reception, Manager | Administrative visit and billing summary without clinical records |
| GET | `/patients/:id/timeline` | Nurse, Doctor, Director | Visit, clinical, investigation, Rx and billing timeline |
| GET | `/visits/queue` | Reception, Nurse, Doctor | Active queue |
| POST | `/visits` | Reception, Nurse | Check in patient and assign queue number |
| PATCH | `/visits/:id/status` | Reception, Nurse, Doctor, Pharmacy, Lab, Radiology | Move visit through workflow |
| POST | `/visits/appointments` | Reception | Create appointment |
| GET | `/visits/appointments/today` | Reception, Nurse, Doctor | Daily appointment list |

## Billing

| Method | Route | Roles | Purpose |
| --- | --- | --- | --- |
| POST | `/billing/invoices` | Reception | Create invoice from service items |
| POST | `/billing/invoices/:id/payments` | Reception | Record payment and receipt |
| GET | `/billing/invoices` | Reception, Manager | List invoices |
| GET | `/billing/summary` | Manager | Daily revenue and pending bills |

## Nursing

| Method | Route | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/nursing/worklist` | Nurse | Queue and admitted patient worklist |
| POST | `/nursing/visits/:visitId/triage` | Nurse | Record SATS triage; emergencies notify doctors |
| POST | `/nursing/visits/:visitId/vitals` | Nurse | Record vitals, BMI, critical flags |
| POST | `/nursing/visits/:visitId/notes` | Nurse | NANDA nursing assessment and care plan |
| POST | `/nursing/visits/:visitId/mar` | Nurse | Medication administration record |
| POST | `/nursing/visits/:visitId/fluid-balance` | Nurse | Input/output balance |

## Doctor / Clinical

| Method | Route | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/clinical/worklist` | Doctor | Triaged consultation queue |
| GET | `/clinical/visits/:visitId/context` | Doctor | Patient context for consultation, including nursing triage, vitals, notes, MAR, and fluid balance |
| POST | `/clinical/visits/:visitId/soap` | Doctor | SOAP note and ICD-10 diagnosis |
| POST | `/clinical/visits/:visitId/prescriptions` | Doctor | Send eRx to pharmacy |
| POST | `/clinical/visits/:visitId/lab-requests` | Doctor | Send lab order |
| POST | `/clinical/visits/:visitId/imaging-requests` | Doctor | Send radiology order |
| POST | `/clinical/visits/:visitId/admission` | Doctor | Admit patient to ward/bed |
| POST | `/clinical/visits/:visitId/discharge` | Doctor | Discharge summary and status update |

## Pharmacy

| Method | Route | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/pharmacy/prescriptions?status=pending` | Pharmacy | Prescription queue |
| POST | `/pharmacy/prescriptions/:id/dispense` | Pharmacy | Dispense prescription and update stock |
| GET | `/pharmacy/drugs` | Pharmacy, Manager | Formulary list |
| POST | `/pharmacy/drugs` | Pharmacy | Create formulary drug |
| GET | `/pharmacy/inventory` | Pharmacy, Manager | Inventory batches |
| POST | `/pharmacy/inventory` | Pharmacy | Receive inventory batch |
| GET | `/pharmacy/stock-alerts` | Pharmacy, Manager | Low stock and near-expiry alerts |

## Laboratory

| Method | Route | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/lab/requests` | Laboratory, Doctor | Lab worklist/results |
| PATCH | `/lab/requests/:id/sample` | Laboratory | Collect sample and generate barcode code |
| PATCH | `/lab/requests/:id/reject` | Laboratory | Reject sample and notify doctor |
| PATCH | `/lab/requests/:id/results` | Laboratory | Enter structured results |
| PATCH | `/lab/requests/:id/validate` | Laboratory | Technical validation |
| PATCH | `/lab/requests/:id/authorize` | Laboratory | Result authorization |

## Radiology

| Method | Route | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/radiology/requests` | Radiology, Doctor | Imaging worklist/reports |
| PATCH | `/radiology/requests/:id/procedure` | Radiology | Capture procedure details |
| PATCH | `/radiology/requests/:id/report` | Radiology | Release image/report and urgent finding alerts |

## Management and Director

| Method | Route | Roles | Purpose |
| --- | --- | --- | --- |
| GET/POST | `/management/staff` | Manager | Staff registry, contact details, and optional platform account creation |
| PATCH | `/management/staff/:id/status` | Manager, Director | Mark staff active/on leave; Director can deactivate and disable linked login |
| GET/POST | `/management/expenses` | Manager | Expenditure tracking |
| GET/POST | `/management/beds` | Manager | Ward and bed management |
| GET/POST | `/management/assets` | Manager | Asset register |
| GET | `/management/financial-summary` | Manager | Monthly P&L snapshot |
| GET | `/director/dashboard` | Director | Cross-department KPI dashboard |
| GET | `/director/audit-logs` | Director | Recent audit trail |

## System Administration and Notifications

| Method | Route | Roles | Purpose |
| --- | --- | --- | --- |
| GET/POST | `/admin/users` | Director | Staff user onboarding, optional staff registry creation, and account management |
| PATCH | `/admin/users/:id` | Director | Update user/roles/password/status |
| PATCH | `/admin/users/:id/unlock` | Director | Unlock failed-login lockout |
| GET | `/admin/settings` | Director | List system settings |
| PUT | `/admin/settings/:key` | Director | Upsert system setting |
| GET | `/notifications` | Authenticated | Role/user notifications |
| PATCH | `/notifications/:id/read` | Authenticated | Mark notification read |
