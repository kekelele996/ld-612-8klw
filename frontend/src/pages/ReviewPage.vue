<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { ElMessage } from "element-plus";
import ReviewChecklist from "../components/common/ReviewChecklist.vue";
import DiffViewer from "../components/common/DiffViewer.vue";
import EmptyState from "../components/common/EmptyState.vue";
import StatCard from "../components/common/StatCard.vue";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import { useDiffResultStore } from "../stores/DiffResultStore";
import { useReviewNoteStore } from "../stores/ReviewNoteStore";
import { buildReviewSummary, downloadMarkdown } from "../utils/exportSummary";
import { log } from "../utils/logger";
import type { ReviewStatus } from "../types/ReviewStatus";
import type { ReviewNote } from "../types/ReviewNote";

const documentStore = usePolicyDocumentStore();
const sectionStore = usePolicySectionStore();
const diffStore = useDiffResultStore();
const noteStore = useReviewNoteStore();

const { selectedOldId, selectedNewId } = storeToRefs(documentStore);
const oldId = ref(selectedOldId.value);
const newId = ref(selectedNewId.value);
watch(selectedOldId, (value) => {
  if (value && !oldId.value) oldId.value = value;
});
watch(selectedNewId, (value) => {
  if (value && !newId.value) newId.value = value;
});
watch([oldId, newId], ([o, n]) => documentStore.selectPair(o, n));

const statusFilter = ref<ReviewStatus | "">("OPEN");
const selectedDiffId = ref<number>(0);

const pairDiffs = computed(() => diffStore.byPair(oldId.value, newId.value));
const oldDoc = computed(() => documentStore.getById(oldId.value));
const newDoc = computed(() => documentStore.getById(newId.value));

const pairNoteIds = computed(() => new Set(pairDiffs.value.map((diff) => diff.id)));
const pairNotes = computed(() => noteStore.rows.filter((note) => pairNoteIds.value.has(note.diff_result_id)));
const visibleNotes = computed(() =>
  statusFilter.value ? pairNotes.value.filter((note) => note.status === statusFilter.value) : pairNotes.value
);

const selectedDiff = computed(() => pairDiffs.value.find((diff) => diff.id === selectedDiffId.value) ?? null);
const selectedDiffNotes = computed(() => (selectedDiff.value ? noteStore.byDiff(selectedDiff.value.id) : []));

const stats = computed(() => {
  const counts = { OPEN: 0, CONFIRMED: 0, IGNORED: 0, RESOLVED: 0 } as Record<ReviewStatus, number>;
  pairNotes.value.forEach((note) => {
    counts[note.status] += 1;
  });
  return counts;
});

const selectDiff = (id: number) => {
  selectedDiffId.value = selectedDiffId.value === id ? 0 : id;
};

const sectionMap = computed(() => new Map(sectionStore.rows.map((section) => [section.id, section])));

const onCreate = async (input: { diff_result_id: number; tag: string; comment: string; reviewer: string }) => {
  await noteStore.create(input);
};
const onUpdate = async (id: number, patch: Partial<Pick<ReviewNote, "tag" | "comment" | "reviewer">>) => {
  await noteStore.update(id, patch);
};
const onStatus = async (id: number, status: ReviewStatus) => {
  await noteStore.setStatus(id, status);
};
const onDelete = async (id: number) => {
  await noteStore.remove(id);
};

const noteCountOf = (diffId: number) => pairNotes.value.filter((note) => note.diff_result_id === diffId).length;
const openCountOf = (diffId: number) =>
  pairNotes.value.filter((note) => note.diff_result_id === diffId && (note.status === "OPEN" || note.status === "CONFIRMED")).length;

const exportSummary = () => {
  if (!oldDoc.value || !newDoc.value) {
    ElMessage.error("请先选择要导出的版本对");
    return;
  }
  try {
    const markdown = buildReviewSummary({
      oldDocument: oldDoc.value,
      newDocument: newDoc.value,
      diffs: pairDiffs.value,
      sections: sectionStore.rows,
      notes: pairNotes.value
    });
    const filename = `隐私政策审阅摘要_${newDoc.value.version_label.replace(/[\\/:*?"<>|（）()\s]+/g, "_")}.md`;
    downloadMarkdown(markdown, filename);
    log("ReviewNote", "EXPORT", { open: stats.value.OPEN + stats.value.CONFIRMED, total: pairNotes.value.length });
    log("DiffResult", "EXPORT", { pairId: `${oldId.value}-${newId.value}`, total: pairDiffs.value.length });
    log("PolicyDocument", "EXPORT", { ids: `${oldId.value},${newId.value}` });
    ElMessage.success("审阅摘要已导出");
  } catch (error) {
    ElMessage.error((error as Error).message || "导出失败");
  }
};
</script>

