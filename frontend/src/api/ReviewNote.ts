import type { ReviewNote } from "../types/ReviewNote";
import type { ReviewStatus } from "../types/ReviewStatus";
import { getDatabase, persistDatabase, tick } from "./db";
import { nextId } from "../utils/ids";
import { log } from "../utils/logger";
import { PolicyDiffError } from "../utils/errors";
import {
  createReviewNoteFromForm,
  createUpdatedReviewNote,
  type ReviewNoteFormInput
} from "../constructors/ReviewNoteConstructor";

export async function listReviewNote(): Promise<ReviewNote[]> {
  return tick(getDatabase().reviewNote as ReviewNote[]);
}

export async function createReviewNote(input: ReviewNoteFormInput): Promise<ReviewNote> {
  if (!input.comment.trim() || !input.diff_result_id) throw new PolicyDiffError("NOTE_INVALID");
  const db = getDatabase();
  const exists = (db.diffResult as { id: number }[]).some((row) => row.id === input.diff_result_id);
  if (!exists) throw new PolicyDiffError("NOTE_INVALID");
  const note = createReviewNoteFromForm(nextId(db.reviewNote as { id: number }[]), input);
  db.reviewNote.push(note);
  persistDatabase(db);
  log("ReviewNote", "CREATE", { diffId: note.diff_result_id, status: note.status, reviewer: note.reviewer });
  return tick(note);
}

export async function updateReviewNote(
  id: number,
  patch: Partial<Pick<ReviewNote, "tag" | "comment" | "reviewer">>
): Promise<ReviewNote> {
  const db = getDatabase();
  const index = (db.reviewNote as ReviewNote[]).findIndex((row) => row.id === id);
  if (index === -1) throw new PolicyDiffError("NOTE_INVALID");
  const updated = createUpdatedReviewNote(db.reviewNote[index] as ReviewNote, patch);
  db.reviewNote[index] = updated;
  persistDatabase(db);
  log("ReviewNote", "UPDATE", { id, fields: Object.keys(patch).join(",") });
  return tick(updated);
}

export async function updateReviewNoteStatus(id: number, status: ReviewStatus): Promise<ReviewNote> {
  const db = getDatabase();
  const index = (db.reviewNote as ReviewNote[]).findIndex((row) => row.id === id);
  if (index === -1) throw new PolicyDiffError("NOTE_INVALID");
  const current = db.reviewNote[index] as ReviewNote;
  const updated = createUpdatedReviewNote(current, { status });
  db.reviewNote[index] = updated;
  persistDatabase(db);
  log("ReviewNote", "STATUS_CHANGE", { id, from: current.status, to: status });
  return tick(updated);
}

export async function deleteReviewNote(id: number): Promise<void> {
  const db = getDatabase();
  db.reviewNote = (db.reviewNote as ReviewNote[]).filter((row) => row.id !== id);
  persistDatabase(db);
  log("ReviewNote", "DELETE", { id });
  return tick(undefined);
}
