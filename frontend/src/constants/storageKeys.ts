/** localStorage 键名集中管理；浏览器重开后各 store 经 api 层从这些键恢复 */
export const STORAGE_KEYS = {
  policyDocument: "policy-diff:policy-document",
  policySection: "policy-diff:policy-section",
  diffResult: "policy-diff:diff-result",
  reviewNote: "policy-diff:review-note",
  auditLog: "policy-diff:audit-log",
  lastCompare: "policy-diff:last-compare"
} as const;

export type StorageKey = keyof typeof STORAGE_KEYS;

export const AUDIT_LOG_LIMIT = 300;
