import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors, { CorsOptions } from "cors";
import { connectToDb } from "@/Utility/connection";
import commentsRoutes from "@/routes/api/comments";
import internalRoutes from "@/routes/api/internal"; // keep if you're using the internal endpoints

const app = express();

app.use(helmet());
app.use(express.json({ limit: "16kb" }));

// ---- CORS: one primary + optional extras (comma-separated) ----
const primary = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const extras = (process.env.EXTRA_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins: string[] = [primary, ...extras];

const corsOptions: CorsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  credentials: false
};

app.use(cors(corsOptions));

// ---- Health ----
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ---- Routes ----
app.use("/api/comments", commentsRoutes);
app.use("/api/internal", internalRoutes); // comment out if you haven't added internal routes

// ---- Listen (bind to IPv4 loopback by default; override via HOST if needed) ----
const PORT = Number(process.env.PORT) || 3004;
const HOST = process.env.HOST || "127.0.0.1";

connectToDb().then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`🟣 Comments API listening on http://${HOST}:${PORT}`);
  });
});