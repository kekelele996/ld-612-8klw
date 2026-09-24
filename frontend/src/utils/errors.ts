import { ERROR_CODES, type ErrorCode } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";
import { log } from "./logger";

// 业务异常：api（service）层与 store（controller）层分别包装抛出，
// 页面拿到 message 直接展示，code 用于日志与特殊分支处理。
export class PolicyDiffError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, cause?: unknown) {
    super(ERROR_MESSAGES[code]);
    this.name = "PolicyDiffError";
    this.code = code;
    if (cause) console.warn(cause);
  }
}

export function fail(code: ErrorCode, entity: Parameters<typeof log>[0], action: string, cause?: unknown): never {
  log(entity, action, { code: ERROR_CODES[code] }, "error");
  throw new PolicyDiffError(code, cause);
}

export function wrapService<T>(fn: () => T, entity: Parameters<typeof log>[0], action: string): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof PolicyDiffError) throw error;
    return fail("VALIDATION_FAILED", entity, action, error);
  }
}

export async function wrapServiceAsync<T>(
  fn: () => Promise<T>,
  entity: Parameters<typeof log>[0],
  action: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof PolicyDiffError) throw error;
    return fail("VALIDATION_FAILED", entity, action, error);
  }
}
