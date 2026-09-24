import type { DiffType as DiffTypeEnum } from "../types/DiffType";

// 差异类型枚举值：新增 / 移除 / 改写 / 移动（重新编号）/ 未变化
export const DiffType = ["ADDED", "REMOVED", "MODIFIED", "MOVED", "UNCHANGED"] as const;

export const DiffTypeText: Record<DiffTypeEnum, string> = {
  ADDED: "新增",
  REMOVED: "移除",
  MODIFIED: "改写",
  MOVED: "移动",
  UNCHANGED: "未变化"
};

export const DiffTypeOrder: DiffTypeEnum[] = [...DiffType];

// 用于筛选器与图例的统一配置（store/页面/组件共同引用）
export const DiffTypeOptions = DiffTypeOrder.map((value) => ({
  value,
  label: DiffTypeText[value]
}));

// 差异类型对应的语义色板，展示组件与导出摘要共用
export const DiffTypeTone: Record<DiffTypeEnum, string> = {
  ADDED: "success",
  REMOVED: "danger",
  MODIFIED: "warning",
  MOVED: "primary",
  UNCHANGED: "info"
};
