import { defineStore } from "pinia";
import type { PolicySection } from "../types/PolicySection";
import type { RiskLevelOrNone } from "../types/PrivacyRiskLevel";
import * as api from "../api/PolicySection";
import { PolicyDiffError } from "../utils/errors";
import { assessRisk } from "../utils/riskEngine";

export const usePolicySectionStore = defineStore("policySection", {
  state: () => ({
    rows: [] as PolicySection[],
    loading: false,
    error: ""
  }),
  getters: {
    byDocument: (state) => (documentId: number) =>
      state.rows
        .filter((row) => row.document_id === documentId)
        .sort((a, b) => a.order_index - b.order_index),
    riskySections: (state) =>
      [...state.rows]
        .filter((row) => row.risk_level !== "NONE")
        .sort((a, b) => b.risk_score - a.risk_score),
    previewRisk: () => (content: string, heading = "") => assessRisk(content, heading)
  },
  actions: {
    async load() {
      this.loading = true;
      this.error = "";
      try {
        this.rows = await api.listPolicySection();
      } catch (error) {
        this.error = this.wrap(error);
      } finally {
        this.loading = false;
      }
    },
    async updateContent(id: number, patch: Pick<PolicySection, "heading" | "content">) {
      try {
        await api.updatePolicySectionContent(id, patch);
        await this.load();
      } catch (error) {
        this.error = this.wrap(error);
        throw error;
      }
    },
    async overrideRisk(id: number, level: RiskLevelOrNone) {
      try {
        await api.overrideSectionRisk(id, level);
        await this.load();
      } catch (error) {
        this.error = this.wrap(error);
        throw error;
      }
    },
    wrap(error: unknown): string {
      return error instanceof PolicyDiffError ? error.message : "条款操作失败，请重试";
    }
  }
});
