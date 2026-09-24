import type { RiskAssessment } from "./RiskAssessment";

export interface PolicySection {
  id: number;
  document_id: number;
  section_no: string;
  heading: string;
  content: string;
  category: string;
  order_index: number;
  risk_level: RiskAssessment["level"];
  risk_score: number;
  risk_hits: RiskAssessment["hits"];
  risk_assessed_at: string;
  risk_manual: boolean;
}
