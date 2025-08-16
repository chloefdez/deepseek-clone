import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "../../../../config/db";
import Chat from "../../../../models/Chat";

type RouteParams = { params: { chatId: string } };

/** GET /api/messages/:chatId — return messages for a chat */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      );
    }

    await connectDB();

    const chat = await Chat.findOne({ _id: params.chatId, userId })
      .select("_id messages")
      .lean();

    if (!chat) {
      return NextResponse.json(
        { success: false, message: "Chat not found" },
        { status: 404 }
      );
    }

    const messages = Array.isArray((chat as any).messages)
      ? (chat as any).messages
      : [];

    return NextResponse.json({ success: true, data: messages }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}

/** POST /api/messages/:chatId — append a user message */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const content = (body?.content ?? "").toString().trim();
    if (!content) {
      return NextResponse.json(
        { success: false, message: "Missing content" },
        { status: 400 }
      );
    }

    await connectDB();

    const now = Date.now();
    const chat = await Chat.findOneAndUpdate(
      { _id: params.chatId, userId },
      {
        $push: { messages: { role: "user", content, timestamp: now } },
        $set: { updatedAt: new Date(now) },
      },
      { new: true, projection: "_id messages updatedAt" }
    ).lean();

    if (!chat) {
      return NextResponse.json(
        { success: false, message: "Chat not found" },
        { status: 404 }
      );
    }

    const messages = Array.isArray((chat as any).messages)
      ? (chat as any).messages
      : [];

    return NextResponse.json({ success: true, data: messages }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}