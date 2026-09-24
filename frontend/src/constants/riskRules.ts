import type { RiskCategory } from "../types/RiskCategory";
import type { PrivacyRiskLevel } from "../types/PrivacyRiskLevel";

// 风险规则：每个类目下的触发关键词（带权重）与缓释关键词（出现在 ±12 字窗口内降权）
// 所有命中都会生成 RiskHit 作为“命中依据”，保证等级可解释、可复核。
export interface RiskRuleKeyword {
  keyword: string;
  weight: number;
}

export interface RiskRule {
  category: RiskCategory;
  triggers: RiskRuleKeyword[];
  mitigations: string[];
}

export const RISK_RULES: RiskRule[] = [
  {
    category: "THIRD_PARTY_SHARING",
    triggers: [
      { keyword: "共享给第三方", weight: 80 },
      { keyword: "向第三方提供", weight: 80 },
      { keyword: "提供给第三方", weight: 75 },
      { keyword: "授权第三方", weight: 70 },
      { keyword: "第三方共享", weight: 60 },
      { keyword: "委托", weight: 35 },
      { keyword: "SDK", weight: 30 },
      { keyword: "共享", weight: 25 }
    ],
    mitigations: ["不会", "不向", "不与", "无需", "明确同意", "授权同意", "单独同意"]
  },
  {
    category: "LOCATION",
    triggers: [
      { keyword: "精确位置", weight: 70 },
      { keyword: "地理位置", weight: 55 },
      { keyword: "位置信息", weight: 55 },
      { keyword: "定位", weight: 45 }
    ],
    mitigations: ["不收集", "不会", "模糊", "仅当", "授权同意", "您可以随时关闭"]
  },
  {
    category: "SENSITIVE_INFO",
    triggers: [
      { keyword: "身份证号", weight: 70 },
      { keyword: "身份证", weight: 65 },
      { keyword: "银行卡号", weight: 70 },
      { keyword: "生物识别", weight: 70 },
      { keyword: "面部识别", weight: 70 },
      { keyword: "指纹", weight: 60 },
      { keyword: "行踪轨迹", weight: 65 },
      { keyword: "健康", weight: 45 },
      { keyword: "敏感个人信息", weight: 60 }
    ],
    mitigations: ["单独同意", "不会", "不收集", "删除", "加密", "脱敏"]
  },
  {
    category: "LONG_RETENTION",
    triggers: [
      { keyword: "十年", weight: 70 },
      { keyword: "永久", weight: 70 },
      { keyword: "长期", weight: 45 },
      { keyword: "不少于", weight: 40 },
      { keyword: "持续保存", weight: 40 },
      { keyword: "保留", weight: 25 }
    ],
    mitigations: ["最短期限", "必要期限", "实现目的所必需", "及时删除", "删除", "匿名化"]
  }
];

// 总分 → 等级阈值：分数按“类目内最高有效触发权重 + 其余类目 30%”折算
export const RISK_THRESHOLDS: { level: PrivacyRiskLevel; min: number }[] = [
  { level: "CRITICAL", min: 80 },
  { level: "HIGH", min: 60 },
  { level: "MEDIUM", min: 40 },
  { level: "LOW", min: 1 }
];

export const MITIGATION_WINDOW = 12;
