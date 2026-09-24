import { computed, ref } from "vue";
import { parsePolicyText, type ParseResult } from "../utils/parser";
import { assessRisk } from "../utils/riskEngine";
import { PolicyDiffError } from "../utils/errors";

export interface ParserPreview {
  preamble: string;
  sections: ReturnType<typeof parsePolicyText>["sections"];
  valid: boolean;
}

// 导入页使用：粘贴文本时实时预览自动分段与风险预判，不落库
export function usePolicyParser() {
  const rawText = ref("");
  const error = ref("");

  const preview = computed<ParserPreview>(() => {
    if (!rawText.value.trim()) {
      return { preamble: "", sections: [], valid: false };
    }
    try {
      const result: ParseResult = parsePolicyText(rawText.value);
      error.value = "";
      return { ...result, valid: result.sections.length > 0 };
    } catch {
      error.value = "分段解析失败，请检查文本格式";
      return { preamble: "", sections: [], valid: false };
    }
  });

  const sectionCount = computed(() => preview.value.sections.length);

  // 导入前校验，错误抛给 store/api 的统一包装
  const ensureParsable = () => {
    if (!rawText.value.trim()) throw new PolicyDiffError("IMPORT_EMPTY");
    if (!preview.value.valid) throw new PolicyDiffError("PARSE_NO_SECTION");
  };

  const previewRiskFor = (content: string, heading = "") => assessRisk(content, heading);

  const reset = () => {
    rawText.value = "";
    error.value = "";
  };

  return { rawText, preview, sectionCount, error, ensureParsable, previewRiskFor, reset };
}
