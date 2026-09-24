import type { ReviewNote } from "../types/ReviewNote";
import { nowIso } from "../utils/ids";

export interface ReviewNoteFormInput {
  diff_result_id: number;
  tag: string;
  comment: string;
  reviewer: string;
}

// 新建备注默认进入待处理清单
export const createReviewNoteFromForm = (id: number, input: ReviewNoteFormInput): ReviewNote => ({
  id,
  diff_result_id: input.diff_result_id,
  tag: input.tag.trim() || "待法务确认",
  comment: input.comment.trim(),
  reviewer: input.reviewer.trim() || "合规同事",
  status: "OPEN",
  created_at: nowIso(),
  updated_at: nowIso()
});

export const createUpdatedReviewNote = (
  current: ReviewNote,
  patch: Partial<Pick<ReviewNote, "tag" | "comment" | "reviewer" | "status">>
): ReviewNote => ({
  ...current,
  ...patch,
  updated_at: nowIso()
});

export const createReviewNoteResponse = (row: ReviewNote): ReviewNote => ({ ...row });
