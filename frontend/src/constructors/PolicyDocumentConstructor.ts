import type { PolicyDocument } from "../types/PolicyDocument";
import type { ParsedSection } from "../types/ParsedSection";
import { contentHash, nowIso } from "../utils/ids";

export interface PolicyDocumentImportInput {
  title: string;
  version_label: string;
  raw_text: string;
}

// 导入构造器：store 导入动作只传三项表单字段，其余在此统一补齐
export const createPolicyDocumentFromImport = (
  id: number,
  input: PolicyDocumentImportInput,
  sections: ParsedSection[]
): PolicyDocument => ({
  id,
  title: input.title.trim(),
  version_label: input.version_label.trim(),
  raw_text: input.raw_text,
  normalized_sections: sections.map((section) => `${section.section_no} ${section.heading}`).join("\n"),
  content_hash: contentHash(input.raw_text),
  section_count: sections.length,
  imported_at: nowIso()
});

// 编辑构造器：保留原始创建时间与派生字段
export const createUpdatedPolicyDocument = (
  current: PolicyDocument,
  patch: Pick<PolicyDocument, "title" | "version_label">
): PolicyDocument => ({
  ...current,
  title: patch.title.trim() || current.title,
  version_label: patch.version_label.trim() || current.version_label
});

export const createPolicyDocumentResponse = (row: PolicyDocument): PolicyDocument => ({ ...row });
