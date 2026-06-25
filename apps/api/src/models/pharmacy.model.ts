import mongoose, { model, Schema } from "mongoose";

const { models } = mongoose;

const prescriptionSchema = new Schema(
  {
    visit: { type: Schema.Types.ObjectId, ref: "Visit", required: true, index: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    doctor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    drug: { type: Schema.Types.ObjectId, ref: "Drug" },
    drugName: { type: String, required: true, trim: true },
    brandName: { type: String, trim: true },
    dose: { type: String, required: true, trim: true },
    frequency: { type: String, required: true, trim: true },
    route: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    specialInstructions: { type: String, trim: true },
    interactionFlags: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: ["pending", "dispensed", "partially_dispensed", "cancelled"],
      default: "pending",
      index: true,
    },
    dispensedBy: { type: Schema.Types.ObjectId, ref: "User" },
    dispensedAt: { type: Date },
  },
  { timestamps: true },
);

const drugSchema = new Schema(
  {
    genericName: { type: String, required: true, trim: true, index: true },
    brandNames: [{ type: String, trim: true }],
    strength: { type: String, required: true, trim: true },
    dosageForm: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["controlled", "prescription", "otc", "consumable"],
      default: "prescription",
      index: true,
    },
    storageRequirements: { type: String, trim: true },
    reorderLevel: { type: Number, default: 10, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const inventoryBatchSchema = new Schema(
  {
    drug: { type: Schema.Types.ObjectId, ref: "Drug", required: true, index: true },
    batchNumber: { type: String, required: true, trim: true },
    location: { type: String, default: "main_pharmacy", trim: true },
    quantityOnHand: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, default: 0, min: 0 },
    sellingPrice: { type: Number, default: 0, min: 0 },
    expiryDate: { type: Date, required: true, index: true },
    supplier: { type: String, trim: true },
    receivedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

const dispenseRecordSchema = new Schema(
  {
    prescription: { type: Schema.Types.ObjectId, ref: "Prescription", required: true, index: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    batch: { type: Schema.Types.ObjectId, ref: "InventoryBatch" },
    quantityDispensed: { type: Number, required: true, min: 1 },
    counsellingNotes: { type: String, trim: true },
    dispensedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export const Prescription = (models.Prescription || model("Prescription", prescriptionSchema)) as any;
export const Drug = (models.Drug || model("Drug", drugSchema)) as any;
export const InventoryBatch = (models.InventoryBatch || model("InventoryBatch", inventoryBatchSchema)) as any;
export const DispenseRecord = (models.DispenseRecord || model("DispenseRecord", dispenseRecordSchema)) as any;
