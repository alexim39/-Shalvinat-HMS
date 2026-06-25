import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { LabRequest } from "../models/investigation.model.js";
import { Notification } from "../models/notification.model.js";
import { asyncHandler } from "../utils/async-handler.js";
import { notFound } from "../utils/http-error.js";
import { makeLabSampleCode } from "../utils/ids.js";

export const labRouter = Router();

labRouter.use(requireAuth);

labRouter.get(
  "/requests",
  requireRoles("laboratory", "doctor"),
  asyncHandler(async (req, res) => {
    const status = String(req.query.status ?? "");
    const query = status ? { status } : { status: { $ne: "reviewed" } };
    const requests = await LabRequest.find(query)
      .populate("patient", "patientNumber firstName lastName gender dateOfBirth")
      .populate("doctor", "fullName")
      .sort({ urgency: -1, createdAt: 1 })
      .limit(100)
      .lean();

    res.json({ data: requests });
  }),
);

labRouter.patch(
  "/requests/:id/sample",
  requireRoles("laboratory"),
  validate({
    body: z.object({
      sampleCondition: z.string().default("acceptable"),
      specimenType: z.string().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const request = await LabRequest.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        sampleCode: makeLabSampleCode(),
        sampleCollectedAt: new Date(),
        sampleCollectedBy: req.user?.id,
        status: "sample_collected",
      },
      { new: true },
    );
    if (!request) {
      throw notFound("Lab request not found.");
    }

    res.json({ data: request });
  }),
);

labRouter.patch(
  "/requests/:id/reject",
  requireRoles("laboratory"),
  validate({
    body: z.object({
      rejectionReason: z.string().min(2),
    }),
  }),
  asyncHandler(async (req, res) => {
    const request: any = await LabRequest.findByIdAndUpdate(
      req.params.id,
      { rejectionReason: req.body.rejectionReason, status: "rejected" },
      { new: true },
    ).populate("patient", "patientNumber");
    if (!request) {
      throw notFound("Lab request not found.");
    }

    await Notification.create({
      recipient: request.doctor,
      title: "Lab sample rejected",
      message: `${request.patient.patientNumber}: ${req.body.rejectionReason}`,
      severity: "warning",
      link: `/doctor?visit=${request.visit}`,
    });

    res.json({ data: request });
  }),
);

labRouter.patch(
  "/requests/:id/results",
  requireRoles("laboratory"),
  validate({
    body: z.object({
      results: z
        .array(
          z.object({
            analyte: z.string().min(1),
            value: z.string().min(1),
            unit: z.string().optional(),
            referenceRange: z.string().optional(),
            flag: z.enum(["normal", "high", "low", "critical"]).default("normal"),
          }),
        )
        .min(1),
    }),
  }),
  asyncHandler(async (req, res) => {
    const request: any = await LabRequest.findByIdAndUpdate(
      req.params.id,
      { results: req.body.results, status: "processing" },
      { new: true },
    ).populate("patient", "patientNumber");
    if (!request) {
      throw notFound("Lab request not found.");
    }

    if (req.body.results.some((result: any) => result.flag === "critical")) {
      await Notification.create({
        recipient: request.doctor,
        title: "Critical lab value",
        message: `${request.patient.patientNumber} has a critical lab result requiring acknowledgement.`,
        severity: "critical",
        link: `/doctor?visit=${request.visit}`,
      });
    }

    res.json({ data: request });
  }),
);

labRouter.patch(
  "/requests/:id/validate",
  requireRoles("laboratory"),
  asyncHandler(async (req, res) => {
    const request = await LabRequest.findByIdAndUpdate(
      req.params.id,
      {
        technicalValidatedBy: req.user?.id,
        technicalValidatedAt: new Date(),
        status: "validated",
      },
      { new: true },
    );
    if (!request) {
      throw notFound("Lab request not found.");
    }

    res.json({ data: request });
  }),
);

labRouter.patch(
  "/requests/:id/authorize",
  requireRoles("laboratory"),
  asyncHandler(async (req, res) => {
    const request = await LabRequest.findByIdAndUpdate(
      req.params.id,
      {
        authorizedBy: req.user?.id,
        authorizedAt: new Date(),
        status: "authorized",
      },
      { new: true },
    );
    if (!request) {
      throw notFound("Lab request not found.");
    }

    res.json({ data: request });
  }),
);
