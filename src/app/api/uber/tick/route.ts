import { NextResponse } from "next/server";
import { getUberEngine } from "@/lib/uber/simulation";

export async function POST() {
  try {
    const engine = getUberEngine();
    const updated = engine.tick();
    return NextResponse.json({
      success: true,
      state: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Tick failed" },
      { status: 500 }
    );
  }
}
