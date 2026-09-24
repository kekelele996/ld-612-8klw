export interface TextSegment {
  type: "equal" | "insert" | "delete";
  text: string;
}

// 字符级最长公共子序列，用于两侧原文的行内高亮
function lcsTable(a: string, b: string): number[][] {
  const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  return table;
}

export function diffChars(oldText: string, newText: string): TextSegment[] {
  const table = lcsTable(oldText, newText);
  const segments: TextSegment[] = [];
  let i = 0;
  let j = 0;
  const push = (type: TextSegment["type"], text: string) => {
    if (!text) return;
    const last = segments[segments.length - 1];
    if (last && last.type === type) last.text += text;
    else segments.push({ type, text });
  };
  while (i < oldText.length && j < newText.length) {
    if (oldText[i] === newText[j]) {
      push("equal", oldText[i]);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      push("delete", oldText[i]);
      i += 1;
    } else {
      push("insert", newText[j]);
      j += 1;
    }
  }
  if (i < oldText.length) push("delete", oldText.slice(i));
  if (j < newText.length) push("insert", newText.slice(j));
  return segments;
}

// 相似度：LCS 长度 / 较长串长度，用于区分大幅改写还是小幅调整
export function similarity(oldText: string, newText: string): number {
  if (!oldText && !newText) return 1;
  const table = lcsTable(oldText, newText);
  const longest = Math.max(oldText.length, newText.length) || 1;
  return table[0][0] / longest;
}

export function countChanged(segments: TextSegment[]): { inserted: number; deleted: number } {
  return segments.reduce(
    (acc, segment) => {
      if (segment.type === "insert") acc.inserted += segment.text.length;
      if (segment.type === "delete") acc.deleted += segment.text.length;
      return acc;
    },
    { inserted: 0, deleted: 0 }
  );
}
