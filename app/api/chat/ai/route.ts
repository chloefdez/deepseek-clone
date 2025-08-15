import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

const DEEPSEEK_BASE = "https://api.deepseek.com/v1/chat/completions";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const rawMessages = Array.isArray(body?.messages) ? body.messages : null;
    if (!rawMessages) {
      return NextResponse.json(
        { error: "messages[] (role/content) is required" },
        { status: 400 }
      );
    }

    const messages = rawMessages.map((m: any) => ({
      role:
        m?.role === "assistant" || m?.role === "system" ? m.role : "user",
      content: String(m?.content ?? ""),
    }));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(DEEPSEEK_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY ?? ""}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        temperature: 0.7,
      }),
      signal: controller.signal,
    }).catch((e) => {
      throw new Error(`Network error to DeepSeek: ${e?.message ?? e}`);
    });
    clearTimeout(timer);

    if (!res.ok) {
      let errJson: any = null;
      try {
        errJson = await res.json();
      } catch {
      }
      const reason =
        errJson?.error?.message ||
        errJson?.error ||
        `${res.status} ${res.statusText}`;
      return NextResponse.json({ error: reason }, { status: res.status });
    }

    const json = await res.json();
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
    console.error("/api/chat/ai fetch error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}