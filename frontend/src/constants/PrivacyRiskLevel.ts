export const PrivacyRiskLevel = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type PrivacyRiskLevelValue = (typeof PrivacyRiskLevel)[number];

export const PrivacyRiskLevelText: Record<PrivacyRiskLevelValue, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  CRITICAL: "严重"
};

/** 风险排序权重，等级比较与统计均使用它，禁止在组件内散写魔法数字 */
export const PrivacyRiskLevelWeight: Record<PrivacyRiskLevelValue, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

export const PrivacyRiskLevelColor: Record<PrivacyRiskLevelValue, string> = {
  LOW: "#667085",
  MEDIUM: "#b54708",
  HIGH: "#c01048",
  CRITICAL: "#7a271a"
};

export const PrivacyRiskLevelAdvice: Record<PrivacyRiskLevelValue, string> = {
  LOW: "一般性表述，抽样复核即可",
  MEDIUM: "建议确认改动目的与用户告知是否充分",
  HIGH: "优先追问：要求业务方说明合法性基础、范围与退出方式",
  CRITICAL: "最高优先级：疑似扩大共享/采集敏感信息，需在上线前澄清"
};

export const isPrivacyRiskLevel = (value: string): value is PrivacyRiskLevelValue =>
  (PrivacyRiskLevel as readonly string[]).includes(value);
