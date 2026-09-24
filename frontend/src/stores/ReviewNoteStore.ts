import { defineStore } from "pinia";
import {
  createReviewNote,
  deleteReviewNote,
  listReviewNotes,
  updateReviewNote
} from "../api/ReviewNote";
import { ReviewStatus, isPendingStatus, type ReviewStatusValue } from "../constants/ReviewStatus";
import { isAppError } from "../utils/AppError";
import type { ReviewNote, ReviewNoteDraft } from "../types/ReviewNote";

interface ReviewNoteState {
  rows: ReviewNote[];
  loading: boolean;
  error: string;
}

export const useReviewNoteStore = defineStore("reviewNote", {
  state: (): ReviewNoteState => ({ rows: [], loading: false, error: "" }),
  getters: {
    byDiff: (state) => (diffResultId: number) =>
      state.rows
        .filter((note) => note.diff_result_id === diffResultId)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    openRows(state): ReviewNote[] {
      return state.rows.filter((note) => isPendingStatus(note.status));
    },
    statusCounts(state): Record<ReviewStatusValue, number> {
      return ReviewStatus.reduce(
        (acc, status) => {
          acc[status] = state.rows.filter((note) => note.status === status).length;
          return acc;
        },
        { OPEN: 0, CONFIRMED: 0, IGNORED: 0, RESOLVED: 0 } as Record<ReviewStatusValue, number>
      );
    },
    notesForPair: (state) => (diffIds: number[]) => {
      const idSet = new Set(diffIds);
      return state.rows.filter((note) => idSet.has(note.diff_result_id));
    }
  },
  actions: {
    async load() {
      this.loading = true;
      this.error = "";
      try {
        this.rows = await listReviewNotes();
      } catch (error) {
        this.error = isAppError(error) ? error.message : "备注加载失败";
      } finally {
        this.loading = false;
      }
    },
    async add(draft: ReviewNoteDraft) {
      const note = await createReviewNote(draft);
      this.rows = [note, ...this.rows];
      return note;
    },
    async update(id: number, patch: Partial<Pick<ReviewNote, "comment" | "reviewer" | "tag" | "status">>) {
      const note = await updateReviewNote(id, patch);
      this.rows = this.rows.map((item) => (item.id === id ? note : item));
      return note;
    },
    async remove(id: number) {
      await deleteReviewNote(id);
      this.rows = this.rows.filter((item) => item.id !== id);
    }
  }
});
