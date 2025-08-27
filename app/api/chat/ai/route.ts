// app/api/chat/ai/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { env } from "@/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// a little headroom for longer answers
export const maxDuration = 30;

const DEEPSEEK_BASE = "https://api.deepseek.com/v1/chat/completions";

type InMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawMessages: unknown = body?.messages;
  if (!Array.isArray(rawMessages)) {
    return NextResponse.json(
      { error: "messages[] (role/content) is required" },
      { status: 400 }
    );
  }

  const messages: InMessage[] = rawMessages.map((m: any) => ({
    role: m?.role === "assistant" || m?.role === "system" ? m.role : "user",
    content: String(m?.content ?? ""),
  }));

  // forward client abort to provider
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  (req as any).signal?.addEventListener?.("abort", onAbort);

  try {
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
        max_tokens: 700,     // tighter = faster
        stream: true,        // <<< stream from DeepSeek
      }),
      signal: ctrl.signal,
      cache: "no-store",
    });

    if (!upstream.ok) {
      let errJson: any = null;
      try { errJson = await upstream.json(); } catch {}
      const reason =
        errJson?.error?.message ||
        errJson?.error ||
        `${upstream.status} ${upstream.statusText}`;
      return NextResponse.json({ error: reason }, { status: upstream.status });
    }

    // Pass-through the provider's SSE stream to the client
    if (upstream.headers.get("content-type")?.includes("text/event-stream") && upstream.body) {
      return new Response(upstream.body, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // Fallback if provider didn't stream
    const json = await upstream.json().catch(() => null);
    const content =
      json?.choices?.[0]?.message?.content ??
      json?.choices?.[0]?.delta?.content ??
      "";
    return NextResponse.json({ content });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }
    console.error("/api/chat/ai error:", err);
    return NextResponse.json({ error: err?.message ?? "Server error" }, { status: 500 });
  } finally {
    (req as any).signal?.removeEventListener?.("abort", onAbort);
  }
}