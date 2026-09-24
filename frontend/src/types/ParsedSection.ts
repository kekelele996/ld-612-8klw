// 自动分段中间结构：由 usePolicyParser / parser 产生，再交给构造器落库
export interface ParsedSection {
  section_no: string;
  section_key: string;
  heading: string;
  content: string;
  order_index: number;
}
