import mongoose from "mongoose";

export async function connectToDb() {
  const uri = process.env.MONGODB_URI_COMMENTS || process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Missing MONGODB_URI_COMMENTS (or MONGODB_URI) env var");
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log("✅ Connected to MongoDB (comments)");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
}