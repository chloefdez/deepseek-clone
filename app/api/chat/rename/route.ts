import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "../../../../config/db";
import Chat from "../../../../models/Chat";
import mongoose from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      );
    }

    const { chatId, name }: { chatId?: string; name?: string } = await req.json();
    const trimmed = (name ?? "").trim();
    if (!chatId || !trimmed) {
      return NextResponse.json(
        { success: false, message: "chatId and name are required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return NextResponse.json(
        { success: false, message: "Invalid chatId" },
        { status: 400 }
      );
    }

    await connectDB();

    const now = new Date();
    const updated = await Chat.findOneAndUpdate(
      { _id: chatId, userId },
      { $set: { title: trimmed, name: trimmed, updatedAt: now } },
      { new: true, projection: "_id title name updatedAt" }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Chat not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message ?? "Server error" },
      { status: 500 }
    );
  }
}