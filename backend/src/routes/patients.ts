import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import express from "express";
import { patients } from "../db/schema.js";
import { db } from "../db/index.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, parseInt(page as string, 10) || 1);
    const limitPerPage = Math.min(
      100,
      Math.max(1, parseInt(limit as string, 10) || 10),
    );
    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];

    if (search) {
      filterConditions.push(
        or(
          ilike(patients.name, `%${search}%`),
          ilike(patients.phone, `%${search}%`),
        ),
      );
    }

    if (status) {
      filterConditions.push(eq(patients.status, status as Status));
    }

    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(patients)
      .where(whereClause);

    const totalCount = countResult[0]?.count ?? 0;

    const patientList = await db
      .select()
      .from(patients)
      .where(whereClause)
      .orderBy(asc(patients.id))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: patientList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error("Error fetching patients:", error);
    res.status(500).json({ error: "Failed to fetch patients" });
  }
});

router.post("/:id/send-sms", async (req, res) => {
  try {
    const patientId = Number(req.params.id);

    if (!Number.isFinite(patientId)) {
      return res.status(400).json({ error: "Invalid patient ID" });
    }

    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId));

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const [updatedPatient] = await db
      .update(patients)
      .set({ status: "contacted", updatedAt: new Date() })
      .where(eq(patients.id, patientId))
      .returning({
        id: patients.id,
        name: patients.name,
        phone: patients.phone,
        status: patients.status,
      });

    const message = `Hi ${updatedPatient?.name}, you missed your appointment at Sunrise Family Clinic. Reply YES to rebook.`;

    return res.status(200).json({
      patient: updatedPatient,
      message,
    });
  } catch (error) {
    console.error("Error sending SMS to patient:", error);
    res.status(500).json({ error: "Failed to send SMS to patient" });
  }
});

export default router;
