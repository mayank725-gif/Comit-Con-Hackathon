import { NextResponse } from "next/server";
import { getAgentStore } from "@/lib/store";

export async function GET() {
  try {
    const store = getAgentStore();
    const pending = store.getPendingApprovals();
    const all = store.getAllApprovals();

    return NextResponse.json({
      success: true,
      pendingCount: pending.length,
      pending,
      history: all,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch approvals" },
      { status: 500 }
    );
  }
}
