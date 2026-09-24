import type { DiffResult } from "../types/DiffResult";
import type { PolicyDocument } from "../types/PolicyDocument";
import type { PolicySection } from "../types/PolicySection";
import type { ReviewNote } from "../types/ReviewNote";
import { DiffTypeText } from "../constants/DiffType";
import { PrivacyRiskLevelText, NoRiskText } from "../constants/PrivacyRiskLevel";
import { ReviewStatusText } from "../constants/ReviewStatus";
import { RiskCategoryText } from "../constants/RiskCategory";
import { formatDate, formatPercent } from "./formatters";
import { log } from "./logger";
import { PolicyDiffError } from "./errors";

export interface ExportInput {
  oldDocument: PolicyDocument;
  newDocument: PolicyDocument;
  diffs: DiffResult[];
  sections: PolicySection[];
  notes: ReviewNote[];
}

// 审阅摘要：版本信息 + 风险统计 + 差异清单 + 未处理事项，Markdown 格式
export function buildReviewSummary(input: ExportInput): string {
  const { oldDocument, newDocument, diffs, sections, notes } = input;
  const newSections = sections.filter((section) => section.document_id === newDocument.id);
  const lines: string[] = [];

  lines.push(`# 隐私政策版本对比审阅摘要`);
  lines.push("");
  lines.push(`- 导出时间：${formatDate(new Date().toISOString())}`);
  lines.push(`- 旧版本：${oldDocument.title} ${oldDocument.version_label}`);
  lines.push(`- 新版本：${newDocument.title} ${newDocument.version_label}`);
  lines.push(`- 旧版条款数：${sections.filter((s) => s.document_id === oldDocument.id).length}，新版条款数：${newSections.length}`);
  lines.push("");

  lines.push(`## 一、差异统计`);
  const counts = { ADDED: 0, REMOVED: 0, MODIFIED: 0, MOVED: 0, UNCHANGED: 0 } as Record<DiffResult["diff_type"], number>;
  diffs.forEach((diff) => {
    counts[diff.diff_type] += 1;
  });
  (Object.keys(DiffTypeText) as DiffResult["diff_type"][]).forEach((type) => {
    lines.push(`- ${DiffTypeText[type]}：${counts[type]} 条`);
  });
  lines.push("");

  lines.push(`## 二、风险统计（按新版条款）`);
  const riskCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 } as Record<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL", number>;
  newSections.forEach((section) => {
    if (section.risk_level !== "NONE") riskCounts[section.risk_level as keyof typeof riskCounts] += 1;
  });
  lines.push(`- ${PrivacyRiskLevelText.CRITICAL}：${riskCounts.CRITICAL} 条`);
  lines.push(`- ${PrivacyRiskLevelText.HIGH}：${riskCounts.HIGH} 条`);
  lines.push(`- ${PrivacyRiskLevelText.MEDIUM}：${riskCounts.MEDIUM} 条`);
  lines.push(`- ${PrivacyRiskLevelText.LOW}：${riskCounts.LOW} 条`);
  lines.push(`- ${NoRiskText}：${newSections.length - Object.values(riskCounts).reduce((a, b) => a + b, 0)} 条`);
  lines.push("");

  const risky = newSections
    .filter((section) => section.risk_level === "HIGH" || section.risk_level === "CRITICAL")
    .sort((a, b) => b.risk_score - a.risk_score);
  if (risky.length > 0) {
    lines.push(`### 优先追问（高 / 严重）`);
    risky.forEach((section) => {
      const categories = [...new Set(section.risk_hits.filter((hit) => hit.weight > 0).map((hit) => RiskCategoryText[hit.category]))];
      lines.push(
        `- **${section.section_no} ${section.heading}**（${PrivacyRiskLevelText[section.risk_level as keyof typeof PrivacyRiskLevelText]}，${section.risk_score}/100）${categories.length ? `：${categories.join("、")}` : ""}`
      );
    });
    lines.push("");
  }

  lines.push(`## 三、逐条差异`);
  diffs.forEach((diff, index) => {
    const levelText = diff.risk_level && diff.risk_level !== "NONE" ? PrivacyRiskLevelText[diff.risk_level as keyof typeof PrivacyRiskLevelText] : NoRiskText;
    lines.push(`### ${index + 1}. [${DiffTypeText[diff.diff_type]}] ${diff.section_no} ${diff.new_heading || diff.old_heading}`);
    lines.push(`- 风险等级：${levelText}`);
    if (diff.diff_type === "MODIFIED" || diff.diff_type === "MOVED") {
      lines.push(`- 内容相似度：${formatPercent(diff.similarity)}`);
    }
    lines.push(`- 变化说明：${diff.summary}`);
    if (diff.diff_type !== "ADDED" && diff.old_content) {
      lines.push(`- 旧版原文：${oneLine(diff.old_content)}`);
    }
    if (diff.diff_type !== "REMOVED" && diff.new_content) {
      lines.push(`- 新版原文：${oneLine(diff.new_content)}`);
    }
    lines.push("");
  });

  const pending = notes.filter((note) => note.status === "OPEN" || note.status === "CONFIRMED");
  lines.push(`## 四、未处理事项（${pending.length} 条）`);
  if (pending.length === 0) {
    lines.push("- 无，全部备注均已处理。");
  } else {
    pending.forEach((note) => {
      const diff = diffs.find((item) => item.id === note.diff_result_id);
      lines.push(
        `- [${ReviewStatusText[note.status]}] ${diff?.section_no ?? "-"} ${diff?.new_heading || diff?.old_heading || ""}｜${note.tag}｜${note.comment}（${note.reviewer}，${formatDate(note.updated_at)}）`
      );
    });
  }
  lines.push("");
  return lines.join("\n");
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function downloadMarkdown(markdown: string, filename: string): void {
  try {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
    log("ReviewNote", "EXPORT", { open: 0, total: 0 });
  } catch (error) {
    throw new PolicyDiffError("EXPORT_FAILED", error);
  }
}
