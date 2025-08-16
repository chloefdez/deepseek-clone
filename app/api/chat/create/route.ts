import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "../../../../config/db";
import Chat from "../../../../models/Chat";

export async function POST(_req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      );
    }

    await connectDB();

    const chat = await Chat.create({
      userId,
      title: "New Chat",
      name: "New Chat",
      messages: [],
      updatedAt: new Date(),
    });

    // Normalize shape for the client
    const obj = chat.toObject();
    const data = {
      ...obj,
      _id: String(obj._id),
      title: obj.title || obj.name || `Chat ${String(obj._id).slice(-6)}`,
      messages: Array.isArray(obj.messages) ? obj.messages : [],
    };

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}