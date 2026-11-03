import { AssistantMessage, MarketplaceState, ZoneId } from "./types";

export class MultiAgentDriverCopilot {
  public async answerDriverQuery(query: string, state: MarketplaceState): Promise<AssistantMessage> {
    const q = query.toLowerCase().trim();
    const id = `MSG_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const geminiKey = process.env.GEMINI_API_KEY;

    // 1. If Gemini API key is configured, use real LLM with live city state injection
    if (geminiKey) {
      try {
        const zoneSummary = Object.values(state.zones)
          .map((z) => `${z.name}: Demand=${z.currentDemand}, ActiveDrivers=${z.activeDrivers}, Surge=${z.surgeMultiplier}x, Deficit=${z.deficitOrSurplus}`)
          .join(" | ");

        const systemPrompt = `You are the Uber Assistant (powered by the Michelangelo ML Platform). You are acting as an expert real-time AI copilot for an active Uber driver in San Francisco.
Live City Telemetry:
${zoneSummary}
City Avg Surge: ${state.metrics.cityAvgSurge}x, Avg Rider Wait: ${state.metrics.avgRiderWaitTimeMin} min.
Model Health: ${state.modelHealth.status} (${state.modelHealth.activeRoutingAlgorithm}).
Active Scenario: ${state.activeScenario.title} - ${state.activeScenario.description}.

Answer the driver's query concisely (2-4 sentences max), professionally, and actionably. Include specific dollar estimates or zone recommendations where relevant.`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
        const aiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `${systemPrompt}\n\nDriver asks: "${query}"` },
                ],
              },
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const generatedText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generatedText) {
            return {
              id,
              sender: "ASSISTANT",
              agentType: "DISPATCH",
              text: generatedText.trim(),
              timestamp,
              actionableRecommendation: {
                suggestedZone: state.zones.STADIUM.surgeMultiplier >= 2.0 ? "STADIUM" : "AIRPORT",
                estimatedSurge: Math.max(state.zones.STADIUM.surgeMultiplier, state.zones.AIRPORT.surgeMultiplier),
                extraEarningsEstimate: "+$18 - $28 / trip",
              },
            };
          }
        }
      } catch (err) {
        console.warn("Gemini call error in driver copilot, using local engine:", err);
      }
    }

    // 2. Comprehensive Local Multi-Agent Engine (Zero Latency & 100% Offline Functional)

    // A. REPOSITIONING / DISPATCH AGENT
    if (
      q.includes("where") ||
      q.includes("go") ||
      q.includes("drive") ||
      q.includes("hotspot") ||
      q.includes("high fare") ||
      q.includes("reposition") ||
      q.includes("more rides") ||
      q.includes("busy")
    ) {
      let bestZone: ZoneId = "STADIUM";
      let maxDeficit = -1;

      for (const [zId, zone] of Object.entries(state.zones)) {
        if (zone.deficitOrSurplus > maxDeficit) {
          maxDeficit = zone.deficitOrSurplus;
          bestZone = zId as ZoneId;
        }
      }

      const target = state.zones[bestZone];
      return {
        id,
        sender: "ASSISTANT",
        agentType: "DISPATCH",
        text: `📍 **Dispatch Forecaster**: Michelangelo recommends repositioning to **${target.name}**. Current Surge is **${target.surgeMultiplier}x** with a net deficit of **${target.deficitOrSurplus} unfulfilled passengers**. Expected payout is ~**$${Math.round(22 * target.surgeMultiplier)} - $${Math.round(34 * target.surgeMultiplier)}** on your next trip.`,
        timestamp,
        actionableRecommendation: {
          suggestedZone: bestZone,
          estimatedSurge: target.surgeMultiplier,
          extraEarningsEstimate: `+$${Math.round(10 * target.surgeMultiplier)} surge bonus`,
        },
      };
    }

    // B. EVENT INTEL & SURGE EXPLANATION AGENT
    if (
      q.includes("why") ||
      q.includes("surge") ||
      q.includes("stadium") ||
      q.includes("airport") ||
      q.includes("concert") ||
      q.includes("red") ||
      q.includes("event")
    ) {
      if (state.activeScenario.type === "STADIUM_CONCERT_END") {
        return {
          id,
          sender: "ASSISTANT",
          agentType: "EVENT_INTEL",
          text: `🏟️ **Event Alert**: The Coldplay Concert at **Chase Center / Oracle Park** has concluded with 65,000 attendees exiting. Rider app open rates spiked **+420%** along 3rd St. Michelangelo has set dynamic surge to **${state.zones.STADIUM.surgeMultiplier}x**. Anti-herd protection is capping incoming driver flow to prevent gridlock.`,
          timestamp,
        };
      } else if (state.activeScenario.type === "AIRPORT_FLIGHT_WAVE") {
        return {
          id,
          sender: "ASSISTANT",
          agentType: "EVENT_INTEL",
          text: `✈️ **Airport Inflow**: 8 long-haul international flights landed at SFO Terminals 2 & 3 within 25 minutes. Average trip distance from SFO is 18 miles along US-101. Surge is at **${state.zones.AIRPORT.surgeMultiplier}x**.`,
          timestamp,
        };
      } else {
        return {
          id,
          sender: "ASSISTANT",
          agentType: "EVENT_INTEL",
          text: `📊 **Market Intelligence**: City-wide average surge is **${state.metrics.cityAvgSurge}x**. Financial District and SoMa Corridor are showing steady commuter pickups with low traffic delays.`,
          timestamp,
        };
      }
    }

    // C. EARNINGS & PACING AGENT
    if (
      q.includes("earning") ||
      q.includes("money") ||
      q.includes("hourly") ||
      q.includes("made") ||
      q.includes("rate") ||
      q.includes("income") ||
      q.includes("goal")
    ) {
      return {
        id,
        sender: "ASSISTANT",
        agentType: "EARNINGS",
        text: `💰 **Shift Telemetry**: Your current pace is **$${state.metrics.avgDriverHourlyRate}/hr** ($138 today across 4.5 hours). You are pacing **+61% above the unassisted market baseline** ($18.40/hr) thanks to predictive surge repositioning.`,
        timestamp,
      };
    }

    // D. SYSTEM GUARD & MODEL HEALTH AGENT
    if (
      q.includes("drift") ||
      q.includes("stale") ||
      q.includes("health") ||
      q.includes("model") ||
      q.includes("ai") ||
      q.includes("michelangelo") ||
      q.includes("algorithm") ||
      q.includes("herd")
    ) {
      if (state.modelHealth.status === "FALLBACK_ENGAGED") {
        return {
          id,
          sender: "ASSISTANT",
          agentType: "SYSTEM_GUARD",
          text: `⚠️ **Self-Healing Failover**: Sensor latency caused a temporary 78% feature deviation. Michelangelo automatically switched to the **Real-Time Heuristic Failover Engine** with zero dispatch disruption. Recalibration completes in ~3 seconds.`,
          timestamp,
        };
      } else {
        return {
          id,
          sender: "ASSISTANT",
          agentType: "SYSTEM_GUARD",
          text: `🛡️ **Michelangelo AI Guard**: Model health is **NOMINAL**. Feature drift score is 0.08 (safe threshold < 0.40). Anti-herd volatility damping is active, ensuring optimal city-wide equilibrium.`,
          timestamp,
        };
      }
    }

    // E. TRAFFIC & ROUTING QUESTIONS
    if (q.includes("traffic") || q.includes("route") || q.includes("bridge") || q.includes("highway") || q.includes("101")) {
      return {
        id,
        sender: "ASSISTANT",
        agentType: "DISPATCH",
        text: `🚗 **Transit Navigation**: US-101 South towards SFO is flowing at 58 mph. Northbound towards Downtown via I-80 is clear. If heading to Chase Center, approach via Mariposa St to avoid 3rd St pedestrian congestion.`,
        timestamp,
      };
    }

    // F. DEFAULT GENERAL INQUIRY
    return {
      id,
      sender: "ASSISTANT",
      agentType: "DISPATCH",
      text: `👋 **Uber Assistant**: Michelangelo is tracking San Francisco fleet supply in real time. Demand is strongest at **${state.zones.STADIUM.name}** (${state.zones.STADIUM.surgeMultiplier}x) and **${state.zones.AIRPORT.name}** (${state.zones.AIRPORT.surgeMultiplier}x). What would you like to optimize?`,
      timestamp,
    };
  }
}

export const driverCopilot = new MultiAgentDriverCopilot();
