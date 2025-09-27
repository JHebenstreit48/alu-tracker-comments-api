import { Schema, model, type Document } from "mongoose";

export type FeedbackCategory = "bug" | "feature" | "content" | "other";
export type FeedbackStatus = "new" | "triaged" | "closed";

export interface FeedbackDoc extends Document {
  category: FeedbackCategory;
  message: string;
  email?: string;
  pageUrl?: string;
  userAgent?: string;
  status: FeedbackStatus;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<FeedbackDoc>(
  {
    category: { type: String, enum: ["bug", "feature", "content", "other"], required: true, index: true },
    message: { type: String, required: true, minlength: 5, maxlength: 3000 },
    email: { type: String },
    pageUrl: { type: String },
    userAgent: { type: String },
    status: { type: String, enum: ["new", "triaged", "closed"], default: "new", index: true }
  },
  { timestamps: true }
);

export default model<FeedbackDoc>("Feedback", FeedbackSchema);