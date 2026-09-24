// 中文数字编号 → 阿拉伯数字键（用于条款对齐），覆盖“一/二/十/十一/二十/二十三”
const CN_DIGITS: Record<string, number> = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9
};

export function chineseToNumber(input: string): number | null {
  const text = input.trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) return Number(text);
  if (text === "十") return 10;
  let total = 0;
  let current = 0;
  for (const char of text) {
    if (char === "十") {
      total += (current || 1) * 10;
      current = 0;
    } else if (char in CN_DIGITS) {
      current = CN_DIGITS[char];
    } else {
      return null;
    }
  }
  total += current;
  return total > 0 ? total : null;
}

// 阿拉伯 / 中文混合编号归一化为层级数组，如 "2.1" → [2,1]，"十" → [10]
export function normalizeSectionNo(no: string): string {
  const parts = no
    .replace(/[第条款章节]/g, "")
    .split(/[.．、\s-]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const numeric = chineseToNumber(part);
      return numeric === null ? part : String(numeric);
    });
  return parts.join(".");
}

export function cleanHeading(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
