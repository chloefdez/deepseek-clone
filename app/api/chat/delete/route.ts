import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "../../../../config/db";
import Chat from "../../../../models/Chat";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      );
    }

    const { chatId }: { chatId?: string } = await req.json();
    if (!chatId) {
      return NextResponse.json(
        { success: false, message: "chatId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    await Chat.deleteOne({ _id: chatId, userId });

    return NextResponse.json(
      { success: true, message: "Chat Deleted" },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}