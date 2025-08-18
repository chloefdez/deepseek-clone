import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "../../../../config/db";
import Chat from "../../../../models/Chat";

/** GET /api/messages/:chatId — return messages for a chat */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ chatId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      );
    }

    const { chatId } = await ctx.params;
    if (!chatId) {
      return NextResponse.json(
        { success: false, message: "Missing chatId" },
        { status: 400 }
      );
    }

    await connectDB();

    const chat = await Chat.findOne({ _id: chatId, userId })
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

/** POST /api/messages/:chatId — append a message (user or assistant) */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ chatId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      );
    }

    const { chatId } = await ctx.params;
    if (!chatId) {
      return NextResponse.json(
        { success: false, message: "Missing chatId" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawContent = (body?.content ?? "").toString();
    const content = rawContent.trim();

    // allow saving either role; default to "user"
    let role =
      body?.role === "assistant" || body?.role === "system"
        ? body.role
        : "user";

    if (!content) {
      return NextResponse.json(
        { success: false, message: "Missing content" },
        { status: 400 }
      );
    }

    await connectDB();

    const now = Date.now();
    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, userId },
      {
        $push: { messages: { role, content, timestamp: now } },
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