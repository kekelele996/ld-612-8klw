import type { RiskAssessment } from "../types/RiskAssessment";
import type { RiskHit } from "../types/RiskHit";
import {
  MITIGATION_WINDOW,
  RISK_RULES,
  RISK_THRESHOLDS,
  type RiskRule
} from "../constants/riskRules";
import { nowIso } from "./ids";

// 风险引擎：关键词规则匹配 → 缓释词窗口判定 → 类目取最高有效权重 →
// 其余类目按 30% 折算求和 → 阈值映射等级。每一步都落到 RiskHit，保证可解释。

interface MatchedKeyword {
  rule: RiskRule;
  index: number;
  trigger: string;
  weight: number;
}

function findTriggers(text: string): MatchedKeyword[] {
  const results: MatchedKeyword[] = [];
  RISK_RULES.forEach((rule) => {
    rule.triggers.forEach(({ keyword, weight }) => {
      let from = 0;
      let hit = text.indexOf(keyword, from);
      while (hit !== -1) {
        results.push({ rule, index: hit, trigger: keyword, weight });
        from = hit + keyword.length;
        hit = text.indexOf(keyword, from);
      }
    });
  });
  return results.sort((a, b) => a.index - b.index);
}

function hasNearbyMitigation(text: string, index: number, trigger: string, mitigations: string[]): string | null {
  const start = Math.max(0, index - MITIGATION_WINDOW);
  const end = Math.min(text.length, index + trigger.length + MITIGATION_WINDOW);
  const window = text.slice(start, end);
  return mitigations.find((word) => window.includes(word)) ?? null;
}

export function assessRisk(content: string, heading = ""): RiskAssessment {
  const text = `${heading}。${content}`.replace(/\s+/g, "");
  const hits: RiskHit[] = [];
  const effectiveByCategory = new Map<string, number>();

  findTriggers(text).forEach(({ rule, index, trigger, weight }) => {
    const mitigation = hasNearbyMitigation(text, index, trigger, rule.mitigations);
    if (mitigation) {
      hits.push({
        category: rule.category,
        keyword: `${trigger}（邻近缓释词「${mitigation}」）`,
        weight: 0,
        kind: "MITIGATION",
        snippet: text.slice(Math.max(0, index - 6), Math.min(text.length, index + trigger.length + 6))
      });
      return;
    }
    hits.push({
      category: rule.category,
      keyword: trigger,
      weight,
      kind: "TRIGGER",
      snippet: text.slice(Math.max(0, index - 6), Math.min(text.length, index + trigger.length + 6))
    });
    effectiveByCategory.set(rule.category, Math.max(effectiveByCategory.get(rule.category) ?? 0, weight));
  });

  const scores = [...effectiveByCategory.values()].sort((a, b) => b - a);
  let score = 0;
  scores.forEach((value, index) => {
    score += index === 0 ? value : value * 0.3;
  });
  score = Math.min(100, Math.round(score));

  const matched = RISK_THRESHOLDS.find((threshold) => score >= threshold.min);
  return {
    score,
    level: matched ? matched.level : "NONE",
    hits: hits.sort((a, b) => b.weight - a.weight),
    assessed_at: nowIso()
  };
}

export function levelFromScore(score: number): RiskAssessment["level"] {
  const matched = RISK_THRESHOLDS.find((threshold) => score >= threshold.min);
  return matched ? matched.level : "NONE";
}
