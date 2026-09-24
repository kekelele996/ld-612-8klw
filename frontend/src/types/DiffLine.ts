/** 一行正文及其行内差异标记（字符区间，左闭右开） */
export interface DiffMark {
  start: number;
  end: number;
  type: "ins" | "del";
}

export interface DiffLine {
  text: string;
  marks: DiffMark[];
}
