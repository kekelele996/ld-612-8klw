import type { ReviewStatus } from "./ReviewStatus";

export interface ReviewNote {
  id: number;
  diff_result_id: number;
  tag: string;
  comment: string;
  reviewer: string;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
}
