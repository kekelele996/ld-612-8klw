import type { ReviewStatus } from "./ReviewStatus";
import type { SectionCategory } from "./SectionCategory";

/** 审阅备注：挂在某条差异结果上，形成待处理清单 */
export interface ReviewNote {
  id: number;
  diff_result_id: number;
  /** 标签：THIRD_PARTY_SHARING / LOCATION / SENSITIVE_INFO / RETENTION / MANUAL */
  tag: SectionCategory | "MANUAL";
  comment: string;
  reviewer: string;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface ReviewNoteDraft {
  diff_result_id: number;
  tag: ReviewNote["tag"];
  comment: string;
  reviewer: string;
}
