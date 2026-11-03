export interface ProcessRequest {
  query: string;
  category?: string;
  options?: Record<string, any>;
}

export interface MetricItem {
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
}

export interface ProcessResponse {
  success: boolean;
  mode: "live" | "simulated";
  title: string;
  summary: string;
  keyInsights: string[];
  metrics: MetricItem[];
  rawResult?: any;
  executionTimeMs: number;
}
