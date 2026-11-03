import {
  AgentTaskInput,
  PolicyRule,
  PolicyEvaluationResult,
  PolicyViolation,
} from "./types";
import { DEFAULT_POLICIES } from "./policies";

export class PolicyEngine {
  private rules: PolicyRule[];

  constructor(customRules?: PolicyRule[]) {
    this.rules = customRules || DEFAULT_POLICIES;
  }

  public evaluate(task: AgentTaskInput): PolicyEvaluationResult {
    const startTime = performance.now();
    const violations: PolicyViolation[] = [];

    const textToScan = `${task.title} ${task.description} ${task.vendorOrRecipient || ""} ${JSON.stringify(
      task.metadata || {}
    )}`.toLowerCase();

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      // 1. Budget Checks
      if (rule.category === "BUDGET" && rule.threshold !== undefined && task.amount !== undefined) {
        if (rule.id === "RULE_BUDGET_TIER_2" && task.amount >= rule.threshold) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: "BLOCK",
            reason: `Requested amount ($${task.amount.toLocaleString()}) exceeds autonomous system ceiling of $${rule.threshold.toLocaleString()}. Hard block enforced.`,
            detectedValue: task.amount,
          });
        } else if (
          rule.id === "RULE_BUDGET_TIER_1" &&
          task.amount >= rule.threshold &&
          task.amount < 10000
        ) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: "REQUIRE_APPROVAL",
            reason: `Amount ($${task.amount.toLocaleString()}) exceeds the $${rule.threshold.toLocaleString()} auto-spend limit. Mandatory Human-in-the-Loop review triggered.`,
            detectedValue: task.amount,
          });
        }
      }

      // 2. Pattern Matching (Regex/Substring) for Vendors, PII, Injections, Compliance
      if (rule.pattern) {
        const regex = new RegExp(rule.pattern, "i");
        if (regex.test(textToScan)) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            reason: `Policy breach detected: input matched restricted pattern [${rule.name}].`,
            detectedValue: task.vendorOrRecipient || "Text Content",
          });
        }
      }
    }

    const hasBlock = violations.some((v) => v.severity === "BLOCK");
    const hasApproval = violations.some((v) => v.severity === "REQUIRE_APPROVAL");

    // Compute Safety Score (100 is best, 0 is dangerous)
    let safetyScore = 100;
    if (hasBlock) {
      safetyScore = Math.max(10, 100 - violations.length * 35);
    } else if (hasApproval) {
      safetyScore = 65;
    }

    const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      passed: !hasBlock && !hasApproval,
      requiresApproval: hasApproval && !hasBlock,
      blocked: hasBlock,
      violations,
      safetyScore,
      latencyMs: Math.max(latencyMs, 0.5),
    };
  }

  public getRules(): PolicyRule[] {
    return [...this.rules];
  }

  public updateRule(id: string, updates: Partial<PolicyRule>) {
    this.rules = this.rules.map((r) => (r.id === id ? { ...r, ...updates } : r));
  }
}

export const globalPolicyEngine = new PolicyEngine();
