import mongoose, { Schema, model, models } from "mongoose";

const MessageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    timestamp: { type: Number, required: true },
  },
  { _id: false }
);

const ChatSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, default: "" },
    name: { type: String, default: "" },
    messages: { type: [MessageSchema], default: [] },
  },
  { timestamps: true }
);

export default models.Chat || model("Chat", ChatSchema);