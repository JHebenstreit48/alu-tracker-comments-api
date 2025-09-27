import mongoose from "mongoose";

export async function connectToDb() {
  const uri = process.env.MONGODB_URI_COMMENTS || process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Missing MONGODB_URI_COMMENTS (or MONGODB_URI)");
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });

  const c = mongoose.connection;
  console.log(`✅ Mongo connected: host=${c.host} db=${c.name}`);
  // For deep debugging locally, uncomment:
  // mongoose.set("debug", true);
}