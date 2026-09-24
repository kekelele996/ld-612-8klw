import type { DiffResult } from "../types/DiffResult";
import type { PolicyDocument } from "../types/PolicyDocument";
import type { PolicySection } from "../types/PolicySection";
import { getDatabase, persistDatabase, tick } from "./db";
import { nextId, nowIso } from "../utils/ids";
import { pairSections, buildDiffRow } from "../utils/diffEngine";
import { log } from "../utils/logger";
import { PolicyDiffError } from "../utils/errors";
import { createDiffResultFromRow, createUpdatedDiffResult } from "../constructors/DiffResultConstructor";

export async function listDiffResult(): Promise<DiffResult[]> {
  return tick(getDatabase().diffResult as DiffResult[]);
}

export async function listDiffResultByPair(oldDocumentId: number, newDocumentId: number): Promise<DiffResult[]> {
  return tick(
    (getDatabase().diffResult as DiffResult[])
      .filter((row) => row.old_document_id === oldDocumentId && row.new_document_id === newDocumentId)
      .sort(
        (a, b) =>
          (a.new_section_id ? sectionOrder(a.new_section_id) : sectionOrder(a.old_section_id)) -
          (b.new_section_id ? sectionOrder(b.new_section_id) : sectionOrder(b.old_section_id))
      )
  );
}

function sectionOrder(sectionId: number): number {
  return (getDatabase().policySection as PolicySection[]).find((row) => row.id === sectionId)?.order_index ?? 999;
}

// 生成版本对比：重复生成同一对时按 (old_section_id,new_section_id) 幂等更新
export async function generateDiffResult(oldDocumentId: number, newDocumentId: number): Promise<DiffResult[]> {
  if (oldDocumentId === newDocumentId) throw new PolicyDiffError("SAME_DOCUMENT");
  const db = getDatabase();
  const oldDoc = (db.policyDocument as PolicyDocument[]).find((row) => row.id === oldDocumentId);
  const newDoc = (db.policyDocument as PolicyDocument[]).find((row) => row.id === newDocumentId);
  if (!oldDoc || !newDoc) throw new PolicyDiffError("SECTION_NOT_FOUND");

  const oldSections = (db.policySection as PolicySection[]).filter((row) => row.document_id === oldDocumentId);
  const newSections = (db.policySection as PolicySection[]).filter((row) => row.document_id === newDocumentId);
  const pairs = pairSections(oldSections, newSections);
  const timestamp = nowIso();

  const others = (db.diffResult as DiffResult[]).filter(
    (row) => !(row.old_document_id === oldDocumentId && row.new_document_id === newDocumentId)
  );
  const existing = (db.diffResult as DiffResult[]).filter(
    (row) => row.old_document_id === oldDocumentId && row.new_document_id === newDocumentId
  );

  // 先无 id 组装，复用既有 id，新行统一从全局最大 id 递增
  const rows = pairs.map((pair) => {
    const row = buildDiffRow(pair, oldDoc as PolicyDocument, newDoc as PolicyDocument, {
      created_at: timestamp,
      updated_at: timestamp
    });
    const found = existing.find(
      (item) => item.old_section_id === row.old_section_id && item.new_section_id === row.new_section_id
    );
    return found ? createUpdatedDiffResult(found, row) : createDiffResultFromRow(-1, row);
  });

  let sequence = nextId([...others, ...rows] as { id: number }[]);
  rows.forEach((row) => {
    if (row.id === -1) {
      row.id = sequence;
      sequence += 1;
    }
  });

  db.diffResult = [...others, ...rows];
  // 清理已消失差异上的孤立备注
  const diffIds = new Set((db.diffResult as DiffResult[]).map((row) => row.id));
  db.reviewNote = (db.reviewNote as { diff_result_id: number }[]).filter((row) => diffIds.has(row.diff_result_id));

  persistDatabase(db);
  log("DiffResult", "GENERATE", { oldId: oldDocumentId, newId: newDocumentId, total: rows.length });
  return tick(rows);
}

export async function updateDiffResultSummary(id: number, summary: string): Promise<DiffResult> {
  const db = getDatabase();
  const index = (db.diffResult as DiffResult[]).findIndex((row) => row.id === id);
  if (index === -1) throw new PolicyDiffError("PAIR_NOT_FOUND");
  const updated = createUpdatedDiffResult(db.diffResult[index] as DiffResult, { summary });
  db.diffResult[index] = updated;
  persistDatabase(db);
  log("DiffResult", "UPDATE", { id, fields: "summary" });
  return tick(updated);
}