<template>
  <section>
    <header class="page-head">
      <h1>审阅清单</h1>
      <p>按状态筛选和更新备注，关闭浏览器再打开数据仍在；可导出含版本、风险统计和未处理事项的 Markdown 摘要。</p>
    </header>

    <div class="page-toolbar">
      <el-select v-model="oldId" placeholder="旧版本" style="width: 240px">
        <el-option v-for="doc in documentStore.byOldest" :key="`r-old-${doc.id}`" :value="doc.id" :label="doc.version_label" />
      </el-select>
      <span>→</span>
      <el-select v-model="newId" placeholder="新版本" style="width: 240px">
        <el-option v-for="doc in documentStore.byOldest" :key="`r-new-${doc.id}`" :value="doc.id" :label="doc.version_label" />
      </el-select>
      <el-radio-group v-model="statusFilter" size="small">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button value="OPEN">待处理</el-radio-button>
        <el-radio-button value="CONFIRMED">已确认</el-radio-button>
        <el-radio-button value="IGNORED">已忽略</el-radio-button>
        <el-radio-button value="RESOLVED">已处理</el-radio-button>
      </el-radio-group>
      <div class="spacer" />
      <el-button type="primary" :disabled="!oldDoc || !newDoc" @click="exportSummary">导出 Markdown 摘要</el-button>
    </div>

    <div class="metrics">
      <StatCard label="待处理" :value="stats.OPEN" tone="warning" />
      <StatCard label="已确认风险" :value="stats.CONFIRMED" tone="danger" />
      <StatCard label="已忽略" :value="stats.IGNORED" />
      <StatCard label="已处理" :value="stats.RESOLVED" tone="success" />
      <StatCard label="未处理事项合计" :value="stats.OPEN + stats.CONFIRMED" tone="danger" />
    </div>

    <template v-if="pairDiffs.length">
      <h2 style="font-size: 16px; margin: 8px 0 10px">按差异条款处理（点击展开两侧原文与备注）</h2>
      <div class="panel-stack">
        <el-card
          v-for="diff in pairDiffs"
          :key="diff.id"
          shadow="never"
          :class="['review-diff-card', { 'is-open': openCountOf(diff.id) > 0 }]"
        >
          <div class="doc-meta-row" @click="selectDiff(diff.id)" style="cursor: pointer">
            <el-tag size="small" :type="diff.diff_type === 'ADDED' ? 'success' : diff.diff_type === 'REMOVED' ? 'danger' : diff.diff_type === 'MODIFIED' ? 'warning' : 'info'">
              {{ diff.diff_type }}
            </el-tag>
            <strong>{{ diff.section_no }} {{ diff.new_heading || diff.old_heading }}</strong>
            <el-tag size="small" effect="plain">{{ diff.risk_level }}</el-tag>
            <el-badge :value="openCountOf(diff.id)" :hidden="openCountOf(diff.id) === 0" type="danger" />
            <span class="stat-card-hint">备注 {{ noteCountOf(diff.id) }} 条</span>
            <el-button link type="primary" size="small" style="margin-left: auto">
              {{ selectedDiffId === diff.id ? "收起" : "处理 / 查看" }}
            </el-button>
          </div>
          <template v-if="selectedDiffId === diff.id">
            <DiffViewer
              :diff="diff"
              :risk-hits="sectionMap.get(diff.new_section_id || diff.old_section_id)?.risk_hits ?? []"
              :risk-manual="sectionMap.get(diff.new_section_id || diff.old_section_id)?.risk_manual"
            />
            <div style="margin-top: 12px">
              <ReviewChecklist
                :diff-id="diff.id"
                :notes="noteStore.byDiff(diff.id)"
                :diffs="pairDiffs"
                :show-filter="false"
                :on-create="onCreate"
                :on-update="onUpdate"
                :on-status="onStatus"
                :on-delete="onDelete"
              />
            </div>
          </template>
        </el-card>
      </div>

      <h2 style="font-size: 16px; margin: 24px 0 10px">本版本对的全部备注</h2>
      <ReviewChecklist
        :notes="visibleNotes"
        :diffs="pairDiffs"
        :show-filter="false"
        :on-create="onCreate"
        :on-update="onUpdate"
        :on-status="onStatus"
        :on-delete="onDelete"
      />
    </template>

    <EmptyState v-else title="当前版本对没有对比结果" hint="请先到「版本对比」生成差异，或检查上方版本选择" />
  </section>
</template>
