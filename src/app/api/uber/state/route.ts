import { NextResponse } from "next/server";
import { getUberEngine } from "@/lib/uber/simulation";

export async function GET() {
  try {
    const engine = getUberEngine();
    return NextResponse.json({
      success: true,
      state: engine.getState(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch state" },
      { status: 500 }
    );
  }
}
