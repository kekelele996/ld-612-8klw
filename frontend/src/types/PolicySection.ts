import type { PrivacyRiskLevel } from "./PrivacyRiskLevel";
import type { SectionCategory } from "./SectionCategory";

/** 条款段落：自动分段后的最小对比单元 */
export interface PolicySection {
  id: number;
  document_id: number;
  /** 规范化后的章节编号，如 第3条 / 4.2 / 一 */
  section_no: string;
  heading: string;
  content: string;
  /** 涉险类别，未命中为 OTHER */
  category: SectionCategory;
  risk_level: PrivacyRiskLevel | null;
}

/** 解析器产出的未持久化结构（尚无 id / document_id） */
export interface ParsedSection {
  section_no: string;
  heading: string;
  content: string;
}
