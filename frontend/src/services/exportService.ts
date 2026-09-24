import { DiffTypeText } from "../constants/DiffType";
import { PrivacyRiskLevelText, PrivacyRiskLevelWeight } from "../constants/PrivacyRiskLevel";
import { ReviewStatusText, isPendingStatus } from "../constants/ReviewStatus";
import { SectionCategoryText } from "../constants/SectionCategory";
import { formatDate, truncate } from "../utils/formatters";
import { AppError, errorCode } from "../utils/AppError";
import type { ComparisonReport } from "../types/ComparisonReport";
import type { DiffResult } from "../types/DiffResult";
import type { ReviewNote } from "../types/ReviewNote";

const CHANGED_TYPES: DiffResult["diff_type"][] = ["ADDED", "REMOVED", "MODIFIED", "MOVED"];

const renderRiskHits = (diff: DiffResult): string[] => {
  if (diff.risks.length === 0) return ["- 未命中第三方共享 / 定位 / 敏感信息 / 长期保存关键词"];
  return diff.risks.map((hit) => {
    const lines = [
      `- 【${PrivacyRiskLevelText[hit.level]}】${SectionCategoryText[hit.category]}（${hit.side === "old" ? "旧版" : "新版"}命中）`,
      `  - 命中依据：${hit.matchedKeywords.join("、")}（权重累计 ${hit.score} 分）`,
      `  - 定级理由：${hit.reason}`,
      ...hit.evidence.map((sentence) => `  - 原文证据：「${sentence}」`)
    ];
    return lines.join("\n");
  });
};

const renderNote = (note: ReviewNote): string =>
  `- [${ReviewStatusText[note.status]}] ${note.reviewer}：${note.comment || "（无备注内容）"}` +
  `（${SectionCategoryText[note.tag as keyof typeof SectionCategoryText] ?? "手动标记"}，更新于 ${formatDate(note.updated_at)}）`;

/**
 * 导出 Markdown 摘要：必须带版本信息、风险统计、差异统计与未处理事项。
 */
export const buildReportMarkdown = (report: ComparisonReport): string => {
  const { oldDocument, newDocument, diffs, notes, generatedAt } = report;
  const changed = diffs.filter((diff) => CHANGED_TYPES.includes(diff.diff_type));
  const openNotes = notes.filter((note) => isPendingStatus(note.status));

  const lines: string[] = [];
  lines.push("# 隐私政策版本对比审阅摘要");
  lines.push("");
  lines.push(`- 生成时间：${formatDate(generatedAt)}`);
  lines.push(`- 旧版：${oldDocument.title}（${oldDocument.version_label || "未标注版本"}，导入于 ${formatDate(oldDocument.imported_at)}）`);
  lines.push(`- 新版：${newDocument.title}（${newDocument.version_label || "未标注版本"}，导入于 ${formatDate(newDocument.imported_at)}）`);
  lines.push(`- 条款总数：旧版 ${oldDocument.normalized_sections.length} 条 / 新版 ${newDocument.normalized_sections.length} 条`);
  lines.push("");

  lines.push("## 一、变化统计");
  for (const type of CHANGED_TYPES) {
    lines.push(`- ${DiffTypeText[type]}：${report.diffTypeCounts[type] ?? 0} 条`);
  }
  lines.push(`- 未变化：${report.diffTypeCounts.UNCHANGED ?? 0} 条`);
  lines.push("");

  lines.push("## 二、风险统计");
  if (report.riskCounts.length === 0) {
    lines.push("- 本次对比未扫描到风险条款");
  } else {
    for (const item of [...report.riskCounts].sort(
      (a, b) => PrivacyRiskLevelWeight[b.level] - PrivacyRiskLevelWeight[a.level]
    )) {
      lines.push(`- ${PrivacyRiskLevelText[item.level]}风险：${item.count} 处条款`);
    }
    const highOrCritical = diffs.filter(
      (diff) =>
        diff.risk_level !== null &&
        PrivacyRiskLevelWeight[diff.risk_level] >= PrivacyRiskLevelWeight.HIGH
    ).length;
    lines.push(`- 建议优先追问（高/严重）：${highOrCritical} 条`);
  }
  lines.push("");

  lines.push("## 三、变化条款与命中依据");
  if (changed.length === 0) {
    lines.push("- 两个版本内容一致，无变化条款。");
  }
  changed.forEach((diff, index) => {
    lines.push(`### ${index + 1}. [${DiffTypeText[diff.diff_type]}] ${diff.section_title}`);
    lines.push(`- 章节编号：旧 ${diff.old_section_no ?? "—"} / 新 ${diff.new_section_no ?? "—"}`);
    lines.push(`- 变化说明：${diff.summary}`);
    if (diff.old_section) {
      const oldText = (diff.old_section as { content: string }).content;
      lines.push(`- 旧版原文：\n\n> ${truncate(oldText, 400).replace(/\n/g, "\n> ")}`);
    }
    if (diff.new_section) {
      const newText = (diff.new_section as { content: string }).content;
      lines.push(`- 新版原文：\n\n> ${truncate(newText, 400).replace(/\n/g, "\n> ")}`);
    }
    lines.push(...renderRiskHits(diff));
    const relatedNotes = notes.filter((note) => note.diff_result_id === diff.id);
    if (relatedNotes.length > 0) {
      lines.push("- 审阅备注：");
      relatedNotes.forEach((note) => lines.push(renderNote(note)));
    }
    lines.push("");
  });

  lines.push("## 四、未处理事项");
  if (openNotes.length === 0) {
    lines.push("- 无未处理备注，全部审阅意见均已闭环。");
  } else {
    lines.push(`共 ${openNotes.length} 条待处理：`);
    openNotes.forEach((note) => {
      const diff = diffs.find((item) => item.id === note.diff_result_id);
      lines.push(
        `- 《${diff?.section_title ?? "未知条款"}》[${SectionCategoryText[note.tag as keyof typeof SectionCategoryText] ?? "手动标记"}] ` +
        `${note.reviewer}：${note.comment || "（待补充）"}（${formatDate(note.updated_at)}）`
      );
    });
  }
  lines.push("");
  lines.push("> 本摘要由 policy-diff 本地生成，风险等级基于关键词规则，仅供合规审阅参考。");

  return lines.join("\n");
};

export const safeBuildReportMarkdown = (report: ComparisonReport): string => {
  try {
    return buildReportMarkdown(report);
  } catch (error) {
    throw new AppError(errorCode.EXPORT_FAILED, {
      reason: error instanceof Error ? error.message : String(error)
    });
  }
};

export const reportFilename = (report: ComparisonReport): string => {
  const slug = (value: string) =>
    value.replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 24) || "version";
  return `policy-diff_${slug(report.oldDocument.version_label)}_vs_${slug(
    report.newDocument.version_label
  )}.md`;
};
