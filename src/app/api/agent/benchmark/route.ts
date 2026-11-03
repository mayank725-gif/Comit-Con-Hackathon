import { NextResponse } from "next/server";
import { runBenchmarkEvaluation, BENCHMARK_TEST_CASES } from "@/lib/benchmarkData";

export async function POST() {
  try {
    const results = runBenchmarkEvaluation();
    return NextResponse.json({
      success: true,
      results,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Benchmark failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      caseCount: BENCHMARK_TEST_CASES.length,
      cases: BENCHMARK_TEST_CASES,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch test cases" },
      { status: 500 }
    );
  }
}
