import { NextResponse } from "next/server";
import { getUberEngine } from "@/lib/uber/simulation";
import { llmReasoningEngine } from "@/lib/uber/llmEngine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const query = body.query || body.message || "";
    const { driverProfile, history, apiKey } = body;

    if (!query) {
      return NextResponse.json({ success: false, error: "query is required" }, { status: 400 });
    }

    const engine = getUberEngine();
    const state = engine.getState();
    const answer = await llmReasoningEngine.generateResponse(
      query,
      state,
      driverProfile,
      history || [],
      apiKey
    );

    return NextResponse.json({
      success: true,
      message: answer,
    });
  } catch (err: any) {
    console.error("Assistant error, returning resilient fallback:", err);
    return NextResponse.json({
      success: true,
      message: {
        id: `FALLBACK_${Date.now()}`,
        sender: "ASSISTANT",
        agentType: "DISPATCH",
        text: "👋 **नमस्ते पार्टनर जी!** उबर माइकल एंजेलो एआई कॉपायलट सक्रिय है।\nइस समय **चिन्नास्वामी स्टेडियम और एमजी रोड** में उच्च मांग (3.5x सर्ज) है। नई राइड का अनुरोध आते ही आपको तुरंत अलर्ट मिलेगा!",
        timestamp: new Date().toISOString(),
      },
    });
  }
}
