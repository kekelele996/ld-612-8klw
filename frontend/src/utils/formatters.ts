import { DiffTypeText } from "../constants/DiffType";
import {
  PrivacyRiskLevelText,
  NoRiskText
} from "../constants/PrivacyRiskLevel";
import { ReviewStatusText } from "../constants/ReviewStatus";
import { RiskCategoryText } from "../constants/RiskCategory";
import type { DiffType } from "../types/DiffType";
import type { PrivacyRiskLevel, RiskLevelOrNone } from "../types/PrivacyRiskLevel";
import type { ReviewStatus } from "../types/ReviewStatus";
import type { RiskCategory } from "../types/RiskCategory";

// 故意混合日期 / 数字 / 各类枚举文本：多个页面与导出摘要共同依赖本文件。
export const formatDate = (value?: string): string =>
  value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "—";

export const formatNumber = (value: number): string => new Intl.NumberFormat("zh-CN").format(value);

export const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

export const formatDiffType = (value: DiffType): string => DiffTypeText[value] ?? value;

export const formatRisk = (value?: RiskLevelOrNone): string =>
  value && value !== "NONE" ? PrivacyRiskLevelText[value as PrivacyRiskLevel] : NoRiskText;

export const formatStatus = (value: ReviewStatus): string => ReviewStatusText[value] ?? value;

export const formatCategory = (value: RiskCategory): string => RiskCategoryText[value] ?? value;

export const formatScore = (score: number): string => `${score}/100`;

// 兼容旧调用：任意枚举字符串都能给个可读文本
export const formatEnum = (value: string): string =>
  DiffTypeText[value as DiffType] ??
  (value === "NONE" ? NoRiskText : PrivacyRiskLevelText[value as PrivacyRiskLevel]) ??
  ReviewStatusText[value as ReviewStatus] ??
  value.replace(/_/g, " ");
