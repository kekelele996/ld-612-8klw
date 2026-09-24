/**
 * 日志模板集中位置。每个实体至少 4 条（创建/更新/状态变更/导出），
 * 所有写操作经 utils/logger 包装记录；字段变更时必须同步本文件与调用处。
 */
export const LOG_TEMPLATES = {
  PolicyDocument: {
    CREATE: "政策文档创建：#{id}《{title}》版本 {version_label}",
    UPDATE: "政策文档更新：#{id}《{title}》变更字段 {fields}",
    STATUS_CHANGE: "政策文档状态变更：#{id} {from} → {to}",
    EXPORT: "政策文档导出：#{id}，共 {sections} 个分段",
    DELETE: "政策文档删除：#{id}《{title}》"
  },
  PolicySection: {
    CREATE: "条款段落创建：文档 #{document_id} 编号 {section_no}《{heading}》",
    UPDATE: "条款段落更新：#{id}《{heading}》变更字段 {fields}",
    STATUS_CHANGE: "条款段落风险等级变更：#{id} {from} → {to}",
    EXPORT: "条款段落导出：文档 #{document_id} 共 {count} 条"
  },
  DiffResult: {
    CREATE: "差异结果创建：{old} → {new}，{diff_type} {section}",
    UPDATE: "差异结果更新：#{id} 变更字段 {fields}",
    STATUS_CHANGE: "差异结果复核状态变更：#{id} {from} → {to}",
    EXPORT: "差异结果导出：对比 {old} → {new}，共 {count} 条",
    COMPARE: "版本对比执行：{old} → {new}，新增 {added} / 移除 {removed} / 改写 {modified} / 移动 {moved}"
  },
  ReviewNote: {
    CREATE: "审阅备注创建：差异 #{diff_result_id} 标签 {tag} 处理人 {reviewer}",
    UPDATE: "审阅备注更新：#{id} 变更字段 {fields}",
    STATUS_CHANGE: "审阅备注状态变更：#{id} {from} → {to}",
    EXPORT: "审阅备注导出：未处理 {open} 条 / 共 {total} 条"
  }
} as const;

export type LogEntity = keyof typeof LOG_TEMPLATES;
export type LogAction<E extends LogEntity> = keyof (typeof LOG_TEMPLATES)[E];
