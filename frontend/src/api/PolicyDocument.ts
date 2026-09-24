import { ERROR_CODES } from "../constants/errorCodes";
import { AppError } from "../utils/AppError";
import { logAction } from "../utils/logger";
import { readStorage, writeStorage } from "../utils/localStorage";
import { nextId, seedIdSequence } from "../utils/id";
import { buildPolicySection } from "../constructors/PolicySectionConstructor";
import { summarizeSectionRisk } from "../constructors/PolicySectionConstructor";
import { parsePolicyText } from "../services/policyParser";
import { scanSection } from "../services/riskScanner";
import type { PolicyDocument, PolicyDocumentImport } from "../types/PolicyDocument";
import type { PolicySection } from "../types/PolicySection";
import type { DiffResult } from "../types/DiffResult";
import type { ReviewNote } from "../types/ReviewNote";

const DOC_KEY = "policyDocument";
const SEC_KEY = "policySection";

const readDocuments = (): PolicyDocument[] => readStorage<PolicyDocument[]>(DOC_KEY, []);
const readSections = (): PolicySection[] => readStorage<PolicySection[]>(SEC_KEY, []);

const persistSections = (rows: PolicySection[]): void => writeStorage(SEC_KEY, rows);

export async function listPolicyDocuments(): Promise<PolicyDocument[]> {
  try {
    const rows = readDocuments();
    seedIdSequence(rows);
    return rows;
  } catch (error) {
    throw new AppError(ERROR_CODES.STORAGE_UNAVAILABLE, {
      reason: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function listSectionsByDocument(documentId: number): Promise<PolicySection[]> {
  return readSections().filter((section) => section.document_id === documentId);
}

/** 导入：校验 → 自动分段 → 风险扫描 → 文档与段落一并落库 */
export async function importPolicyDocument(form: PolicyDocumentImport): Promise<PolicyDocument> {
  if (!form.raw_text.trim()) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, { field: "政策正文" });
  }
  if (!form.version_label.trim()) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, { field: "版本标签" });
  }

  const documents = readDocuments();
  if (documents.some((item) => item.version_label === form.version_label.trim())) {
    throw new AppError(ERROR_CODES.DUPLICATE_VERSION, { version_label: form.version_label.trim() });
  }

  // controller 层包装解析异常（service 已抛过一次 PARSE_FAILED，这里补充上下文）
  const parsed = parsePolicyText(form.raw_text);

  const allSections = readSections();
  seedIdSequence([...documents, ...allSections]);

  const documentId = nextId();
  const sections: PolicySection[] = parsed.sections.map((section) => {
    const hits = scanSection(section, "new");
    return buildPolicySection(documentId, section, summarizeSectionRisk(hits));
  });

  const document: PolicyDocument = {
    id: documentId,
    title: form.title.trim() || "未命名隐私政策",
    version_label: form.version_label.trim(),
    raw_text: form.raw_text,
    normalized_sections: sections,
    imported_at: new Date().toISOString()
  };

  persistSections([...allSections, ...sections]);
  writeStorage(DOC_KEY, [document, ...documents]);

  logAction("PolicyDocument", "CREATE", {
    id: document.id,
    title: document.title,
    version_label: document.version_label
  });
  logAction("PolicySection", "EXPORT", { document_id: document.id, count: sections.length });
  return document;
}

export async function deletePolicyDocument(id: number): Promise<void> {
  const documents = readDocuments();
  const target = documents.find((item) => item.id === id);
  if (!target) throw new AppError(ERROR_CODES.DOCUMENT_NOT_FOUND, { id });
  writeStorage(
    DOC_KEY,
    documents.filter((item) => item.id !== id)
  );
  persistSections(readSections().filter((section) => section.document_id !== id));

  // 级联清理：涉及该文档的差异结果，以及挂在这些差异上的审阅备注
  const diffRows = readStorage<DiffResult[]>("diffResult", []).filter(
    (diff) => diff.old_document_id !== id && diff.new_document_id !== id
  );
  writeStorage("diffResult", diffRows);
  const keepDiffIds = new Set(diffRows.map((diff) => diff.id));
  const noteRows = readStorage<ReviewNote[]>("reviewNote", []).filter((note) =>
    keepDiffIds.has(note.diff_result_id)
  );
  writeStorage("reviewNote", noteRows);

  logAction("PolicyDocument", "DELETE", { id, title: target.title });
}
