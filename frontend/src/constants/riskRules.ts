import type { PrivacyRiskLevel } from "../types/PrivacyRiskLevel";
import type { SectionCategory } from "../types/SectionCategory";

/**
 * 风险规则（纯规则文件，不与扫描逻辑耦合）。
 *
 * 定级可解释：扫描器累计命中关键词的 weight，得到 score，
 * 再按 scoreThresholds 映射等级；命中依据即 matchedKeywords + evidence 原文句。
 */
export interface RiskRule {
  category: Exclude<SectionCategory, "OTHER">;
  /** 规则内关键词，命中一次累加 weight */
  keywords: { word: string; weight: number }[];
  scoreThresholds: { min: number; level: PrivacyRiskLevel }[];
  /** 该类别存在命中时的保底等级 */
  floorLevel: PrivacyRiskLevel;
  /** 定级理由模板，{words} 会被替换为命中关键词 */
  reasonTemplate: string;
}

/** 严重信号词：无论落在哪个类别，命中即把等级抬到 CRITICAL */
export const CRITICAL_SIGNALS: string[] = [
  "精确位置",
  "精确定位",
  "行踪轨迹",
  "生物识别",
  "人脸",
  "指纹",
  "医疗健康",
  "银行账户",
  "征信",
  "出境",
  "跨境",
  "永久保存",
  "长期保存",
  "无限期",
  "共享给合作伙伴",
  "向第三方提供",
  "出售"
];

export const RISK_RULES: RiskRule[] = [
  {
    category: "THIRD_PARTY_SHARING",
    keywords: [
      { word: "共享", weight: 2 },
      { word: "第三方", weight: 2 },
      { word: "SDK", weight: 2 },
      { word: "供应商", weight: 1 },
      { word: "合作伙伴", weight: 2 },
      { word: "委托处理", weight: 1 },
      { word: "提供给", weight: 2 },
      { word: "转让", weight: 2 },
      { word: "对外提供", weight: 3 },
      { word: "披露", weight: 1 },
      { word: "开放平台", weight: 2 },
      { word: "出境", weight: 3 },
      { word: "跨境", weight: 3 },
      { word: "境外", weight: 2 },
      { word: "关联公司", weight: 1 }
    ],
    scoreThresholds: [
      { min: 6, level: "CRITICAL" },
      { min: 3, level: "HIGH" },
      { min: 1, level: "MEDIUM" }
    ],
    floorLevel: "MEDIUM",
    reasonTemplate: "命中第三方共享相关表述（{words}），需核实接收方、目的与用户授权范围"
  },
  {
    category: "LOCATION",
    keywords: [
      { word: "位置信息", weight: 2 },
      { word: "定位", weight: 2 },
      { word: "地理位置", weight: 2 },
      { word: "经纬度", weight: 3 },
      { word: "精确位置", weight: 4 },
      { word: "精确定位", weight: 4 },
      { word: "行踪轨迹", weight: 4 },
      { word: "IP地址", weight: 1 },
      { word: "基站", weight: 2 },
      { word: "GPS", weight: 3 }
    ],
    scoreThresholds: [
      { min: 7, level: "CRITICAL" },
      { min: 3, level: "HIGH" },
      { min: 1, level: "MEDIUM" }
    ],
    floorLevel: "MEDIUM",
    reasonTemplate: "命中位置/定位相关采集表述（{words}），需核实精度、触发时机与关闭路径"
  },
  {
    category: "SENSITIVE_INFO",
    keywords: [
      { word: "身份证", weight: 3 },
      { word: "身份证件", weight: 3 },
      { word: "手机号", weight: 1 },
      { word: "银行卡", weight: 3 },
      { word: "银行账户", weight: 4 },
      { word: "生物识别", weight: 4 },
      { word: "人脸", weight: 4 },
      { word: "指纹", weight: 4 },
      { word: "医疗健康", weight: 4 },
      { word: "健康", weight: 2 },
      { word: "财产信息", weight: 3 },
      { word: "征信", weight: 4 },
      { word: "行踪", weight: 3 },
      { word: "不满14", weight: 4 },
      { word: "未成年人", weight: 3 },
      { word: "敏感", weight: 2 }
    ],
    scoreThresholds: [
      { min: 7, level: "CRITICAL" },
      { min: 4, level: "HIGH" },
      { min: 1, level: "MEDIUM" }
    ],
    floorLevel: "MEDIUM",
    reasonTemplate: "命中敏感个人信息表述（{words}），需核实单独同意、必要性与最小化原则"
  },
  {
    category: "RETENTION",
    keywords: [
      { word: "保存期限", weight: 2 },
      { word: "存储期限", weight: 2 },
      { word: "保留期限", weight: 2 },
      { word: "长期保存", weight: 4 },
      { word: "永久保存", weight: 4 },
      { word: "无限期", weight: 4 },
      { word: "最短期限", weight: 2 },
      { word: "必要期限", weight: 1 },
      { word: "持续保存", weight: 3 },
      { word: "超期", weight: 1 },
      { word: "删除或匿名化", weight: 2 },
      { word: "予以删除", weight: 2 },
      { word: "到期删除", weight: 2 },
      { word: "及时删除", weight: 2 },
      { word: "注销后", weight: 2 }
    ],
    scoreThresholds: [
      { min: 7, level: "CRITICAL" },
      { min: 4, level: "HIGH" },
      { min: 1, level: "LOW" }
    ],
    floorLevel: "LOW",
    reasonTemplate: "命中信息保存期限表述（{words}），需核实期限是否明确、到期删除机制是否落地"
  }
];
