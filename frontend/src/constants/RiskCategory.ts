import type { RiskCategory as RiskCategoryEnum } from "../types/RiskCategory";

export const RiskCategory = [
  "THIRD_PARTY_SHARING",
  "LOCATION",
  "SENSITIVE_INFO",
  "LONG_RETENTION"
] as const;

// 重点关注的四类高敏条款
export const RiskCategoryText: Record<RiskCategoryEnum, string> = {
  THIRD_PARTY_SHARING: "第三方共享",
  LOCATION: "定位信息",
  SENSITIVE_INFO: "敏感信息",
  LONG_RETENTION: "长期保存"
};

export const RiskCategoryOptions = RiskCategory.map((value) => ({
  value,
  label: RiskCategoryText[value]
}));
