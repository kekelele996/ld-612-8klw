<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { ElMessage } from "element-plus";
import { Right } from "@element-plus/icons-vue";
import DiffViewer from "../components/common/DiffViewer.vue";
import ReviewChecklist from "../components/common/ReviewChecklist.vue";
import EmptyState from "../components/common/EmptyState.vue";
import StatCard from "../components/common/StatCard.vue";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { useDiffResultStore } from "../stores/DiffResultStore";
import { useReviewNoteStore } from "../stores/ReviewNoteStore";
import { DiffType, DiffTypeText, DiffTypeColor, type DiffTypeValue } from "../constants/DiffType";
import { PrivacyRiskLevel, PrivacyRiskLevelText, PrivacyRiskLevelWeight } from "../constants/PrivacyRiskLevel";
import { isAppError } from "../utils/AppError";
import type { ReviewNote } from "../types/ReviewNote";

const documentStore = usePolicyDocumentStore();
const diffStore = useDiffResultStore();
const noteStore = useReviewNoteStore();

const { sorted } = storeToRefs(documentStore);
const { rows, oldDocumentId, newDocumentId, loading, error } = storeToRefs(diffStore);

const oldId = ref<number | null>(oldDocumentId.value);
const newId = ref<number | null>(newDocumentId.value);
const typeFilter = ref<Set<DiffTypeValue>>(new Set());
const onlyRisk = ref(false);
const pendingDraft = ref<{ diffId: number; tag: ReviewNote["tag"] } | null>(null);

onMounted(async () => {
  await Promise.all([documentStore.load(), noteStore.load()]);
  diffStore.setSelection(oldId.value, newId.value);
  await diffStore.restorePair();
  if (rows.value.length === 0 && sorted.value.length >= 2) {
    // 默认推荐最近两份，但不自动执行对比
    const [latest, previous] = sorted.value;
    newId.value = latest.id;
    oldId.value = previous.id;
  }
});

const oldDocument = computed(() => sorted.value.find((doc) => doc.id === oldId.value) ?? null);
const newDocument = computed(() => sorted.value.find((doc) => doc.id === newId.value) ?? null);
const canCompare = computed(
  () => oldDocument.value !== null && newDocument.value !== null && oldId.value !== newId.value
);

const runCompare = async () => {
  if (!oldDocument.value || !newDocument.value) return;
  try {
    await diffStore.compare(oldDocument.value, newDocument.value);
    typeFilter.value = new Set();
    onlyRisk.value = false;
  } catch (err) {
    ElMessage.error(isAppError(err) ? err.message : "对比失败");
  }
};

const diffTypeCounts = computed(() => diffStore.diffTypeCounts);

const filteredRows = computed(() =>
  rows.value.filter((item) => {
    if (typeFilter.value.size > 0 && !typeFilter.value.has(item.diff_type)) return false;
    if (onlyRisk.value && item.risks.length === 0) return false;
    return true;
  })
);

const riskCount = (level: (typeof PrivacyRiskLevel)[number]) =>
  rows.value.filter((item) => item.risk_level === level).length;

const toggleType = (type: DiffTypeValue) => {
  if (typeFilter.value.has(type)) typeFilter.value.delete(type);
  else typeFilter.value.add(type);
  typeFilter.value = new Set(typeFilter.value);
};

const notesOf = (diffId: number) => noteStore.byDiff(diffId);

const onAddNote = (payload: { diffId: number; tag: ReviewNote["tag"] }) => {
  pendingDraft.value = payload;
  ElMessage.success("已在下方审阅清单中打开备注框，填写问题后加入清单");
};

const createNote = async (draft: {
  diff_result_id: number;
  tag: ReviewNote["tag"];
  comment: string;
  reviewer: string;
}) => {
  try {
    await noteStore.add(draft);
    pendingDraft.value = null;
    ElMessage.success("已加入审阅清单（待处理）");
  } catch (err) {
    ElMessage.error(isAppError(err) ? err.message : "添加失败");
  }
};
</script>

