import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import Chat from "../../../../models/Chat";
import connectDB from "../../../../config/db";

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY!,
});

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth() as { userId: string | null };

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User not authenticated" },
        { status: 401 }
      );
    }

    const { chatId, prompt }: { chatId: string; prompt: string } = await req.json();

    if (!chatId || !prompt?.trim()) {
      return NextResponse.json(
        { success: false, message: "chatId and prompt are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const data = await Chat.findOne({ userId, _id: chatId });
    if (!data) {
      return NextResponse.json(
        { success: false, message: "Chat not found" },
        { status: 404 }
      );
    }

    const userPrompt = {
      role: "user" as const,
      content: prompt,
      timestamp: Date.now(),
    };
    data.messages.push(userPrompt);

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "deepseek-chat",
      store: true,
    });

    const message = {
      ...completion.choices[0].message,
      timestamp: Date.now(),
    };

    data.messages.push(message);
    await data.save();

    return NextResponse.json({ success: true, data: message }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message ?? "Server error" },
      { status: 500 }
    );
  }
}