# 隐私政策差异对比器（policy-diff）

纯前端隐私政策版本对比与风险标注工具：合规同事导入新旧两版隐私政策后，工具自动分段、按编号与标题对应条款、并排展示两侧原文并标记新增/移除/改写/移动，对第三方共享、定位、敏感信息、长期保存四类条款给出**可解释的风险等级与命中依据**，并支持按状态管理审阅备注、刷新后恢复、导出带版本/风险统计/未处理事项的 Markdown 摘要。所有数据只保存在浏览器 localStorage，不接入任何第三方 API。

## 快速启动（推荐 Docker）

```bash
cp .env.example .env && docker compose up -d
```

启动后访问：<http://localhost:20112>

首次打开会自动载入两版示例政策（v2.1 / v3.0），直接就能体验完整流程。

常用命令：

```bash
docker compose logs -f frontend   # 查看日志
docker compose down               # 停止
```

> 本项目为纯前端应用，无数据库容器；审阅数据存储在浏览器 localStorage 中，更换浏览器/清理站点数据会重置。

## 本地开发

```bash
cd frontend
npm install
npm run dev        # http://localhost:20112
npm run build      # 类型检查 + 生产构建
npm run preview    # 预览构建产物
```

## 完整业务流程

1. **文档导入** `/documents`：粘贴政策正文（标题独占一行，支持「一、」「第1条」「1. 标题」三类编号）→ 实时预览分段结果 → 导入时自动分段并跑风险引擎；可展开查看/编辑条款、删除版本。
2. **版本对比** `/compare`：选择新旧版本 → 章节先按归一化编号对应，编号变化但标题基本一致的判定为「移动」，编号与标题都对不上的拆为「移除 + 新增」→ 左右两栏保留两侧原文，字符级高亮删除/插入，并给出变化说明（增删字数、相似度）→ 可按五种变化类型过滤。
3. **风险标注** `/risks`：四类重点风险（第三方共享 / 定位信息 / 敏感信息 / 长期保存）按规则关键词命中，记录命中词、原文片段、权重与缓释词（如“单独同意”“及时删除”），分数折算后映射为 低/中/高/严重；可按等级、类目筛选，可人工覆盖等级，编辑条款后自动重评；页面顶部给出“建议优先追问”。
4. **审阅清单** `/review`：按差异条款添加备注（标签、内容、审阅人），支持按 待处理/已确认/已忽略/已处理 筛选与状态流转；一键导出 Markdown 摘要，包含版本信息、差异统计、风险统计、逐条两侧原文、未处理事项。

数据全部写入 localStorage：浏览器重新打开后文档、条款、差异、备注和选中的版本对都会恢复。

## 风险评级如何做到可解释

- 规则定义：`frontend/src/constants/riskRules.ts`，每个类目包含触发关键词（带权重）与缓释关键词。
- 引擎实现：`frontend/src/utils/riskEngine.ts`。命中关键词前后 12 字窗口内出现缓释词（如“不会”“单独同意”“最短期限”“及时删除”）时记为缓释命中、不计分；同一类目取最高有效触发权重，其余类目按 30% 折算求和（满分 100）。
- 阈值：1–39 低、40–59 中、60–79 高、80–100 严重。
- 每条条款持久化 `risk_score / risk_level / risk_hits（命中词+片段+权重+缓释）`，界面上「命中依据」可直接展开核对，也会写进导出摘要。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | Vue 3（`<script setup>`）+ TypeScript |
| 构建 | Vite |
| UI | Element Plus（中文语言包） |
| 状态管理 | Pinia（按实体拆 4 个 store） |
| 路由 | Vue Router 4（HTML5 history） |
| 数据 | localStorage（首次启动用 `mocks/seedData.ts` 注入示例） |
| 部署 | Docker Compose + Nginx 多阶段构建 |

## 项目目录结构

```text
frontend/src/
├── api/                  # 按模型分文件的 async API（localStorage 持久化）
│   ├── db.ts             # 本地数据库读写 / 首次种子注入
│   ├── PolicyDocument.ts # 导入（分段+风险标注同事务）、编辑、删除
│   ├── PolicySection.ts  # 条款编辑重评、人工风险覆盖
│   ├── DiffResult.ts     # 版本对比生成（幂等）、摘要编辑
│   └── ReviewNote.ts     # 备注 CRUD 与状态流转
├── stores/               # Pinia 独立 store（controller 层，包装 api 异常）
├── types/                # 4 个核心模型 + 枚举类型 + 风险评估类型
├── constants/            # 枚举、风险规则、日志模板、错误码/消息、状态文案、存储键
├── constructors/         # 默认/导入/表单/更新构造器，页面与 store 不散写结构
├── components/common/    # ImportPanel / DiffViewer / RiskTag / RiskEvidence /
│                         # ReviewChecklist / SectionCard / StatusBadge / StatCard / EmptyState
├── hooks/                # usePolicyParser / useTextDiff / useLocalStorageState / useDiffFilter
├── pages/                # DocumentsPage / ComparePage / RisksPage / ReviewPage
├── router/               # 路由表与侧边导航
├── utils/                # parser / textLcs / diffEngine / riskEngine / exportSummary /
│                         # storage / logger / errors / formatters / numbering / ids
└── mocks/                # 两版示例政策与首次种子构建
```

## 环境变量说明

- `COMPOSE_PROJECT_NAME`：Compose 项目名与容器名前缀，默认 `policy-diff`。
- `FRONTEND_PORT`：宿主机映射端口，默认 `20112`，容器内固定为 Nginx 80。

## Docker 部署说明

