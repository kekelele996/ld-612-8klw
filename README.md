# 隐私政策差异对比器

隐私政策版本对比与风险标注工具：合规同事粘贴新旧两版隐私政策后，工具自动分段、按编号与标题对应章节、左右并排展示差异并保留两侧原文，对第三方共享、定位、敏感信息、长期保存条款给出**可解释**的风险等级与命中依据，并可把问题加入审阅清单、按状态跟进，最后导出含版本、风险统计和未处理事项的 Markdown 摘要。纯前端应用，数据只存浏览器 localStorage，重新打开自动恢复。

## 快速启动

```bash
cp .env.example .env && docker compose up -d
```

前端：<http://localhost:20112>

首次使用可在「文档导入」页点击 **载入旧版示例 / 载入新版示例**，一键导入两份内置隐私政策，然后到「版本对比」选择两版执行对比。

## 完整使用流程

1. **文档导入**（`/documents`）：粘贴政策正文并填写版本标签，支持 `第X条 / 第X章 / 一、 / （一） / 1. / 1.2` 等章节头，粘贴时即时自动分段并给出风险预判。
2. **版本对比**（`/compare`）：选择新旧两份文档执行对比。
   - 章节先按**编号**对应，再按**标题**对应，剩余章节做全局相似度匹配，正确处理「新版中间插入一条导致后续编号全部顺延」的情况。
   - 变化类型：新增 / 移除 / 改写 / 移动 / 未变化；改写条款左右并排、行级与行内字符差异高亮，两侧原文始终保留。
   - 命中第三方共享、定位、敏感信息、长期保存的条款在差异卡片内展示等级、命中关键词、权重分、证据句与定级理由。
3. **风险标注**（`/risks`）：按四类风险分类浏览跨版本命中，高/严重条款排在最前，可直接「追问并加入审阅清单」。
4. **审阅清单**（`/review`）：备注按 待处理 / 已确认风险 / 已忽略 / 已解决 筛选、行内编辑与状态流转；可导出 Markdown 摘要（包含版本信息、变化统计、风险统计、逐条命中依据、未处理事项）。

## 风险等级如何得出（可解释）

规则集中在 `src/constants/riskRules.ts`：

- 四类风险各自维护关键词与权重（如「精确位置」权重 4、「共享」权重 2）；
- 扫描一条条款时累计命中关键词权重得到 **score**，按各类别阈值映射为 低 / 中 / 高 / 严重；
- `CRITICAL_SIGNALS`（精确位置、行踪轨迹、生物识别、人脸、出境、永久保存、无限期、向第三方提供等）一旦命中，等级抬到**严重**；
- 每条命中同时输出：类别、命中侧（旧版/新版）、命中关键词、权重分、包含关键词的原文证据句、定级理由模板。

## 本地开发方式

- 前端：`cd frontend && npm install && npm run dev`
- 类型检查：`cd frontend && npx vue-tsc --noEmit`
- 生产构建：`cd frontend && npm run build`

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vue 3 + TypeScript + Vite + Element Plus + Pinia + vue-router |
| 后端 | 无（`src/api/*` 为本地异步数据层，读写 localStorage） |
| 数据库 | localStorage（键名见 `constants/storageKeys.ts`），内置 mock 示例在 `mocks/seedData.ts` |
| 部署 | Docker Compose（多阶段构建 + Nginx 托管 SPA） |

## 项目目录结构

```text
frontend/src/
├── api/                  # 本地异步数据层（按模型分文件）：校验、持久化、异常包装、审计日志
├── stores/               # Pinia 独立 store（文档/段落/差异/备注）
├── types/                # 数据模型与枚举类型
├── constants/            # 枚举常量、风险规则、日志模板、错误码/错误消息、状态文案、存储键
├── constructors/         # 默认对象、表单对象、持久化对象构造器
├── components/common/    # ImportPanel / DiffViewer / RiskTag / ReviewChecklist / SectionCard 等
├── hooks/                # usePolicyParser / useTextDiff / useLocalStorageState
├── pages/                # 文档导入 / 版本对比 / 风险标注 / 审阅清单 四个路由页
├── router/               # vue-router 路由表
├── services/             # 自动分段、风险扫描、章节对齐、行内差异、对比编排、摘要导出
├── utils/                # formatters / localStorage / logger / AppError / id / download
└── mocks/                # 内置新旧两版示例隐私政策
```

## 环境变量说明

- `COMPOSE_PROJECT_NAME`: Compose 项目名，默认 `policy-diff`
- `FRONTEND_PORT`: 前端端口，默认 `20112`

