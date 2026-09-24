import type { DiffType } from "./DiffType";
import type { RiskLevelOrNone } from "./PrivacyRiskLevel";

export interface DiffResult {
  id: number;
  old_document_id: number;
  new_document_id: number;
  /** 兼容基础模型字段：新版条款 id，新增时取新侧，移除时取旧侧 */
  section_id: number;
  old_section_id: number;
  new_section_id: number;
  section_no: string;
  old_heading: string;
  new_heading: string;
  old_content: string;
  new_content: string;
  diff_type: DiffType;
  summary: string;
  risk_level: RiskLevelOrNone;
  /** 相似度 0-1，用于解释改写幅度 */
  similarity: number;
  created_at: string;
  updated_at: string;
}
