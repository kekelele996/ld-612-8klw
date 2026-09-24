import { DiffTypeText } from "../constants/DiffType";
import { PrivacyRiskLevelWeight } from "../constants/PrivacyRiskLevel";
import { logAction } from "../utils/logger";
import { AppError, errorCode } from "../utils/AppError";
import { buildDiffResult } from "../constructors/DiffResultConstructor";
import type { DiffLine } from "../types/DiffLine";
import type { DiffResult } from "../types/DiffResult";
import type { PolicyDocument } from "../types/PolicyDocument";
import type { PolicySection } from "../types/PolicySection";
import type { RiskHit } from "../types/RiskHit";
import type { DiffType } from "../types/DiffType";
import { diffLines } from "./lineDiff";
import { scanSection } from "./riskScanner";
import { MOVED_SIMILARITY, alignSections, contentSimilarity } from "./sectionAlign";

/** 两侧风险去重：同类别时保留等级更高的一侧，但证据合并以便解释 */
const mergeRisks = (oldHits: RiskHit[], newHits: RiskHit[]): RiskHit[] => {
  const map = new Map<RiskHit["category"], RiskHit>();
  [...oldHits, ...newHits].forEach((hit) => {
    const existing = map.get(hit.category);
    if (!existing) {
      map.set(hit.category, hit);
      return;
    }
    const winner =
      PrivacyRiskLevelWeight[hit.level] >= PrivacyRiskLevelWeight[existing.level] ? hit : existing;
    map.set(hit.category, {
      ...winner,
      matchedKeywords: [...new Set([...existing.matchedKeywords, ...hit.matchedKeywords])],
      evidence: [...new Set([...existing.evidence, ...hit.evidence])].slice(0, 6),
      score: Math.max(existing.score, hit.score)
    });
  });
  return [...map.values()].sort(
    (a, b) => PrivacyRiskLevelWeight[b.level] - PrivacyRiskLevelWeight[a.level]
  );
};

const buildSummary = (
  oldSection: PolicySection | null,
  newSection: PolicySection | null,
  inserted: number,
  deleted: number
): string => {
  if (!oldSection && newSection) {
    return `新版新增条款《${newSection.heading}》，旧版无对应章节`;
  }
  if (oldSection && !newSection) {
    return `新版删除条款《${oldSection.heading}》，旧版编号 ${oldSection.section_no}`;
  }
  if (oldSection && newSection) {
    return `正文改写：新增行 ${inserted}、删除行 ${deleted}（旧 ${oldSection.section_no} → 新 ${newSection.section_no}）`;
  }
  return "无变化";
};

/**
 * 执行一次版本对比：章节按编号/标题对应，保留两侧原文，
 * 对第三方共享、定位、敏感信息、长期保存做双侧风险扫描。
 */
export const compareDocuments = (oldDocument: PolicyDocument, newDocument: PolicyDocument): DiffResult[] => {
  if (oldDocument.id === newDocument.id) {
    throw new AppError(errorCode.SAME_VERSION_COMPARE, { id: oldDocument.id });
  }

  const { pairs } = alignSections(
    oldDocument.normalized_sections as PolicySection[],
    newDocument.normalized_sections as PolicySection[]
  );

  const results: DiffResult[] = [];

  for (const pair of pairs) {
    const { old, new: next } = pair;

    // 风险双侧扫描
    const risks = mergeRisks(
      old ? scanSection(old, "old") : [],
      next ? scanSection(next, "new") : []
    );

    let diffType: DiffType = pair.preliminaryType;
    let oldLines: DiffLine[] = [];
    let newLines: DiffLine[] = [];
    let inserted = 0;
    let deleted = 0;

    if (old && next) {
      const similarity = contentSimilarity(old.content, next.content);
      const noChanged = old.section_no !== next.section_no;
      const lineResult = diffLines(old.content, next.content);
      oldLines = lineResult.oldLines;
      newLines = lineResult.newLines;
      inserted = lineResult.insertedLineCount;
      deleted = lineResult.deletedLineCount;

      // 正文与标题实质一致：即使因插入新条款导致编号顺延，也算未变化
      const sameBody = old.content.trim() === next.content.trim();
      const sameHeading = old.heading.trim() === next.heading.trim();
      // 统计行内真实变化字符数（纯位置移动时应趋近于 0）
      const changedChars =
        lineResult.oldLines.reduce(
          (sum, line) => sum + line.marks.filter((mark) => mark.type === "del").reduce((s, mark) => s + (mark.end - mark.start), 0),
          0
        ) +
        lineResult.newLines.reduce(
          (sum, line) => sum + line.marks.filter((mark) => mark.type === "ins").reduce((s, mark) => s + (mark.end - mark.start), 0),
          0
        );

      if (sameBody && (sameHeading || similarity >= 0.995)) {
        diffType = "UNCHANGED";
      } else if (similarity >= 0.995) {
        diffType = "UNCHANGED";
      } else if (similarity >= MOVED_SIMILARITY && noChanged && changedChars <= 12) {
        // 正文几乎逐字一致、仅编号或位置变化 → 移动
        diffType = "MOVED";
      } else {
        diffType = "MODIFIED";
      }
    }

    results.push(
      buildDiffResult({
        oldDocumentId: oldDocument.id,
        newDocumentId: newDocument.id,
        pair,
        diffType,
        summary: buildSummary(old, next, inserted, deleted),
        oldLines,
        newLines,
        risks
      })
    );
  }

  const counts = results.reduce<Record<string, number>>((acc, item) => {
    acc[item.diff_type] = (acc[item.diff_type] ?? 0) + 1;
    return acc;
  }, {});

  logAction("DiffResult", "COMPARE", {
    old: oldDocument.version_label || `#${oldDocument.id}`,
    new: newDocument.version_label || `#${newDocument.id}`,
    added: counts.ADDED ?? 0,
    removed: counts.REMOVED ?? 0,
    modified: counts.MODIFIED ?? 0,
    moved: counts.MOVED ?? 0
  });

  // 按 新增/移除/改写/移动/未变化 的业务顺序输出
  const order: DiffResult["diff_type"][] = ["REMOVED", "MODIFIED", "ADDED", "MOVED", "UNCHANGED"];
  return results.sort(
    (a, b) =>
      order.indexOf(a.diff_type) - order.indexOf(b.diff_type) ||
      (a.old_section_no ?? a.new_section_no ?? "").localeCompare(b.old_section_no ?? b.new_section_no ?? "", "zh-CN")
  );
};

export const describeDiffType = (type: DiffResult["diff_type"]): string => DiffTypeText[type];
