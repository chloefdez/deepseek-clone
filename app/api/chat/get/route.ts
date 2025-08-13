import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "../../../../config/db";
import Chat from "../../../../models/Chat";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      );
    }

    await connectDB();

    const data = await Chat.find({ userId }).sort({ updatedAt: -1 });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}