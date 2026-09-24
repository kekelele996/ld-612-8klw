import { defineStore } from "pinia";
import type { ReviewNote } from "../types/ReviewNote";
import type { ReviewStatus } from "../types/ReviewStatus";
import * as api from "../api/ReviewNote";
import type { ReviewNoteFormInput } from "../constructors/ReviewNoteConstructor";
import { PolicyDiffError } from "../utils/errors";
import { ReviewStatusOrder } from "../constants/ReviewStatus";

export const useReviewNoteStore = defineStore("reviewNote", {
  state: () => ({
    rows: [] as ReviewNote[],
    loading: false,
    error: ""
  }),
  getters: {
    byDiff: (state) => (diffId: number) =>
      state.rows
        .filter((row) => row.diff_result_id === diffId)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    statusStats: (state) => {
      const stats = { OPEN: 0, CONFIRMED: 0, IGNORED: 0, RESOLVED: 0 } as Record<ReviewStatus, number>;
      state.rows.forEach((row) => {
        stats[row.status] += 1;
      });
      return stats;
    },
    // 导出摘要用：OPEN + CONFIRMED 属于未处理事项
    openItems(state) {
      return state.rows.filter((row) => row.status === "OPEN" || row.status === "CONFIRMED");
    },
    statusOrder: () => ReviewStatusOrder
  },
  actions: {
    async load() {
      this.loading = true;
      this.error = "";
      try {
        this.rows = await api.listReviewNote();
      } catch (error) {
        this.error = this.wrap(error);
      } finally {
        this.loading = false;
      }
    },
    async create(input: ReviewNoteFormInput) {
      try {
        await api.createReviewNote(input);
        await this.load();
      } catch (error) {
        this.error = this.wrap(error);
        throw error;
      }
    },
    async update(id: number, patch: Partial<Pick<ReviewNote, "tag" | "comment" | "reviewer">>) {
      try {
        await api.updateReviewNote(id, patch);
        await this.load();
      } catch (error) {
        this.error = this.wrap(error);
        throw error;
      }
    },
    async setStatus(id: number, status: ReviewStatus) {
      try {
        await api.updateReviewNoteStatus(id, status);
        await this.load();
      } catch (error) {
        this.error = this.wrap(error);
      }
    },
    async remove(id: number) {
      try {
        await api.deleteReviewNote(id);
        await this.load();
      } catch (error) {
        this.error = this.wrap(error);
      }
    },
    wrap(error: unknown): string {
      return error instanceof PolicyDiffError ? error.message : "备注操作失败，请重试";
    }
  }
});
