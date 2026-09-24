import type { PrivacyRiskLevel as PrivacyRiskLevelEnum } from "../types/PrivacyRiskLevel";

// 隐私风险等级枚举值：低 / 中 / 高 / 严重
export const PrivacyRiskLevel = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const PrivacyRiskLevelText: Record<PrivacyRiskLevelEnum, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  CRITICAL: "严重"
};

export const PrivacyRiskLevelOrder: PrivacyRiskLevelEnum[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export const PrivacyRiskLevelOptions = PrivacyRiskLevel.map((value) => ({
  value,
  label: PrivacyRiskLevelText[value]
}));

// 等级色板：RiskTag、风险页统计与导出摘要共用
export const PrivacyRiskLevelTone: Record<PrivacyRiskLevelEnum, "info" | "success" | "warning" | "danger"> = {
  LOW: "info",
  MEDIUM: "success",
  HIGH: "warning",
  CRITICAL: "danger"
};

// 未命中风险时的展示文案（不属于正式枚举）
export const NoRiskText = "未命中";
