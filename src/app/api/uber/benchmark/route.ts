import { NextResponse } from "next/server";
import { UBER_BENCHMARK_DATA } from "@/lib/uber/benchmark";

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      benchmark: UBER_BENCHMARK_DATA,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch benchmark" },
      { status: 500 }
    );
  }
}
