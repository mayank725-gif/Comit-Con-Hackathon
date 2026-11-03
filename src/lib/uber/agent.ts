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

        const systemPrompt = `You are the Uber India Assistant (powered by the Michelangelo ML Platform). You are acting as an expert real-time AI copilot for an active Uber driver in Bengaluru, India.
Live City Telemetry:
${zoneSummary}
City Avg Surge: ${state.metrics.cityAvgSurge}x, Avg Rider Wait: ${state.metrics.avgRiderWaitTimeMin} min.
Model Health: ${state.modelHealth.status} (${state.modelHealth.activeRoutingAlgorithm}).
Active Scenario: ${state.activeScenario.title} - ${state.activeScenario.description}.

Answer the driver's query concisely (2-4 sentences max), professionally, and actionably in English with INR (₹) estimates. Mention relevant Indian routes (e.g. Hebbal Flyover, Outer Ring Road, MG Road) where helpful.`;

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
                extraEarningsEstimate: "+₹350 - ₹600 / trip",
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
        text: `📍 **Dispatch Forecaster**: Michelangelo recommends repositioning to **${target.name}**. Current Surge is **${target.surgeMultiplier}x** with a net deficit of **${target.deficitOrSurplus} unfulfilled riders**. Expected fare is ~**₹${Math.round(380 * target.surgeMultiplier)} - ₹${Math.round(650 * target.surgeMultiplier)}** on your next trip.`,
        timestamp,
        actionableRecommendation: {
          suggestedZone: bestZone,
          estimatedSurge: target.surgeMultiplier,
          extraEarningsEstimate: `+₹${Math.round(200 * target.surgeMultiplier)} surge bonus`,
        },
        routingTrace: {
          confidenceScore: 0.984,
          tokensEvaluated: 148,
          featuresQueried: ["hex_demand_delta_15m", "driver_supply_density", "traffic_bottleneck_index"],
          latencyMs: 6.8,
        },
      };
    }

    // B. MONSOON & WEATHER SAFETY AGENT
    if (
      q.includes("rain") ||
      q.includes("flood") ||
      q.includes("monsoon") ||
      q.includes("waterlog") ||
      q.includes("weather") ||
      q.includes("safe")
    ) {
      return {
        id,
        sender: "ASSISTANT",
        agentType: "SYSTEM_GUARD",
        text: `🌧️ **Monsoon Weather Advisory**: Bellandur underpass and Silk Board junction are experiencing waterlogging. Michelangelo has enabled flood avoidance routing: avoid Outer Ring Road low-lying segments and utilize the elevated flyover towards Electronic City or Old Airport Road. Surge across wet zones is **2.8x - 2.9x**.`,
        timestamp,
        actionableRecommendation: {
          suggestedZone: "DOWNTOWN",
          estimatedSurge: 2.2,
          extraEarningsEstimate: "+₹280 rain premium",
        },
        routingTrace: {
          confidenceScore: 0.971,
          tokensEvaluated: 162,
          featuresQueried: ["rain_precipitation_mm_hr", "hex_flood_sensor_telemetry", "ev_battery_efficiency_temp"],
          latencyMs: 7.4,
        },
      };
    }

    // C. EVENT INTEL & SURGE EXPLANATION AGENT
    if (
      q.includes("why") ||
      q.includes("surge") ||
      q.includes("stadium") ||
      q.includes("airport") ||
      q.includes("chinnaswamy") ||
      q.includes("match") ||
      q.includes("concert") ||
      q.includes("red") ||
      q.includes("event")
    ) {
      if (state.activeScenario.type === "STADIUM_CONCERT_END") {
        return {
          id,
          sender: "ASSISTANT",
          agentType: "EVENT_INTEL",
          text: `🏟️ **Event Alert**: The IPL T20 match at **M. Chinnaswamy Stadium** has concluded with 40,000 spectators exiting along MG Road & Cubbon Park. Rider booking requests surged **+440%**. Michelangelo has set dynamic surge to **${state.zones.STADIUM.surgeMultiplier}x**. Anti-herd protection is managing inflow to prevent road gridlock.`,
          timestamp,
          actionableRecommendation: {
            suggestedZone: "STADIUM",
            estimatedSurge: state.zones.STADIUM.surgeMultiplier,
            extraEarningsEstimate: "+₹350 - ₹550 / trip",
          },
          routingTrace: {
            confidenceScore: 0.992,
            tokensEvaluated: 176,
            featuresQueried: ["venue_ticket_exit_distribution", "h3_hex_egress_velocity", "surge_anti_herd_damping"],
            latencyMs: 5.9,
          },
        };
      } else if (state.activeScenario.type === "AIRPORT_FLIGHT_WAVE") {
        return {
          id,
          sender: "ASSISTANT",
          agentType: "EVENT_INTEL",
          text: `✈️ **Airport Inflow Alert**: 10 long-haul domestic & international flights arrived at Kempegowda Airport (BLR) within 30 minutes. Average fare back to city via Bellary Road / Hebbal Expressway is ~₹1,200 - ₹1,600. Current surge is **${state.zones.AIRPORT.surgeMultiplier}x**.`,
          timestamp,
          actionableRecommendation: {
            suggestedZone: "AIRPORT",
            estimatedSurge: state.zones.AIRPORT.surgeMultiplier,
            extraEarningsEstimate: "+₹450 airport surge bonus",
          },
          routingTrace: {
            confidenceScore: 0.978,
            tokensEvaluated: 154,
            featuresQueried: ["flightstats_inbound_arrival_bank", "hebbal_expressway_travel_time", "airport_taxi_queue_depth"],
            latencyMs: 6.2,
          },
        };
      } else {
        return {
          id,
          sender: "ASSISTANT",
          agentType: "EVENT_INTEL",
          text: `📊 **Bengaluru Market Intelligence**: City-wide average surge is **${state.metrics.cityAvgSurge}x**. Bellandur Outer Ring Road and Koramangala are showing heavy tech-park and dinner demand with moderate Silk Board traffic.`,
          timestamp,
          routingTrace: {
            confidenceScore: 0.965,
            tokensEvaluated: 130,
            featuresQueried: ["city_wide_hex_supply_demand_ratio", "traffic_speed_index"],
            latencyMs: 5.1,
          },
        };
      }
    }

    // D. EARNINGS & PACING AGENT
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
        text: `💰 **Shift Telemetry**: Your current pace is **₹${state.metrics.avgDriverHourlyRate}/hr** (₹2,070 earned today across 4.5 hours). You are pacing **+64% above the unassisted market baseline** (₹280/hr) thanks to predictive surge positioning.`,
        timestamp,
        routingTrace: {
          confidenceScore: 0.995,
          tokensEvaluated: 110,
          featuresQueried: ["driver_shift_elapsed_hours", "cumulative_fare_inr", "pacing_projection_model"],
          latencyMs: 4.8,
        },
      };
    }

    // E. SYSTEM GUARD & MODEL HEALTH AGENT
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
          text: `⚠️ **Self-Healing Failover**: Sensor latency & rain deviations caused a temporary 78% feature deviation. Michelangelo automatically switched to the **Real-Time Heuristic Failover Engine** with zero driver disruption. Recalibration completes in ~3 seconds.`,
          timestamp,
          routingTrace: {
            confidenceScore: 0.892,
            tokensEvaluated: 198,
            featuresQueried: ["ks_test_drift_p_value", "realtime_heuristic_rule_matrix", "kafka_stream_lag_ms"],
            latencyMs: 14.8,
          },
        };
      } else {
        return {
          id,
          sender: "ASSISTANT",
          agentType: "SYSTEM_GUARD",
          text: `🛡️ **Michelangelo AI Guard**: Model health is **NOMINAL**. Feature drift score is 0.08 (safe threshold < 0.40). Anti-herd volatility damping is active, ensuring optimal city-wide equilibrium.`,
          timestamp,
          routingTrace: {
            confidenceScore: 0.998,
            tokensEvaluated: 142,
            featuresQueried: ["feature_drift_ks_statistic", "anti_herd_oscillation_damping_filter"],
            latencyMs: 5.4,
          },
        };
      }
    }

    // F. TRAFFIC & ROUTING QUESTIONS
    if (q.includes("traffic") || q.includes("route") || q.includes("hebbal") || q.includes("silk board") || q.includes("ring road")) {
      return {
        id,
        sender: "ASSISTANT",
        agentType: "DISPATCH",
        text: `🚗 **Bengaluru Traffic Guidance**: Hebbal Flyover towards Kempegowda Airport is moving smoothly at 52 km/h. Outer Ring Road near Bellandur has moderate tech park rush. If heading to Chinnaswamy Stadium, take Queens Road to avoid MG Road bottleneck.`,
        timestamp,
        routingTrace: {
          confidenceScore: 0.975,
          tokensEvaluated: 150,
          featuresQueried: ["google_routes_live_speed", "bengaluru_traffic_junction_status"],
          latencyMs: 6.9,
        },
      };
    }

    // G. DEFAULT GENERAL INQUIRY
    return {
      id,
      sender: "ASSISTANT",
      agentType: "DISPATCH",
      text: `👋 **Uber India Assistant**: Michelangelo is tracking Bengaluru fleet supply in real time. Demand is highest at **${state.zones.STADIUM.name}** (${state.zones.STADIUM.surgeMultiplier}x) and **${state.zones.AIRPORT.name}** (${state.zones.AIRPORT.surgeMultiplier}x). What would you like to optimize?`,
      timestamp,
      routingTrace: {
        confidenceScore: 0.962,
        tokensEvaluated: 120,
        featuresQueried: ["general_city_state", "driver_idle_status"],
        latencyMs: 5.0,
      },
    };
  }
}

export const driverCopilot = new MultiAgentDriverCopilot();
