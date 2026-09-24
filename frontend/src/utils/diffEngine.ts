import type { DiffResult } from "../types/DiffResult";
import type { DiffType } from "../types/DiffType";
import type { PolicyDocument } from "../types/PolicyDocument";
import type { PolicySection } from "../types/PolicySection";
import { DiffTypeText } from "../constants/DiffType";
import { diffChars, similarity, type TextSegment } from "./textLcs";
import { normalizeHeading } from "./parser";
import { normalizeSectionNo } from "./numbering";

export interface SectionPair {
  oldSection: PolicySection | null;
  newSection: PolicySection | null;
  /** 匹配依据：编号对齐 / 标题对齐（移动）/ 无匹配 */
  matchedBy: "NO" | "HEADING";
  similarity: number;
}

const MOVED_HEADING_THRESHOLD = 0.75;
// 同编号但标题与正文都对不上时（如旧版七=法律适用、新版七=未成年人保护），
// 解除编号配对，交给标题匹配去识别 MOVED，剩余两侧分别记为移除/新增。
const BROKEN_PAIR_SIMILARITY = 0.25;
const BROKEN_PAIR_HEADING = 0.5;

// 先按归一化编号配对；编号对不上的，再用标题相似度识别“移动/重新编号”
export function pairSections(oldSections: PolicySection[], newSections: PolicySection[]): SectionPair[] {
  const oldByKey = new Map(oldSections.map((section) => [normalizeSectionNo(section.section_no), section]));
  const newByKey = new Map(newSections.map((section) => [normalizeSectionNo(section.section_no), section]));
  const pairs: SectionPair[] = [];
  const pairedOld = new Set<number>();
  const pairedNew = new Set<number>();

  newSections.forEach((newSection) => {
    const oldSection = newSection.section_no ? oldByKey.get(normalizeSectionNo(newSection.section_no)) ?? null : null;
    if (oldSection) {
      const candidate = buildPair(oldSection, newSection, "NO");
      const headingMatch = headingRatio(oldSection.heading, newSection.heading);
      if (candidate.similarity < BROKEN_PAIR_SIMILARITY && headingMatch < BROKEN_PAIR_HEADING) return;
      pairs.push(candidate);
      pairedOld.add(oldSection.id);
      pairedNew.add(newSection.id);
    }
  });

  // 未配对的两侧做标题匹配（编号变化、标题基本一致 → MOVED）
  oldSections
    .filter((section) => !pairedOld.has(section.id))
    .forEach((oldSection) => {
      const candidate = newSections
        .filter((section) => !pairedNew.has(section.id))
        .map((newSection) => ({ newSection, ratio: headingRatio(oldSection.heading, newSection.heading) }))
        .filter((item) => item.ratio >= MOVED_HEADING_THRESHOLD)
        .sort((a, b) => b.ratio - a.ratio)[0];
      if (candidate) {
        pairs.push(buildPair(oldSection, candidate.newSection, "HEADING"));
        pairedOld.add(oldSection.id);
        pairedNew.add(candidate.newSection.id);
      }
    });

  oldSections
    .filter((section) => !pairedOld.has(section.id))
    .forEach((section) => pairs.push(buildPair(section, null, "NO")));
  newSections
    .filter((section) => !pairedNew.has(section.id))
    .forEach((section) => pairs.push(buildPair(null, section, "NO")));

  // 按新版顺序优先、旧版兜底排序
  pairs.sort((a, b) => {
    const ao = a.newSection?.order_index ?? a.oldSection?.order_index ?? 0;
    const bo = b.newSection?.order_index ?? b.oldSection?.order_index ?? 0;
    return ao - bo;
  });
  return pairs;
}

function buildPair(oldSection: PolicySection | null, newSection: PolicySection | null, matchedBy: SectionPair["matchedBy"]): SectionPair {
  const ratio = oldSection && newSection ? similarity(oldSection.content, newSection.content) : 0;
  return { oldSection, newSection, matchedBy, similarity: ratio };
}

function headingRatio(a: string, b: string): number {
  return similarity(normalizeHeading(a), normalizeHeading(b));
}

export function classifyPair(pair: SectionPair): DiffType {
  const { oldSection, newSection } = pair;
  if (oldSection && newSection) {
    // 内容与标题完全一致：编号变了算移动（重新编号），编号一致才算未变化
    if (oldSection.content === newSection.content && oldSection.heading === newSection.heading) {
      return pair.matchedBy === "HEADING" || oldSection.section_no !== newSection.section_no
        ? "MOVED"
        : "UNCHANGED";
    }
    if (pair.matchedBy === "HEADING" && pair.similarity >= MOVED_HEADING_THRESHOLD) {
      return "MOVED";
    }
    return "MODIFIED";
  }
  return oldSection ? "REMOVED" : "ADDED";
}

export function summarizePair(diffType: DiffType, pair: SectionPair): string {
  const { oldSection, newSection } = pair;
  switch (diffType) {
    case "ADDED":
      return `新增条款「${newSection?.heading ?? ""}」，共 ${newSection?.content.length ?? 0} 字。`;
    case "REMOVED":
      return `移除条款「${oldSection?.heading ?? ""}」，原条款共 ${oldSection?.content.length ?? 0} 字。`;
    case "MOVED":
      return pair.similarity >= 0.999
        ? `条款编号由「${oldSection?.section_no}」调整为「${newSection?.section_no}」，标题与正文均无变化。`
        : `条款编号由「${oldSection?.section_no}」调整为「${newSection?.section_no}」，标题基本一致，内容相似度 ${Math.round(pair.similarity * 100)}%。`;
    case "UNCHANGED":
      return "条款标题与正文均无变化。";
    case "MODIFIED":
    default: {
      const segments = diffChars(oldSection?.content ?? "", newSection?.content ?? "");
      const changed = segments.reduce(
        (acc, seg) => {
          if (seg.type === "insert") acc.inserted += seg.text.length;
          if (seg.type === "delete") acc.deleted += seg.text.length;
          return acc;
        },
        { inserted: 0, deleted: 0 }
      );
      return `正文改写：删除 ${changed.deleted} 字，新增 ${changed.inserted} 字，内容相似度 ${Math.round(pair.similarity * 100)}%。`;
    }
  }
}

// 把配对结果转成可持久化的 DiffResult（不负责 id 分配）
export function buildDiffRow(
  pair: SectionPair,
  oldDoc: PolicyDocument,
  newDoc: PolicyDocument,
  timestamps: { created_at: string; updated_at: string }
): Omit<DiffResult, "id"> {
  const diffType = classifyPair(pair);
  const { oldSection, newSection } = pair;
  return {
    old_document_id: oldDoc.id,
    new_document_id: newDoc.id,
    section_id: (newSection ?? oldSection)!.id,
    old_section_id: oldSection?.id ?? 0,
    new_section_id: newSection?.id ?? 0,
    section_no: newSection?.section_no ?? oldSection?.section_no ?? "",
    old_heading: oldSection?.heading ?? "",
    new_heading: newSection?.heading ?? "",
    old_content: oldSection?.content ?? "",
    new_content: newSection?.content ?? "",
    diff_type: diffType,
    summary: summarizePair(diffType, pair),
    risk_level: (newSection ?? oldSection)?.risk_level ?? "NONE",
    similarity: Math.round(pair.similarity * 100) / 100,
    created_at: timestamps.created_at,
    updated_at: timestamps.updated_at
  };
}

export { diffChars, DiffTypeText };
export type { TextSegment };
