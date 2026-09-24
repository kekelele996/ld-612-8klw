import type { DiffType } from "../types/DiffType";
import type { PrivacyRiskLevel } from "../types/PrivacyRiskLevel";
import type { ReviewStatus } from "../types/ReviewStatus";
import type { SectionCategory } from "../types/SectionCategory";
import { STATUS_TEXT } from "../constants/statusText";

export const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
};

/** 通用状态文本：差异类型 / 风险等级 / 审阅状态 / 条款类别共用 */
export const formatStatus = (
  value: DiffType | PrivacyRiskLevel | ReviewStatus | SectionCategory | string
): string =>
  STATUS_TEXT.DiffType[value as DiffType] ??
  STATUS_TEXT.PrivacyRiskLevel[value as PrivacyRiskLevel] ??
  STATUS_TEXT.ReviewStatus[value as ReviewStatus] ??
  STATUS_TEXT.SectionCategory[value as SectionCategory] ??
  value.replace(/_/g, " ");

export const formatNumber = (value: number): string => new Intl.NumberFormat("zh-CN").format(value);

/** 风险等级：格式化层也保留兜底，真实映射以 constants/PrivacyRiskLevel 为准 */
export const formatRisk = (value: PrivacyRiskLevel | string): string =>
  STATUS_TEXT.PrivacyRiskLevel[value as PrivacyRiskLevel] ?? value;

/** 长文本截断，导出证据句与卡片预览共用 */
export const truncate = (value: string, max = 120): string => {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > max ? `${compact.slice(0, max)}…` : compact;
};

/** 百分比：用于风险占比展示 */
export const formatPercent = (part: number, total: number): string =>
  total === 0 ? "0%" : `${Math.round((part / total) * 100)}%`;
