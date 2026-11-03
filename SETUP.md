# 🛠️ Hackathon Quickstart Guide

This workspace is fully scaffolded and verified. When your problem statements drop at **5:00 PM**, you can pivot and adapt this project in under 15 minutes.

---

## 🏃‍♂️ 1. How to Run Locally

```bash
# 1. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- You will see the complete dark-mode interactive dashboard with live metrics, console inputs, and preset buttons.
- The app is currently running in **Simulated Fallback Mode**, meaning it returns instant, realistic AI-like responses with **zero API keys required**.

---

## 🔌 2. How to Connect Live AI (Optional)

1. Open `.env.local` in this directory.
2. Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
3. Paste it:
   ```env
   GEMINI_API_KEY="your-gemini-key-here"
   ```
4. Restart `npm run dev`. The app will automatically switch from simulated mode to live Gemini 1.5 Flash inference!

---

## 🔄 3. How to Pivot to Any Problem Statement at 5:00 PM

| Problem Type | Where to Customize | What to Change |
| :--- | :--- | :--- |
| **FinTech / Fraud Detection** | `src/app/page.tsx` & `src/types/index.ts` | Change input label to "Transaction Hash / Payload", update presets to "Flag anomalous \$50k wire", change metrics to "Fraud Risk Index". |
| **Healthcare / BioTech** | `src/app/page.tsx` & `src/app/api/process/route.ts` | Change inputs to "Patient Vitals / Symptoms", change AI prompt to clinical triage, change metrics to "Triage Priority". |
| **Developer Productivity** | `src/app/page.tsx` & `src/app/api/process/route.ts` | Change inputs to "Git Diff / Stack Trace", prompt to "Generate fix and unit test", change metrics to "Bug Coverage". |
| **E-Commerce / Retail** | `src/app/page.tsx` | Change inputs to "Customer Review / Cart State", change prompt to "Sentiment & Retention offer", metrics to "LTV Impact". |

---

## 📁 4. Project Blueprint

```
├── src/
│   ├── app/
│   │   ├── api/process/route.ts   <-- Universal API handler (Live AI + Mock fallback)
│   │   ├── layout.tsx             <-- Root layout & theme
│   │   ├── page.tsx               <-- Full interactive dashboard UI
│   │   └── globals.css            <-- Tailwind CSS configuration
│   ├── components/
│   │   ├── Navbar.tsx             <-- Header with live status & action buttons
│   │   └── StatsCard.tsx          <-- Metric display cards
│   └── types/
│       └── index.ts               <-- TypeScript interfaces
├── .env.example                   <-- Template config
├── .env.local                     <-- Local environment
├── PITCH_DECK_GUIDE.md            <-- 6-slide winning pitch script
├── DEMO_CHECKLIST.md              <-- Pre-demo technical checklist
├── SUBMISSION_README.md           <-- Devpost / Unstop submission draft
└── package.json                   <-- Dependencies (Next.js, Tailwind, Lucide)
```
