import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import Comment from "@/models/Comments";

const router = Router();

// ---- Config toggles via env ----
const AUTO_VISIBLE = process.env.COMMENTS_AUTO_VISIBLE === "true";
const ADMIN_KEY = process.env.COMMENTS_ADMIN_KEY || ""; // optional, used for admin ops

// ---- Rate limit on create ----
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

// ---- Zod schema (validate first, then transform) ----
const createCommentSchema = z.object({
  normalizedKey: z.string().trim().min(1).max(200),
  brand: z.string().trim().max(120).optional(),
  model: z.string().trim().max(120).optional(),
  type: z.enum(["missing-data", "correction", "general"]),
  body: z.string().min(5).max(2000).transform((s) => s.replace(/\s+/g, " ").trim()),
  authorName: z.string().trim().max(120).optional(),
  authorEmail: z.string().trim().max(254).email("Invalid email").optional(),
  hp: z.string().optional()
});

// ---- Helpers ----
function requireAdminKey(req: Request, res: Response): boolean {
  if (!ADMIN_KEY) {
    res
      .status(501)
      .json({ ok: false, error: { code: "NOT_CONFIGURED", message: "Set COMMENTS_ADMIN_KEY" } });
    return false;
  }
  if (req.header("x-admin-key") !== ADMIN_KEY) {
    res
      .status(401)
      .json({ ok: false, error: { code: "UNAUTHORIZED", message: "Invalid admin key" } });
    return false;
  }
  return true;
}

/* ============================
   ADMIN (declare before '/:slug')
   ============================ */

// GET /api/comments/admin/list?status=pending&slug=test-slug&limit=200
router.get("/admin/list", async (req: Request, res: Response) => {
  if (!requireAdminKey(req, res)) return;

  const { status, slug, limit } = req.query as {
    status?: "visible" | "pending" | "hidden";
    slug?: string;
    limit?: string;
  };

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (slug) filter.normalizedKey = slug;

  const lim = Math.min(Math.max(parseInt(String(limit ?? "200"), 10) || 200, 1), 500);

  const items = await Comment.find(filter)
    .sort({ createdAt: -1 })
    .limit(lim)
    .select("+authorEmail") // include email for admin view; public GET still excludes it
    .lean({ getters: false, virtuals: false });

  res.json({ ok: true, data: { items } });
});

router.patch("/:id/visible", async (req, res) => {
  if (!requireAdminKey(req, res)) return;
  try {
    const { id } = req.params;
    const updated = await Comment.findByIdAndUpdate(id, { status: "visible" }, { new: true });
    if (!updated) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Comment not found" } });
      return;
    }
    res.json({ ok: true, data: { comment: updated } });
  } catch (err) {
    console.error("PATCH /visible error:", err);
    res.status(500).json({ ok: false, error: { code: "SERVER_ERROR", message: "Unexpected error" } });
  }
});

router.patch("/:id/hide", async (req, res) => {
  if (!requireAdminKey(req, res)) return;
  try {
    const { id } = req.params;
    const updated = await Comment.findByIdAndUpdate(id, { status: "hidden" }, { new: true });
    if (!updated) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Comment not found" } });
      return;
    }
    res.json({ ok: true, data: { comment: updated } });
  } catch (err) {
    console.error("PATCH /hide error:", err);
    res.status(500).json({ ok: false, error: { code: "SERVER_ERROR", message: "Unexpected error" } });
  }
});

router.delete("/:id", async (req, res) => {
  if (!requireAdminKey(req, res)) return;
  try {
    const { id } = req.params;
    const deleted = await Comment.findByIdAndDelete(id);
    if (!deleted) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Comment not found" } });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE comment error:", err);
    res.status(500).json({ ok: false, error: { code: "SERVER_ERROR", message: "Unexpected error" } });
  }
});

/* ============================
   PUBLIC
   ============================ */

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
      .lean({ getters: false, virtuals: false });

    res.json({ ok: true, data: { comments } });
  } catch (err) {
    console.error("GET /api/comments/:slug error:", err);
    res.status(500).json({ ok: false, error: { code: "SERVER_ERROR", message: "Unexpected error" } });
  }
});

// POST /api/comments → create (guest or logged-in later); pending by default
router.post("/", limiter, async (req: Request, res: Response) => {
  try {
    const parsed = createCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten() }
      });
      return;
    }

    const { hp, ...data } = parsed.data;
    if (hp && hp.trim() !== "") {
      // Honeypot tripped → pretend success, drop
      res.json({ ok: true });
      return;
    }

    const created = await Comment.create({
      ...data,
      status: AUTO_VISIBLE ? "visible" : "pending"
    });

    console.log(
      `[comments] created _id=${created._id.toString()} key=${created.normalizedKey} status=${created.status}`
    );

    res.json({ ok: true, data: { id: created._id, status: created.status } });
  } catch (err) {
    console.error("POST /api/comments error:", err);
    res.status(500).json({ ok: false, error: { code: "SERVER_ERROR", message: "Unexpected error" } });
  }
});

export default router;