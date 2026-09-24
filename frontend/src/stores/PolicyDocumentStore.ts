import { defineStore } from "pinia";
import type { PolicyDocument } from "../types/PolicyDocument";
import * as api from "../api/PolicyDocument";
import { readUiState, writeUiState } from "../utils/storage";
import { PolicyDiffError } from "../utils/errors";
import { log } from "../utils/logger";

interface DocumentUiState {
  selectedOldId: number;
  selectedNewId: number;
}

// controller 层：包装 service(api) 抛出的异常，记录 error 供页面展示
export const usePolicyDocumentStore = defineStore("policyDocument", {
  state: () => ({
    rows: [] as PolicyDocument[],
    loading: false,
    error: "",
    selectedOldId: 0,
    selectedNewId: 0
  }),
  getters: {
    byOldest: (state) => [...state.rows].sort((a, b) => a.imported_at.localeCompare(b.imported_at)),
    getById: (state) => (id: number) => state.rows.find((row) => row.id === id) ?? null
  },
  actions: {
    async load() {
      this.loading = true;
      this.error = "";
      try {
        this.rows = await api.listPolicyDocument();
        this.restoreSelection();
      } catch (error) {
        this.error = this.wrap(error);
      } finally {
        this.loading = false;
      }
    },
    async importDocument(input: api.ImportDocumentInput) {
      this.error = "";
      try {
        const result = await api.importPolicyDocument(input);
        await this.load();
        // 新版自动选为“新版本”，旧版保持
        this.selectPair(this.selectedOldId || (this.rows.length > 1 ? this.rows[0].id : 0), result.document.id);
        return result.document;
      } catch (error) {
        this.error = this.wrap(error);
        throw error;
      }
    },
    async updateMeta(id: number, patch: Pick<PolicyDocument, "title" | "version_label">) {
      try {
        await api.updatePolicyDocumentMeta(id, patch);
        await this.load();
      } catch (error) {
        this.error = this.wrap(error);
        throw error;
      }
    },
    async remove(id: number) {
      try {
        await api.deletePolicyDocument(id);
        if (this.selectedOldId === id) this.selectedOldId = 0;
        if (this.selectedNewId === id) this.selectedNewId = 0;
        this.persistSelection();
        await this.load();
      } catch (error) {
        this.error = this.wrap(error);
        throw error;
      }
    },
    selectPair(oldId: number, newId: number) {
      this.selectedOldId = oldId;
      this.selectedNewId = newId;
      this.persistSelection();
    },
    restoreSelection() {
      const saved = readUiState<Partial<DocumentUiState>>({});
      const hasOld = this.rows.some((row) => row.id === saved.selectedOldId);
      const hasNew = this.rows.some((row) => row.id === saved.selectedNewId);
      if (!this.selectedOldId) {
        this.selectedOldId = hasOld && saved.selectedOldId ? saved.selectedOldId : this.byOldest[0]?.id ?? 0;
      }
      if (!this.selectedNewId) {
        this.selectedNewId = hasNew && saved.selectedNewId ? saved.selectedNewId : this.byOldest[1]?.id ?? this.byOldest[0]?.id ?? 0;
      }
    },
    persistSelection() {
      const state: DocumentUiState = { selectedOldId: this.selectedOldId, selectedNewId: this.selectedNewId };
      writeUiState(state);
      log("PolicyDocument", "UPDATE", { fields: "selection" });
    },
    wrap(error: unknown): string {
      if (error instanceof PolicyDiffError) return error.message;
      log("PolicyDocument", "UPDATE", {}, "error");
      return "文档操作失败，请重试";
    }
  }
});
