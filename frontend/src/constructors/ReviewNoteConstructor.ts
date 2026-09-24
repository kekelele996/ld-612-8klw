import type { ReviewNote, ReviewNoteDraft } from "../types/ReviewNote";
import { nextId } from "../utils/id";

export const createDefaultReviewNote = (): ReviewNote => ({
  id: 0,
  diff_result_id: 0,
  tag: "MANUAL",
  comment: "",
  reviewer: "合规审阅人",
  status: "OPEN",
  created_at: "",
  updated_at: ""
});

export const createReviewNoteForm = (diffResultId: number): ReviewNoteDraft => ({
  diff_result_id: diffResultId,
  tag: "MANUAL",
  comment: "",
  reviewer: "合规审阅人"
});

/** 新建备注：默认 OPEN 进入待处理清单 */
export const buildReviewNote = (draft: ReviewNoteDraft): ReviewNote => {
  const now = new Date().toISOString();
  return {
    id: nextId(),
    diff_result_id: draft.diff_result_id,
    tag: draft.tag,
    comment: draft.comment.trim(),
    reviewer: draft.reviewer.trim() || "合规审阅人",
    status: "OPEN",
    created_at: now,
    updated_at: now
  };
};

export const createReviewNoteResponse = createDefaultReviewNote;
