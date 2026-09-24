import { defineStore } from "pinia";
import {
  deletePolicyDocument,
  importPolicyDocument,
  listPolicyDocuments
} from "../api/PolicyDocument";
import { isAppError } from "../utils/AppError";
import type { PolicyDocument, PolicyDocumentImport } from "../types/PolicyDocument";

interface PolicyDocumentState {
  rows: PolicyDocument[];
  loading: boolean;
  error: string;
}

export const usePolicyDocumentStore = defineStore("policyDocument", {
  state: (): PolicyDocumentState => ({ rows: [], loading: false, error: "" }),
  getters: {
    sorted: (state) =>
      [...state.rows].sort((a, b) => b.imported_at.localeCompare(a.imported_at)),
    getById: (state) => (id: number) => state.rows.find((item) => item.id === id),
    count: (state) => state.rows.length
  },
  actions: {
    async load() {
      this.loading = true;
      this.error = "";
      try {
        this.rows = await listPolicyDocuments();
      } catch (error) {
        this.error = isAppError(error) ? error.message : "文档加载失败";
      } finally {
        this.loading = false;
      }
    },
    async importDocument(form: PolicyDocumentImport) {
      const document = await importPolicyDocument(form);
      this.rows = [document, ...this.rows];
      return document;
    },
    async remove(id: number) {
      await deletePolicyDocument(id);
      this.rows = this.rows.filter((item) => item.id !== id);
    }
  }
});
