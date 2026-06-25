import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Invoice } from "../models/billing.model.js";
import { ClinicalNote } from "../models/clinical.model.js";
import { LabRequest, ImagingRequest } from "../models/investigation.model.js";
import { TriageRecord, VitalSign } from "../models/nursing.model.js";
import { Patient } from "../models/patient.model.js";
import { Prescription } from "../models/pharmacy.model.js";
import { Visit } from "../models/visit.model.js";
import { asyncHandler } from "../utils/async-handler.js";
import { calculateAge, escapeRegex } from "../utils/case.js";
import { notFound } from "../utils/http-error.js";
import { getPagination, paginationMeta } from "../utils/pagination.js";
import { decryptText } from "../utils/secure-fields.js";
import { nextPatientNumber } from "../utils/sequences.js";

export const patientRouter = Router();

patientRouter.use(requireAuth);

const patientBody = z.object({
  firstName: z.string().min(2),
  middleName: z.string().optional(),
  lastName: z.string().min(2),
  dateOfBirth: z.coerce.date(),
  gender: z.enum(["male", "female", "other"]),
  maritalStatus: z.string().optional(),
  bloodGroup: z.enum(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]).optional(),
  genotype: z.enum(["AA", "AS", "SS", "AC", "SC"]).optional(),
  nationality: z.string().optional(),
  stateOfOrigin: z.string().optional(),
  lgaOfOrigin: z.string().optional(),
  villageOfOrigin: z.string().optional(),
  residentialAddress: z.string().min(5),
  phone: z.string().min(6),
  phoneAlt: z.string().optional(),
  email: z.email().optional().or(z.literal("")),
  category: z.enum(["company", "family", "hmo", "individual"]).default("individual"),
  nextOfKin: z
    .object({
      name: z.string().optional(),
      relationship: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      stateOfOrigin: z.string().optional(),
      lga: z.string().optional(),
    })
    .optional(),
  hmo: z
    .object({
      company: z.string().optional(),
      plan: z.string().optional(),
      idNumber: z.string().optional(),
      employerName: z.string().optional(),
    })
    .optional(),
  allergies: z.array(z.string()).default([]),
  alerts: z.array(z.string()).default([]),
  photoUrl: z.string().optional(),
});

patientRouter.get(
  "/",
  requireRoles("reception", "nurse", "doctor", "manager"),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const search = String(req.query.search ?? "").trim();
    const query = search
      ? {
          $or: [
            { patientNumber: new RegExp(escapeRegex(search), "i") },
            { firstName: new RegExp(escapeRegex(search), "i") },
            { lastName: new RegExp(escapeRegex(search), "i") },
            { phone: new RegExp(escapeRegex(search), "i") },
            { "hmo.idNumber": new RegExp(escapeRegex(search), "i") },
          ],
        }
      : {};

    const [patients, total] = await Promise.all([
      Patient.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Patient.countDocuments(query),
    ]);

    res.json({
      data: patients.map((patient: any) => ({
        ...patient,
        age: calculateAge(patient.dateOfBirth),
      })),
      pagination: paginationMeta(total, page, limit),
    });
  }),
);

patientRouter.post(
  "/",
  requireRoles("reception"),
  validate({ body: patientBody }),
  asyncHandler(async (req, res) => {
    const patient = await Patient.create({
      ...req.body,
      patientNumber: await nextPatientNumber(),
      createdBy: req.user?.id,
    });

    res.status(201).json({ data: patient });
  }),
);

patientRouter.get(
  "/:id",
  requireRoles("reception", "nurse", "doctor", "manager"),
  asyncHandler(async (req, res) => {
    const patient = await Patient.findById(req.params.id).lean();
    if (!patient) {
      throw notFound("Patient not found.");
    }

    res.json({ data: { ...patient, age: calculateAge((patient as any).dateOfBirth) } });
  }),
);

patientRouter.patch(
  "/:id",
  requireRoles("reception", "nurse"),
  validate({ body: patientBody.partial() }),
  asyncHandler(async (req, res) => {
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedBy: req.user?.id },
      { new: true, runValidators: true },
    );
    if (!patient) {
      throw notFound("Patient not found.");
    }

    res.json({ data: patient });
  }),
);

patientRouter.get(
  "/:id/reception-summary",
  requireRoles("reception", "manager"),
  asyncHandler(async (req, res) => {
    const patientId = String(req.params.id);
    const patient = await Patient.findById(patientId).lean();
    if (!patient) {
      throw notFound("Patient not found.");
    }

    const [visits, invoices] = await Promise.all([
      Visit.find({ patient: patientId })
        .select("visitNumber visitType department queueNumber status paymentStatus billing createdAt updatedAt")
        .sort({ createdAt: -1 })
        .lean(),
      Invoice.find({ patient: patientId })
        .select("invoiceNumber total amountPaid balance status payerType createdAt updatedAt")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    res.json({
      data: {
        patient: { ...patient, age: calculateAge((patient as any).dateOfBirth) },
        visits,
        invoices,
      },
    });
  }),
);

patientRouter.get(
  "/:id/timeline",
  requireRoles("nurse", "doctor", "director"),
  asyncHandler(async (req, res) => {
    const patient = await Patient.findById(req.params.id).lean();
    if (!patient) {
      throw notFound("Patient not found.");
    }

    const [visits, triage, vitals, clinicalNotes, prescriptions, labRequests, imagingRequests, invoices] =
      await Promise.all([
        Visit.find({ patient: req.params.id }).sort({ createdAt: -1 }).lean(),
        TriageRecord.find({ patient: req.params.id }).sort({ createdAt: -1 }).lean(),
        VitalSign.find({ patient: req.params.id }).sort({ createdAt: -1 }).lean(),
        ClinicalNote.find({ patient: req.params.id }).sort({ createdAt: -1 }).lean(),
        Prescription.find({ patient: req.params.id }).sort({ createdAt: -1 }).lean(),
        LabRequest.find({ patient: req.params.id }).sort({ createdAt: -1 }).lean(),
        ImagingRequest.find({ patient: req.params.id }).sort({ createdAt: -1 }).lean(),
        Invoice.find({ patient: req.params.id }).sort({ createdAt: -1 }).lean(),
      ]);

    res.json({
      data: {
        patient: { ...patient, age: calculateAge((patient as any).dateOfBirth) },
        visits,
        triage,
        vitals,
        clinicalNotes: clinicalNotes.map((note: any) => ({
          ...note,
          assessment: decryptText(note.assessmentEncrypted),
          assessmentEncrypted: undefined,
        })),
        prescriptions,
        labRequests,
        imagingRequests,
        invoices,
      },
    });
  }),
);
