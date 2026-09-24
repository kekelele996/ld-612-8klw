import { ERROR_CODES } from "./errorCodes";

/** 错误消息模板集中位置，占位符由 service 层填充 */
export const ERROR_MESSAGES: Record<(typeof ERROR_CODES)[keyof typeof ERROR_CODES], string> = {
  VALIDATION_FAILED: "表单字段缺失或格式错误：{field}",
  PARSE_FAILED: "政策文本解析失败：{reason}",
  DOCUMENT_NOT_FOUND: "找不到政策文档 #{id}",
  SECTION_NOT_FOUND: "找不到条款段落 #{id}",
  DIFF_NOT_FOUND: "找不到差异结果 #{id}",
  REVIEW_NOTE_NOT_FOUND: "找不到审阅备注 #{id}",
  DUPLICATE_VERSION: "已存在版本标签为 {version_label} 的文档，请先删除旧版本",
  SAME_VERSION_COMPARE: "新旧版本不能选择同一份文档（#{id}）",
  STORAGE_UNAVAILABLE: "浏览器本地存储不可用：{reason}，刷新后数据可能无法恢复",
  EXPORT_FAILED: "导出摘要失败：{reason}"
};
