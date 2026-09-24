import type { PolicySection } from "../types/PolicySection";
import type { RiskLevelOrNone } from "../types/PrivacyRiskLevel";
import { getDatabase, persistDatabase, tick } from "./db";
import { PolicyDiffError } from "../utils/errors";
import { log } from "../utils/logger";
import { createManualRiskSection, reasessPolicySection } from "../constructors/PolicySectionConstructor";

export async function listPolicySection(): Promise<PolicySection[]> {
  return tick(getDatabase().policySection as PolicySection[]);
}

export async function listPolicySectionByDocument(documentId: number): Promise<PolicySection[]> {
  return tick(
    (getDatabase().policySection as PolicySection[])
      .filter((section) => section.document_id === documentId)
      .sort((a, b) => a.order_index - b.order_index)
  );
}

// 编辑条款标题/正文后重新运行风险引擎
export async function updatePolicySectionContent(
  id: number,
  patch: Pick<PolicySection, "heading" | "content">
): Promise<PolicySection> {
  const db = getDatabase();
  const index = (db.policySection as PolicySection[]).findIndex((row) => row.id === id);
  if (index === -1) throw new PolicyDiffError("SECTION_NOT_FOUND");
  const current = db.policySection[index] as PolicySection;
  const updated = reasessPolicySection({ ...current, ...patch });
  db.policySection[index] = updated;
  persistDatabase(db);
  log("PolicySection", "UPDATE", { id, fields: Object.keys(patch).join(",") });
  log("PolicySection", "RISK_ASSESS", { sectionId: id, level: updated.risk_level, score: updated.risk_score });
  return tick(updated);
}

// 人工覆盖风险等级（命中依据保留，等级标为手工调整）
export async function overrideSectionRisk(id: number, level: RiskLevelOrNone): Promise<PolicySection> {
  const db = getDatabase();
  const index = (db.policySection as PolicySection[]).findIndex((row) => row.id === id);
  if (index === -1) throw new PolicyDiffError("SECTION_NOT_FOUND");
  const current = db.policySection[index] as PolicySection;
  const updated = createManualRiskSection(current, level);
  db.policySection[index] = updated;
  persistDatabase(db);
  log("PolicySection", "RISK_OVERRIDE", { sectionId: id, from: current.risk_level, to: level });
  return tick(updated);
}
