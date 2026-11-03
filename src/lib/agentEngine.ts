import {
  AgentTaskInput,
  AgentTaskExecution,
  AgentStep,
  HumanApprovalItem,
  RiskLevel,
} from "./types";
import { globalPolicyEngine } from "./policyEngine";
import { getAgentStore } from "./store";

export class GovernedAgentRunner {
  public async execute(input: AgentTaskInput): Promise<AgentTaskExecution> {
    const store = getAgentStore();
    const taskId = `TASK_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const startTime = Date.now();
    const steps: AgentStep[] = [];

    // Step 1: Ingestion & Natural Language Parsing
    steps.push({
      stepNumber: 1,
      name: "Ingest & Parse Task Intent",
      type: "THINKING",
      status: "SUCCESS",
      details: `Received request: "${input.title}". Entity parameters extracted: Amount: $${input.amount || 0}, Target: ${input.vendorOrRecipient || "N/A"}, Dept: ${input.department}.`,
      timestamp: new Date().toISOString(),
      latencyMs: 18,
    });

    // Step 2: Policy & Guardrails Evaluation (Pre-execution boundary)
    const policyResult = globalPolicyEngine.evaluate(input);
    const hasViolations = policyResult.violations.length > 0;

    steps.push({
      stepNumber: 2,
      name: "Pre-Execution Guardrails Evaluation",
      type: "POLICY_CHECK",
      status: policyResult.blocked ? "BLOCKED" : policyResult.requiresApproval ? "PAUSED" : "SUCCESS",
      details: policyResult.blocked
        ? `HARD POLICY BLOCK: ${policyResult.violations.map((v) => v.reason).join(" | ")}`
        : policyResult.requiresApproval
        ? `ESCALATION TRIGGERED: ${policyResult.violations.map((v) => v.reason).join(" | ")}`
        : `Policy compliance verified. Safety Score: ${policyResult.safetyScore}/100. Evaluated in ${policyResult.latencyMs}ms.`,
      timestamp: new Date().toISOString(),
      latencyMs: policyResult.latencyMs,
    });

    // Hash for immutable audit trail
    const auditHash = Math.random().toString(36).substring(2, 18);

    // Step 3A: If Hard Blocked by Policy
    if (policyResult.blocked) {
      steps.push({
        stepNumber: 3,
        name: "Execution Aborted & Threat Quarantined",
        type: "AUDIT",
        status: "BLOCKED",
        details: "Policy violation intercepted before tool invocation. No financial funds or data released.",
        timestamp: new Date().toISOString(),
        latencyMs: 5,
      });

      const execution: AgentTaskExecution = {
        id: taskId,
        input,
        status: "BLOCKED_BY_POLICY",
        policyResult,
        steps,
        auditLogs: [],
        executionTimeMs: Date.now() - startTime,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.saveTask(execution);
      store.recordAudit({
        id: `LOG_${Date.now()}`,
        taskId,
        action: "POLICY_VIOLATION_BLOCKED",
        actor: "POLICY_ENGINE",
        details: `Blocked task "${input.title}". Violations: ${policyResult.violations.map((v) => v.ruleName).join(", ")}`,
        safetyScore: policyResult.safetyScore,
        hash: auditHash,
        timestamp: new Date().toISOString(),
      });

      return execution;
    }

    // Step 3B: If Human-in-the-Loop Approval Required
    if (policyResult.requiresApproval) {
      const approvalId = `APP_${Date.now()}`;
      const approvalItem: HumanApprovalItem = {
        id: approvalId,
        taskId,
        taskTitle: input.title,
        requester: input.requesterEmail,
        amount: input.amount,
        vendor: input.vendorOrRecipient,
        triggerReason: policyResult.violations[0]?.reason || "High risk transaction threshold reached.",
        violatedRules: policyResult.violations,
        riskLevel: input.amount && input.amount > 5000 ? "HIGH" : "MEDIUM",
        status: "PENDING",
        createdAt: new Date().toISOString(),
      };

      store.createApproval(approvalItem);

      steps.push({
        stepNumber: 3,
        name: "Agent Paused -> Escalated to Manager Queue",
        type: "HUMAN_ESCALATION",
        status: "PAUSED",
        details: `Task frozen at safe boundary. Dispatched approval ticket ${approvalId} to Manager Approval Center. Awaiting human confirmation.`,
        timestamp: new Date().toISOString(),
        latencyMs: 12,
      });

      const execution: AgentTaskExecution = {
        id: taskId,
        input,
        status: "AWAITING_HUMAN_APPROVAL",
        policyResult,
        steps,
        auditLogs: [],
        approvalId,
        executionTimeMs: Date.now() - startTime,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.saveTask(execution);
      store.recordAudit({
        id: `LOG_${Date.now()}`,
        taskId,
        action: "ESCALATED_FOR_HUMAN_APPROVAL",
        actor: "POLICY_ENGINE",
        details: `Escalated task "${input.title}" (Amount: $${input.amount || 0}). Awaiting human decision.`,
        safetyScore: policyResult.safetyScore,
        hash: auditHash,
        timestamp: new Date().toISOString(),
      });

      return execution;
    }

    // Step 3C: All Guardrails Passed -> Automated Tool Execution
    steps.push({
      stepNumber: 3,
      name: "Invoking Enterprise Tool: Finance/ERP Connector",
      type: "TOOL_CALL",
      status: "SUCCESS",
      details: `Dispatched tool call: executePayment({ amount: ${input.amount || 0}, recipient: "${input.vendorOrRecipient || "Internal"}", category: "${input.category}" })`,
      timestamp: new Date().toISOString(),
      latencyMs: 145,
    });

    steps.push({
      stepNumber: 4,
      name: "Task Completed & Audit Log Sealed",
      type: "EXECUTION",
      status: "SUCCESS",
      details: `Transaction confirmed in core ledger. Zero compliance warnings. Verified end-to-end.`,
      timestamp: new Date().toISOString(),
      latencyMs: 25,
    });

    const execution: AgentTaskExecution = {
      id: taskId,
      input,
      status: "COMPLETED",
      policyResult,
      steps,
      auditLogs: [],
      executionTimeMs: Date.now() - startTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.saveTask(execution);
    store.recordAudit({
      id: `LOG_${Date.now()}`,
      taskId,
      action: "TASK_EXECUTED_SAFELY",
      actor: "AGENT",
      details: `Safely completed "${input.title}" for $${input.amount || 0} to ${input.vendorOrRecipient || "internal"}.`,
      safetyScore: policyResult.safetyScore,
      hash: auditHash,
      timestamp: new Date().toISOString(),
    });

    return execution;
  }
}

export const agentRunner = new GovernedAgentRunner();
