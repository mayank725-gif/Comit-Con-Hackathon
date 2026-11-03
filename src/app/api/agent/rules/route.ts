import { NextResponse } from "next/server";
import { globalPolicyEngine } from "@/lib/policyEngine";

export async function GET() {
  try {
    const rules = globalPolicyEngine.getRules();
    return NextResponse.json({ success: true, rules });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch rules" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, enabled, threshold } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Rule id required" }, { status: 400 });
    }

    globalPolicyEngine.updateRule(id, {
      ...(enabled !== undefined ? { enabled } : {}),
      ...(threshold !== undefined ? { threshold } : {}),
    });

    return NextResponse.json({ success: true, rules: globalPolicyEngine.getRules() });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update rule" },
      { status: 500 }
    );
  }
}
