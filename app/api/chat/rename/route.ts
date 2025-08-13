import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "../../../../config/db";
import Chat from "../../../../models/Chat";

export async function POST(_: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      );
    }

    const { chatId, name }: { chatId?: string; name?: string } = await _.json();
    const trimmed = (name ?? "").trim();

    if (!chatId || !trimmed) {
      return NextResponse.json(
        { success: false, message: "chatId and name are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const updated = await Chat.findOneAndUpdate(
      { _id: chatId, userId },
      { name: trimmed, updatedAt: new Date() },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Chat not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}