# Database Schema

MongoDB is modeled with Mongoose schemas in `apps/api/src/models`.

## Security and Operations

### User
Authentication and RBAC identity.

- `fullName`, `email`, `phone`
- `department`, `designation`
- `roles`: reception, nurse, doctor, pharmacy, laboratory, radiology, manager, director
- `passwordHash`: bcrypt, excluded from default queries
- `status`: active, inactive, suspended, locked
- `mustChangePassword`, `twoFactorEnabled`
- `failedLoginAttempts`, `lockedUntil`, `lastLoginAt`
- `refreshTokenHash`

### AuditLog
Append-only request activity log.

- `actor`, `actorEmail`
- `action`: read or mutation
- `method`, `path`, `statusCode`
- `ipAddress`, `userAgent`, `requestId`
- `metadata`

### SystemSetting
Director-managed key/value settings for hospital profile, fee schedules, lab menus, formulary configuration, and integration settings.

## Reception and Patient Administration

### Patient
Core patient record and NHIA/HMO-ready demographics.

- `patientNumber`: generated as `SHL-YYYY-00001`
- `firstName`, `middleName`, `lastName`
- `dateOfBirth`, `gender`, `maritalStatus`
- `bloodGroup`, `genotype`, `nationality`
- `stateOfOrigin`, `lgaOfOrigin`, `villageOfOrigin`
- `residentialAddress`, `phone`, `phoneAlt`, `email`
- `category`: company, family, HMO, individual
- `nextOfKin`: name, relationship, phone, address, state, LGA
- `hmo`: company, plan, id number, employer name
- `allergies`, `alerts`, `photoUrl`
- `consent`
- `createdBy`, `updatedBy`

### Visit
Encounter and queue record.

- `visitNumber`
- `patient`
- `visitType`: OPD, IPD, emergency, antenatal, immunisation
- `department`, `assignedDoctor`
- `queueNumber`, `checkInTime`
- `triageLevel`
- `status`: registered, queued, triaged, with doctor, investigations, pharmacy, admitted, discharged, deceased
- `paymentStatus`: pending, partial, paid, HMO, deferred
- `billing`: total invoice, paid, balance
- `admission`: ward, bed, diagnosis, plan, admitted/discharged timestamps, summary

### Appointment
Scheduled care record.

- `patient`, `department`, `doctor`
- `type`: walk-in, scheduled OPD, specialist, antenatal, immunisation, follow-up
- `startsAt`, `status`, `reason`, `reminderSentAt`

### Invoice
Billing and payment ledger.

- `invoiceNumber`
- `patient`, `visit`
- `items`: description, department, quantity, unit price, amount
- `subtotal`, `discount`, `total`, `amountPaid`, `balance`
- `status`: draft, pending, partial, paid, void
- `payerType`: self, HMO, NHIA, company
- `payments`: receipt number, amount, method, reference, collector, reversal fields

## Clinical Care

### TriageRecord

- `visit`, `patient`
- `category`: resuscitation, emergent, urgent, less urgent, non-urgent
- `presentingComplaint`, `notes`, `escalated`
- `recordedBy`

### VitalSign

- BP, pulse, temperature, respiratory rate, SpO2, GRBS, weight, height, BMI, pain score
- `flags`: generated for critical BP, low SpO2, high fever, severe pain
- `recordedBy`

### NursingNote

- NANDA-style `assessment`, `diagnoses`, `goals`, `interventions`
- `shiftHandover`, fall risk score, pressure ulcer risk score

### MedicationAdministration

- `prescription`, `doseGiven`, `route`, `administeredAt`
- `status`: given, missed, refused, held
- `reason`, `administeredBy`

### FluidBalance

- `inputMl`, `outputMl`, `source`, `route`, `balanceMl`

### ClinicalNote

- `visit`, `patient`, `doctor`
- `subjective`, `objective`, encrypted assessment, `diagnoses`, `plan`
- `reviewOfSystems`, `physicalExam`, `lockedAt`

Sensitive assessment text is stored in an AES-256-GCM encrypted payload through `secure-fields.ts`.

## Ancillary Departments

### Prescription

- `visit`, `patient`, `doctor`
- formulary `drug`
- `drugName`, `brandName`, dose, frequency, route, duration, quantity
- `specialInstructions`, `interactionFlags`
- `status`: pending, dispensed, partially dispensed, cancelled
- `dispensedBy`, `dispensedAt`

### Drug

- `genericName`, `brandNames`, strength, dosage form
- `category`: controlled, prescription, OTC, consumable
- `storageRequirements`, `reorderLevel`, `active`

### InventoryBatch

- `drug`, `batchNumber`, `location`
- `quantityOnHand`, costs/prices, `expiryDate`, supplier
- `receivedBy`

### DispenseRecord

- `prescription`, `patient`, `batch`
- `quantityDispensed`, `counsellingNotes`, `dispensedBy`

### LabRequest

- `visit`, `patient`, `doctor`
- `tests`, `discipline`, `urgency`, specimen and clinical notes
- `sampleCode`, sample collection fields, rejection reason
- `results`: analyte, value, unit, reference range, flag
- technical validation and authorization fields
- `status`: ordered, sample collected, processing, validated, authorized, rejected, reviewed

### ImagingRequest

- `visit`, `patient`, `doctor`
- `modality`, `bodyRegion`, `clinicalIndication`, `urgency`
- procedure fields, image/report links, report text
- `urgentFinding`, `status`

## Management

### Staff
Staff registry with `fullName`, `role` including director, optional `email`/`phone`, department, designation, registration number, employment type, leave balance, `status` for active/on leave/inactive staff, performance notes, and optional linked `User` account for platform access.

### Expense
Operational expenditure by category, amount, date, receipt URL, recorder.

### Bed
Ward and bed occupancy status with current patient/visit references.

### Asset
Hospital asset register with location, serial number, purchase date, warranty expiry, and status.

### Notification
Role/user-targeted alerts for critical values, stock alerts, pending work, and operational follow-up.
