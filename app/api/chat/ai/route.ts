import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
});

// Your UI can send either `messages` or a single `prompt`
type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function POST(req: Request) {
  try {
    if (!process.env.DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: "Missing DEEPSEEK_API_KEY" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as { messages?: Msg[]; prompt?: string };

    const raw: Msg[] =
      body?.messages && body.messages.length
        ? body.messages
        : [{ role: "user", content: body?.prompt ?? "Say hello" }];

    // ✅ Ensure correct type for the SDK
    const messages: ChatCompletionMessageParam[] = raw.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const completion = await client.chat.completions.create({
      model: "deepseek-chat",
      messages,
      temperature: 0.7,
    });

    const content = completion.choices?.[0]?.message?.content ?? "";
    return NextResponse.json({ content });
} catch (err: unknown) {
  const message =
    err instanceof Error ? err.message :
    typeof err === "string" ? err :
    "Unknown error";
  console.error("chat/ai error:", err);
  return NextResponse.json({ error: message }, { status: 500 });
}
}