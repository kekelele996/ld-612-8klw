import type { ReviewStatus as ReviewStatusEnum } from "../types/ReviewStatus";

// 审阅备注状态：待处理 / 已确认风险 / 已忽略 / 已处理
export const ReviewStatus = ["OPEN", "CONFIRMED", "IGNORED", "RESOLVED"] as const;

export const ReviewStatusText: Record<ReviewStatusEnum, string> = {
  OPEN: "待处理",
  CONFIRMED: "已确认",
  IGNORED: "已忽略",
  RESOLVED: "已处理"
};

export const ReviewStatusOrder: ReviewStatusEnum[] = ["OPEN", "CONFIRMED", "IGNORED", "RESOLVED"];

export const ReviewStatusOptions = ReviewStatusOrder.map((value) => ({
  value,
  label: ReviewStatusText[value]
}));

export const ReviewStatusTone: Record<ReviewStatusEnum, "warning" | "danger" | "info" | "success"> = {
  OPEN: "warning",
  CONFIRMED: "danger",
  IGNORED: "info",
  RESOLVED: "success"
};
