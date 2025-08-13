import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const a = await auth();

    return NextResponse.json(
      {
        userId: a.userId ?? null,
        sessionId: a.sessionId ?? null,
        orgId: a.orgId ?? null,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Auth inspection failed" },
      { status: 500 }
    );
  }
}
