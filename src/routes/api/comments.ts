import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import Comment from "@/models/Comments";

const router = Router();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

const createCommentSchema = z.object({
  normalizedKey: z.string().trim().min(1).max(200),
  brand: z.string().trim().max(120).optional(),
  model: z.string().trim().max(120).optional(),
  type: z.enum(["missing-data", "correction", "general"]),
  body: z.string().transform(s => s.replace(/\s+/g, " ").trim()).min(5).max(2000),
  authorName: z.string().trim().max(120).optional(),
  authorEmail: z.string().trim().max(254).email("Invalid email").optional(),
  hp: z.string().optional()
});

// GET /api/comments/:slug → visible comments (newest first)
router.get("/:slug", async (req: Request<{ slug: string }>, res: Response) => {
  try {
    const slug = String(req.params.slug || "").trim();
    if (!slug) {
      res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing slug" } });
      return;
    }

    const comments = await Comment.find({ normalizedKey: slug, status: "visible" })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean({ getters: false, virtuals: false }); // authorEmail has select:false

    res.json({ ok: true, data: { comments } });
  } catch (err) {
    console.error("GET /api/comments/:slug error:", err);
    res.status(500).json({ ok: false, error: { code: "SERVER_ERROR", message: "Unexpected error" } });
  }
});

// POST /api/comments → create pending (logged-in handled later)
router.post("/", limiter, async (req: Request, res: Response) => {
  try {
    const parsed = createCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten() } });
      return;
    }

    const { hp, ...data } = parsed.data;
    if (hp && hp.trim() !== "") {
      // Honeypot tripped → pretend success, drop the submission.
      res.json({ ok: true });
      return;
    }

    // If/when you add JWT middleware, you can do:
    // const userId = (req as any).user?._id;
    // if (userId) (data as any).authorId = userId;

    await Comment.create({ ...data, status: "pending" });
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/comments error:", err);
    res.status(500).json({ ok: false, error: { code: "SERVER_ERROR", message: "Unexpected error" } });
  }
});

// (Scaffold) moderation
router.patch("/:id/status", async (_req, res) => {
  res.status(501).json({ ok: false, error: { code: "NOT_IMPLEMENTED", message: "Moderation pending" } });
});

export default router;