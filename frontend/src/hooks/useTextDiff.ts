import { computed, ref } from "vue";
import { diffLines, type LineDiffResult } from "../services/lineDiff";

/** 行内差异 hook：DiffViewer 与导入预览的“试对比”共用 */
export function useTextDiff(oldText: string, newText: string) {
  const oldInput = ref(oldText);
  const newInput = ref(newText);
  const result = ref<LineDiffResult | null>(null);

  const run = (left?: string, right?: string): LineDiffResult => {
    if (left !== undefined) oldInput.value = left;
    if (right !== undefined) newInput.value = right;
    result.value = diffLines(oldInput.value, newInput.value);
    return result.value;
  };

  const hasChange = computed(() => {
    if (!result.value) return oldInput.value !== newInput.value;
    return result.value.insertedLineCount + result.value.deletedLineCount > 0;
  });

  return { oldInput, newInput, result, hasChange, run };
}
