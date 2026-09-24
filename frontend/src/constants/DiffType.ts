export const DiffType = ["ADDED", "REMOVED", "MODIFIED", "MOVED", "UNCHANGED"] as const;
export type DiffTypeValue = (typeof DiffType)[number];

export const DiffTypeText: Record<DiffTypeValue, string> = {
  ADDED: "新增",
  REMOVED: "移除",
  MODIFIED: "改写",
  MOVED: "移动",
  UNCHANGED: "未变化"
};

/** 供状态徽章、筛选器、导出共用的语义色 */
export const DiffTypeColor: Record<DiffTypeValue, string> = {
  ADDED: "#1a7f37",
  REMOVED: "#b42318",
  MODIFIED: "#b54708",
  MOVED: "#175cd3",
  UNCHANGED: "#667085"
};

export const DiffTypeDescription: Record<DiffTypeValue, string> = {
  ADDED: "新版存在、旧版没有的条款",
  REMOVED: "旧版存在、新版删除的条款",
  MODIFIED: "编号与标题一致，但正文内容发生变化",
  MOVED: "标题与内容基本一致，仅章节编号或位置变化",
  UNCHANGED: "两侧条款一致"
};

export const isDiffType = (value: string): value is DiffTypeValue =>
  (DiffType as readonly string[]).includes(value);