<template>
  <div class="compare-page">
    <section class="panel selector">
      <h2>选择对比版本</h2>
      <div class="select-row">
        <label>
          <span>旧版</span>
          <el-select v-model="oldId" placeholder="选择旧版政策" clearable>
            <el-option
              v-for="doc in sorted"
              :key="doc.id"
              :label="`${doc.title}（${doc.version_label}）`"
              :value="doc.id"
              :disabled="doc.id === newId"
            />
          </el-select>
        </label>
        <el-icon class="arrow"><Right /></el-icon>
        <label>
          <span>新版</span>
          <el-select v-model="newId" placeholder="选择新版政策" clearable>
            <el-option
              v-for="doc in sorted"
              :key="doc.id"
              :label="`${doc.title}（${doc.version_label}）`"
              :value="doc.id"
              :disabled="doc.id === oldId"
            />
          </el-select>
        </label>
        <el-button type="primary" :loading="loading" :disabled="!canCompare" @click="runCompare">
          开始对比
        </el-button>
      </div>
      <el-alert v-if="error" :title="error" type="error" :closable="false" />
      <p v-if="sorted.length < 2" class="hint">
        至少需要在「文档导入」中导入两份政策，才能进行版本对比。
      </p>
    </section>

    <template v-if="rows.length > 0">
      <section class="metrics">
        <StatCard
          v-for="type in ['ADDED', 'REMOVED', 'MODIFIED', 'MOVED']"
          :key="type"
          :label="DiffTypeText[type as DiffTypeValue]"
          :value="diffTypeCounts[type] ?? 0"
          :tone="type === 'REMOVED' ? 'danger' : type === 'MODIFIED' ? 'warn' : type === 'MOVED' ? 'info' : ''"
        />
      </section>

      <section class="risk-strip panel">
        <h2>风险等级分布（高/严重条款建议优先追问）</h2>
        <div class="risk-chips">
          <button
            v-for="level in [...PrivacyRiskLevel].reverse()"
            :key="level"
            class="risk-chip"
            :class="{ active: onlyRisk }"
            @click="onlyRisk = !onlyRisk"
          >
            <span class="dot" :style="{ background: PrivacyRiskLevelWeight[level] >= PrivacyRiskLevelWeight.HIGH ? '#c01048' : '#667085' }" />
            {{ PrivacyRiskLevelText[level] }} {{ riskCount(level) }}
          </button>
        </div>
      </section>

      <section class="panel filters">
        <h2>差异筛选</h2>
        <div class="type-filters">
          <button
            v-for="type in DiffType"
            :key="type"
            class="chip"
            :class="{ active: typeFilter.has(type) }"
            @click="toggleType(type)"
          >
            <span class="swatch" :style="{ background: DiffTypeColor[type] }" />
            {{ DiffTypeText[type] }} {{ diffTypeCounts[type] ?? 0 }}
          </button>
        </div>
        <el-checkbox v-model="onlyRisk">只看命中风险（第三方共享 / 定位 / 敏感信息 / 长期保存）</el-checkbox>
      </section>

      <section class="diff-list">
        <EmptyState
          v-if="filteredRows.length === 0"
          title="当前筛选下没有条款"
          description="试着取消差异类型筛选或关闭“只看命中风险”"
        />
        <div v-for="diff in filteredRows" :id="`diff-${diff.id}`" :key="diff.id">
          <DiffViewer
            :diff="diff"
            :old-label="`旧版：${oldDocument?.version_label ?? ''}`"
            :new-label="`新版：${newDocument?.version_label ?? ''}`"
            :notes="notesOf(diff.id)"
            @add-note="onAddNote"
          />
        </div>
      </section>

      <section v-if="pendingDraft" class="panel draft-panel">
        <ReviewChecklist
          :notes="[]"
          :pending-draft="pendingDraft"
          @create="createNote"
        />
      </section>
    </template>

    <EmptyState
      v-else
      title="尚未生成对比结果"
      description="选择新旧两版政策后点击“开始对比”，章节会先按编号、再按标题自动对应"
    />
  </div>
</template>

<style scoped>
.compare-page { display: grid; gap: 18px; }
.panel { background: #fbfaf4; border: 1px solid #d8d6c8; border-radius: 10px; padding: 18px 20px; }
.panel h2 { margin: 0 0 12px; font-size: 16px; color: #274335; }
.select-row { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
.select-row label { display: grid; gap: 6px; font-size: 13px; color: #4a5248; flex: 1; min-width: 220px; }
.arrow { font-size: 22px; color: #7d4d18; padding-bottom: 8px; }
.hint { margin: 10px 0 0; color: #b54708; font-size: 13px; }
.metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.risk-chips, .type-filters { display: flex; gap: 8px; flex-wrap: wrap; }
.risk-chip, .chip {
  display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid #c9c2b2; background: #fff; color: #4a5248;
  border-radius: 999px; padding: 5px 14px; font-size: 13px; cursor: pointer;
}
.chip.active, .risk-chip.active { background: #274335; color: #f5f1e6; border-color: #274335; }
.swatch, .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.filters { display: grid; gap: 10px; }
.diff-list { display: grid; gap: 12px; }
.draft-panel { border-style: dashed; }
@media (max-width: 900px) { .metrics { grid-template-columns: repeat(2, 1fr); } }
</style>
