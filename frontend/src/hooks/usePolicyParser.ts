import { computed, ref } from "vue";
import { parsePolicyText, type ParseOutcome } from "../services/policyParser";
import { scanSection } from "../services/riskScanner";
import { summarizeSectionRisk } from "../constructors/PolicySectionConstructor";
import { isAppError } from "../utils/AppError";

/** 导入面板即时预览：粘贴文本后自动分段并做风险预扫描，不落库 */
export function usePolicyParser() {
  const rawText = ref("");
  const parseError = ref("");
  const outcome = ref<ParseOutcome | null>(null);

  const parse = (text: string) => {
    rawText.value = text;
    if (!text.trim()) {
      outcome.value = null;
      parseError.value = "";
      return;
    }
    try {
      outcome.value = parsePolicyText(text);
      parseError.value = "";
    } catch (error) {
      outcome.value = null;
      parseError.value = isAppError(error) ? error.message : "解析失败";
    }
  };

  const previewSections = computed(() => {
    if (!outcome.value) return [];
    return outcome.value.sections.map((section) => {
      const hits = scanSection(section, "new");
      return { ...section, risk: summarizeSectionRisk(hits), hits };
    });
  });

  return {
    rawText,
    parseError,
    preamble: computed(() => outcome.value?.preamble ?? ""),
    previewSections,
    sectionCount: computed(() => outcome.value?.sections.length ?? 0),
    parse
  };
}
