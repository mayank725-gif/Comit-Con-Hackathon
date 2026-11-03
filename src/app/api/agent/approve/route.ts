import { NextResponse } from "next/server";
import { getAgentStore } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { approvalId, decision, reviewerNote, reviewedBy } = body;

    if (!approvalId || !decision) {
      return NextResponse.json(
        { success: false, error: "approvalId and decision ('APPROVED' | 'REJECTED') are required." },
        { status: 400 }
      );
    }

    const store = getAgentStore();
    const resolved = store.resolveApproval(
      approvalId,
      decision,
      reviewerNote || `Manual decision: ${decision}`,
      reviewedBy || "Admin Manager"
    );

    if (!resolved) {
      return NextResponse.json(
        { success: false, error: "Approval ticket not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      approval: resolved,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to resolve approval" },
      { status: 500 }
    );
  }
}
