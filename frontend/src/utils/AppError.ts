import { ERROR_CODES, type ErrorCode } from "../constants/errorCodes";
import { ERROR_MESSAGES } from "../constants/errorMessages";

/** 领域异常：service 抛出后由 api/controller 层再次包装为用户提示 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly vars: Record<string, string | number>;

  constructor(code: ErrorCode, vars: Record<string, string | number> = {}) {
    super(code);
    this.name = "AppError";
    this.code = code;
    this.vars = vars;
  }

  get message(): string {
    const template = ERROR_MESSAGES[this.code] ?? this.code;
    return template.replace(/\{(\w+)\}/g, (_, key: string) =>
      this.vars[key] === undefined ? `{${key}}` : String(this.vars[key])
    );
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;

export const errorCode = ERROR_CODES;
