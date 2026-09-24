import type { DiffResult } from "./DiffResult";
import type { PolicyDocument } from "./PolicyDocument";
import type { PrivacyRiskLevel } from "./PrivacyRiskLevel";
import type { ReviewNote } from "./ReviewNote";

export interface RiskLevelCount {
  level: PrivacyRiskLevel;
  count: number;
}

/** 一次版本对比的完整产物：差异清单 + 统计，供页面与导出共用 */
export interface ComparisonReport {
  oldDocument: PolicyDocument;
  newDocument: PolicyDocument;
  diffs: DiffResult[];
  notes: ReviewNote[];
  generatedAt: string;
  diffTypeCounts: Record<string, number>;
  riskCounts: RiskLevelCount[];
  openNoteCount: number;
}
