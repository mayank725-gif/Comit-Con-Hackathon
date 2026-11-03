import { NextResponse } from "next/server";
import { getAgentStore } from "@/lib/store";

export async function GET() {
  try {
    const store = getAgentStore();
    const auditLogs = store.getAuditLogs();
    const metrics = store.getSummaryMetrics();

    return NextResponse.json({
      success: true,
      metrics,
      auditLogs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch audit log" },
      { status: 500 }
    );
  }
}
