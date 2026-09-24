import { STORAGE_KEYS } from "../constants/storageKeys";
import { PolicyDiffError } from "./errors";
import { log } from "./logger";

// 本地数据库：所有实体在一个键下整体读写（纯前端、无第三方 API）。
export interface LocalDatabase {
  policyDocument: unknown[];
  policySection: unknown[];
  diffResult: unknown[];
  reviewNote: unknown[];
  version: number;
}

export const emptyDatabase = (): LocalDatabase => ({
  policyDocument: [],
  policySection: [],
  diffResult: [],
  reviewNote: [],
  version: 1
});

export function isStorageAvailable(): boolean {
  try {
    const probe = "__policy_diff_probe__";
    localStorage.setItem(probe, probe);
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function readDatabase(): LocalDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DB);
    if (!raw) return emptyDatabase();
    const parsed = JSON.parse(raw) as Partial<LocalDatabase>;
    return { ...emptyDatabase(), ...parsed };
  } catch (error) {
    log("PolicyDocument", "UPDATE", {}, "error");
    throw new PolicyDiffError("STORAGE_UNAVAILABLE", error);
  }
}

export function writeDatabase(db: LocalDatabase): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DB, JSON.stringify(db));
  } catch (error) {
    throw new PolicyDiffError("STORAGE_UNAVAILABLE", error);
  }
}

// 界面偏好（选中的版本对等），与业务数据分开持久化
export function readUiState<T>(fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.UI);
    return raw ? { ...fallback, ...(JSON.parse(raw) as T) } : fallback;
  } catch {
    return fallback;
  }
}

export function writeUiState<T>(state: T): void {
  try {
    localStorage.setItem(STORAGE_KEYS.UI, JSON.stringify(state));
  } catch {
    // 偏好写入失败不阻断业务流程
  }
}
