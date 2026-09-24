import type { SectionCategory } from "../types/SectionCategory";

/** 涉险类别顺序决定同一条款归类与统计口径 */
export const SECTION_CATEGORY_ORDER: SectionCategory[] = [
  "THIRD_PARTY_SHARING",
  "LOCATION",
  "SENSITIVE_INFO",
  "RETENTION",
  "OTHER"
];

export const SectionCategoryText: Record<SectionCategory, string> = {
  THIRD_PARTY_SHARING: "第三方共享",
  LOCATION: "定位信息",
  SENSITIVE_INFO: "敏感信息",
  RETENTION: "长期保存",
  OTHER: "一般条款"
};

export const SectionCategoryColor: Record<SectionCategory, string> = {
  THIRD_PARTY_SHARING: "#7a271a",
  LOCATION: "#175cd3",
  SENSITIVE_INFO: "#c01048",
  RETENTION: "#b54708",
  OTHER: "#667085"
};

export const isSectionCategory = (value: string): value is SectionCategory =>
  (SECTION_CATEGORY_ORDER as readonly string[]).includes(value);
