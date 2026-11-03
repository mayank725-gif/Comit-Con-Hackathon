import { AssistantMessage, MarketplaceState, ZoneId } from "./types";
import { getUberEngine } from "./simulation";

export class MultiAgentDriverCopilot {
  public answerDriverQuery(query: string, state: MarketplaceState): AssistantMessage {
    const q = query.toLowerCase().trim();
    const id = `MSG_${Date.now()}`;
    const timestamp = new Date().toISOString();

    // 1. DISPATCH / REPOSITIONING QUERIES
    if (q.includes("where should i go") || q.includes("where to drive") || q.includes("hotspot") || q.includes("more rides") || q.includes("position")) {
      // Find highest surge zone with deficit
      let bestZone: ZoneId = "STADIUM";
      let maxScore = -1;

      for (const [zId, zone] of Object.entries(state.zones)) {
        const score = zone.surgeMultiplier * 1.5 + (zone.deficitOrSurplus / 20);
        if (score > maxScore) {
          maxScore = score;
          bestZone = zId as ZoneId;
        }
      }

      const target = state.zones[bestZone];
      return {
        id,
        sender: "ASSISTANT",
        agentType: "DISPATCH",
        text: `📍 Michelangelo Forecaster recommends repositioning to **${target.name}**. Current Surge: **${target.surgeMultiplier}x** with an estimated ${target.deficitOrSurplus} passenger deficit. Heading there now will boost your next 2 hours by ~$38-$45.`,
        timestamp,
        actionableRecommendation: {
          suggestedZone: bestZone,
          estimatedSurge: target.surgeMultiplier,
          extraEarningsEstimate: "+$18 - $24 / trip",
        },
      };
    }

    // 2. SURGE EXPLANATION / EVENT INTEL QUERIES
    if (q.includes("why") && (q.includes("surge") || q.includes("stadium") || q.includes("airport") || q.includes("red"))) {
      if (state.activeScenario.type === "STADIUM_CONCERT_END") {
        return {
          id,
          sender: "ASSISTANT",
          agentType: "EVENT_INTEL",
          text: `🏟️ **Event Alert**: The Coldplay Concert at **Central Stadium** just concluded with 65,000 attendees. Rider app opens surged +420% in the last 15 minutes. Michelangelo has applied a 3.4x dynamic surge multiplier with anti-herd protection enabled.`,
          timestamp,
        };
      } else if (state.activeScenario.type === "AIRPORT_FLIGHT_WAVE") {
        return {
          id,
          sender: "ASSISTANT",
          agentType: "EVENT_INTEL",
          text: `✈️ **Flight Wave Alert**: 8 long-haul international flights landed at Terminal 2 within 25 minutes. Average trip distance from Airport is 24 miles (high-fare highway route). Surge is currently 2.4x.`,
          timestamp,
        };
      } else {
        return {
          id,
          sender: "ASSISTANT",
          agentType: "EVENT_INTEL",
          text: `📊 **Marketplace Intelligence**: Current city-wide average surge is ${state.metrics.cityAvgSurge}x. Entertainment District and Downtown are showing steady evening restaurant demand. No major traffic gridlocks reported.`,
          timestamp,
        };
      }
    }

    // 3. EARNINGS QUERIES
    if (q.includes("earning") || q.includes("money") || q.includes("made today") || q.includes("hourly rate") || q.includes("income")) {
      const avgRate = state.metrics.avgDriverHourlyRate;
      return {
        id,
        sender: "ASSISTANT",
        agentType: "EARNINGS",
        text: `💰 **Earnings Synthesis**: You've clocked 4.5 hours with an effective rate of **$${avgRate}/hr** ($142 today). You are tracking **+34% above your 30-day average** due to optimized repositioning during peak demand windows.`,
        timestamp,
      };
    }

    // 4. MODEL HEALTH / STALE MODEL / SYSTEM SAFETY QUERIES
    if (q.includes("model") || q.includes("stale") || q.includes("drift") || q.includes("system") || q.includes("algorithm")) {
      if (state.modelHealth.status === "FALLBACK_ENGAGED") {
        return {
          id,
          sender: "ASSISTANT",
          agentType: "SYSTEM_GUARD",
          text: `⚠️ **AI Guard Advisory**: Sensor ingest latency triggered a temporary model drift alert (Drift Index: ${state.modelHealth.featureDriftScore}). Michelangelo automatically engaged the **Real-Time Heuristic Fallback Engine** to protect driver earnings. Recalibration underway.`,
          timestamp,
        };
      } else {
        return {
          id,
          sender: "ASSISTANT",
          agentType: "SYSTEM_GUARD",
          text: `✅ **Michelangelo ML Health**: Nominal. Inference latency: ${state.modelHealth.latencyMs}ms. Predictive demand models are retrained every 10 minutes with zero feature drift detected. Anti-herd damping is active.`,
          timestamp,
        };
      }
    }

    // DEFAULT ROUTED ANSWER
    return {
      id,
      sender: "ASSISTANT",
      agentType: "DISPATCH",
      text: `🤖 **Uber Assistant**: Michelangelo is actively monitoring city-wide demand. Currently, **${state.zones.STADIUM.name}** and **${state.zones.AIRPORT.name}** offer the highest revenue potential. Let me know if you need specific zone forecasts or shift pacing!`,
      timestamp,
    };
  }
}

export const driverCopilot = new MultiAgentDriverCopilot();
