import { ERROR_CODES } from "../constants/errorCodes";
import { AppError } from "../utils/AppError";
import type { ParsedSection } from "../types/PolicySection";

/**
 * 隐私政策自动分段。
 * 支持的章节头：
 *   第X条 / 第X章 / 一、 / （一） / 1. / 1、 / 1.2 / 1.2.3 / 一. 标题
 * 无法识别编号时，按“非空短句 + 冒号/换行”兜底为标题。
 */

interface RawHeading {
  no: string;
  title: string;
  lineIndex: number;
}

const CN_NUM = "零一二三四五六七八九十百";
const CN_NUM_RE = new RegExp(`^[${CN_NUM}]+$`);

const stripIndex = (value: string): string => value.replace(/^[\s　]+|[\s　]+$/g, "");

const normalizeDigits = (value: string): string =>
  value.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));

/** 将“第十二条/十二”等中文编号转成可比较数字序列 */
export const normalizeSectionNo = (raw: string): string => {
  const no = normalizeDigits(raw).replace(/[\s　]/g, "");
  const article = no.match(/^第([0-9]+|[零一二三四五六七八九十百]+)[条章节部分]?$/);
  if (article) return `A${cnToNumber(article[1]) ?? article[1]}`;
  if (/^\d+(\.\d+)*$/.test(no)) return `N${no}`;
  if (CN_NUM_RE.test(no)) return `C${cnToNumber(no) ?? no}`;
  const parenthesized = no.match(/^[（(](\d+)[)）]$/);
  if (parenthesized) return `P${parenthesized[1]}`;
  return `X${no}`;
};

const cnToNumber = (value: string): number | null => {
  if (/^\d+$/.test(value)) return Number(value);
  if (!CN_NUM_RE.test(value)) return null;
  const map: Record<string, number> = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (value === "十") return 10;
  let total = 0;
  let section = 0;
  for (const ch of value) {
    if (ch === "百") {
      section = (section || 1) * 100;
      total += section;
      section = 0;
    } else if (ch === "十") {
      section = (section || 1) * 10;
      if (!value.includes("百")) {
        total += section;
        section = 0;
      }
    } else {
      section += map[ch];
    }
  }
  total += section;
  return total;
};

const matchHeading = (line: string): RawHeading | null => {
  const normalized = normalizeDigits(line);
  // 第X条/章/节（阿拉伯或中文数字）
  let m = normalized.match(
    new RegExp(`^[\\s　]*第\\s*([0-9]+|[${CN_NUM}]+)\\s*([条章节部分])[\\s:：、]*(.*)$`)
  );
  if (m) {
    return { no: `第${m[1]}${m[2]}`, title: stripIndex(m[3] || ""), lineIndex: -1 };
  }
  // 中文数字开头：一、标题
  m = normalized.match(new RegExp(`^[\\s　]*([${CN_NUM}]+)[、.．]\\s*(.+)$`));
  if (m && m[2].length <= 40) return { no: m[1], title: stripIndex(m[2]), lineIndex: -1 };
  // （一）/（1）
  m = normalized.match(/^[\s　]*[（(]\s*([0-9]+|[零一二三四五六七八九十]+)\s*[)）][\s:：、.]*(.*)$/);
  if (m) return { no: `(${m[1]})`, title: stripIndex(m[3] || ""), lineIndex: -1 };
  // 1. 标题 / 1.2 标题（标题需是非纯数字的短句）
  m = normalized.match(/^[\s　]*(\d+(?:\.\d+){0,3})[、.．]\s*(.+)$/);
  if (m && m[2].length <= 40 && !/^\d+$/.test(m[2].trim())) {
    return { no: m[1], title: stripIndex(m[2]), lineIndex: -1 };
  }
  return null;
};

/** 短行兜底：仅当出现明确的条款主题词时才视为无编号小标题（避免“隐私政策/生效日期”误入） */
const matchLooseHeading = (line: string): RawHeading | null => {
  const text = stripIndex(line);
  const topicalPattern = /个人信息|信息共享|信息收集|信息使用|信息保存|权限管理|用户权利|联系方式|服务范围|保存期限|处理方式|政策更新|未成年人/;
  if (
    text.length >= 4 &&
    text.length <= 24 &&
    !/[。；;.!?！？]$/.test(text) &&
    topicalPattern.test(text)
  ) {
    return { no: "", title: text, lineIndex: -1 };
  }
  return null;
};

export interface ParseOutcome {
  sections: ParsedSection[];
  preamble: string;
}

export const parsePolicyText = (rawText: string): ParseOutcome => {
  if (!rawText || !rawText.trim()) {
    throw new AppError(ERROR_CODES.PARSE_FAILED, { reason: "文本为空，无法分段" });
  }
  const lines = rawText
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim());

  const headings: { heading: RawHeading; index: number }[] = [];
  lines.forEach((line, index) => {
    const heading = matchHeading(line) ?? matchLooseHeading(line);
    if (heading) headings.push({ heading: { ...heading, lineIndex: index }, index });
  });

  if (headings.length === 0) {
    throw new AppError(ERROR_CODES.PARSE_FAILED, {
      reason: "未识别到“第X条 / 1. / 一、”等章节标题，请检查原文格式"
    });
  }

  const sections: ParsedSection[] = [];
  headings.forEach(({ heading, index }, order) => {
    const end = order + 1 < headings.length ? headings[order + 1].index : lines.length;
    const bodyLines = lines.slice(index + 1, end);
    const content = bodyLines
      .map((line) => line)
      .filter((line) => line.length > 0)
      .join("\n")
      .trim();
    sections.push({
      section_no: heading.no || `前言${order + 1}`,
      heading: heading.title || `条款 ${heading.no || order + 1}`,
      content: content || "（该章节下未解析到正文）"
    });
  });

  const preamble = lines.slice(0, headings[0].index).filter(Boolean).join("\n").trim();
  return { sections, preamble };
};
