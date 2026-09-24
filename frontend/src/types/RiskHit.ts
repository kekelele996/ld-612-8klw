import type { RiskCategory } from "./RiskCategory";

// 单条命中依据：命中的关键词、片段与计分权重
export interface RiskHit {
  category: RiskCategory;
  keyword: string;
  weight: number;
  kind: "TRIGGER" | "MITIGATION";
  snippet: string;
}
