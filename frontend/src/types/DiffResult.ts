import type { DiffType } from "./DiffType";
import type { DiffLine } from "./DiffLine";
import type { PrivacyRiskLevel } from "./PrivacyRiskLevel";
import type { RiskHit } from "./RiskHit";

/**
 * 差异结果：一对新旧文档 + 一个按编号/标题对应的章节。
 * old_section / new_section 同时保留两侧原文，至少一侧存在。
 */
export interface DiffResult {
  id: number;
  old_document_id: number;
  new_document_id: number;
  section_id: string;
  /** 两侧规范化章节编号，MOVED 判断依据 */
  old_section_no: string | null;
  new_section_no: string | null;
  section_title: string;
  diff_type: DiffType;
  summary: string;
  old_section: unknown | null;
  new_section: unknown | null;
  /** 行级 + 行内差异，仅改写时生成 */
  old_lines: DiffLine[];
  new_lines: DiffLine[];
  /** 两侧风险命中：含命中关键词、证据句、权重分与定级理由 */
  risks: RiskHit[];
  risk_level: PrivacyRiskLevel | null;
  created_at: string;
}
