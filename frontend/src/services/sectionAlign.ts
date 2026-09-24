import { normalizeSectionNo } from "./policyParser";
import type { PolicySection } from "../types/PolicySection";
import type { SectionPair, PairStats } from "../types/SectionPair";

const headingKey = (heading: string): string =>
  heading
    .replace(/[\s　:：()（）【】\[\]、，,。.．]/g, "")
    .replace(/^第[0-9零一二三四五六七八九十百]+[条章节部分]/, "")
    .toLowerCase();

/** 去掉空白与标点后的正文相似度（0~1），Dice 字符集合系数，适合中文短条款 */
export const contentSimilarity = (a: string, b: string): number => {
  const compact = (text: string) => text.replace(/[\s　，。；：、,.!?;:：（）()【】\[\]""'']/g, "");
  const ca = compact(a);
  const cb = compact(b);
  if (ca === cb) return 1;
  if (ca.length === 0 || cb.length === 0) return 0;
  const setA = new Set(ca);
  const setB = new Set(cb);
  let common = 0;
  for (const ch of setA) if (setB.has(ch)) common += 1;
  return (2 * common) / (setA.size + setB.size);
};

/** 标题相似度：完全一致为 1，否则按字符集合 Dice 给部分分 */
const headingSimilarity = (a: string, b: string): number => {
  const ha = headingKey(a);
  const hb = headingKey(b);
  if (!ha || !hb) return 0;
  if (ha === hb) return 1;
  const setA = new Set(ha);
  const setB = new Set(hb);
  let common = 0;
  for (const ch of setA) if (setB.has(ch)) common += 1;
  return (2 * common) / (setA.size + setB.size);
};

export interface AlignmentResult {
  pairs: SectionPair[];
  stats: PairStats;
}

interface Edge {
  oldIndex: number;
  newIndex: number;
  score: number;
  matchedBy: "heading" | "no" | "content";
}

/** 编号一致性奖励：标题匹配但编号变了通常意味着移动/插入 */
const noMatches = (a: PolicySection, b: PolicySection): boolean =>
  normalizeSectionNo(a.section_no) === normalizeSectionNo(b.section_no);

/** 贪心二分图匹配：按边权降序配对，避免插入条款导致后续全部错位 */
const greedyMatch = (edges: Edge[]): Map<number, number> => {
  const mapping = new Map<number, number>();
  const usedOld = new Set<number>();
  const usedNew = new Set<number>();
  for (const edge of [...edges].sort((a, b) => b.score - a.score)) {
    if (usedOld.has(edge.oldIndex) || usedNew.has(edge.newIndex)) continue;
    usedOld.add(edge.oldIndex);
    usedNew.add(edge.newIndex);
    mapping.set(edge.oldIndex, edge.newIndex);
  }
  return mapping;
};

/**
 * 章节对应（章节先按编号和标题对应）：
 * 1. 标题完全一致 + 编号一致 → 确定配对（MODIFIED/UNCHANGED 候选）
 * 2. 标题完全一致但编号变化 → 配对（MOVED 候选，由对比服务按正文相似度判定）
 * 3. 剩余章节建立候选边（编号一致 / 标题相似 / 正文相似），全局贪心最优匹配
 * 4. 最终未配上的新章节 ADDED、旧章节 REMOVED
 */
export const alignSections = (
  oldSections: PolicySection[],
  newSections: PolicySection[]
): AlignmentResult => {
  const pairs: SectionPair[] = [];
  const usedOld = new Set<number>();
  const usedNew = new Set<number>();
  const stats: PairStats = { pairedByNo: 0, pairedByHeading: 0, unmatched: 0 };

  // 1) 标题完全一致（对插入新条款最鲁棒：不依赖编号位置）
  newSections.forEach((next, newIndex) => {
    if (usedNew.has(newIndex)) return;
    const candidates = oldSections
      .map((section, oldIndex) => ({ section, oldIndex }))
      .filter(
        ({ section, oldIndex }) =>
          !usedOld.has(oldIndex) && headingKey(section.heading) === headingKey(next.heading) && headingKey(next.heading)
      );
    if (candidates.length === 1 || (candidates.length > 0 && noMatches(candidates[0].section, next))) {
      const pick = candidates[0];
      usedOld.add(pick.oldIndex);
      usedNew.add(newIndex);
      if (noMatches(pick.section, next)) stats.pairedByNo += 1;
      else stats.pairedByHeading += 1;
      pairs.push({
        key: `heading:${headingKey(next.heading)}`,
        old: pick.section,
        new: next,
        preliminaryType: "MODIFIED"
      });
    }
  });

  // 2) 剩余章节：收集候选边，全局贪心匹配
  const edges: Edge[] = [];
  oldSections.forEach((section, oldIndex) => {
    if (usedOld.has(oldIndex)) return;
    newSections.forEach((next, newIndex) => {
      if (usedNew.has(newIndex)) return;
      const sameNo = noMatches(section, next);
      const headSim = headingSimilarity(section.heading, next.heading);
      const bodySim = contentSimilarity(section.content, next.content);
      let score = 0;
      let matchedBy: Edge["matchedBy"] = "content";
      if (sameNo) {
        // 编号一致：给正文相似度加权，但不能压过标题完全一致
        score = 0.55 + bodySim * 0.4;
        matchedBy = "no";
      }
      if (headSim >= 0.6) {
        const headScore = 0.5 + headSim * 0.3 + bodySim * 0.2;
        if (headScore > score) {
          score = headScore;
          matchedBy = "heading";
        }
      }
      // 正文高度相关（标题完全不同的改写）
      if (bodySim >= 0.55 && matchedBy === "content") {
        score = Math.max(score, bodySim * 0.6);
      }
      if (score >= 0.62) edges.push({ oldIndex, newIndex, score, matchedBy });
    });
  });

  const mapping = greedyMatch(edges);
  mapping.forEach((newIndex, oldIndex) => {
    usedOld.add(oldIndex);
    usedNew.add(newIndex);
    const oldSection = oldSections[oldIndex];
    const nextSection = newSections[newIndex];
    if (normalizeSectionNo(oldSection.section_no) === normalizeSectionNo(nextSection.section_no)) {
      stats.pairedByNo += 1;
    } else {
      stats.pairedByHeading += 1;
    }
    pairs.push({
      key: `match:${oldSection.id}-${nextSection.id}`,
      old: oldSection,
      new: nextSection,
      preliminaryType: "MODIFIED"
    });
  });

  // 3) 未配上的新章节 = ADDED
  newSections.forEach((next, newIndex) => {
    if (usedNew.has(newIndex)) return;
    usedNew.add(newIndex);
    stats.unmatched += 1;
    pairs.push({ key: `added:${next.id}`, old: null, new: next, preliminaryType: "ADDED" });
  });

  // 4) 未配上的旧章节 = REMOVED
  oldSections.forEach((section, oldIndex) => {
    if (usedOld.has(oldIndex)) return;
    usedOld.add(oldIndex);
    stats.unmatched += 1;
    pairs.push({ key: `removed:${section.id}`, old: section, new: null, preliminaryType: "REMOVED" });
  });

  return { pairs, stats };
};

/** MOVED 阈值：标题已对应，正文高度一致时视为仅移动而非改写 */
export const MOVED_SIMILARITY = 0.85;
