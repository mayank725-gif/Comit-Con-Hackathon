import { NextResponse } from "next/server";
import { getUberEngine } from "@/lib/uber/simulation";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { scenario } = body;

    if (!scenario) {
      return NextResponse.json({ success: false, error: "scenario is required" }, { status: 400 });
    }

    const engine = getUberEngine();
    const updated = engine.triggerScenario(scenario);

    return NextResponse.json({
      success: true,
      state: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Scenario trigger failed" },
      { status: 500 }
    );
  }
}
