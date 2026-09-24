import type { DiffResult } from "../types/DiffResult";
import type { DiffLine } from "../types/DiffLine";
import type { PolicySection } from "../types/PolicySection";
import type { RiskHit } from "../types/RiskHit";
import type { SectionPair } from "../types/SectionPair";
import type { DiffType } from "../types/DiffType";
import type { PrivacyRiskLevel } from "../types/PrivacyRiskLevel";
import { PrivacyRiskLevelWeight } from "../constants/PrivacyRiskLevel";
import { nextId } from "../utils/id";

export const createDefaultDiffResult = (): DiffResult => ({
  id: 0,
  old_document_id: 0,
  new_document_id: 0,
  section_id: "",
  old_section_no: null,
  new_section_no: null,
  section_title: "",
  diff_type: "UNCHANGED",
  summary: "",
  old_section: null,
  new_section: null,
  old_lines: [],
  new_lines: [],
  risks: [],
  risk_level: null,
  created_at: ""
});

export const createDiffResultForm = createDefaultDiffResult;

export interface BuildDiffInput {
  oldDocumentId: number;
  newDocumentId: number;
  pair: SectionPair;
  diffType: DiffType;
  summary: string;
  oldLines: DiffLine[];
  newLines: DiffLine[];
  risks: RiskHit[];
}

/** 配对结果 → 持久化差异结果；两侧原文始终以 old_section/new_section 保留 */
export const buildDiffResult = (input: BuildDiffInput): DiffResult => {
  const { pair } = input;
  const title =
    pair.new?.heading || pair.old?.heading || pair.new?.section_no || pair.old?.section_no || "未命名条款";
  return {
    id: nextId(),
    old_document_id: input.oldDocumentId,
    new_document_id: input.newDocumentId,
    section_id: pair.key,
    old_section_no: pair.old?.section_no ?? null,
    new_section_no: pair.new?.section_no ?? null,
    section_title: title,
    diff_type: input.diffType,
    summary: input.summary,
    old_section: (pair.old as PolicySection | null) ?? null,
    new_section: (pair.new as PolicySection | null) ?? null,
    old_lines: input.oldLines,
    new_lines: input.newLines,
    risks: input.risks,
    risk_level: highestLevel(input.risks),
    created_at: new Date().toISOString()
  };
};

const highestLevel = (risks: RiskHit[]): PrivacyRiskLevel | null =>
  risks.reduce<PrivacyRiskLevel | null>(
    (acc, hit) => (acc === null || PrivacyRiskLevelWeight[hit.level] > PrivacyRiskLevelWeight[acc] ? hit.level : acc),
    null
  );

export const createDiffResultResponse = createDefaultDiffResult;
