import { ref, watch, type Ref } from "vue";
import { readUiState, writeUiState } from "../utils/storage";

// 通用“偏好状态 + localStorage 恢复”：筛选器、表单草稿、选中版本对等
// 浏览器重新打开后自动恢复；key 需要在各调用方保持唯一。
export function useLocalStorageState<T extends object>(key: string, defaultValue: T): {
  state: Ref<T>;
  reset: () => void;
} {
  const initial = readUiState<Record<string, unknown>>({});
  const restored = key in initial ? (initial[key] as T) : defaultValue;
  const state = ref(restored) as Ref<T>;

  watch(
    state,
    (value) => {
      const all = readUiState<Record<string, unknown>>({});
      all[key] = value;
      writeUiState(all);
    },
    { deep: true }
  );

  const reset = () => {
    state.value = JSON.parse(JSON.stringify(defaultValue)) as T;
  };

  return { state, reset };
}
