// src/server.ts
import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors, { type CorsOptions } from "cors";
import { connectToDb } from "@/Utility/connection";
import commentsRoutes from "@/routes/api/comments";
import feedbackRoutes from "@/routes/api/feedback";   // ← add this
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

const corsOptions: CorsOptions = {
  origin: [primary, ...extras],
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"], // include DELETE for admin endpoints
  credentials: false,
};
app.use(cors(corsOptions));

// Health
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Routes
app.use("/api/comments", commentsRoutes);
app.use("/api/feedback", feedbackRoutes);             // ← mount feedback routes
app.use("/api/internal", internalRoutes);

// IMPORTANT: bind to 0.0.0.0 so Render can reach it
const PORT = Number(process.env.PORT) || 3004;

connectToDb().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🟣 Comments API listening on http://0.0.0.0:${PORT}`);
  });
});