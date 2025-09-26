import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { connectToDb } from "@/Utility/connection";
import commentsRoutes from "@/routes/api/comments";
import internalRoutes from "@/routes/api/internal";

const app = express();

app.use(helmet());
app.use(express.json({ limit: "16kb" }));

// CORS: primary origin + optional extras
const primary = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const extras = (process.env.EXTRA_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
const allowedOrigins = new Set([primary, ...extras]);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // curl/postman
      if (allowedOrigins.has(origin)) return cb(null, true);
      return cb(null, false);
    },
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    credentials: false
  })
);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/comments", commentsRoutes);
app.use("/api/internal", internalRoutes);

const PORT = Number(process.env.PORT || 3004);

connectToDb().then(() => {
  app.listen(PORT, () => console.log(`🟣 Comments API listening on :${PORT}`));
});