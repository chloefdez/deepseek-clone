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
      name: "New Chat",
      messages: [],
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, data: chat }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message ?? "Server error" },
      { status: 500 }
    );
  }
}