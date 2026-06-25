# Implemented User Flows

## OPD Flow

1. Reception registers or searches a patient in `/reception`.
2. Reception checks the patient in through `POST /visits`, creating a visit number and queue number.
3. Reception generates an OPD invoice and collects payment.
4. Nurse opens `/nursing`, selects the queued visit, records triage and vitals.
5. Emergency or critical vitals create doctor notifications automatically.
6. Doctor opens `/doctor`, writes SOAP notes, diagnosis, prescription, lab orders, or imaging orders.
7. Doctor can allocate a bed from the Bed Allocation panel (vacant beds only).
8. Doctor sets patient status (active inpatient / ready for discharge / discharged / deceased / transferred) from the Patient Status panel.
9. Pharmacy, lab, and radiology receive their respective queue records.
10. Doctor can admit or discharge using clinical endpoints.

## Bed Management Flow

1. **Nurse/Reception**: View all beds with occupancy status and patient details from `/nursing` (Ward Bed Status card) or `/reception`.
2. **Reception/Nurse**: Reserve a vacant bed for an incoming patient (1-hour auto-expiry).
3. **Doctor**: View vacant beds in the Bed Allocation panel; select a bed and allocate to current visit.
4. System sets bed to `occupied`, records admitting doctor, and syncs the visit's admission fields.
5. On discharge, the doctor's patient status change to "discharged" triggers automatic bed release (`under_cleaning`).
6. **Concurrency**: Attempt to allocate an already-occupied bed returns 409; only doctors can call the allocate endpoint.

## Pharmacy Flow (Full Inventory)

1. Doctor submits eRx through `/clinical/visits/:visitId/prescriptions`.
2. Pharmacist sees the pending prescription in `/pharmacy`.
3. Pharmacist dispenses, with batch suggestion by FIFO/expiry, and stock decremented.
4. **Inventory Management**:
   - Create/approve Purchase Orders for low-stock items.
   - Receive goods via GRN (auto-creates batches + stock movements).
   - Transfer stock between locations (main pharmacy ↔ ward stores).
   - Record adjustments with reasons (consumption, loss, expiry).
5. **Controlled Substances**: Dual-signature (Pharmacist + prescribing Doctor) required for dispensing; separate ledger maintained.
6. **Alerts**: Pre-expiry (30 days), low stock, expired batch quarantine, suspicious adjustment flags.
7. **Accounting Integration**: GRN invoice matching by Accounting triggers payment request to Manager/Director.

## Lab Flow (with File Upload)

1. Doctor orders lab tests.
2. Lab user sees requests in `/lab`.
3. Lab collects sample, generating barcode.
4. Lab enters structured analyte results.
5. **Upload Result Files**: Lab uploads JPEG/PNG/PDF/DOC/DOCX files (20MB limit per file, 10 files per batch).
6. Release toggle notifies ordering doctor.
7. **File Access**: Doctor/Director can download any file; Lab staff can download only their own uploads.
8. Critical values notify the ordering doctor.

## Radiology Flow (with File Upload)

1. Doctor orders imaging.
2. Radiology user performs procedure and enters report.
3. **Upload Imaging Files**: Radiology uploads image/report files (same limits as Lab).
4. Release toggle notifies ordering doctor.
5. **File Access**: Same ACL as Lab — uploader can download own; doctor/director unrestricted.

## Accounting Flow

1. **Payments**: Receive payments (cash, POS, bank transfer, HMO, NHIA, online). Amounts > ₦100,000 require Director authorization.
2. **Invoices**: View/edit/void invoices with full audit trail (editHistory tracks before/after).
3. **Payment Reversals**: Reverse payments with reason; > ₦100,000 requires Director approval.
4. **Receivables**: View outstanding balances with aging report (0-30, 31-60, 61-90, 91+ days).
5. **HMO Claims**: Create claims, submit to Manager for review/approval before NHIA submission.
6. **Vouchers**: Create petty cash, vendor payment, and refund vouchers; Manager approves.
7. **GRN Matching**: Match goods received notes to invoices for procurement payments.
8. **Reports**: Daily collections by method, revenue by department, P&L summary.
9. **Patient Billing**: View patient billing history and outstanding balance **without** clinical data.

## Patient Category Change Flow

1. Reception selects a patient and opens the "Change Patient Record Type" panel.
2. Selects new category: Individual → Family → Company/Organization → HMO.
3. **Family**: Must specify a family head patient ID; optionally set billing policy to family_billed.
4. **Company**: Must specify organization name; optionally set employer ID and organization_billed policy.
5. System reports whether active visits exist (invoices remain with individual unless explicitly migrated).
6. Full audit trail of category change (previous and new values).

## Director Flow

1. Director opens `/director` for executive KPI dashboard.
2. Director creates accounts for all roles including **Accountant** and **Accounts Manager**.
3. Director manages user lifecycle: activate, suspend, unlock, password reset.
4. Director reviews audit logs for all mutations across all modules including accounting.
5. Director has unrestricted access to all clinical records and file downloads.

## Manager Flow

1. Manager opens `/management` for staff, beds, expenses, assets, financial summary.
2. Manager **approves/rejects accounting requests** (payment reversals, invoice edits, voucher approvals).
3. Manager reviews GRN invoice matching before payment release.
4. Manager views pharmacy stock alerts and purchase order status.

## Clinical Data Access Control

| Role | Patient Demographics | Vitals | Prescriptions | Lab/Imaging Results | Clinical Diagnosis | File Download |
| --- | --- | --- | --- | --- | --- | --- |
| Doctor | Full | Full | Full | Full | Full | Full (all) |
| Nurse | Full | Full | Full | Full | Full | 403 |
| Director | Full | Full | Full | Full | Full | Full (all) |
| Pharmacy | Full | Full | Full | Redacted | Redacted | 403 |
| Laboratory | Full | Full | Redacted | Full | Redacted | Own uploads only |
| Radiology | Full | Full | Redacted | Full | Redacted | Own uploads only |
| Reception | Full | Redacted | Redacted | Redacted | Redacted | 403 |
| Accountant | Full | Redacted | Redacted | Redacted | Redacted | 403 |
| Manager | Full | Redacted | Redacted | Redacted | Redacted | 403 |

## Security Flow

1. User signs in with email/password.
2. API enforces bcrypt verification, failed-login lockout, JWT access/refresh tokens, RBAC.
3. All mutations logged to AuditLog (actor, path, method, status, IP, requestId).
4. Sensitive assessment text encrypted at field level (AES-256-GCM).
5. File downloads ACL-enforced at the API level; unauthorized roles receive 403.
6. Accounting transactions > ₦100,000 require Director approval tracked via ApprovalRequest model.
7. Controlled substance dispensing requires dual-signature (Pharmacist + Doctor).

## Rollout Notes

- New roles (`accountant`, `accounts_manager`) are additive; existing roles unchanged.
- New models use separate MongoDB collections; existing collections unchanged.
- Bed reservations auto-expire after 1 hour (configurable in seed/default).
- File uploads stored in `uploads/` directory with UUID filenames.
- Clinical data redaction applies to ALL non-doctor/nurse/director roles.
- Director remains superuser with unrestricted access across all modules.
