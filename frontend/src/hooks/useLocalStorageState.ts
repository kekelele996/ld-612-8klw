import { ref, watch, type Ref } from "vue";

/**
 * 通用 localStorage 响应式状态：审阅页的筛选条件等界面偏好使用，
 * 业务数据（文档/差异/备注）仍由各 store 经 api 层持久化。
 */
export function useLocalStorageState<T>(key: string, initial: T): {
  state: Ref<T>;
  reset: () => void;
} {
  const read = (): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  };

  const state = ref(read()) as Ref<T>;

  watch(
    state,
    (value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // 配额不足时保留内存态，不阻断审阅
      }
    },
    { deep: true }
  );

  const reset = () => {
    state.value = initial;
    localStorage.removeItem(key);
  };

  return { state, reset };
}
