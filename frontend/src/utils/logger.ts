import { LOG_TEMPLATES, type LogEntity } from "../constants/logTemplates";

// 简易日志门面：写操作统一走这里，模板集中在 constants/logTemplates。
// 本地纯前端环境只输出到 console，保留 level 便于后续接入审计通道。
export type LogLevel = "info" | "warn" | "error";

const interpolate = (template: string, vars?: Record<string, unknown>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars && vars[key] !== undefined ? String(vars[key]) : `{${key}}`
  );

export function log(entity: LogEntity, action: string, vars?: Record<string, unknown>, level: LogLevel = "info") {
  const group = LOG_TEMPLATES[entity] as Record<string, string>;
  const template = group?.[action] ?? `${entity}.${action}`;
  const message = interpolate(template, vars);
  // eslint-disable-next-line no-console
  console[level === "error" ? "error" : level === "warn" ? "warn" : "info"](`[policy-diff] ${message}`);
  return message;
}
