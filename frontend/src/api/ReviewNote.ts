import { ERROR_CODES } from "../constants/errorCodes";
import { AppError } from "../utils/AppError";
import { readStorage, writeStorage } from "../utils/localStorage";
import { seedIdSequence } from "../utils/id";
import { logAction } from "../utils/logger";
import { buildReviewNote } from "../constructors/ReviewNoteConstructor";
import { isReviewStatus } from "../constants/ReviewStatus";
import type { ReviewNote, ReviewNoteDraft } from "../types/ReviewNote";
import type { ReviewStatus } from "../types/ReviewStatus";

const KEY = "reviewNote";

const readAll = (): ReviewNote[] => {
  const rows = readStorage<ReviewNote[]>(KEY, []);
  seedIdSequence(rows);
  return rows;
};

export async function listReviewNotes(): Promise<ReviewNote[]> {
  return readAll().sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function listReviewNotesByDiff(diffResultId: number): Promise<ReviewNote[]> {
  return readAll()
    .filter((note) => note.diff_result_id === diffResultId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function createReviewNote(draft: ReviewNoteDraft): Promise<ReviewNote> {
  if (!draft.comment.trim()) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, { field: "备注内容" });
  }
  const rows = readAll();
  const note = buildReviewNote(draft);
  writeStorage(KEY, [note, ...rows]);
  logAction("ReviewNote", "CREATE", {
    diff_result_id: note.diff_result_id,
    tag: note.tag,
    reviewer: note.reviewer
  });
  return note;
}

export async function updateReviewNote(
  id: number,
  patch: Partial<Pick<ReviewNote, "comment" | "reviewer" | "tag" | "status">>
): Promise<ReviewNote> {
  const rows = readAll();
  const index = rows.findIndex((note) => note.id === id);
  if (index < 0) throw new AppError(ERROR_CODES.REVIEW_NOTE_NOT_FOUND, { id });

  const previous = rows[index];
  if (patch.status !== undefined && !isReviewStatus(patch.status)) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, { field: `status=${patch.status}` });
  }

  const next: ReviewNote = {
    ...previous,
    ...patch,
    updated_at: new Date().toISOString()
  };
  rows[index] = next;
  writeStorage(KEY, rows);

  if (patch.status && patch.status !== previous.status) {
    logAction("ReviewNote", "STATUS_CHANGE", {
      id,
      from: previous.status,
      to: patch.status
    });
  } else {
    logAction("ReviewNote", "UPDATE", {
      id,
      fields: Object.keys(patch).join(",") || "none"
    });
  }
  return next;
}

export async function deleteReviewNote(id: number): Promise<void> {
  const rows = readAll();
  if (!rows.some((note) => note.id === id)) {
    throw new AppError(ERROR_CODES.REVIEW_NOTE_NOT_FOUND, { id });
  }
  writeStorage(
    KEY,
    rows.filter((note) => note.id !== id)
  );
}

/** 差异结果重算（同一对文档重新对比）后，把旧备注迁移到新差异行 */
export async function migrateReviewNotes(
  oldDiffIds: number[],
  mapping: { oldId: number; newId: number }[]
): Promise<void> {
  if (oldDiffIds.length === 0) return;
  const rows = readAll();
  const idMap = new Map(mapping.map((item) => [item.oldId, item.newId]));
  const migrated = rows.map((note) =>
    idMap.has(note.diff_result_id)
      ? { ...note, diff_result_id: idMap.get(note.diff_result_id)! }
      : note
  );
  writeStorage(KEY, migrated);
}

export type { ReviewStatus };
