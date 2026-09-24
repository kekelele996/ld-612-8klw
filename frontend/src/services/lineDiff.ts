import type { DiffLine, DiffMark } from "../types/DiffLine";

type Op = "equal" | "insert" | "delete" | "replace";

interface RowOp {
  op: Op;
  oldText: string | null;
  newText: string | null;
}

/** 行级 LCS，返回成对的行操作；replace 时保留左右两侧原行 */
const lcsRows = (oldLines: string[], newLines: string[]): RowOp[] => {
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] = oldLines[i] === newLines[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const rows: RowOp[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      rows.push({ op: "equal", oldText: oldLines[i], newText: newLines[j] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      // 尝试与下一插入行配对为 replace（同位置左删右增），减少“整段飘红”
      if (oldLines[i] !== newLines[j] && dp[i][j + 1] === dp[i + 1][j]) {
        rows.push({ op: "replace", oldText: oldLines[i], newText: newLines[j] });
        i += 1;
        j += 1;
      } else {
        rows.push({ op: "delete", oldText: oldLines[i], newText: null });
        i += 1;
      }
    } else {
      rows.push({ op: "insert", oldText: null, newText: newLines[j] });
      j += 1;
    }
  }
  while (i < m) {
    rows.push({ op: "delete", oldText: oldLines[i], newText: null });
    i += 1;
  }
  while (j < n) {
    rows.push({ op: "insert", oldText: null, newText: newLines[j] });
    j += 1;
  }
  return rows;
};

/** 字符级 LCS，标出一行内真正变化的区间 */
const charMarks = (oldText: string, newText: string): { oldMarks: DiffMark[]; newMarks: DiffMark[] } => {
  const m = oldText.length;
  const n = newText.length;
  if (m + n > 1200) return { oldMarks: [], newMarks: [] };
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] = oldText[i] === newText[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const oldMarks: DiffMark[] = [];
  const newMarks: DiffMark[] = [];
  let i = 0;
  let j = 0;
  let delStart = -1;
  let insStart = -1;
  const flush = () => {
    if (delStart >= 0) {
      oldMarks.push({ start: delStart, end: i, type: "del" });
      delStart = -1;
    }
    if (insStart >= 0) {
      newMarks.push({ start: insStart, end: j, type: "ins" });
      insStart = -1;
    }
  };
  while (i < m && j < n) {
    if (oldText[i] === newText[j]) {
      flush();
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      if (delStart < 0) delStart = i;
      i += 1;
    } else {
      if (insStart < 0) insStart = j;
      j += 1;
    }
  }
  if (i < m && delStart < 0) delStart = i;
  if (j < n && insStart < 0) insStart = j;
  flush();
  return { oldMarks, newMarks };
};

export interface LineDiffResult {
  oldLines: DiffLine[];
  newLines: DiffLine[];
  insertedLineCount: number;
  deletedLineCount: number;
}

/** 保留两侧原文：左侧全部带删除视角，右侧全部带新增视角，空行占位对齐 */
export const diffLines = (oldText: string, newText: string): LineDiffResult => {
  const split = (text: string) => text.replace(/\r\n?/g, "\n").split("\n");
  const oldSource = split(oldText);
  const newSource = split(newText);
  const ops = lcsRows(oldSource, newSource);

  const oldLines: DiffLine[] = [];
  const newLines: DiffLine[] = [];
  let insertedLineCount = 0;
  let deletedLineCount = 0;

  for (const row of ops) {
    if (row.op === "equal") {
      oldLines.push({ text: row.oldText ?? "", marks: [] });
      newLines.push({ text: row.newText ?? "", marks: [] });
    } else if (row.op === "insert") {
      oldLines.push({ text: "", marks: [] });
      newLines.push({ text: row.newText ?? "", marks: [{ start: 0, end: (row.newText ?? "").length, type: "ins" }] });
      insertedLineCount += 1;
    } else if (row.op === "delete") {
      oldLines.push({ text: row.oldText ?? "", marks: [{ start: 0, end: (row.oldText ?? "").length, type: "del" }] });
      newLines.push({ text: "", marks: [] });
      deletedLineCount += 1;
    } else {
      const { oldMarks, newMarks } = charMarks(row.oldText ?? "", row.newText ?? "");
      oldLines.push({
        text: row.oldText ?? "",
        marks: oldMarks.length > 0 ? oldMarks : [{ start: 0, end: (row.oldText ?? "").length, type: "del" }]
      });
      newLines.push({
        text: row.newText ?? "",
        marks: newMarks.length > 0 ? newMarks : [{ start: 0, end: (row.newText ?? "").length, type: "ins" }]
      });
      insertedLineCount += 1;
      deletedLineCount += 1;
    }
  }
  return { oldLines, newLines, insertedLineCount, deletedLineCount };
};
