import type { DiffType } from "./DiffType";
import type { PolicySection } from "./PolicySection";

/** 章节配对：按编号与标题对应后的中间结构 */
export interface SectionPair {
  key: string;
  old: PolicySection | null;
  new: PolicySection | null;
  /** 预分类：编号变但标题一致为 MOVED */
  preliminaryType: Exclude<DiffType, "UNCHANGED">;
}

export interface PairStats {
  pairedByNo: number;
  pairedByHeading: number;
  unmatched: number;
}
