import { defineStore } from "pinia";
import type { DiffResult } from "../types/DiffResult";
import * as api from "../api/DiffResult";
import { PolicyDiffError } from "../utils/errors";

export const useDiffResultStore = defineStore("diffResult", {
  state: () => ({
    rows: [] as DiffResult[],
    loading: false,
    generating: false,
    error: "",
    lastPairKey: ""
  }),
  getters: {
    byPair: (state) => (oldId: number, newId: number) =>
      state.rows
        .filter((row) => row.old_document_id === oldId && row.new_document_id === newId)
        .sort(comparePair),
    pairStats: (state) => (oldId: number, newId: number) => {
      const rows = state.rows.filter((row) => row.old_document_id === oldId && row.new_document_id === newId);
      const stats = { ADDED: 0, REMOVED: 0, MODIFIED: 0, MOVED: 0, UNCHANGED: 0 } as Record<DiffResult["diff_type"], number>;
      rows.forEach((row) => {
        stats[row.diff_type] += 1;
      });
      return stats;
    }
  },
  actions: {
    async load() {
      this.loading = true;
      this.error = "";
      try {
        this.rows = await api.listDiffResult();
      } catch (error) {
        this.error = this.wrap(error);
      } finally {
        this.loading = false;
      }
    },
    async generate(oldId: number, newId: number) {
      this.generating = true;
      this.error = "";
      try {
        this.rows = await api.generateDiffResult(oldId, newId);
        this.lastPairKey = `${oldId}-${newId}`;
      } catch (error) {
        this.error = this.wrap(error);
        throw error;
      } finally {
        this.generating = false;
      }
    },
    async updateSummary(id: number, summary: string) {
      try {
        await api.updateDiffResultSummary(id, summary);
        await this.load();
      } catch (error) {
        this.error = this.wrap(error);
      }
    },
    wrap(error: unknown): string {
      return error instanceof PolicyDiffError ? error.message : "版本对比失败，请重试";
    }
  }
});

function comparePair(a: DiffResult, b: DiffResult): number {
  const ao = a.new_section_id || a.old_section_id;
  const bo = b.new_section_id || b.old_section_id;
  return ao - bo;
}
