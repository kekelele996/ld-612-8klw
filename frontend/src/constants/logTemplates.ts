// 日志模板集中存放：所有写操作经 utils/logger 调用对应模板。
// 字段或动作变更时必须同步修改模板与调用处（store / api / hooks）。
export const LOG_TEMPLATES = {
  PolicyDocument: {
    CREATE: "政策文档创建：title={title}, version={version}",
    UPDATE: "政策文档更新：id={id}, fields={fields}",
    DELETE: "政策文档删除：id={id}",
    IMPORT: "政策文档导入：title={title}, version={version}, sections={sections}",
    EXPORT: "政策文档参与摘要导出：ids={ids}"
  },
  PolicySection: {
    CREATE: "条款段落创建：document_id={documentId}, no={sectionNo}",
    UPDATE: "条款段落更新：id={id}, fields={fields}",
    DELETE: "条款段落删除：id={id}",
    PARSE: "自动分段完成：document_id={documentId}, count={count}",
    RISK_ASSESS: "风险自动标注：section_id={sectionId}, level={level}, score={score}",
    RISK_OVERRIDE: "风险等级人工调整：section_id={sectionId}, from={from}, to={to}"
  },
  DiffResult: {
    CREATE: "差异结果创建：id={id}, type={type}",
    UPDATE: "差异结果更新：id={id}, fields={fields}",
    DELETE: "差异结果删除：id={id}",
    GENERATE: "版本对比生成：old={oldId}, new={newId}, total={total}",
    EXPORT: "差异结果参与摘要导出：pair={pairId}, total={total}"
  },
  ReviewNote: {
    CREATE: "审阅备注创建：diff_id={diffId}, status={status}, reviewer={reviewer}",
    UPDATE: "审阅备注更新：id={id}, fields={fields}",
    STATUS_CHANGE: "审阅备注状态变更：id={id}, from={from}, to={to}",
    DELETE: "审阅备注删除：id={id}",
    EXPORT: "审阅清单摘要导出：open={open}, total={total}"
  }
} as const;

export type LogEntity = keyof typeof LOG_TEMPLATES;