## Docker 部署说明

- 根 Compose 文件不写 `version`，顶层 `name: policy-diff`。
- 容器名 `${COMPOSE_PROJECT_NAME:-policy-diff}-frontend`，端口映射 `${FRONTEND_PORT:-20112}:80`。
- `frontend/Dockerfile` 为多阶段构建（node:20 构建 → nginx 托管），`nginx.conf` 配置 `try_files $uri $uri/ /index.html;` 支持 SPA 深链接。
- 纯前端无数据库卷；用户数据在浏览器 localStorage 中，更换浏览器/清除站点数据会丢失。
- 常见问题：端口占用时修改 `.env` 的 `FRONTEND_PORT` 后重启；白屏时确认是通过 Nginx/容器访问而非直接打开 `index.html`。

## 枚举/常量出现位置清单

### DiffType（ADDED / REMOVED / MODIFIED / MOVED / UNCHANGED）

- 常量与文案/颜色：`constants/DiffType.ts`；类型：`types/DiffType.ts`
- 日志模板：`constants/logTemplates.ts`（DiffResult.CREATE/COMPARE/EXPORT）
- 错误消息：`constants/errorMessages.ts`（SAME_VERSION_COMPARE 相关流程）
- 构造器：`constructors/DiffResultConstructor.ts`
- 服务：`services/sectionAlign.ts`（配对预分类）、`services/comparisonService.ts`（最终定级）、`services/exportService.ts`（变化统计）
- Store/筛选器：`stores/DiffResultStore.ts`（diffTypeCounts）、`pages/ComparePage.vue`（类型筛选 chips）
- 展示组件：`components/common/StatusBadge.vue`、`components/common/DiffViewer.vue`、`utils/formatters.ts`

### PrivacyRiskLevel（LOW / MEDIUM / HIGH / CRITICAL）

- 常量与文案/颜色/权重/处置建议：`constants/PrivacyRiskLevel.ts`；类型：`types/PrivacyRiskLevel.ts`
- 定级规则：`constants/riskRules.ts`；扫描：`services/riskScanner.ts`
- 日志模板：`constants/logTemplates.ts`（PolicySection.STATUS_CHANGE）
- 构造器：`constructors/PolicySectionConstructor.ts`、`constructors/DiffResultConstructor.ts`
- Store/筛选器：`stores/PolicySectionStore.ts`、`stores/DiffResultStore.ts`（riskyRows、报告风险统计）、`pages/ComparePage.vue` / `pages/RisksPage.vue` / `pages/ReviewPage.vue`（统计卡片与风险筛选）
- 展示组件：`components/common/RiskTag.vue`、`components/common/SectionCard.vue`、`components/common/ReviewChecklist.vue`
- 导出/格式化：`services/exportService.ts`、`utils/formatters.ts`

### ReviewStatus（OPEN / CONFIRMED / IGNORED / RESOLVED）

- 常量与文案/颜色/待处理判断：`constants/ReviewStatus.ts`；类型：`types/ReviewStatus.ts`
- 日志模板：`constants/logTemplates.ts`（ReviewNote.CREATE/UPDATE/STATUS_CHANGE/EXPORT）
- 错误消息与校验：`constants/errorMessages.ts`、`api/ReviewNote.ts`
- 构造器：`constructors/ReviewNoteConstructor.ts`
- Store/筛选器：`stores/ReviewNoteStore.ts`（statusCounts/openRows）、`components/common/ReviewChecklist.vue`（状态筛选与流转按钮）、`pages/ReviewPage.vue` / `pages/RisksPage.vue`
- 展示组件：`components/common/StatusBadge.vue`
- 导出/格式化：`services/exportService.ts`（未处理事项章节）、`utils/formatters.ts`

### 其他常量

- `constants/SectionCategory.ts`：THIRD_PARTY_SHARING / LOCATION / SENSITIVE_INFO / RETENTION / OTHER
- `constants/errorCodes.ts` + `constants/errorMessages.ts`：错误码与模板，service 与 api 两层分别包装
- `constants/storageKeys.ts`：localStorage 键名与审计日志上限

## 为什么会牵一发动全身

实体字段、枚举、日志模板、错误消息、构造器、筛选器和展示组件按职责拆散在 `types / constants / constructors / services / api / stores / hooks / components / pages` 多层并被直接引用：例如给 `DiffType` 增加一个值，需要同步常量文案与颜色、分段对齐与对比服务的判定、导出统计、store 计数、对比页筛选器、StatusBadge/DiffViewer 展示以及 README 清单。

## License

MIT
