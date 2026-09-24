import type { PolicyDocument, PolicyDocumentImport } from "../types/PolicyDocument";
import { nextId } from "../utils/id";

/** 默认对象（store 占位/空态使用） */
export const createDefaultPolicyDocument = (): PolicyDocument => ({
  id: 0,
  title: "",
  version_label: "",
  raw_text: "",
  normalized_sections: [],
  imported_at: ""
});

/** 导入表单对象 */
export const createPolicyDocumentForm = (): PolicyDocumentImport => ({
  title: "",
  version_label: "",
  raw_text: ""
});

/** 导入请求 → 持久化对象（自动分段结果由解析服务注入） */
export const buildPolicyDocument = (
  form: PolicyDocumentImport,
  normalizedSections: PolicyDocument["normalized_sections"]
): PolicyDocument => ({
  id: nextId(),
  title: form.title.trim() || "未命名隐私政策",
  version_label: form.version_label.trim(),
  raw_text: form.raw_text,
  normalized_sections: normalizedSections,
  imported_at: new Date().toISOString()
});

export const createPolicyDocumentResponse = createDefaultPolicyDocument;
