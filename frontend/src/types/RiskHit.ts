import type { PrivacyRiskLevel } from "./PrivacyRiskLevel";
import type { SectionCategory } from "./SectionCategory";

/** 单条风险命中：等级必须能由 matchedKeywords/evidence/reason 解释 */
export interface RiskHit {
  category: Exclude<SectionCategory, "OTHER">;
  level: PrivacyRiskLevel;
  /** 去重后的命中关键词 */
  matchedKeywords: string[];
  /** 规则权重累计分，用于复核等级是如何得出的 */
  score: number;
  /** 命中关键词所在的原文证据句（已截断） */
  evidence: string[];
  /** 可解释的定级说明 */
  reason: string;
  /** 命中发生在哪一侧原文：old 旧版 / new 新版 */
  side: "old" | "new";
}
