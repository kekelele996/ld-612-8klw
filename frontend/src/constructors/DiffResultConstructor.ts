import type { DiffResult } from "../types/DiffResult";

// 差异行的实际字段组装在 utils/diffEngine.buildDiffRow，这里负责补 id
export const createDiffResultFromRow = (id: number, row: Omit<DiffResult, "id">): DiffResult => ({
  id,
  ...row
});

export const createDiffResultResponse = (row: DiffResult): DiffResult => ({ ...row });

// 同版本对重复生成时复用既有 id，并把“本次对比仍然存在”的行刷新
export const createUpdatedDiffResult = (current: DiffResult, patch: Partial<DiffResult>): DiffResult => ({
  ...current,
  ...patch,
  updated_at: new Date().toISOString()
});
