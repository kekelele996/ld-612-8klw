import type { ErrorCode } from "./errorCodes";

// 错误消息模板：与 errorCodes 一一对应，新增错误码须同步此处与调用处包装逻辑。
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_FAILED: "表单字段缺失或格式错误",
  IMPORT_EMPTY: "请粘贴隐私政策正文后再导入",
  PARSE_NO_SECTION: "未能识别出任何条款标题，请使用“一、”“第1条”或“1.标题”格式",
  SAME_DOCUMENT: "请选择两版不同的政策进行对比",
  SECTION_NOT_FOUND: "未找到对应的条款段落",
  NOTE_INVALID: "备注内容不能为空，且必须关联一条差异",
  PAIR_NOT_FOUND: "当前版本对还没有对比结果，请先生成版本对比",
  STORAGE_UNAVAILABLE: "浏览器本地存储不可用，刷新后无法恢复数据",
  EXPORT_FAILED: "摘要导出失败，请重试"
};
