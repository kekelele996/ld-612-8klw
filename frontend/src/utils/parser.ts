import type { ParsedSection } from "../types/ParsedSection";
import { cleanHeading, normalizeSectionNo } from "./numbering";

// 自动分段支持三类标题：
//   一、 / 第一条、第1条 / 1.标题、1．标题、2.1 标题
// 标题必须独占一行（行内正文不会被误切）。
const HEADING_PATTERNS: RegExp[] = [
  /^第?\s*([0-9零一二两三四五六七八九十百]+)\s*[条款章节]?\s*[、.．:：\s]+\s*(.+)$/,
  /^([0-9]+(?:[.．][0-9]+)*)\s*[、.．:：\s]+\s*(.+)$/,
  /^([0-9零一二两三四五六七八九十]+)\s*[、.．]\s*(.+)$/
];

export interface ParseResult {
  preamble: string;
  sections: ParsedSection[];
}

export function parsePolicyText(raw: string): ParseResult {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const sections: ParsedSection[] = [];
  let preamble = "";
  let current: ParsedSection | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const body = buffer.join("\n").trim();
    if (current) {
      current.content = body;
      sections.push(current);
    } else {
      preamble = body;
    }
    buffer = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    const match = trimmed ? matchHeading(trimmed) : null;
    if (match) {
      flush();
      current = {
        section_no: match.no,
        section_key: normalizeSectionNo(match.no),
        heading: cleanHeading(match.heading),
        content: "",
        order_index: sections.length
      };
    } else {
      buffer.push(trimmed);
    }
  });
  flush();

  // 修正 order_index（序言不计入）
  sections.forEach((section, index) => {
    section.order_index = index;
  });
  return { preamble, sections };
}

function matchHeading(line: string): { no: string; heading: string } | null {
  for (const pattern of HEADING_PATTERNS) {
    const matched = line.match(pattern);
    if (matched && matched[2]) {
      const heading = matched[2].trim();
      // 过长的“标题”多半是误判的正文
      if (heading.length > 0 && heading.length <= 40) {
        return { no: matched[1], heading };
      }
    }
  }
  return null;
}

// 归一化标题用于移动（重新编号）判断
export function normalizeHeading(heading: string): string {
  return heading.replace(/[\s，,。.；;、（）()]/g, "");
}
