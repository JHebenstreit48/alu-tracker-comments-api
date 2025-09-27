import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import Feedback from "@/models/Feedback";
import mongoose from "mongoose";

const router = Router();
const ADMIN_KEY = process.env.FEEDBACK_ADMIN_KEY ?? "";

// Public POST /api/feedback
const postLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

const createSchema = z.object({
  category: z.enum(["bug", "feature", "content", "other"]),
  message: z.string().min(5).max(3000).transform((s) => s.replace(/\s+/g, " ").trim()),
  email: z.string().email().max(254).optional(),
  pageUrl: z.string().url().max(2000).optional(),
  hp: z.string().optional()
});

router.post("/", postLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten() }
      });
      return;
    }
    const { hp, ...data } = parsed.data;
    if (hp && hp.trim() !== "") {
      res.json({ ok: true }); // honeypot → pretend success
      return;
    }
    await Feedback.create({ ...data, userAgent: req.headers["user-agent"] || undefined });
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/feedback error:", err);
    res.status(500).json({ ok: false, error: { code: "SERVER_ERROR", message: "Unexpected error" } });
  }
});

// --- Admin helpers (optional for testing) ---
function requireAdmin(req: Request, res: Response): boolean {
  if (!ADMIN_KEY) {
    res.status(501).json({ ok: false, error: { code: "NOT_CONFIGURED", message: "Set FEEDBACK_ADMIN_KEY" } });
    return false;
  }
  if (req.header("x-admin-key") !== ADMIN_KEY) {
    res.status(401).json({ ok: false, error: { code: "UNAUTHORIZED", message: "Invalid admin key" } });
    return false;
  }
  return true;
}

// GET /api/feedback/admin/list?status=new&limit=200
router.get("/admin/list", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { status, limit } = req.query as { status?: "new" | "triaged" | "closed"; limit?: string };
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  const lim = Math.min(Math.max(parseInt(String(limit ?? "200"), 10) || 200, 1), 500);
  const items = await Feedback.find(filter).sort({ createdAt: -1 }).limit(lim).lean();
  res.json({ ok: true, data: { items } });
});

// PATCH /api/feedback/:id (edit message/status)
const adminEditSchema = z
  .object({
    message: z.string().min(5).max(3000).transform((s) => s.replace(/\s+/g, " ").trim()).optional(),
    status: z.enum(["new", "triaged", "closed"]).optional()
  })
  .refine((v) => v.message || v.status, { message: "No changes provided" });

router.patch("/:id", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ ok: false, error: { code: "BAD_ID", message: "Invalid id" } });
    return;
  }
  const parsed = adminEditSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten() }
    });
    return;
  }
  const updated = await Feedback.findByIdAndUpdate(id, parsed.data, { new: true }).lean();
  if (!updated) {
    res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Feedback not found" } });
    return;
  }
  res.json({ ok: true, data: { feedback: updated } });
});

// DELETE /api/feedback/:id
router.delete("/:id", async (req: Request, res: Response) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ ok: false, error: { code: "BAD_ID", message: "Invalid id" } });
    return;
  }
  const del = await Feedback.findByIdAndDelete(id).lean();
  if (!del) {
    res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Feedback not found" } });
    return;
  }
  res.json({ ok: true });
});

export default router;