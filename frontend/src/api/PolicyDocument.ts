import type { PolicyDocument } from "../types/PolicyDocument";
import type { ParsedSection } from "../types/ParsedSection";
import type { PolicySection } from "../types/PolicySection";
import { getDatabase, persistDatabase, tick } from "./db";
import { nextId } from "../utils/ids";
import { parsePolicyText } from "../utils/parser";
import { log } from "../utils/logger";
import { PolicyDiffError } from "../utils/errors";
import { createPolicyDocumentFromImport, createUpdatedPolicyDocument } from "../constructors/PolicyDocumentConstructor";
import { createPolicySectionFromParsed } from "../constructors/PolicySectionConstructor";

export interface ImportDocumentInput {
  title: string;
  version_label: string;
  raw_text: string;
}

export interface ImportDocumentResult {
  document: PolicyDocument;
  sections: PolicySection[];
}

export async function listPolicyDocument(): Promise<PolicyDocument[]> {
  return tick(getDatabase().policyDocument as PolicyDocument[]);
}

// 导入：校验 → 自动分段 → 风险标注 → 落库（文档与段落同事务）
export async function importPolicyDocument(input: ImportDocumentInput): Promise<ImportDocumentResult> {
  const title = input.title.trim();
  const version = input.version_label.trim();
  const raw = input.raw_text.trim();
  if (!raw) throw new PolicyDiffError("IMPORT_EMPTY");
  const parsed = parsePolicyText(raw);
  if (parsed.sections.length === 0) throw new PolicyDiffError("PARSE_NO_SECTION");

  const db = getDatabase();
  const documentId = nextId(db.policyDocument as PolicyDocument[]);
  const document = createPolicyDocumentFromImport(documentId, { title, version_label: version, raw_text: input.raw_text }, parsed.sections);
  const baseId = (db.policySection as PolicySection[]).reduce((max, row) => Math.max(max, row.id), 0);
  const sections = parsed.sections.map((section: ParsedSection, index) =>
    createPolicySectionFromParsed(baseId + index + 1, documentId, section)
  );

  db.policyDocument.push(document);
  db.policySection.push(...sections);
  persistDatabase(db);
  log("PolicyDocument", "IMPORT", { title, version, sections: sections.length });
  sections.forEach((section) =>
    log("PolicySection", "RISK_ASSESS", { sectionId: section.id, level: section.risk_level, score: section.risk_score })
  );
  return tick({ document, sections });
}

export async function updatePolicyDocumentMeta(
  id: number,
  patch: Pick<PolicyDocument, "title" | "version_label">
): Promise<PolicyDocument> {
  const db = getDatabase();
  const index = db.policyDocument.findIndex((row) => (row as PolicyDocument).id === id);
  if (index === -1) throw new PolicyDiffError("SECTION_NOT_FOUND");
  const updated = createUpdatedPolicyDocument(db.policyDocument[index] as PolicyDocument, patch);
  db.policyDocument[index] = updated;
  persistDatabase(db);
  log("PolicyDocument", "UPDATE", { id, fields: Object.keys(patch).join(",") });
  return tick(updated);
}

export async function deletePolicyDocument(id: number): Promise<void> {
  const db = getDatabase();
  db.policyDocument = (db.policyDocument as PolicyDocument[]).filter((row) => row.id !== id);
  db.policySection = (db.policySection as PolicySection[]).filter((row) => row.document_id !== id);
  // 连带清理该文档参与的差异结果，并清理孤立备注
  const relatedDiffIds = new Set(
    (db.diffResult as { id: number; old_document_id: number; new_document_id: number }[])
      .filter((row) => row.old_document_id === id || row.new_document_id === id)
      .map((row) => row.id)
  );
  db.diffResult = (db.diffResult as { old_document_id: number; new_document_id: number }[]).filter(
    (row) => row.old_document_id !== id && row.new_document_id !== id
  );
  db.reviewNote = (db.reviewNote as { diff_result_id: number }[]).filter(
    (row) => !relatedDiffIds.has(row.diff_result_id)
  );
  persistDatabase(db);
  log("PolicyDocument", "DELETE", { id });
  return tick(undefined);
}
