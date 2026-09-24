import type { RiskHit } from "./RiskHit";
import type { RiskLevelOrNone } from "./PrivacyRiskLevel";

// 风险引擎输出：可解释的总分、等级与命中依据
export interface RiskAssessment {
  score: number;
  level: RiskLevelOrNone;
  hits: RiskHit[];
  assessed_at: string;
}
