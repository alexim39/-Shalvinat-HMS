# Database Schema

MongoDB is modeled with Mongoose schemas in `apps/api/src/models`.

## Security and Operations

### User
Authentication and RBAC identity.

- `fullName`, `email`, `phone`
- `department`, `designation`
- `roles`: reception, nurse, doctor, pharmacy, laboratory, radiology, manager, accountant, accounts_manager, director
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
Director-managed key/value settings.

## Reception and Patient Administration

### Patient
Core patient record.

- `patientNumber`, `firstName`, `middleName`, `lastName`
- `dateOfBirth`, `gender`, `maritalStatus`, `bloodGroup`, `genotype`
- `nationality`, `stateOfOrigin`, `lgaOfOrigin`, `villageOfOrigin`
- `residentialAddress`, `phone`, `phoneAlt`, `email`
- `category`: company, family, HMO, individual
- `familyId`: links to family head Patient record
- `organizationName`, `employerId`
- `billingPolicy`: individual_billed, family_billed, organization_billed
- `nextOfKin`, `hmo`, `allergies`, `alerts`, `photoUrl`, `consent`
- `createdBy`, `updatedBy`

### Visit
Encounter and queue record.

- `visitNumber`, `patient`, `visitType`, `department`, `assignedDoctor`
- `queueNumber`, `checkInTime`, `triageLevel`
- `status`, `paymentStatus`
- `billing`: totalInvoice, amountPaid, balance
- `admission`: ward, bed, admittingDiagnosis, managementPlan, admittedAt, dischargedAt, dischargeSummary

### Invoice
Billing and payment ledger.

- `invoiceNumber`, `patient`, `visit`
- `items`, `subtotal`, `discount`, `total`, `amountPaid`, `balance`
- `status`, `payerType`
- `payments[]`, `voidedBy`, `voidedAt`, `voidReason`
- `supervisorAuthorizerId`, `supervisorAuthorizedAt`
- `editHistory[]`: editedBy, editedAt, changes (before/after)
- `updatedBy`

## Clinical Care

### ClinicalNote
- `visit`, `patient`, `doctor`
- `subjective`, `objective`, `assessmentEncrypted` (AES-256-GCM)
- `diagnoses[]`, `plan`, `reviewOfSystems`, `physicalExam`, `lockedAt`
- `patientCurrentStatus`: active_inpatient, ready_for_discharge, discharged, deceased, transferred
- `doctorStatusTimestamp`, `doctorStatusReason`

*(TriageRecord, VitalSign, NursingNote, MedicationAdministration, FluidBalance unchanged)*

## Ancillary Departments

### LabRequest
- Standard lab workflow fields
- `resultFiles[]`: fileName, originalName, fileType, fileSize, storagePath, uploadedBy, uploadedAt, summary, released, releasedAt

### ImagingRequest
- Standard imaging workflow fields
- `resultFiles[]`: same structure as LabRequest

### Prescription, Drug, InventoryBatch, DispenseRecord
- Existing pharmacy models unchanged

## Pharmacy Inventory (New Models)

### InventoryItem
- `name`, `sku`, `drug` (optional ref to Drug)
- `category`: drug, consumable, surgical, equipment, reagent, other
- `unitOfMeasure`, `isControlled`, `reorderLevel`, `reorderPoint`
- `storageCondition`, `minOrderQty`, `active`

### ExtendedBatch
- `item` (ref InventoryItem), `batchNumber`
- `quantity`, `expiryDate`, `costPrice`, `sellingPrice`
- `supplier`, `locationId` (ref InventoryLocation)
- `receivedAt`, `receivedBy`
- `quarantineStatus`: active, quarantined, expired, discarded

### InventoryLocation
- `name`, `type`: main_pharmacy, ward_store, outpatient_pharmacy, emergency_store
- `ward`, `active`

### StockMovement
- `item`, `batch`, `quantity`, `fromLocation`, `toLocation`
- `movementType`: receipt, dispense, transfer, adjustment, return, expiry_write_off
- `referenceId`, `referenceModel`
- `performedBy`, `notes`

### PurchaseOrder
- `poNumber`, `supplier`, `expectedDeliveryDate`
- `items[]`: item (ref), quantity, unitCost
- `status`: draft, pending, approved, ordered, partially_received, received, cancelled
- `createdBy`, `approvedBy`, `notes`

### GoodsReceivedNote
- `grnNumber`, `purchaseOrder`, `supplier`, `receivedBy`
- `items[]`: item, quantityReceived, batchNumber, expiryDate, unitCost, locationId
- `status`: draft, verified, invoice_matched, paid
- `invoiceMatchedBy`, `invoiceMatchedAt`

### ControlledSubstanceRegister
- `item`, `batch`, `shift`
- `balanceBefore`, `quantityDispensed`, `balanceAfter`
- `dispensedBy`, `coSignatory` (dual-signature: Pharmacist + Doctor)
- `prescription`, `patient`
- `discrepancy`, `discrepancyReason`, `notes`

## Accounting (New Models)

### PaymentEntry
- `receiptNumber`, `visit`, `patient`, `invoice`
- `amount`, `method`, `reference`
- `type`: payment, partial_reversal, full_reversal, refund
- `status`: pending, authorized, reversed, rejected
- `receivedBy`, `authorizedBy`, `supervisorAuthorizerId`
- `paymentDate`, `reversalReason`, `notes`

### Receivable
- `patient`, `invoice`, `amountOutstanding`, `daysOutstanding`
- `agingBucket`: 0_30, 31_60, 61_90, 91_plus
- `lastPaymentDate`, `notes`

### HmoClaim
- `claimNumber`, `patient`, `visit`, `hmoProvider`, `hmoPlan`
- `invoice`, `claimedAmount`, `approvedAmount`
- `status`: draft, submitted, pending, approved, partially_approved, rejected, paid
- `submittedBy`, `approvedBy`, `rejectionReason`, `submissionDate`, `responseDate`

### Voucher
- `voucherNumber`, `type`: petty_cash, vendor_payment, refund
- `payee`, `amount`, `category`, `description`
- `receiptAttachmentUrl`
- `status`: draft, pending, approved, paid, rejected, cancelled
- `preparedBy`, `approvedBy`, `paymentDate`

### ApprovalRequest
- `requestType`: payment_reversal, refund, invoice_edit, claim_submission, voucher_approval, grn_payment
- `referenceId`, `referenceModel`, `amount`
- `requestedBy`, `approverRole` (manager/director), `approvedBy`, `approvedAt`
- `status`: pending, approved, rejected
- `reason`, `notes`

## Management

### Bed
- `ward`, `bedNumber`, `category`
- `status`: vacant, occupied, under_cleaning, reserved, maintenance
- `currentPatient`, `currentVisit`, `admittingDoctor`, `admittedAt`
- `reservationExpiresAt`, `reservedBy`

*(Staff, Expense, Asset, Notification unchanged)*
