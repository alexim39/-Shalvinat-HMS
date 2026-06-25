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
| PATCH | `/patients/:id/category` | Reception | Change patient record type (individual↔family↔company/HMO) |
| GET | `/patients/:id/reception-summary` | Reception, Manager | Administrative visit and billing summary without clinical records |
| GET | `/patients/:id/timeline` | Nurse, Doctor, Director, Pharmacy, Lab, Radiology | Visit, clinical, investigation, Rx and billing timeline (clinical data redacted for non-doctor/nurse/director) |
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
| GET | `/billing/invoices` | Reception, Manager, Accountant, Accounts Manager | List/search invoices |
| GET | `/billing/summary` | Manager, Accountant, Accounts Manager | Daily revenue and pending bills |

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
| GET | `/clinical/visits/:visitId/context` | Doctor | Patient context for consultation |
| POST | `/clinical/visits/:visitId/soap` | Doctor | SOAP note and ICD-10 diagnosis |
| PATCH | `/clinical/visits/:visitId/patient-status` | Doctor | Set patient status (active inpatient, ready for discharge, discharged, deceased, transferred); triggers bed release on discharge |
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
| GET | `/pharmacy/inventory-items` | Pharmacy, Manager | Inventory item catalog |
| POST | `/pharmacy/inventory-items` | Pharmacy | Create inventory item |
| GET | `/pharmacy/stock-movements` | Pharmacy, Manager | Stock movement history |
| POST | `/pharmacy/stock-movements` | Pharmacy | Record stock movement (dispense, transfer, adjustment, receipt, return, write-off) |
| GET | `/pharmacy/locations` | Pharmacy, Manager | Inventory locations |
| POST | `/pharmacy/locations` | Pharmacy | Create location |
| GET | `/pharmacy/purchase-orders` | Pharmacy, Manager, Accountant | Purchase order list |
| POST | `/pharmacy/purchase-orders` | Pharmacy | Create PO |
| PATCH | `/pharmacy/purchase-orders/:id/approve` | Pharmacy, Manager | Approve PO |
| POST | `/pharmacy/grn` | Pharmacy | Goods Received Note (creates batches + stock movements) |
| PATCH | `/pharmacy/grn/:id/invoice-match` | Accountant, Accounts Manager | Match GRN to supplier invoice |
| POST | `/pharmacy/controlled-substance-dispense` | Pharmacy | Dispense controlled substance (dual-signature: Pharmacist + Doctor) |
| GET | `/pharmacy/controlled-substance-register` | Pharmacy, Manager | Controlled substance ledger |

## Laboratory

| Method | Route | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/lab/requests` | Laboratory, Doctor | Lab worklist/results |
| PATCH | `/lab/requests/:id/sample` | Laboratory | Collect sample and generate barcode code |
| PATCH | `/lab/requests/:id/reject` | Laboratory | Reject sample and notify doctor |
| PATCH | `/lab/requests/:id/results` | Laboratory | Enter structured results |
| PATCH | `/lab/requests/:id/validate` | Laboratory | Technical validation |
| PATCH | `/lab/requests/:id/authorize` | Laboratory | Result authorization |
| POST | `/lab/requests/:id/upload` | Laboratory | Upload result files (JPEG/PNG/PDF/DOCX; 20MB limit; release toggle notifies doctor) |
| GET | `/lab/requests/:id/files/:idx/download` | Laboratory, Doctor, Director | Download result file (ACL: only doctor/director/uploader) |

## Radiology

| Method | Route | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/radiology/requests` | Radiology, Doctor | Imaging worklist/reports |
| PATCH | `/radiology/requests/:id/procedure` | Radiology | Capture procedure details |
| PATCH | `/radiology/requests/:id/report` | Radiology | Release image/report and urgent finding alerts |
| POST | `/radiology/requests/:id/upload` | Radiology | Upload imaging files (JPEG/PNG/PDF/DOCX; 20MB limit; release toggle notifies doctor) |
| GET | `/radiology/requests/:id/files/:idx/download` | Radiology, Doctor, Director | Download imaging file (ACL: only doctor/director/uploader) |

## Bed Management

