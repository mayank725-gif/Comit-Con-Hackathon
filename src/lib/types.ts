export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type PolicySeverity = "WARN" | "REQUIRE_APPROVAL" | "BLOCK";
export type TaskStatus =
  | "PENDING"
  | "EVALUATING_POLICIES"
  | "AWAITING_HUMAN_APPROVAL"
  | "EXECUTING_TOOLS"
  | "COMPLETED"
  | "BLOCKED_BY_POLICY"
  | "REJECTED_BY_HUMAN";

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  category: "BUDGET" | "VENDOR" | "DATA_PRIVACY" | "SAFETY" | "COMPLIANCE";
  severity: PolicySeverity;
  threshold?: number;
  pattern?: string;
  enabled: boolean;
}

export interface PolicyViolation {
  ruleId: string;
  ruleName: string;
  severity: PolicySeverity;
  reason: string;
  detectedValue?: string | number;
}

export interface PolicyEvaluationResult {
  passed: boolean;
  requiresApproval: boolean;
  blocked: boolean;
  violations: PolicyViolation[];
  safetyScore: number; // 0 - 100
  latencyMs: number;
}

export interface AgentTaskInput {
  title: string;
  description: string;
  category: "EXPENSE_REIMBURSEMENT" | "VENDOR_PAYMENT" | "DATA_ACCESS" | "SYSTEM_CHANGE";
  amount?: number;
  vendorOrRecipient?: string;
  requesterEmail: string;
  department: string;
  metadata?: Record<string, any>;
}

export interface AgentStep {
  stepNumber: number;
  name: string;
  type: "THINKING" | "POLICY_CHECK" | "TOOL_CALL" | "HUMAN_ESCALATION" | "EXECUTION" | "AUDIT";
  status: "SUCCESS" | "FAILED" | "PAUSED" | "BLOCKED";
  details: string;
  timestamp: string;
  latencyMs: number;
}

export interface HumanApprovalItem {
  id: string;
  taskId: string;
  taskTitle: string;
  requester: string;
  amount?: number;
  vendor?: string;
  triggerReason: string;
  violatedRules: PolicyViolation[];
  riskLevel: RiskLevel;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewerNote?: string;
  reviewedBy?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  taskId: string;
  action: string;
  actor: "AGENT" | "POLICY_ENGINE" | "HUMAN_ADMIN" | "TOOL_DISPATCHER";
  details: string;
  safetyScore?: number;
  hash: string;
  timestamp: string;
}

export interface AgentTaskExecution {
  id: string;
  input: AgentTaskInput;
  status: TaskStatus;
  policyResult?: PolicyEvaluationResult;
  steps: AgentStep[];
  auditLogs: AuditLogEntry[];
  approvalId?: string;
  executionTimeMs: number;
  createdAt: string;
  updatedAt: string;
}

export interface BenchmarkCase {
  id: string;
  title: string;
  input: AgentTaskInput;
  type: "STANDARD_SAFE" | "OVER_BUDGET" | "RESTRICTED_VENDOR" | "PROMPT_INJECTION" | "DATA_LEAK";
  expectedOutcome: "AUTO_APPROVE" | "ESCALATE_HUMAN" | "BLOCK";
}

export interface BenchmarkRunResult {
  totalCases: number;
  ungoverned: {
    successRate: number;
    violationRate: number;
    unauthorizedLossDollar: number;
    avgLatencyMs: number;
  };
  governed: {
    successRate: number;
    violationRate: number;
    unauthorizedLossDollar: number;
    avgLatencyMs: number;
    breachesPrevented: number;
    escalationsHandled: number;
  };
  testDetails: Array<{
    id: string;
    title: string;
    type: string;
    ungovernedResult: "EXECUTED_BLINDLY" | "SUCCESS";
    governedResult: "ALLOWED" | "ESCALATED_HUMAN" | "BLOCKED_SAFELY";
    safetyStatus: "SAFE" | "VULNERABILITY_PREVENTED";
  }>;
}
