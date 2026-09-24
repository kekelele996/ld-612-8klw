import { DiffTypeText, DiffTypeTone, DiffTypeOptions } from "./DiffType";
import {
  PrivacyRiskLevelText,
  PrivacyRiskLevelTone,
  PrivacyRiskLevelOptions,
  NoRiskText
} from "./PrivacyRiskLevel";
import { ReviewStatusText, ReviewStatusTone, ReviewStatusOptions } from "./ReviewStatus";
import { RiskCategoryText, RiskCategoryOptions } from "./RiskCategory";

// 状态文案聚合出口：formatters / StatusBadge / RiskTag / 各筛选器统一从这里取
export const STATUS_TEXT = {
  DiffType: DiffTypeText,
  DiffTypeTone,
  DiffTypeOptions,
  PrivacyRiskLevel: PrivacyRiskLevelText,
  PrivacyRiskLevelTone,
  PrivacyRiskLevelOptions,
  NoRiskText,
  ReviewStatus: ReviewStatusText,
  ReviewStatusTone,
  ReviewStatusOptions,
  RiskCategory: RiskCategoryText,
  RiskCategoryOptions
};
