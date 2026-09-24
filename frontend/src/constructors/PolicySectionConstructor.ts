import { PrivacyRiskLevelWeight } from "../constants/PrivacyRiskLevel";
import type { ParsedSection, PolicySection } from "../types/PolicySection";
import type { PrivacyRiskLevel } from "../types/PrivacyRiskLevel";
import type { RiskHit } from "../types/RiskHit";
import { nextId } from "../utils/id";

export const createDefaultPolicySection = (): PolicySection => ({
  id: 0,
  document_id: 0,
  section_no: "",
  heading: "",
  content: "",
  category: "OTHER",
  risk_level: null
});

export const createPolicySectionForm = createDefaultPolicySection;

/** 解析产物 → 持久化段落；风险评估结果（category/level）由扫描服务回填 */
export const buildPolicySection = (
  documentId: number,
  parsed: ParsedSection,
  risk: { category: PolicySection["category"]; level: PolicySection["risk_level"] }
): PolicySection => ({
  id: nextId(),
  document_id: documentId,
  section_no: parsed.section_no,
  heading: parsed.heading,
  content: parsed.content,
  category: risk.category,
  risk_level: risk.level
});

const maxLevel = (a: PrivacyRiskLevel, b: PrivacyRiskLevel): PrivacyRiskLevel =>
  PrivacyRiskLevelWeight[a] >= PrivacyRiskLevelWeight[b] ? a : b;

/** 从命中结果中提取段落级类别/等级 */
export const summarizeSectionRisk = (
  hits: RiskHit[]
): { category: PolicySection["category"]; level: PolicySection["risk_level"] } => {
  if (hits.length === 0) return { category: "OTHER", level: null };
  const level = hits
    .map((hit) => hit.level)
    .reduce((acc, current) => (acc === null ? current : maxLevel(acc, current)));
  return {
    category: hits[0].category,
    level
  };
};