- 根目录 `docker-compose.yml`：不写 `version`，顶层 `name: policy-diff`；只编排 `frontend` 一个服务。
- 容器名：`${COMPOSE_PROJECT_NAME:-policy-diff}-frontend`；端口映射 `${FRONTEND_PORT:-20112}:80`。
- `frontend/Dockerfile` 为 Node 构建 + Nginx 托管的多阶段构建；`frontend/nginx.conf` 已配置
  `try_files $uri $uri/ /index.html;` 支持 SPA 深链接刷新。
- 纯前端无命名卷；端口占用时修改 `.env` 的 `FRONTEND_PORT` 后 `docker compose up -d`。
- 在任意目录名（含中文目录名）下均可构建启动，构建上下文只依赖 `frontend/`。
- 要重置审阅数据：在浏览器中清理站点 localStorage，或浏览器开发者工具中删除 `policy-diff:db:v1` 键。

## 核心数据模型

| 模型 | 关键字段 | 贯穿位置 |
|---|---|---|
| PolicyDocument | id, title, version_label, raw_text, normalized_sections, content_hash, section_count, imported_at | api / store / constructor / 导入页 / 对比页 / 审阅页 / 导出 |
| PolicySection | id, document_id, section_no, heading, content, category, order_index, risk_level, risk_score, risk_hits, risk_manual | api / store / constructor / parser / riskEngine / SectionCard / 风险页 |
| DiffResult | id, old/new_document_id, old/new_section_id, section_no, old/new_heading, old/new_content, diff_type, summary, risk_level, similarity | api / store / constructor / diffEngine / 对比页 / 审阅页 / 导出 |
| ReviewNote | id, diff_result_id, tag, comment, reviewer, status, created_at, updated_at | api / store / constructor / ReviewChecklist / 审阅页 / 导出 |

## 枚举/常量出现位置清单

### DiffType（ADDED / REMOVED / MODIFIED / MOVED / UNCHANGED）

- 类型：`types/DiffType.ts`；常量值/文案/色板：`constants/DiffType.ts`
- 构造与算法：`constructors/DiffResultConstructor.ts`、`utils/diffEngine.ts`（classifyPair/summarizePair）
- 日志：`constants/logTemplates.ts`（DiffResult.GENERATE/EXPORT 等，经 `utils/logger.ts` 输出）
- 错误：删除文档清理差异时使用 `constants/errorCodes.ts`、`constants/errorMessages.ts`
- store：`stores/DiffResultStore.ts`（pairStats 按五类计数）
- 筛选器：`hooks/useDiffFilter.ts`、`pages/ComparePage.vue`
- 展示组件：`components/common/StatusBadge.vue`、`components/common/DiffViewer.vue`
- 导出：`utils/exportSummary.ts`（差异统计）；格式化：`utils/formatters.ts`

### PrivacyRiskLevel（LOW / MEDIUM / HIGH / CRITICAL；另有非枚举 NONE 表示未命中）

- 类型：`types/PrivacyRiskLevel.ts`、`types/RiskAssessment.ts`、`types/RiskHit.ts`
- 常量值/文案/色板/阈值：`constants/PrivacyRiskLevel.ts`、`constants/riskRules.ts`
- 引擎与构造：`utils/riskEngine.ts`、`constructors/PolicySectionConstructor.ts`
- 日志：`logTemplates.ts`（RISK_ASSESS / RISK_OVERRIDE）
- store：`stores/PolicySectionStore.ts`
- 筛选器：`pages/RisksPage.vue`（等级筛选、统计卡）
- 展示组件：`RiskTag.vue`、`RiskEvidence.vue`、`SectionCard.vue`、`DiffViewer.vue`
- 导出：`utils/exportSummary.ts`（风险统计 + 优先追问）；格式化：`utils/formatters.ts`

### ReviewStatus（OPEN / CONFIRMED / IGNORED / RESOLVED）

- 类型：`types/ReviewStatus.ts`；常量值/文案/色板：`constants/ReviewStatus.ts`
- 构造：`constructors/ReviewNoteConstructor.ts`
- 日志：`logTemplates.ts`（CREATE/STATUS_CHANGE/EXPORT）
- 错误：`NOTE_INVALID`（errorCodes / errorMessages）
- store：`stores/ReviewNoteStore.ts`（statusStats、openItems）
- 筛选器：`ReviewChecklist.vue`、`pages/ReviewPage.vue`
- 展示组件：`StatusBadge.vue`
- 导出：`utils/exportSummary.ts`（未处理事项 = OPEN + CONFIRMED）；格式化：`utils/formatters.ts`

### RiskCategory（THIRD_PARTY_SHARING / LOCATION / SENSITIVE_INFO / LONG_RETENTION）

- 类型：`types/RiskCategory.ts`；常量：`constants/RiskCategory.ts`；规则：`constants/riskRules.ts`
- 贯穿：riskEngine → PolicySectionConstructor → Section 字段 → RiskEvidence / RisksPage 筛选与统计 → exportSummary。

## 为什么修改一处会牵动多个文件

项目刻意按“枚举/常量 / 类型 / 构造器 / 日志 / 错误 / store(controller) / api(service) / hook / 组件 / 页面 / 导出”分层：

- 新增一个差异类型或风险等级，需要同步类型、常量文案与色板、diffEngine/riskEngine 分类逻辑、store 统计、筛选器、展示徽标、导出摘要和 README 清单。
- 新增一个风险规则关键词只改 `riskRules.ts`，但结果会同时影响导入时标注、风险页统计、对比页标签、审阅导出。
- 所有写操作都经过 `utils/logger.ts` 的集中模板，错误经 `errors.ts`（service）与 store（controller）两层包装，文案集中在 `errorMessages.ts`。
- 日期、数字、相似度、四类枚举文案统一混入 `utils/formatters.ts`，多个页面和导出共同依赖。

## License

MIT
