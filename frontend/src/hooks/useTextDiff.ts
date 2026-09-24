import { computed } from "vue";
import { diffChars, similarity, countChanged, type TextSegment } from "../utils/textLcs";

// 对比视图使用：两侧原文行内高亮片段 + 相似度 + 增删字数
export function useTextDiff(oldText: () => string, newText: () => string) {
  const segments = computed<TextSegment[]>(() => diffChars(oldText(), newText()));
  const ratio = computed(() => similarity(oldText(), newText()));
  const changed = computed(() => countChanged(segments.value));

  return { segments, ratio, changed };
}
