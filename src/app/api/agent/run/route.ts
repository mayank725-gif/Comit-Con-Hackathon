import { NextResponse } from "next/server";
import { agentRunner } from "@/lib/agentEngine";
import { AgentTaskInput } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body: AgentTaskInput = await req.json();

    if (!body.title || !body.requesterEmail) {
      return NextResponse.json(
        { success: false, error: "Task title and requester email are required." },
        { status: 400 }
      );
    }

    const execution = await agentRunner.execute(body);
    return NextResponse.json({ success: true, execution });
  } catch (err: any) {
    console.error("Agent execution error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