| Method | Route | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/beds` | Nurse, Doctor, Manager, Reception, Accountant | View all beds with patient/doctor info |
| POST | `/beds/allocate` | Doctor | Allocate vacant bed to visit (sets occupied, syncs admission); rejects if bed not vacant (409) |
| POST | `/beds/reserve` | Reception, Nurse | Reserve bed (1-hour expiry); rejects if bed not vacant (409) |

## Accounting

| Method | Route | Roles | Purpose |
| --- | --- | --- | --- |
| POST | `/accounting/payments` | Accountant, Accounts Manager | Record payment (>₦100k requires Director approval) |
| POST | `/accounting/payments/:id/reverse` | Accountant, Accounts Manager | Reverse payment (>₦100k requires Director approval) |
| GET | `/accounting/payments` | Accountant, Accounts Manager, Manager | List payments |
| PATCH | `/accounting/invoices/:id` | Accountant, Accounts Manager | Edit invoice (full audit in editHistory) |
| POST | `/accounting/invoices/:id/void` | Accountant, Accounts Manager | Void invoice |
| GET | `/accounting/receivables` | Accountant, Accounts Manager, Manager | Receivables list with aging |
| GET | `/accounting/receivables/aging` | Accountant, Accounts Manager, Manager, Director | Aging report (0-30, 31-60, 61-90, 91+ days) |
| POST | `/accounting/claims` | Accountant, Accounts Manager | Create HMO claim |
| PATCH | `/accounting/claims/:id/submit` | Accountant, Accounts Manager | Submit claim to Manager |
| GET | `/accounting/claims` | Accountant, Accounts Manager, Manager, Director | List claims |
| POST | `/accounting/vouchers` | Accountant, Accounts Manager | Create payment voucher (petty cash/vendor/refund) |
| GET | `/accounting/vouchers` | Accountant, Accounts Manager, Manager, Director | List vouchers |
| GET | `/accounting/approvals` | Manager, Director | Pending approval requests |
| PATCH | `/accounting/approvals/:id` | Manager, Director | Approve/reject approval request |
| GET | `/accounting/reports/daily-collections` | Accountant, Accounts Manager, Manager, Director | Daily collections by payment method |
| GET | `/accounting/reports/revenue-by-department` | Accountant, Accounts Manager, Manager, Director | Revenue breakdown by department (date range) |
| GET | `/accounting/reports/pnl-summary` | Accountant, Accounts Manager, Manager, Director | P&L summary (revenue, collected, outstanding, expenses, net position) |
| GET | `/accounting/patients/:id/billing-history` | Accountant, Accounts Manager | Patient billing history (no clinical data) |

## Management and Director

| Method | Route | Roles | Purpose |
| --- | --- | --- | --- |
| GET/POST | `/management/staff` | Manager | Staff registry, contact details, and optional platform account creation |
| PATCH | `/management/staff/:id/status` | Manager, Director | Mark staff active/on leave; Director can deactivate and disable linked login |
| GET/POST | `/management/expenses` | Manager | Expenditure tracking |
| GET/POST | `/management/beds` | Manager | Ward and bed management (CRUD) |
| GET/POST | `/management/assets` | Manager | Asset register |
| GET | `/management/financial-summary` | Manager | Monthly P&L snapshot |
| GET | `/director/dashboard` | Director | Cross-department KPI dashboard |
| GET | `/director/audit-logs` | Director | Recent audit trail |

## System Administration and Notifications

| Method | Route | Roles | Purpose |
| --- | --- | --- | --- |
| GET/POST | `/admin/users` | Director | User onboarding including accountant/accounts_manager roles |
| PATCH | `/admin/users/:id` | Director | Update user/roles/password/status |
| PATCH | `/admin/users/:id/unlock` | Director | Unlock failed-login lockout |
| GET | `/admin/settings` | Director | List system settings |
| PUT | `/admin/settings/:key` | Director | Upsert system setting |
| GET | `/notifications` | Authenticated | Role/user notifications |
| PATCH | `/notifications/:id/read` | Authenticated | Mark notification read |

## RBAC Field-Level Filtering

Non-clinical roles (Pharmacy, Laboratory, Radiology, Reception, Accountant, Accounts Manager, Manager) receive **redacted clinical data** when accessing patient timeline or clinical endpoints:

| Field | Doctor/Nurse/Director | Other Roles |
| --- | --- | --- |
| `subjective` | Visible | `"[redacted]"` |
| `assessment` | Visible (decrypted) | Removed |
| `diagnoses` | Visible | Removed |
| `plan` | Visible | `"[redacted]"` |
| `reviewOfSystems` | Visible | Removed |
| `physicalExam` | Visible | Removed |

### File Download ACL

| Role | Own upload | Others' uploads |
| --- | --- | --- |
| Doctor/Director | Download | Download |
| Lab/Radiology | Download | **403 Forbidden** |
| All other roles | 403 | 403 |
