# 🛡️ AgentGuard: Governed AI Agent & Policy Control Engine
> **Comit-Con 24-Hour Hackathon Submission**  
> **Problem Statement 3**: Amazon — Governed AI Agents (Inspired by AWS AgentCore Policy & Evaluations)

[![Live Production URL](https://img.shields.io/badge/Live%20Demo-Vercel-black?logo=vercel)](https://comit-con-hackathon-ag0c3txme-jindalmayank019-5619s-projects.vercel.app)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.4-black?logo=next.dot.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 1. Problem Statement
Autonomous AI agents are being entrusted with real enterprise tasks—filing expense claims, paying vendors, and managing database state. However, **ungoverned LLM agents suffer from catastrophic failure modes**:
- Executing unauthorized high-value transactions without human confirmation.
- Falling victim to prompt injections and developer jailbreaks.
- Exfiltrating PII, plain-text passwords, or wiring money to sanctioned entities.

Current solutions either rely on brittle prompt engineering (which fails under adversarial inputs) or manual approval for every single trivial action (which destroys agent autonomy).

---

## 💡 2. Our Solution: AgentGuard
**AgentGuard** is a zero-trust, pre-execution governance layer for autonomous agents. It enforces deterministic and natural-language guardrails on every tool invocation before funds or data leave the system:

1. **Pre-Execution Policy Boundary**: Evaluates every parameter against enterprise policies in **<4ms overhead**.
2. **Dynamic Dual-Control Escalation**:
   - **Under $1,000**: Safe actions auto-execute instantly.
   - **$1,000 – $10,000**: Freezes agent state and creates a real-time ticket in the **Human-in-the-Loop Approval Center**.
   - **Over $10,000 or Jailbreak/Sanctioned**: Instant hard block and threat quarantine.
3. **20-Case Benchmark Evaluation Suite**: Direct verification comparing Ungoverned Baseline vs. AgentGuard.
4. **Episodic Cryptographic Audit Trail**: Immutable log chaining every thinking step, policy check, and human decision.

---

## 📊 3. Measured Benchmark Results (Rubric: 20 Points)

Tested against a standardized suite of **20 enterprise workflows** (10 standard safe, 5 high-value escalations, 5 adversarial attacks):

| Metric | Ungoverned Baseline Agent | AgentGuard (Our Solution) | Net Improvement |
| :--- | :---: | :---: | :---: |
| **Policy Violation Rate** | **50%** (10 breaches) | **0%** (0 breaches) | **100% Elimination** |
| **Unauthorized Loss Dollars** | **$107,449** lost | **$0** lost | **$107,449 Protected** |
| **Adversarial Jailbreak Interception** | 0% (Blindly executed) | **100%** (5/5 stopped) | **+100% Security** |
| **Human Escalations Handled** | 0 (Unchecked autonomy) | **5/5** safely routed | **Zero-Risk Autonomy** |
| **Policy Engine Latency Overhead** | 0ms | **~4.0ms** | **Sub-5ms Friction** |

---

## 🏗️ 4. System Architecture

```
User / API Request (e.g., "$4,500 Data Center Lease")
             │
             ▼
     ┌────────────────┐
     │  Agent Intake  │ (Extracts Entities & Intent)
     └───────┬────────┘
             │
             ▼
┌─────────────────────────┐
│  AgentGuard Engine      │ ◄─── Natural Language Policies:
│  Pre-Execution Boundary │      • Budget Tier Ceiling
└────────────┬────────────┘      • Sanctioned Entities Filter
             │                   • PII Exfiltration Guard
             │                   • Prompt Injection Defense
             ├─────────────────────────────────────────┐
             │                                         │
    [Safe < $1,000]                           [Violates Policy]
             │                                         │
             ▼                                         ▼
┌─────────────────────────┐               ┌─────────────────────────┐
│ Enterprise Tool Call    │               │  THREAT QUARANTINED     │
│ (Financial ERP Ledger)  │               │  Execution Aborted      │
└────────────┬────────────┘               └────────────┬────────────┘
             │                                         │
             ▼                                         ▼
    [Amount > $1,000]                                  │
             │                                         │
             ▼                                         │
┌─────────────────────────┐                            │
│  Human Approval Center  │                            │
│  (Manager Review Modal) │                            │
└────────────┬────────────┘                            │
             │                                         │
      [Approved / Rejected]                            │
             │                                         │
             ▼                                         ▼
┌───────────────────────────────────────────────────────────┐
│              Episodic Cryptographic Audit Log              │
└───────────────────────────────────────────────────────────┘
```

---

## 🛠️ 5. Tech Stack & Implementation
- **Frontend & Dashboard**: Next.js 16 (App Router), React 19, Tailwind CSS, Lucide React
- **Backend API & Policy Engine**: Native Next.js Serverless Route Handlers (Zero BaaS / 100% self-contained)
- **Governance**: Multi-tier AST & regex rule evaluator with sub-5ms deterministic response
- **State Store**: Thread-safe in-memory session manager with cryptographic audit logging
- **Deployment**: Live on Vercel Edge Network

---

## ⚡ 6. How to Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👥 Team Members
- **Mayank Jindal** & Team (Team of 4) — Comit-Con Hackathon 2026
