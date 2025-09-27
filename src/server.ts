import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors, { type CorsOptions } from "cors";
import { connectToDb } from "@/Utility/connection";
import commentsRoutes from "@/routes/api/comments";
import feedbackRoutes from "@/routes/api/feedback";
import internalRoutes from "@/routes/api/internal";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "16kb" }));

// CORS: one primary + optional extras (comma-separated)
const primary = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const extras = (process.env.EXTRA_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowedOrigins = [primary, ...extras];

const corsOptions: CorsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  credentials: false
};
app.use(cors(corsOptions));

console.log("🌐 CORS allowed origins:", allowedOrigins.join(", ") || "(none)");

// Health
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Routes
app.use("/api/comments", commentsRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/internal", internalRoutes);

// IMPORTANT: bind to 0.0.0.0 so Render (and Docker) can reach it
const PORT = Number(process.env.PORT) || 3004;

connectToDb().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🟣 Comments API listening on http://0.0.0.0:${PORT}`);
  });
});