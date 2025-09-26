import { Router, Request, Response } from "express";
import Comment from "@/models/Comments";

const router = Router();
const SERVICE_KEY = process.env.COMMENTS_SERVICE_KEY;

// POST /api/internal/comments/claim-by-email
router.post("/comments/claim-by-email", async (req: Request, res: Response) => {
  try {
    if (!SERVICE_KEY || req.header("x-service-key") !== SERVICE_KEY) {
      res.status(401).json({ ok: false, error: { code: "UNAUTHORIZED", message: "Invalid service key" } });
      return;
    }
    const { userId, email } = req.body as { userId?: string; email?: string };
    if (!userId || !email) {
      res.status(400).json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing userId or email" } });
      return;
    }

    const result = await Comment.updateMany(
      { authorId: { $exists: false }, authorEmail: email },
      { $set: { authorId: userId } }
    );

    res.json({
      ok: true,
      data: {
        matched: (result as any).matchedCount ?? (result as any).matched,
        modified: (result as any).modifiedCount ?? (result as any).modified
      }
    });
  } catch (err) {
    console.error("POST /api/internal/comments/claim-by-email error:", err);
    res.status(500).json({ ok: false, error: { code: "SERVER_ERROR", message: "Unexpected error" } });
  }
});

export default router;