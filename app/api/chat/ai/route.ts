import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { env } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const DEEPSEEK_BASE = "https://api.deepseek.com/v1/chat/completions";

type InMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // env.DEEPSEEK_API_KEY is validated by zod in src/env.ts
    const body = await req.json().catch(() => null);
    const rawMessages: unknown = body?.messages;

    if (!Array.isArray(rawMessages)) {
      return NextResponse.json(
        { error: "messages[] (role/content) is required" },
        { status: 400 }
      );
    }

    const messages: InMessage[] = rawMessages.map((m: any) => ({
      role:
        m?.role === "assistant" || m?.role === "system" ? m.role : "user",
      content: String(m?.content ?? ""),
    }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    const upstream = await fetch(DEEPSEEK_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`, 
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        temperature: 0.7,
      }),
      signal: controller.signal,
      cache: "no-store",
    }).catch((e) => {
      throw new Error(`Network error to DeepSeek: ${e?.message ?? e}`);
    });

    clearTimeout(timer);

    if (!upstream.ok) {
      let errJson: any = null;
      try {
        errJson = await upstream.json();
      } catch {}
      const reason =
        errJson?.error?.message ||
        errJson?.error ||
        `${upstream.status} ${upstream.statusText}`;
      return NextResponse.json({ error: reason }, { status: upstream.status });
    }

    const json = await upstream.json();
    const content =
      json?.choices?.[0]?.message?.content ??
      json?.choices?.[0]?.delta?.content ??
      "";

    return NextResponse.json({ content });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return NextResponse.json(
        { error: "Model request timed out (server)" },
        { status: 504 }
      );
    }
    console.error("/api/chat/ai error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
