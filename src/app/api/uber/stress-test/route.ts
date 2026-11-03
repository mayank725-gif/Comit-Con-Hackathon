import { NextResponse } from "next/server";
import { getUberEngine } from "@/lib/uber/simulation";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { locationName = "M. Chinnaswamy Stadium, MG Road", lat = 12.9788, lng = 77.5996 } = body;

    const engine = getUberEngine();
    const result = engine.handle1000BurstStressTest(locationName, lat, lng);

    return NextResponse.json({
      ...result,
    });
  } catch (error: any) {
    console.error("Stress test failure:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to process 1,000 request shock" },
      { status: 500 }
    );
  }
}
