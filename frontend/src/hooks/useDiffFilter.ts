import { computed, ref, toValue, type MaybeRefOrGetter } from "vue";
import type { DiffResult } from "../types/DiffResult";
import type { DiffType } from "../types/DiffType";

// 对比页/审阅页共用：按差异类型过滤差异行
export function useDiffFilter(rowsSource: MaybeRefOrGetter<DiffResult[]>) {
  const activeTypes = ref<DiffType[]>([]);

  const filtered = computed(() => {
    const rows = toValue(rowsSource);
    return activeTypes.value.length === 0
      ? rows
      : rows.filter((row) => activeTypes.value.includes(row.diff_type));
  });

  const toggleType = (type: DiffType) => {
    activeTypes.value = activeTypes.value.includes(type)
      ? activeTypes.value.filter((item) => item !== type)
      : [...activeTypes.value, type];
  };

  const resetFilter = () => {
    activeTypes.value = [];
  };

  return { activeTypes, filtered, toggleType, resetFilter };
}
