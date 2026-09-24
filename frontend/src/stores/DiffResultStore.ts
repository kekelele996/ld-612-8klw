import { defineStore } from "pinia";
import {
  createComparison,
  listDiffResults,
  listDiffResultsByPair
} from "../api/DiffResult";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { PrivacyRiskLevel, PrivacyRiskLevelWeight } from "../constants/PrivacyRiskLevel";
import { DiffType } from "../constants/DiffType";
import { isAppError } from "../utils/AppError";
import type { ComparisonReport } from "../types/ComparisonReport";
import type { DiffResult } from "../types/DiffResult";
import type { PolicyDocument } from "../types/PolicyDocument";
import type { ReviewNote } from "../types/ReviewNote";

interface LastSelection {
  oldId: number | null;
  newId: number | null;
}

interface DiffResultState {
  rows: DiffResult[];
  oldDocumentId: number | null;
  newDocumentId: number | null;
  loading: boolean;
  error: string;
  comparedAt: string;
}

const readSelection = (): LastSelection => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.lastCompare);
    return raw ? (JSON.parse(raw) as LastSelection) : { oldId: null, newId: null };
  } catch {
    return { oldId: null, newId: null };
  }
};

const persistSelection = (selection: LastSelection): void => {
  localStorage.setItem(STORAGE_KEYS.lastCompare, JSON.stringify(selection));
};

export const useDiffResultStore = defineStore("diffResult", {
  state: (): DiffResultState => {
    const selection = readSelection();
    return {
      rows: [],
      oldDocumentId: selection.oldId,
      newDocumentId: selection.newId,
      loading: false,
      error: "",
      comparedAt: ""
    };
  },
  getters: {
    changedRows(state): DiffResult[] {
      return state.rows.filter((item) => item.diff_type !== "UNCHANGED");
    },
    riskyRows(state): DiffResult[] {
      const weight = (level: DiffResult["risk_level"]) =>
        level ? PrivacyRiskLevelWeight[level] : 0;
      return state.rows
        .filter((item) => item.risk_level !== null)
        .sort((a, b) => weight(b.risk_level) - weight(a.risk_level));
    },
    diffTypeCounts(state): Record<string, number> {
      return DiffType.reduce<Record<string, number>>((acc, type) => {
        acc[type] = state.rows.filter((item) => item.diff_type === type).length;
        return acc;
      }, {});
    },
    /** 组装报告：版本 + 风险统计 + 未处理事项，导出与页面共用 */
    buildReport(state) {
      return (oldDocument: PolicyDocument, newDocument: PolicyDocument, notes: ReviewNote[]): ComparisonReport => {
        const riskCounts = PrivacyRiskLevel.map((level) => ({
          level,
          count: state.rows.filter((item) => item.risk_level === level).length
        })).filter((item) => item.count > 0);
        const diffTypeCounts = DiffType.reduce<Record<string, number>>((acc, type) => {
          acc[type] = state.rows.filter((item) => item.diff_type === type).length;
          return acc;
        }, {});
        return {
          oldDocument,
          newDocument,
          diffs: state.rows,
          notes,
          generatedAt: state.comparedAt || new Date().toISOString(),
          diffTypeCounts,
          riskCounts,
          openNoteCount: notes.filter((note) => note.status === "OPEN").length
        };
      };
    }
  },
  actions: {
    setSelection(oldId: number | null, newId: number | null) {
      this.oldDocumentId = oldId;
      this.newDocumentId = newId;
      persistSelection({ oldId: oldId, newId: newId });
    },
    async restorePair() {
      if (this.oldDocumentId !== null && this.newDocumentId !== null) {
        this.rows = await listDiffResultsByPair(this.oldDocumentId, this.newDocumentId);
      }
    },
    async load() {
      this.rows = await listDiffResults();
    },
    async compare(oldDocument: PolicyDocument, newDocument: PolicyDocument) {
      this.loading = true;
      this.error = "";
      try {
        this.rows = await createComparison(oldDocument, newDocument);
        this.oldDocumentId = oldDocument.id;
        this.newDocumentId = newDocument.id;
        this.comparedAt = new Date().toISOString();
        persistSelection({ oldId: oldDocument.id, newId: newDocument.id });
      } catch (error) {
        this.error = isAppError(error) ? error.message : "版本对比失败";
        throw error;
      } finally {
        this.loading = false;
      }
    },
    clearPair() {
      this.rows = [];
      this.oldDocumentId = null;
      this.newDocumentId = null;
      persistSelection({ oldId: null, newId: null });
    }
  }
});
