import type { LocalDatabase } from "../utils/storage";
import { readDatabase, writeDatabase, isStorageAvailable } from "../utils/storage";
import { buildSeedDatabase } from "../mocks/seedData";

// API 层统一从这里取库：首次打开没有数据时注入示例政策，之后只读 localStorage。
let cache: LocalDatabase | null = null;

export function getDatabase(): LocalDatabase {
  if (cache) return cache;
  if (!isStorageAvailable()) {
    // localStorage 不可用时退化为内存库（仅当前会话有效）
    cache = buildSeedDatabase();
    return cache;
  }
  const db = readDatabase();
  if (db.policyDocument.length === 0) {
    cache = buildSeedDatabase();
    writeDatabase(cache);
  } else {
    cache = db;
  }
  return cache;
}

export function persistDatabase(db: LocalDatabase = getDatabase()): void {
  cache = db;
  writeDatabase(db);
}

export function resetDatabase(): LocalDatabase {
  cache = buildSeedDatabase();
  writeDatabase(cache);
  return cache;
}

export function clearDatabase(): LocalDatabase {
  cache = {
    policyDocument: [],
    policySection: [],
    diffResult: [],
    reviewNote: [],
    version: 1
  };
  writeDatabase(cache);
  return cache;
}

// 模拟异步 IO，保持所有 API 签名为 Promise，与真实后端可互换
export const tick = <T>(value: T, delay = 20): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), delay));
