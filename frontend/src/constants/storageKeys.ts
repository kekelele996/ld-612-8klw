// localStorage 键位：业务数据库与界面偏好分开存放，升级结构时只迁移 DB
export const STORAGE_KEYS = {
  DB: "policy-diff:db:v1",
  UI: "policy-diff:ui:v1"
} as const;
