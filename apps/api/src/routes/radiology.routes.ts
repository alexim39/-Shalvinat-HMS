import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { ImagingRequest } from "../models/investigation.model.js";
import { Notification } from "../models/notification.model.js";
import { asyncHandler } from "../utils/async-handler.js";
import { notFound } from "../utils/http-error.js";

export const radiologyRouter = Router();

radiologyRouter.use(requireAuth);

radiologyRouter.get(
  "/requests",
  requireRoles("radiology", "doctor"),
  asyncHandler(async (req, res) => {
    const status = String(req.query.status ?? "");
    const query = status ? { status } : { status: { $ne: "reviewed" } };
    const requests = await ImagingRequest.find(query)
      .populate("patient", "patientNumber firstName lastName gender dateOfBirth")
      .populate("doctor", "fullName")
      .sort({ urgency: -1, createdAt: 1 })
      .limit(100)
      .lean();

    res.json({ data: requests });
  }),
);

radiologyRouter.patch(
  "/requests/:id/procedure",
  requireRoles("radiology"),
  validate({
    body: z.object({
      assignedTechnician: z.string().optional(),
      suite: z.string().optional(),
      radiationDose: z.string().optional(),
      preparationNotes: z.string().optional(),
      performedAt: z.coerce.date().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const request = await ImagingRequest.findByIdAndUpdate(
      req.params.id,
      { ...req.body, assignedTechnician: req.body.assignedTechnician ?? req.user?.id, status: "performed" },
      { new: true },
    );
    if (!request) {
      throw notFound("Imaging request not found.");
    }

    res.json({ data: request });
  }),
);

radiologyRouter.patch(
  "/requests/:id/report",
  requireRoles("radiology"),
  validate({
    body: z.object({
      imageUrls: z.array(z.string()).default([]),
      reportText: z.string().optional(),
      reportUrl: z.string().optional(),
      urgentFinding: z.boolean().default(false),
    }),
  }),
  asyncHandler(async (req, res) => {
    const request: any = await ImagingRequest.findByIdAndUpdate(
      req.params.id,
      { ...req.body, status: "reported" },
      { new: true },
    ).populate("patient", "patientNumber");
    if (!request) {
      throw notFound("Imaging request not found.");
    }

    if (req.body.urgentFinding) {
      await Notification.create({
        recipient: request.doctor,
        title: "Urgent imaging finding",
        message: `${request.patient.patientNumber} has an urgent radiology report.`,
        severity: "critical",
        link: `/doctor?visit=${request.visit}`,
      });
    }

    res.json({ data: request });
  }),
);
