import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Notification } from "../models/notification.model.js";
import { DispenseRecord, Drug, InventoryBatch, Prescription } from "../models/pharmacy.model.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError, notFound } from "../utils/http-error.js";

export const pharmacyRouter = Router();

pharmacyRouter.use(requireAuth);

pharmacyRouter.get(
  "/prescriptions",
  requireRoles("pharmacy"),
  asyncHandler(async (req, res) => {
    const status = String(req.query.status ?? "pending");
    const prescriptions = await Prescription.find(status ? { status } : {})
      .populate("patient", "patientNumber firstName lastName allergies")
      .populate("doctor", "fullName")
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    res.json({ data: prescriptions });
  }),
);

pharmacyRouter.post(
  "/prescriptions/:id/dispense",
  requireRoles("pharmacy"),
  validate({
    body: z.object({
      batch: z.string().optional(),
      quantityDispensed: z.number().min(1),
      counsellingNotes: z.string().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const prescription: any = await Prescription.findById(req.params.id);
    if (!prescription) {
      throw notFound("Prescription not found.");
    }

    if (req.body.batch) {
      const batch: any = await InventoryBatch.findById(req.body.batch);
      if (!batch) {
        throw notFound("Inventory batch not found.");
      }
      if (batch.quantityOnHand < req.body.quantityDispensed) {
        throw new HttpError(409, "Insufficient stock for this batch.");
      }
      batch.quantityOnHand -= req.body.quantityDispensed;
      await batch.save();

      const drug: any = await Drug.findById(batch.drug);
      if (drug && batch.quantityOnHand <= drug.reorderLevel) {
        await Notification.create({
          role: "manager",
          title: "Drug reorder alert",
          message: `${drug.genericName} is at or below reorder level.`,
          severity: "warning",
          link: "/pharmacy/inventory",
        });
      }
    }

    const record = await DispenseRecord.create({
      ...req.body,
      prescription: prescription._id,
      patient: prescription.patient,
      dispensedBy: req.user?.id,
    });

    prescription.status =
      req.body.quantityDispensed >= prescription.quantity ? "dispensed" : "partially_dispensed";
    prescription.dispensedBy = req.user?.id;
    prescription.dispensedAt = new Date();
    await prescription.save();

    res.status(201).json({ data: { prescription, record } });
  }),
);

pharmacyRouter.get(
  "/drugs",
  requireRoles("pharmacy", "manager"),
  asyncHandler(async (req, res) => {
    const search = String(req.query.search ?? "");
    const query = search ? { genericName: new RegExp(search, "i") } : {};
    const drugs = await Drug.find(query).sort({ genericName: 1 }).limit(100).lean();
    res.json({ data: drugs });
  }),
);

pharmacyRouter.post(
  "/drugs",
  requireRoles("pharmacy"),
  validate({
    body: z.object({
      genericName: z.string().min(2),
      brandNames: z.array(z.string()).default([]),
      strength: z.string().min(1),
      dosageForm: z.string().min(1),
      category: z.enum(["controlled", "prescription", "otc", "consumable"]).default("prescription"),
      storageRequirements: z.string().optional(),
      reorderLevel: z.number().min(0).default(10),
      active: z.boolean().default(true),
    }),
  }),
  asyncHandler(async (req, res) => {
    const drug = await Drug.create(req.body);
    res.status(201).json({ data: drug });
  }),
);

pharmacyRouter.get(
  "/inventory",
  requireRoles("pharmacy", "manager"),
  asyncHandler(async (_req, res) => {
    const batches = await InventoryBatch.find()
      .populate("drug", "genericName strength dosageForm reorderLevel category")
      .sort({ expiryDate: 1 })
      .limit(200)
      .lean();

    res.json({ data: batches });
  }),
);

pharmacyRouter.post(
  "/inventory",
  requireRoles("pharmacy"),
  validate({
    body: z.object({
      drug: z.string().min(1),
      batchNumber: z.string().min(1),
      location: z.string().default("main_pharmacy"),
      quantityOnHand: z.number().min(0),
      unitCost: z.number().min(0).default(0),
      sellingPrice: z.number().min(0).default(0),
      expiryDate: z.coerce.date(),
      supplier: z.string().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const batch = await InventoryBatch.create({ ...req.body, receivedBy: req.user?.id });
    res.status(201).json({ data: batch });
  }),
);

pharmacyRouter.get(
  "/stock-alerts",
  requireRoles("pharmacy", "manager"),
  asyncHandler(async (_req, res) => {
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const [nearExpiry, batches] = await Promise.all([
      InventoryBatch.find({ expiryDate: { $lte: thirtyDays }, quantityOnHand: { $gt: 0 } })
        .populate("drug", "genericName strength")
        .lean(),
      InventoryBatch.find({ quantityOnHand: { $gt: 0 } }).populate("drug").lean(),
    ]);

    const lowStock = batches.filter((batch: any) => batch.quantityOnHand <= batch.drug?.reorderLevel);
    res.json({ data: { nearExpiry, lowStock } });
  }),
);
