import { STORAGE_KEYS, type StorageKey } from "../constants/storageKeys";
import { AppError, errorCode } from "./AppError";

/** localStorage 读写统一封装：解析失败/配额不足在此抛 STORAGE_UNAVAILABLE */
export function readStorage<T>(key: StorageKey, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[key]);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new AppError(errorCode.STORAGE_UNAVAILABLE, {
      reason: error instanceof Error ? error.message : String(error)
    });
  }
}

export function writeStorage<T>(key: StorageKey, value: T): void {
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
  } catch (error) {
    throw new AppError(errorCode.STORAGE_UNAVAILABLE, {
      reason: error instanceof Error ? error.message : String(error)
    });
  }
}

export function removeStorage(key: StorageKey): void {
  try {
    localStorage.removeItem(STORAGE_KEYS[key]);
  } catch (error) {
    throw new AppError(errorCode.STORAGE_UNAVAILABLE, {
      reason: error instanceof Error ? error.message : String(error)
    });
  }
}
