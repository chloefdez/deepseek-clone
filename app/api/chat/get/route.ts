import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "../../../../config/db";
import Chat from "../../../../models/Chat";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const doc = await Chat.findOne({ _id: id, userId })
        .select("_id title name messages updatedAt")
        .lean();

      if (!doc) {
        return NextResponse.json(
          { success: false, message: "Chat not found" },
          { status: 404 }
        );
      }

      const normId = String((doc as any)._id);
      const safeTitle =
        (doc as any).title?.trim?.() ||
        (doc as any).name?.trim?.() ||
        `Chat ${normId.slice(-6)}`;

      const messages = Array.isArray((doc as any).messages)
        ? (doc as any).messages
        : [];

      const data = {
        ...doc,
        _id: normId,
        title: safeTitle,
        messages,
      };

      return NextResponse.json({ success: true, data }, { status: 200 });
    }

    const docs = await Chat.find({ userId })
      .sort({ updatedAt: -1 })
      .select("_id title name messages updatedAt")
      .lean();

    const data = (Array.isArray(docs) ? docs : []).map((d: any) => {
      const normId = String(d?._id);
      const safeTitle =
        d?.title?.trim?.() || d?.name?.trim?.() || `Chat ${normId.slice(-6)}`;
      const messages = Array.isArray(d?.messages) ? d.messages : [];
      return {
        ...d,
        _id: normId,
        title: safeTitle,
        messages,
      };
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}