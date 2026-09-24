import { defineStore } from "pinia";
import { listPolicySections } from "../api/PolicySection";
import type { PolicySection } from "../types/PolicySection";

interface PolicySectionState {
  rows: PolicySection[];
  loading: boolean;
}

export const usePolicySectionStore = defineStore("policySection", {
  state: (): PolicySectionState => ({ rows: [], loading: false }),
  getters: {
    byDocument: (state) => (documentId: number) =>
      state.rows.filter((section) => section.document_id === documentId),
    riskSections: (state) =>
      state.rows
        .filter((section) => section.risk_level !== null)
        .sort((a, b) => (a.risk_level ?? "").localeCompare(b.risk_level ?? ""))
  },
  actions: {
    async load() {
      this.loading = true;
      this.rows = await listPolicySections();
      this.loading = false;
    }
  }
});
