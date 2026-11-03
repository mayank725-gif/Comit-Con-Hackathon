import { NextResponse } from "next/server";
import { getUberEngine } from "@/lib/uber/simulation";
import { driverCopilot } from "@/lib/uber/agent";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json({ success: false, error: "query is required" }, { status: 400 });
    }

    const engine = getUberEngine();
    const state = engine.getState();
    const answer = await driverCopilot.answerDriverQuery(query, state);

    return NextResponse.json({
      success: true,
      message: answer,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Assistant error" },
      { status: 500 }
    );
  }
}
