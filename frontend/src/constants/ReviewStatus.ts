export const ReviewStatus = ["OPEN", "CONFIRMED", "IGNORED", "RESOLVED"] as const;
export type ReviewStatusValue = (typeof ReviewStatus)[number];

export const ReviewStatusText: Record<ReviewStatusValue, string> = {
  OPEN: "待处理",
  CONFIRMED: "已确认风险",
  IGNORED: "已忽略",
  RESOLVED: "已解决"
};

export const ReviewStatusColor: Record<ReviewStatusValue, string> = {
  OPEN: "#b54708",
  CONFIRMED: "#c01048",
  IGNORED: "#667085",
  RESOLVED: "#1a7f37"
};

/** 导出摘要中的“未处理事项”即该集合：仅待处理算未处理 */
export const isPendingStatus = (status: ReviewStatusValue): boolean => status === "OPEN";

export const isReviewStatus = (value: string): value is ReviewStatusValue =>
  (ReviewStatus as readonly string[]).includes(value);
