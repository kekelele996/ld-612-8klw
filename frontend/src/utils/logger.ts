import { LOG_TEMPLATES, type LogAction, type LogEntity } from "../constants/logTemplates";
import { AUDIT_LOG_LIMIT, STORAGE_KEYS } from "../constants/storageKeys";

export interface AuditEntry {
  time: string;
  entity: LogEntity;
  action: string;
  message: string;
}

const fill = (template: string, vars: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] === undefined ? `{${key}}` : String(vars[key])
  );

const readLog = (): AuditEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.auditLog);
    return raw ? (JSON.parse(raw) as AuditEntry[]) : [];
  } catch {
    return [];
  }
};

/** 所有写操作的统一审计出口：控制台 + localStorage 环形缓冲 */
export const logAction = <E extends LogEntity>(
  entity: E,
  action: LogAction<E>,
  vars: Record<string, string | number> = {}
): AuditEntry => {
  const template = (LOG_TEMPLATES[entity] as Record<string, string>)[action as string] ?? action;
  const entry: AuditEntry = {
    time: new Date().toISOString(),
    entity,
    action: action as string,
    message: fill(template, vars)
  };
  console.info(`[audit][${entity}.${String(action)}]`, entry.message);
  try {
    const rows = readLog();
    rows.push(entry);
    localStorage.setItem(
      STORAGE_KEYS.auditLog,
      JSON.stringify(rows.slice(-AUDIT_LOG_LIMIT))
    );
  } catch {
    // 审计写入失败不阻断业务流
  }
  return entry;
};

export const listAuditLog = (): AuditEntry[] => readLog().reverse();
