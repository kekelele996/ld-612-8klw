import { readStorage, writeStorage } from "../utils/localStorage";
import { seedIdSequence } from "../utils/id";
import { logAction } from "../utils/logger";
import { compareDocuments } from "../services/comparisonService";
import { migrateReviewNotes } from "./ReviewNote";
import type { DiffResult } from "../types/DiffResult";
import type { PolicyDocument } from "../types/PolicyDocument";

const KEY = "diffResult";

export async function listDiffResults(): Promise<DiffResult[]> {
  const rows = readStorage<DiffResult[]>(KEY, []);
  seedIdSequence(rows);
  return rows;
}

export async function listDiffResultsByPair(oldId: number, newId: number): Promise<DiffResult[]> {
  return (await listDiffResults()).filter(
    (item) => item.old_document_id === oldId && item.new_document_id === newId
  );
}

/** 生成对比结果并落库；同一对文档重复对比时覆盖旧结果，备注按 section_id 迁移到新差异行 */
export async function createComparison(
  oldDocument: PolicyDocument,
  newDocument: PolicyDocument
): Promise<DiffResult[]> {
  const results = compareDocuments(oldDocument, newDocument);
  const existing = readStorage<DiffResult[]>(KEY, []);
  const previous = existing.filter(
    (item) => item.old_document_id === oldDocument.id && item.new_document_id === newDocument.id
  );
  const mapping = results
    .map((item) => {
      const match = previous.find((old) => old.section_id === item.section_id);
      return match ? { oldId: match.id, newId: item.id } : null;
    })
    .filter((item): item is { oldId: number; newId: number } => item !== null);
  await migrateReviewNotes(
    previous.map((item) => item.id),
    mapping
  );

  const retained = existing.filter(
    (item) =>
      !(item.old_document_id === oldDocument.id && item.new_document_id === newDocument.id)
  );
  writeStorage(KEY, [...results, ...retained]);

  logAction("DiffResult", "EXPORT", {
    old: oldDocument.version_label,
    new: newDocument.version_label,
    count: results.length
  });
  return results;
}

export async function getDiffResult(id: number): Promise<DiffResult | null> {
  return (await listDiffResults()).find((item) => item.id === id) ?? null;
}
