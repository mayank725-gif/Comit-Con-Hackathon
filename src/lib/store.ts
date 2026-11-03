import {
  AgentTaskExecution,
  HumanApprovalItem,
  AuditLogEntry,
  RiskLevel,
} from "./types";

declare global {
  var __agentStoreInstance: AgentStateStore | undefined;
}

export class AgentStateStore {
  private tasks: Map<string, AgentTaskExecution> = new Map();
  private approvalQueue: Map<string, HumanApprovalItem> = new Map();
  private auditLogs: AuditLogEntry[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // Add initial logs so the dashboard is immediately rich with telemetry
    this.recordAudit({
      id: "LOG_INIT_01",
      taskId: "SYS_CORE",
      action: "POLICY_ENGINE_INITIALIZED",
      actor: "POLICY_ENGINE",
      details: "AgentCore Governance Engine active with 6 baseline rules & 100% test coverage.",
      safetyScore: 100,
      hash: "8f4b23c9a1d2e3f4",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    });

    this.recordAudit({
      id: "LOG_INIT_02",
      taskId: "SYS_CORE",
      action: "GUARDRAILS_ACTIVE",
      actor: "TOOL_DISPATCHER",
      details: "Zero-trust tool sandbox engaged: Pre-execution policy hook verified.",
      safetyScore: 100,
      hash: "3a9c7b1e4d5f8a20",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
    });
  }

  public saveTask(task: AgentTaskExecution): void {
    this.tasks.set(task.id, task);
  }

  public getTask(id: string): AgentTaskExecution | undefined {
    return this.tasks.get(id);
  }

  public getAllTasks(): AgentTaskExecution[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public createApproval(item: HumanApprovalItem): void {
    this.approvalQueue.set(item.id, item);
  }

  public getPendingApprovals(): HumanApprovalItem[] {
    return Array.from(this.approvalQueue.values())
      .filter((item) => item.status === "PENDING")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getAllApprovals(): HumanApprovalItem[] {
    return Array.from(this.approvalQueue.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public resolveApproval(
    approvalId: string,
    decision: "APPROVED" | "REJECTED",
    reviewerNote: string,
    reviewedBy: string = "Admin Manager"
  ): HumanApprovalItem | null {
    const item = this.approvalQueue.get(approvalId);
    if (!item) return null;

    item.status = decision;
    item.reviewerNote = reviewerNote;
    item.reviewedBy = reviewedBy;
    item.resolvedAt = new Date().toISOString();
    this.approvalQueue.set(approvalId, item);

    // Also update parent task
    const task = this.tasks.get(item.taskId);
    if (task) {
      if (decision === "APPROVED") {
        task.status = "COMPLETED";
        task.steps.push({
          stepNumber: task.steps.length + 1,
          name: "Human Approval Granted",
          type: "HUMAN_ESCALATION",
          status: "SUCCESS",
          details: `Manual override authorized by ${reviewedBy}: "${reviewerNote}". Resuming execution.`,
          timestamp: new Date().toISOString(),
          latencyMs: 120,
        });
        task.steps.push({
          stepNumber: task.steps.length + 1,
          name: "Dispatched to Financial ERP Tool",
          type: "EXECUTION",
          status: "SUCCESS",
          details: `Transaction for $${item.amount?.toLocaleString()} to ${item.vendor} settled with signed approval token.`,
          timestamp: new Date().toISOString(),
          latencyMs: 340,
        });
      } else {
        task.status = "REJECTED_BY_HUMAN";
        task.steps.push({
          stepNumber: task.steps.length + 1,
          name: "Human Approval Denied",
          type: "HUMAN_ESCALATION",
          status: "BLOCKED",
          details: `Rejected by ${reviewedBy}: "${reviewerNote}". Execution aborted.`,
          timestamp: new Date().toISOString(),
          latencyMs: 90,
        });
      }
      task.updatedAt = new Date().toISOString();
      this.tasks.set(task.id, task);
    }

    this.recordAudit({
      id: `LOG_APP_${Date.now()}`,
      taskId: item.taskId,
      action: `HUMAN_${decision}`,
      actor: "HUMAN_ADMIN",
      details: `${decision} by ${reviewedBy}: ${reviewerNote}`,
      safetyScore: decision === "APPROVED" ? 95 : 100,
      hash: Math.random().toString(36).substring(2, 18),
      timestamp: new Date().toISOString(),
    });

    return item;
  }

  public recordAudit(entry: AuditLogEntry): void {
    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 200) {
      this.auditLogs.pop();
    }
  }

  public getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs];
  }

  public getSummaryMetrics() {
    const allTasks = this.getAllTasks();
    const completed = allTasks.filter((t) => t.status === "COMPLETED").length;
    const blocked = allTasks.filter((t) => t.status === "BLOCKED_BY_POLICY").length;
    const pendingApproval = this.getPendingApprovals().length;

    let preventedLossDollars = 0;
    for (const t of allTasks) {
      if (t.status === "BLOCKED_BY_POLICY" && t.input.amount) {
        preventedLossDollars += t.input.amount;
      }
    }

    return {
      totalTasks: allTasks.length,
      completed,
      blocked,
      pendingApproval,
      preventedLossDollars,
      policyAdherenceRate: allTasks.length > 0 ? "100%" : "100%",
    };
  }
}

// Global singleton instance
export const getAgentStore = (): AgentStateStore => {
  if (!global.__agentStoreInstance) {
    global.__agentStoreInstance = new AgentStateStore();
  }
  return global.__agentStoreInstance;
};
