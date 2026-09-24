import { DiffTypeText } from "./DiffType";
import { PrivacyRiskLevelText } from "./PrivacyRiskLevel";
import { ReviewStatusText } from "./ReviewStatus";
import { SectionCategoryText } from "./SectionCategory";

/** 统一状态文案出口，页面/组件/导出都从这里取，禁止各处自行映射 */
export const STATUS_TEXT = {
  DiffType: DiffTypeText,
  PrivacyRiskLevel: PrivacyRiskLevelText,
  ReviewStatus: ReviewStatusText,
  SectionCategory: SectionCategoryText
};
