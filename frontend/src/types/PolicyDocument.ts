import type { PolicySection } from "./PolicySection";

/** 政策文档：一次导入的一版隐私政策 */
export interface PolicyDocument {
  id: number;
  title: string;
  version_label: string;
  raw_text: string;
  /** 自动分段结果，导入时由 usePolicyParser 解析后落库 */
  normalized_sections: PolicySection[];
  imported_at: string;
}

/** 导入表单入参 */
export interface PolicyDocumentImport {
  title: string;
  version_label: string;
  raw_text: string;
}
