import type { PolicySection } from "../types/PolicySection";
import type { ParsedSection } from "../types/ParsedSection";
import type { RiskAssessment } from "../types/RiskAssessment";
import { assessRisk } from "../utils/riskEngine";
import { RiskCategoryText } from "../constants/RiskCategory";

// 由自动分段结果构造条款，并立即执行风险自动标注（等级与命中依据一起落库）
export const createPolicySectionFromParsed = (
  id: number,
  documentId: number,
  parsed: ParsedSection
): PolicySection => {
  const assessment = assessRisk(parsed.content, parsed.heading);
  return {
    id,
    document_id: documentId,
    section_no: parsed.section_no,
    heading: parsed.heading,
    content: parsed.content,
    category: deriveCategory(assessment.hits.map((hit) => hit.category)),
    order_index: parsed.order_index,
    risk_level: assessment.level,
    risk_score: assessment.score,
    risk_hits: assessment.hits,
    risk_assessed_at: assessment.assessed_at,
    risk_manual: false
  };
};

// 重新跑风险引擎（编辑条款内容后）
export const reasessPolicySection = (section: PolicySection): PolicySection => {
  const assessment = assessRisk(section.content, section.heading);
  return {
    ...section,
    category: deriveCategory(assessment.hits.map((hit) => hit.category)),
    risk_level: assessment.level,
    risk_score: assessment.score,
    risk_hits: assessment.hits,
    risk_assessed_at: assessment.assessed_at,
    risk_manual: false
  };
};

// 人工指定等级：保留命中依据，仅覆盖等级
export const createManualRiskSection = (section: PolicySection, level: PolicySection["risk_level"]): PolicySection => ({
  ...section,
  risk_level: level,
  risk_manual: true
});

// 类目取权重最高命中所属类目；多个类目时按 rules 顺序拼接
export function deriveCategory(categories: RiskAssessment["hits"][number]["category"][]): string {
  const unique = [...new Set(categories)];
  if (unique.length === 0) return "一般条款";
  return unique.map((category) => RiskCategoryText[category]).join("、");
}

export const createPolicySectionResponse = (row: PolicySection): PolicySection => ({ ...row });
