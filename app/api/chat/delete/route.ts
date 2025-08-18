import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "../../../../config/db";
import Chat from "../../../../models/Chat";
import mongoose from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function doDelete(req: Request) {
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
  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    return NextResponse.json(
      { success: false, message: "Invalid chatId" },
      { status: 400 }
    );
  }

  await connectDB();

  const result = await Chat.deleteOne({ _id: chatId, userId });
  if (!result.deletedCount) {
    return NextResponse.json(
      { success: false, message: "Chat not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    { success: true, data: { chatId }, message: "Chat deleted" },
    { status: 200 }
  );
}

/** Support both POST and DELETE for convenience */
export async function POST(req: Request) {
  return doDelete(req);
}
export async function DELETE(req: Request) {
  return doDelete(req);
}