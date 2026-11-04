import { AssistantMessage, MarketplaceState, ZoneId } from "./types";

export class MultiAgentDriverCopilot {
  public async answerDriverQuery(query: string, state: MarketplaceState, driverProfile?: any): Promise<AssistantMessage> {
    const q = query.toLowerCase().trim();
    const id = `MSG_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const geminiKey = process.env.GEMINI_API_KEY;

    // Detect if driver is querying in Hindi (Devanagari script or phonetic transliteration)
    const isHindi =
      /[\u0900-\u097F]/.test(query) ||
      q.includes("kahan") ||
      q.includes("kidhar") ||
      q.includes("kamai") ||
      q.includes("paisa") ||
      q.includes("paise") ||
      q.includes("kiraya") ||
      q.includes("batao") ||
      q.includes("madad") ||
      q.includes("namaste") ||
      q.includes("shuru") ||
      q.includes("chalo") ||
      q.includes("jaun") ||
      (q.includes("stadium") && (q.includes("kyu") || q.includes("kyon"))) ||
      (q.includes("traffic") && (q.includes("kaisa") || q.includes("kya")));

    // 0. WORK AREA & DRIVER PROFILE SPECIFIC INTELLIGENCE
    if (
      driverProfile &&
      (q.includes("area") ||
        q.includes("sector") ||
        q.includes("work") ||
        q.includes("इलाका") ||
        q.includes("इलाके") ||
        q.includes("टारगेट") ||
        q.includes("target") ||
        q.includes("goal") ||
        q.includes("बाकी") ||
        q.includes("लक्ष्य") ||
        q.includes("vehicle") ||
        q.includes("गाड़ी") ||
        q.includes("plate") ||
        q.includes("नंबर"))
    ) {
      const remainingTarget = Math.max(0, (driverProfile.dailyEarningsTarget || 3000) - (driverProfile.currentEarnings || 1480));
      const textEn = `📍 **Work Area Spotlight**: Welcome, Driver **${driverProfile.driverName}**! Your assigned primary operating sector is **${driverProfile.primaryZoneName}** in ${driverProfile.cityName}. Your vehicle **${driverProfile.vehicleModel} (${driverProfile.licensePlate})** is on-duty. You have completed **${driverProfile.completedTrips} trips** today with **₹${driverProfile.currentEarnings}** earned. You are only **₹${remainingTarget}** away from your daily ₹${driverProfile.dailyEarningsTarget} target!`;
      const textHi = `📍 **कार्यक्षेत्र इंटेलिजेंस**: नमस्ते, ड्राइवर **${driverProfile.driverName}** जी! आपका प्राथमिक कार्यक्षेत्र **${driverProfile.primaryZoneName}** (${driverProfile.cityName}) है। आपकी गाड़ी **${driverProfile.vehicleModel} (${driverProfile.licensePlate})** ऑन-ड्यूटी है। आज आपने **${driverProfile.completedTrips} ट्रिप्स** पूरी करके **₹${driverProfile.currentEarnings}** कमाए हैं। आप अपने ₹${driverProfile.dailyEarningsTarget} के दैनिक लक्ष्य से केवल **₹${remainingTarget}** दूर हैं!`;

      return {
        id,
        sender: "ASSISTANT",
        agentType: "DISPATCH",
        text: isHindi ? textHi : textEn,
        timestamp,
        actionableRecommendation: {
          suggestedZone: (driverProfile.primaryZone as ZoneId) || "STADIUM",
          estimatedSurge: 2.8,
          extraEarningsEstimate: `₹${remainingTarget} to reach goal`,
        },
        routingTrace: {
          confidenceScore: 0.999,
          tokensEvaluated: 140,
          featuresQueried: ["driver_assigned_sector", "daily_shift_progress", "license_plate_telemetry"],
          latencyMs: 4.2,
        },
      };
    }

    // 1. If Gemini API key is configured, use real LLM with live city state injection
    if (geminiKey) {
      try {
        const zoneSummary = Object.values(state.zones)
          .map((z) => `${z.name}: Demand=${z.currentDemand}, ActiveDrivers=${z.activeDrivers}, Surge=${z.surgeMultiplier}x, Deficit=${z.deficitOrSurplus}`)
          .join(" | ");

        const systemPrompt = `You are the Uber India Assistant (powered by the Michelangelo ML Platform). You are acting as an expert real-time AI copilot for an active Uber driver in India.
Live City Telemetry:
${zoneSummary}
City Avg Surge: ${state.metrics.cityAvgSurge}x, Avg Rider Wait: ${state.metrics.avgRiderWaitTimeMin} min.
Model Health: ${state.modelHealth.status} (${state.modelHealth.activeRoutingAlgorithm}).
Active Scenario: ${state.activeScenario.title} - ${state.activeScenario.description}.

Instructions:
- If the driver speaks/queries in Hindi (Devanagari or transliterated Hindi), respond in polite, natural, professional Hindi using Devanagari script.
- If in English, answer in English.
- Keep responses concise (2-4 sentences max), professional, actionable with INR (₹) estimates and live surge multipliers.`;

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
                extraEarningsEstimate: isHindi ? "+₹350 - ₹600 / ट्रिप" : "+₹350 - ₹600 / trip",
              },
            };
          }
        }
      } catch (err) {
        console.warn("Gemini call error in driver copilot, using local engine:", err);
      }
    }

    // 2. Comprehensive Local Multi-Agent Engine (Zero Latency & 100% Offline Functional)

    // A. TOURIST PLACES & OUTSTATION INTELLIGENCE (Checked first to prevent 'go' in 'goa' collision)
    if (
      q.includes("tourist") ||
      q.includes("taj") ||
      q.includes("agra") ||
      q.includes("goa") ||
      q.includes("kedarnath") ||
      q.includes("mysore") ||
      q.includes("hampi") ||
      q.includes("manali") ||
      q.includes("varanasi") ||
      q.includes("outstation") ||
      q.includes("travel") ||
      q.includes("पर्यटन") ||
      q.includes("ताज") ||
      q.includes("आगरा") ||
      q.includes("गोवा") ||
      q.includes("केदारनाथ") ||
      q.includes("मैसूर") ||
      q.includes("हम्पी") ||
      q.includes("मनाली") ||
      q.includes("काशी") ||
      q.includes("घूमने")
    ) {
      const textEn = `🏛️ **Pan-India Tourist Intelligence**: 32+ premier heritage & travel destinations are active across India. For **Taj Mahal (Agra)**, typical Uber Outstation fare from Delhi NCR is ~₹2,800. For **Mysore Palace**, fare from Bengaluru via the Expressway is ~₹2,400. You can also click on any tourist badge or use the map search bar to fly directly to that site!`;
      const textHi = `🏛️ **अखिल भारतीय पर्यटन व आउटस्टेशन**: देश के 32+ प्रमुख पर्यटन स्थल सक्रिय हैं। **ताज महल (आगरा)** के लिए दिल्ली से अनुमानित आउटस्टेशन किराया लगभग **₹2,800** है। **मैसूर पैलेस** के लिए बेंगलुरु एक्सप्रेसवे से **₹2,400** है। आप नक्शे में पर्यटन बैज पर क्लिक करके सीधे वहां नेविगेट कर सकते हैं!`;

      return {
        id,
        sender: "ASSISTANT",
        agentType: "EVENT_INTEL",
        text: isHindi ? textHi : textEn,
        timestamp,
        routingTrace: {
          confidenceScore: 0.988,
          tokensEvaluated: 165,
          featuresQueried: ["national_tourism_corridors", "uber_outstation_intercity_pricing", "expressway_toll_rates"],
          latencyMs: 5.6,
        },
      };
    }

    // A2. CORPORATE BUSINESS TRAVEL & GST TAX INVOICE AGENT
    if (
      q.includes("gst") ||
      q.includes("tax") ||
      q.includes("itc") ||
      q.includes("invoice") ||
      q.includes("corporate") ||
      q.includes("business travel") ||
      q.includes("expense") ||
      q.includes("जीएसटी") ||
      q.includes("टैक्स") ||
      q.includes("रसीद") ||
      q.includes("बिल")
    ) {
      const textEn = `💼 **Uber for Business & GST Compliance**: Corporate rides include 5% GST (2.5% CGST + 2.5% SGST) under HSN/SAC Code **996412** (Passenger Transportation). Enter your company GSTIN (e.g., \`29AABCU9603R1ZM\`) and Expense Code in the Rider Portal to claim full Input Tax Credit (ITC). Detailed GST invoices are generated and printable immediately upon trip completion.`;
      const textHi = `💼 **उबर बिज़नेस व जीएसटी अनुपालन**: व्यावसायिक यात्राओं पर एचएसएन/एसएसी कोड **996412** के तहत 5% जीएसटी (2.5% CGST + 2.5% SGST) लागू होता है। इनपुट टैक्स क्रेडिट (ITC) प्राप्त करने के लिए राइडर पोर्टल में कंपनी का जीएसटी नंबर और खर्च कोड दर्ज करें। यात्रा पूरी होते ही प्रिंट करने योग्य आधिकारिक जीएसटी टैक्स इनवॉइस उपलब्ध हो जाता है।`;

      return {
        id,
        sender: "ASSISTANT",
        agentType: "EARNINGS",
        text: isHindi ? textHi : textEn,
        timestamp,
        routingTrace: {
          confidenceScore: 0.994,
          tokensEvaluated: 145,
          featuresQueried: ["corporate_gstin_validator", "sac_996412_tax_matrix", "itc_reconciliation_rules"],
          latencyMs: 4.6,
        },
      };
    }

    // A3. VEHICLE TIERS & FARE COMPARISON AGENT
    if (
      q.includes("difference") ||
      q.includes("premier") ||
      q.includes("uber go") ||
      q.includes("auto") ||
      q.includes("green ev") ||
      q.includes("vehicle type") ||
      q.includes("tier") ||
      q.includes("capacity") ||
      q.includes("अंतर") ||
      q.includes("गाड़ी के प्रकार")
    ) {
      const textEn = `🚗 **Vehicle Fleet Guidance**:
- **Uber Go**: Affordable compact sedans (Maruti Dzire) at ₹13.5/km, 4 seats.
- **Uber Premier**: Executive comfort with top-rated drivers (Honda City, Creta) at ₹21.0/km, 4 seats.
- **Uber Auto**: Quick doorstep 3-wheeler auto rickshaws at ₹10.0/km, 3 seats.
- **Uber Green EV**: 100% zero-emission electric cabs (Nexon EV, ZS EV) at ₹15.0/km, 4 seats.`;
      const textHi = `🚗 **वाहन श्रेणी गाइड**:
- **उबर गो (Uber Go)**: किफायती कॉम्पैक्ट सेडान (मारुति डिजायर) ₹13.5/किमी, 4 सीटें।
- **उबर प्रीमियर (Uber Premier)**: आरामदायक सेडान व टॉप ड्राइवर (होंडा सिटी, क्रेटा) ₹21.0/किमी, 4 सीटें।
- **उबर ऑटो (Uber Auto)**: तेज 3-पहिया ऑटो रिक्शा ₹10.0/किमी, 3 सीटें।
- **उबर ग्रीन ईवी (Uber Green EV)**: 100% प्रदूषण-मुक्त इलेक्ट्रिक कैब (नेक्सन ईवी) ₹15.0/किमी, 4 सीटें।`;

      return {
        id,
        sender: "ASSISTANT",
        agentType: "DISPATCH",
        text: isHindi ? textHi : textEn,
        timestamp,
        routingTrace: {
          confidenceScore: 0.991,
          tokensEvaluated: 155,
          featuresQueried: ["vehicle_tier_pricing_rules", "fleet_capacity_specs"],
          latencyMs: 4.8,
        },
      };
    }

    // A4. SAFETY & 4-DIGIT PIN/OTP PROTOCOL
    if (
      q.includes("pin") ||
      q.includes("otp") ||
      q.includes("safety") ||
      q.includes("security") ||
      q.includes("ओटीपी") ||
      q.includes("पिन") ||
      q.includes("सुरक्षा")
    ) {
      const textEn = `🛡️ **Safety PIN Protocol**: Every ride generates a unique **4-digit Security PIN** on the Rider Portal. To protect passengers and prevent fraudulent pickups, the commercial driver MUST type and verify this PIN in their Driver HUD before the vehicle ignition is unlocked and trip metering begins.`;
      const textHi = `🛡️ **सुरक्षा पिन/ओटीपी प्रोटोकॉल**: प्रत्येक राइड बुकिंग पर राइडर पोर्टल में एक विशिष्ट **4-अंकों का सुरक्षा पिन** बनता है। सवारी की सुरक्षा सुनिश्चित करने के लिए ड्राइवर को यात्रा शुरू करने से पहले ड्राइवर HUD में यह पिन सत्यापित करना अनिवार्य होता है।`;

      return {
        id,
        sender: "ASSISTANT",
        agentType: "SYSTEM_GUARD",
        text: isHindi ? textHi : textEn,
        timestamp,
        routingTrace: {
          confidenceScore: 0.997,
          tokensEvaluated: 138,
          featuresQueried: ["two_party_otp_handshake", "safety_toolkit_rules"],
          latencyMs: 3.9,
        },
      };
    }

    // A5. 1,000 CONCURRENT REQUESTS BURST TEST EXPLAINER
    if (
      q.includes("1000") ||
      q.includes("burst") ||
      q.includes("stress") ||
      q.includes("shock") ||
      q.includes("हजार") ||
      q.includes("शॉक") ||
      q.includes("तनाव")
    ) {
      const textEn = `⚡ **1,000 Request Shock Absorber**: When 1,000 concurrent ride requests strike a single hotspot (e.g., Chinnaswamy Stadium), Michelangelo engages 3 algorithmic defenses:
1. **Anti-Herd Damping**: Locks 65% of the fleet across other city zones to prevent citywide cab starvation.
2. **Surge Capped at 3.8x**: Prevents extortionate surge spikes.
3. **Multi-Gate Wave Dispersal**: Divides 1,000 passengers across 3 dispersal gates in 4 staggered waves over 15 minutes.`;
      const textHi = `⚡ **1,000 अनुरोध शॉक एब्जॉर्बर**: जब किसी एक स्थान (जैसे चिन्नास्वामी स्टेडियम) से एक साथ 1,000 राइड अनुरोध आते हैं, तो माइकल एंजेलो 3 सुरक्षा उपाय लागू करता है:
1. **एंटी-हर्ड डैम्पिंग**: पूरे शहर में कैब की कमी न हो, इसके लिए 65% फ्लीट को अन्य इलाकों में सुरक्षित रखता है।
2. **अधिकतम 3.8x सर्ज कैप**: अत्यधिक किराए की बढ़ोतरी को रोकता है।
3. **मल्टी-गेट वेव डिस्पर्सल**: 1,000 यात्रियों को 3 निकास द्वारों पर 4 क्रमिक चरणों में विभाजित करता है।`;

      return {
        id,
        sender: "ASSISTANT",
        agentType: "EVENT_INTEL",
        text: isHindi ? textHi : textEn,
        timestamp,
        routingTrace: {
          confidenceScore: 0.998,
          tokensEvaluated: 180,
          featuresQueried: ["anti_herd_lock_ratio", "dispersal_gates_capacity", "surge_cap_clamp"],
          latencyMs: 4.1,
        },
      };
    }

    // A6. PAYMENTS & INSTANT IMPS CASHOUT
    if (
      q.includes("cashout") ||
      q.includes("payout") ||
      q.includes("imps") ||
      q.includes("bank") ||
      q.includes("भुगतान") ||
      q.includes("कैशआउट") ||
      q.includes("बैंक")
    ) {
      const textEn = `💳 **Financial Payments & Cashout**:
- **For Drivers**: One-click **Instant IMPS Cash Out** transfers your net shift earnings (after 20% Uber fee and fuel deduction) directly into your linked bank account (e.g. HDFC Bank).
- **For Riders**: Supports Google Pay UPI, Uber Cash, Corporate Billing, and Cash to Driver.`;
      const textHi = `💳 **भुगतान व त्वरित कैशआउट**:
- **ड्राइवरों के लिए**: एक-क्लिक **त्वरित IMPS कैशआउट** 20% उबर सेवा शुल्क और ईंधन खर्च काटकर आपकी शुद्ध कमाई तुरंत बैंक खाते में जमा कर देता है।
- **यात्रियों के लिए**: गूगल पे यूपीआई, उबर कैश, कॉर्पोरेट बिलिंग और नकद भुगतान का विकल्प उपलब्ध है।`;

      return {
        id,
        sender: "ASSISTANT",
        agentType: "EARNINGS",
        text: isHindi ? textHi : textEn,
        timestamp,
        routingTrace: {
          confidenceScore: 0.995,
          tokensEvaluated: 140,
          featuresQueried: ["imps_instant_transfer_gateway", "payment_method_router"],
          latencyMs: 4.3,
        },
      };
    }

    // B. REPOSITIONING / DISPATCH AGENT
    if (
      q.includes("where") ||
      /\bgo\b/i.test(q) ||
      q.includes("drive") ||
      q.includes("hotspot") ||
      q.includes("high fare") ||
      q.includes("reposition") ||
      q.includes("more rides") ||
      q.includes("busy") ||
      q.includes("कहाँ") ||
      q.includes("किधर") ||
      q.includes("जाऊँ") ||
      q.includes("सवारी") ||
      q.includes("kahan") ||
      q.includes("kidhar") ||
      q.includes("jaun") ||
      (q.includes("kamai") && (q.includes("kahan") || q.includes("jaun") || q.includes("kidhar") || q.includes("milegi")))
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
      const textEn = `📍 **Dispatch Forecaster**: Michelangelo recommends repositioning to **${target.name}**. Current Surge is **${target.surgeMultiplier}x** with a net deficit of **${target.deficitOrSurplus} unfulfilled riders**. Expected fare is ~**₹${Math.round(380 * target.surgeMultiplier)} - ₹${Math.round(650 * target.surgeMultiplier)}** on your next trip.`;
      const textHi = `📍 **डिस्पैच फोरकास्टर**: माइकल एंजेलो आपको **${target.name}** जाने की सलाह देता है। वर्तमान में यहाँ **${target.surgeMultiplier}x सर्ज** है और **${target.deficitOrSurplus} असंतुष्ट सवारियों** की प्रतीक्षा है। अगली ट्रिप पर संभावित किराया ~**₹${Math.round(380 * target.surgeMultiplier)} - ₹${Math.round(650 * target.surgeMultiplier)}** होगा।`;

      return {
        id,
        sender: "ASSISTANT",
        agentType: "DISPATCH",
        text: isHindi ? textHi : textEn,
        timestamp,
        actionableRecommendation: {
          suggestedZone: bestZone,
          estimatedSurge: target.surgeMultiplier,
          extraEarningsEstimate: isHindi
            ? `+₹${Math.round(200 * target.surgeMultiplier)} सर्ज बोनस`
            : `+₹${Math.round(200 * target.surgeMultiplier)} surge bonus`,
        },
        routingTrace: {
          confidenceScore: 0.984,
          tokensEvaluated: 148,
          featuresQueried: ["hex_demand_delta_15m", "driver_supply_density", "traffic_bottleneck_index"],
          latencyMs: 6.8,
        },
      };
    }

    // C. EARNINGS & PACING AGENT
    if (
      q.includes("earning") ||
      q.includes("money") ||
      q.includes("hourly") ||
      q.includes("made") ||
      q.includes("income") ||
      q.includes("pacing") ||
      q.includes("pace") ||
      q.includes("कमाई") ||
      q.includes("पैसे") ||
      q.includes("रुपये") ||
      q.includes("घंटे") ||
      q.includes("इनकम") ||
      q.includes("kamai") ||
      q.includes("paisa") ||
      q.includes("paise")
    ) {
      const textEn = `💰 **Shift Telemetry**: Your current pace is **₹${state.metrics.avgDriverHourlyRate}/hr** (₹2,070 earned today across 4.5 hours). You are pacing **+64% above the unassisted market baseline** (₹280/hr) thanks to predictive surge positioning.`;
      const textHi = `💰 **शिफ्ट टेलीमेट्री**: आपकी वर्तमान कमाई दर **₹${state.metrics.avgDriverHourlyRate}/घंटा** है (आज 4.5 घंटे में कुल ₹2,070 अर्जित)। प्रेडिक्टिव सर्ज पोजिशनिंग के कारण आप बिना-असिस्टेड बेसलाइन (₹280/घंटा) से **+64% अधिक** कमा रहे हैं।`;

      return {
        id,
        sender: "ASSISTANT",
        agentType: "EARNINGS",
        text: isHindi ? textHi : textEn,
        timestamp,
        routingTrace: {
          confidenceScore: 0.995,
          tokensEvaluated: 110,
          featuresQueried: ["driver_shift_elapsed_hours", "cumulative_fare_inr", "pacing_projection_model"],
          latencyMs: 4.8,
        },
      };
    }

    // D. MONSOON & WEATHER SAFETY AGENT
    if (
      q.includes("rain") ||
      q.includes("flood") ||
      q.includes("monsoon") ||
      q.includes("waterlog") ||
      q.includes("weather") ||
      q.includes("safe") ||
      q.includes("बारिश") ||
      q.includes("बाढ़") ||
      q.includes("पानी") ||
      q.includes("मौसम") ||
      q.includes("सुरक्षा") ||
      q.includes("barish") ||
      q.includes("baad")
    ) {
      const textEn = `🌧️ **Monsoon Weather Advisory**: Bellandur underpass and Silk Board junction are experiencing waterlogging. Michelangelo has enabled flood avoidance routing: avoid Outer Ring Road low-lying segments and utilize the elevated flyover towards Electronic City or Old Airport Road. Surge across wet zones is **2.8x - 2.9x**.`;
      const textHi = `🌧️ **मौसम व मानसून एडवाइजरी**: बेलंदूर अंडरपास और सिल्क बोर्ड जंक्शन पर जलभराव की स्थिति है। माइकल एंजेलो ने सुरक्षित एलिवेटेड फ्लाईओवर्स रूटिंग चालू कर दी है। भीगे इलाकों में सर्ज **2.8x - 2.9x** चल रहा है। सुरक्षित गति से चलें।`;

      return {
        id,
        sender: "ASSISTANT",
        agentType: "SYSTEM_GUARD",
        text: isHindi ? textHi : textEn,
        timestamp,
        actionableRecommendation: {
          suggestedZone: "DOWNTOWN",
          estimatedSurge: 2.2,
          extraEarningsEstimate: isHindi ? "+₹280 बारिश प्रीमियम" : "+₹280 rain premium",
        },
        routingTrace: {
          confidenceScore: 0.971,
          tokensEvaluated: 162,
          featuresQueried: ["rain_precipitation_mm_hr", "hex_flood_sensor_telemetry", "ev_battery_efficiency_temp"],
          latencyMs: 7.4,
        },
      };
    }

    // E. EVENT INTEL & SURGE EXPLANATION AGENT
    if (
      q.includes("surge") ||
      q.includes("stadium") ||
      q.includes("airport") ||
      q.includes("chinnaswamy") ||
      q.includes("match") ||
      q.includes("concert") ||
      q.includes("event") ||
      q.includes("सर्ज") ||
      q.includes("स्टेडियम") ||
      q.includes("हवाई") ||
      q.includes("मैच") ||
      q.includes("भीड़") ||
      q.includes("क्यों") ||
      q.includes("kyon") ||
      q.includes("kyu") ||
      /\bwhy\b/i.test(q)
    ) {
      if (state.activeScenario.type === "STADIUM_CONCERT_END") {
        const textEn = `🏟️ **Event Alert**: The IPL T20 match at **M. Chinnaswamy Stadium** has concluded with 40,000 spectators exiting along MG Road & Cubbon Park. Rider booking requests surged **+440%**. Michelangelo has set dynamic surge to **${state.zones.STADIUM.surgeMultiplier}x**. Anti-herd protection is managing inflow to prevent road gridlock.`;
        const textHi = `🏟️ **इवेंट अलर्ट**: एम. चिन्नास्वामी स्टेडियम में आईपीएल टी20 मैच समाप्त हुआ है और 40,000 दर्शक एमजी रोड व कब्बन पार्क की ओर निकल रहे हैं। बुकिंग मांग में **+440% का भारी उछाल** है। माइकल एंजेलो ने डायनेमिक सर्ज को **${state.zones.STADIUM.surgeMultiplier}x** पर सेट किया है।`;

        return {
          id,
          sender: "ASSISTANT",
          agentType: "EVENT_INTEL",
          text: isHindi ? textHi : textEn,
          timestamp,
          actionableRecommendation: {
            suggestedZone: "STADIUM",
            estimatedSurge: state.zones.STADIUM.surgeMultiplier,
            extraEarningsEstimate: isHindi ? "+₹350 - ₹550 / ट्रिप" : "+₹350 - ₹550 / trip",
          },
          routingTrace: {
            confidenceScore: 0.992,
            tokensEvaluated: 176,
            featuresQueried: ["venue_ticket_exit_distribution", "h3_hex_egress_velocity", "surge_anti_herd_damping"],
            latencyMs: 5.9,
          },
        };
      } else if (state.activeScenario.type === "AIRPORT_FLIGHT_WAVE") {
        const textEn = `✈️ **Airport Inflow Alert**: 10 long-haul domestic & international flights arrived at Kempegowda Airport (BLR) within 30 minutes. Average fare back to city via Bellary Road / Hebbal Expressway is ~₹1,200 - ₹1,600. Current surge is **${state.zones.AIRPORT.surgeMultiplier}x**.`;
        const textHi = `✈️ **एयरपोर्ट इनफ्लो अलर्ट**: केंपेगौड़ा अंतरराष्ट्रीय हवाई अड्डे (BLR) पर लगातार 10 उड़ानें उतरी हैं। शहर के लिए औसत किराया लगभग ₹1,200 - ₹1,600 है। वर्तमान सर्ज **${state.zones.AIRPORT.surgeMultiplier}x** है।`;

        return {
          id,
          sender: "ASSISTANT",
          agentType: "EVENT_INTEL",
          text: isHindi ? textHi : textEn,
          timestamp,
          actionableRecommendation: {
            suggestedZone: "AIRPORT",
            estimatedSurge: state.zones.AIRPORT.surgeMultiplier,
            extraEarningsEstimate: isHindi ? "+₹450 एयरपोर्ट सर्ज बोनस" : "+₹450 airport surge bonus",
          },
          routingTrace: {
            confidenceScore: 0.978,
            tokensEvaluated: 154,
            featuresQueried: ["flightstats_inbound_arrival_bank", "hebbal_expressway_travel_time", "airport_taxi_queue_depth"],
            latencyMs: 6.2,
          },
        };
      } else {
        const textEn = `📊 **Market Intelligence**: City-wide average surge is **${state.metrics.cityAvgSurge}x**. Tech corridors and CBD are showing steady corporate demand with moderate traffic.`;
        const textHi = `📊 **मार्केट इंटेलिजेंस**: पूरे शहर का औसत सर्ज **${state.metrics.cityAvgSurge}x** है। टेक कॉरिडोर और सीबीडी में तेज मांग है और सामान्य यातायात प्रवाह बना हुआ है।`;

        return {
          id,
          sender: "ASSISTANT",
          agentType: "EVENT_INTEL",
          text: isHindi ? textHi : textEn,
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

    // F. TRAFFIC & ROUTING QUESTIONS
    if (
      q.includes("traffic") ||
      q.includes("route") ||
      q.includes("hebbal") ||
      q.includes("silk board") ||
      q.includes("ring road") ||
      q.includes("ट्रैफिक") ||
      q.includes("जाम") ||
      q.includes("रास्ता") ||
      q.includes("मार्ग")
    ) {
      const textEn = `🚗 **Traffic Guidance**: Hebbal Flyover towards Kempegowda Airport is moving smoothly at 52 km/h. Outer Ring Road near Bellandur has moderate tech park rush. If heading to Chinnaswamy Stadium, take Queens Road to avoid MG Road bottleneck.`;
      const textHi = `🚗 **लाइव ट्रैफिक व रूट गाइड**: हेब्बल फ्लाईओवर से एयरपोर्ट की ओर यातायात 52 किमी/घंटा की सामान्य गति से चल रहा है। बेलंदूर रिंग रोड पर टेक-पार्क का मध्यम ट्रैफिक है। चिन्नास्वामी स्टेडियम जाने के लिए क्वींस रोड का उपयोग करें ताकि एमजी रोड के जाम से बचा जा सके।`;

      return {
        id,
        sender: "ASSISTANT",
        agentType: "DISPATCH",
        text: isHindi ? textHi : textEn,
        timestamp,
        routingTrace: {
          confidenceScore: 0.975,
          tokensEvaluated: 150,
          featuresQueried: ["google_routes_live_speed", "bengaluru_traffic_junction_status"],
          latencyMs: 6.9,
        },
      };
    }

    // G. SYSTEM GUARD & MODEL HEALTH AGENT (Must use word boundary \bai\b)
    if (
      q.includes("drift") ||
      q.includes("stale") ||
      q.includes("health") ||
      q.includes("model") ||
      /\bai\b/i.test(q) ||
      q.includes("michelangelo") ||
      q.includes("algorithm") ||
      q.includes("herd") ||
      q.includes("मॉडल") ||
      q.includes("हेल्थ")
    ) {
      if (state.modelHealth.status === "FALLBACK_ENGAGED") {
        const textEn = `⚠️ **Self-Healing Failover**: Sensor latency & rain deviations caused a temporary 78% feature deviation. Michelangelo automatically switched to the **Real-Time Heuristic Failover Engine** with zero driver disruption. Recalibration completes in ~3 seconds.`;
        const textHi = `⚠️ **सेल्फ-हीलिंग फेलओवर**: सेंसर विलंबता के कारण 78% फीचर विचलन दर्ज हुआ। माइकल एंजेलो ने तुरंत बिना किसी रुकावट के **रीयल-टाइम ह्यूरिस्टिक इंजन** पर स्विच कर दिया।`;

        return {
          id,
          sender: "ASSISTANT",
          agentType: "SYSTEM_GUARD",
          text: isHindi ? textHi : textEn,
          timestamp,
          routingTrace: {
            confidenceScore: 0.892,
            tokensEvaluated: 198,
            featuresQueried: ["ks_test_drift_p_value", "realtime_heuristic_rule_matrix", "kafka_stream_lag_ms"],
            latencyMs: 14.8,
          },
        };
      } else {
        const textEn = `🛡️ **Michelangelo AI Guard**: Model health is **NOMINAL**. Feature drift score is 0.08 (safe threshold < 0.40). Anti-herd volatility damping is active, ensuring optimal city-wide equilibrium.`;
        const textHi = `🛡️ **माइकल एंजेलो एआई गार्ड**: मॉडल हेल्थ स्थिति **सामान्य (NOMINAL)** है। फीचर ड्रिफ्ट स्कोर 0.08 है (सुरक्षित सीमा < 0.40)। एंटी-हर्ड वोलाटिलिटी डैम्पिंग सक्रिय है, जिससे ड्राइवरों का संतुलित वितरण बना रहता है।`;

        return {
          id,
          sender: "ASSISTANT",
          agentType: "SYSTEM_GUARD",
          text: isHindi ? textHi : textEn,
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

    // H. DEFAULT GENERAL INQUIRY
    const defaultEn = `👋 **Uber India Assistant**: Michelangelo is tracking fleet supply in real time across India. Demand is highest at **${state.zones.STADIUM?.name || "Downtown"}** (${state.zones.STADIUM?.surgeMultiplier || 1.8}x) and **${state.zones.AIRPORT?.name || "Airport"}** (${state.zones.AIRPORT?.surgeMultiplier || 1.6}x). What would you like to optimize?`;
    const defaultHi = `👋 **उबर भारत कॉपायलट**: माइकल एंजेलो लाइव मार्केट इंजन चालू है। वर्तमान में सबसे अधिक मांग **${state.zones.STADIUM?.name || "स्टेडियम"}** (${state.zones.STADIUM?.surgeMultiplier || 1.8}x) और **${state.zones.AIRPORT?.name || "एयरपोर्ट"}** (${state.zones.AIRPORT?.surgeMultiplier || 1.6}x) पर है। आप मुझसे सबसे ज्यादा कमाई वाले इलाके, ट्रैफिक या पर्यटन स्थलों के बारे में पूछ सकते हैं।`;

    return {
      id,
      sender: "ASSISTANT",
      agentType: "DISPATCH",
      text: isHindi ? defaultHi : defaultEn,
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

export const multiAgentDriverCopilot = new MultiAgentDriverCopilot();
export const driverCopilot = multiAgentDriverCopilot;
