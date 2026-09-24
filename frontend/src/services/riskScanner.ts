import { CRITICAL_SIGNALS, RISK_RULES, type RiskRule } from "../constants/riskRules";
import { PrivacyRiskLevelWeight } from "../constants/PrivacyRiskLevel";
import { truncate } from "../utils/formatters";
import type { PolicySection } from "../types/PolicySection";
import type { PrivacyRiskLevel } from "../types/PrivacyRiskLevel";
import type { RiskHit } from "../types/RiskHit";

/** 按中文标点切句，证据句提取用 */
const splitSentences = (text: string): string[] =>
  text
    .split(/(?<=[。；;！？!?\n])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const scoreToLevel = (rule: RiskRule, score: number): PrivacyRiskLevel => {
  const hit = rule.scoreThresholds.find((threshold) => score >= threshold.min);
  const level = hit?.level ?? rule.floorLevel;
  return PrivacyRiskLevelWeight[level] >= PrivacyRiskLevelWeight[rule.floorLevel]
    ? level
    : rule.floorLevel;
};

const containsCriticalSignal = (text: string): string[] =>
  CRITICAL_SIGNALS.filter((word) => text.includes(word));

/**
 * 扫描单段文本，产出每个类别的命中。
 * 等级解释链：matchedKeywords × weight → score → 阈值映射 → critical 信号抬级
 */
export const scanTextForRisks = (text: string, side: "old" | "new"): RiskHit[] => {
  const sentences = splitSentences(text);
  const criticalHits = new Set(containsCriticalSignal(text));

  return RISK_RULES.map((rule) => {
    const matched: { word: string; weight: number }[] = [];
    const evidence: string[] = [];
    let score = 0;

    for (const { word, weight } of rule.keywords) {
      if (text.includes(word)) {
        matched.push({ word, weight });
        score += weight;
        const sentence = sentences.find((item) => item.includes(word));
        if (sentence && !evidence.includes(truncate(sentence, 100))) {
          evidence.push(truncate(sentence, 100));
        }
      }
    }

    if (matched.length === 0) return null;

    let level = scoreToLevel(rule, score);

    // 严重信号词（精确位置/生物识别/出境/永久保存等）直接抬到 CRITICAL
    // 类别外但同段出现的严重信号也抬级，并在证据中体现
    const boostedSignals: string[] = [];
    for (const word of criticalHits) {
      const inSentence = sentences.find((item) => item.includes(word));
      if (inSentence && !evidence.includes(truncate(inSentence, 100)) && evidence.length < 4) {
        evidence.push(truncate(inSentence, 100));
      }
      boostedSignals.push(word);
    }
    if (boostedSignals.length > 0) level = "CRITICAL";
    const words = matched.map((item) => item.word);
    const reason =
      rule.reasonTemplate.replace("{words}", [...new Set(words)].join("、")) +
      `（规则权重累计 ${score} 分${boostedSignals.length > 0 ? `，严重信号词 ${[...new Set(boostedSignals)].join("、")} 抬至严重` : ""}）`;

    return {
      category: rule.category,
      level,
      matchedKeywords: [...new Set(matched.map((item) => item.word))],
      score,
      evidence: evidence.slice(0, 4),
      reason,
      side
    } satisfies RiskHit;
  }).filter((hit): hit is RiskHit => hit !== null);
};

/** 段落扫描：标题 + 正文一起评估 */
export const scanSection = (
  section: Pick<PolicySection, "heading" | "content">,
  side: "old" | "new"
): RiskHit[] => scanTextForRisks(`${section.heading}\n${section.content}`, side);
