// 隐私风险等级（类型定义位置，常量值见 constants/PrivacyRiskLevel.ts）
export type PrivacyRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

// 未命中任何风险规则的条款使用 NONE，不属于正式风险枚举
export type RiskLevelOrNone = PrivacyRiskLevel | "NONE";
