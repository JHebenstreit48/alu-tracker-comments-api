import { Schema, InferSchemaType, model } from "mongoose";

const CommentsSchema = new Schema(
  {
    normalizedKey: { type: String, required: true, index: true, trim: true },
    brand: { type: String, trim: true },
    model: { type: String, trim: true },
    type: { type: String, enum: ["missing-data", "correction", "general"], required: true },
    body: { type: String, required: true, minlength: 5, maxlength: 2000, trim: true },
    authorName: { type: String, trim: true, maxlength: 120 },
    // Store but NEVER return publicly. select:false prevents accidental exposure.
    authorEmail: { type: String, trim: true, maxlength: 254, select: false },
    authorId: { type: Schema.Types.ObjectId, ref: "User" }, // for logged-in linkage
    status: { type: String, enum: ["visible", "pending", "hidden"], default: "pending", index: true }
  },
  { timestamps: true, collection: "comments" }
);

CommentsSchema.index({ normalizedKey: 1, createdAt: -1 });

export type CommentDoc = InferSchemaType<typeof CommentsSchema>;
const Comment = model<CommentDoc>("Comment", CommentsSchema);
export default Comment;