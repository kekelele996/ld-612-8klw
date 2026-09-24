<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { ElMessage } from "element-plus";
import StatCard from "../components/common/StatCard.vue";
import ReviewChecklist from "../components/common/ReviewChecklist.vue";
import EmptyState from "../components/common/EmptyState.vue";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { useDiffResultStore } from "../stores/DiffResultStore";
import { useReviewNoteStore } from "../stores/ReviewNoteStore";
import { ReviewStatusText, isPendingStatus } from "../constants/ReviewStatus";
import { safeBuildReportMarkdown, reportFilename } from "../services/exportService";
import { downloadTextFile } from "../utils/download";
import { isAppError } from "../utils/AppError";
import type { ReviewStatus as ReviewStatusValue } from "../types/ReviewStatus";

const documentStore = usePolicyDocumentStore();
const diffStore = useDiffResultStore();
const noteStore = useReviewNoteStore();

const { rows: noteRows, statusCounts } = storeToRefs(noteStore);
const { rows: diffRows, oldDocumentId, newDocumentId } = storeToRefs(diffStore);

const pairId = ref<{ old: number; new: number } | null>(
  oldDocumentId.value !== null && newDocumentId.value !== null
    ? { old: oldDocumentId.value, new: newDocumentId.value }
    : null
);

onMounted(async () => {
  await Promise.all([documentStore.load(), noteStore.load(), diffStore.load()]);
  if (pairId.value === null && diffRows.value.length > 0) {
    const first = diffRows.value[0];
    pairId.value = { old: first.old_document_id, new: first.new_document_id };
  }
});

const availablePairs = computed(() => {
  const keys = new Set<string>();
  return diffRows.value
    .map((diff) => ({ old: diff.old_document_id, new: diff.new_document_id }))
    .filter((item) => {
      const key = `${item.old}-${item.new}`;
      if (keys.has(key)) return false;
      keys.add(key);
      return true;
    })
    .map((item) => ({
      ...item,
      oldDocument: documentStore.getById(item.old),
      newDocument: documentStore.getById(item.new)
    }));
});

const pairDiffs = computed(() =>
  pairId.value
    ? diffRows.value.filter(
        (diff) => diff.old_document_id === pairId.value!.old && diff.new_document_id === pairId.value!.new
      )
    : []
);

const pairDiffIds = computed(() => new Set(pairDiffs.value.map((diff) => diff.id)));
const pairNotes = computed(() => noteRows.value.filter((note) => pairDiffIds.value.has(note.diff_result_id)));
const openNotes = computed(() => pairNotes.value.filter((note) => isPendingStatus(note.status)));

const selectPair = (value: string | number | boolean | Record<string, unknown>) => {
  const [oldId, newId] = String(value).split("-").map(Number);
  pairId.value = { old: oldId, new: newId };
};

const onUpdate = async (id: number, patch: { status?: ReviewStatusValue; comment?: string }) => {
  await noteStore.update(id, patch);
  if (patch.status) ElMessage.success(`已标记为「${ReviewStatusText[patch.status]}」`);
};

const exportMarkdown = () => {
  if (!pairId.value) return;
  const oldDocument = documentStore.getById(pairId.value.old);
  const newDocument = documentStore.getById(pairId.value.new);
  if (!oldDocument || !newDocument) {
    ElMessage.error("找不到对比对应的政策文档，请重新执行版本对比");
    return;
  }
  try {
    const report = diffStore.buildReport(oldDocument, newDocument, pairNotes.value);
    const markdown = safeBuildReportMarkdown(report);
    downloadTextFile(reportFilename(report), markdown);
    ElMessage.success("摘要已导出（含版本、风险统计与未处理事项）");
  } catch (error) {
    ElMessage.error(isAppError(error) ? error.message : "导出失败");
  }
};

const pairLabel = (item: { old: number; new: number }) => `${item.old}-${item.new}`;
</script>

<template>
  <div class="review-page">
    <section class="metrics">
      <StatCard label="待处理" :value="statusCounts.OPEN" tone="warn" hint="导出摘要中的未处理事项" />
      <StatCard label="已确认风险" :value="statusCounts.CONFIRMED" tone="danger" />
      <StatCard label="已解决" :value="statusCounts.RESOLVED" />
      <StatCard label="已忽略" :value="statusCounts.IGNORED" />
    </section>

    <section class="panel toolbar">
      <div class="pair-select">
        <span>审阅范围</span>
        <el-select
          :model-value="pairId ? pairLabel(pairId) : ''"
          placeholder="选择一次版本对比"
          style="min-width: 320px"
          @change="selectPair"
        >
          <el-option
            v-for="item in availablePairs"
            :key="pairLabel(item)"
            :label="`${item.oldDocument?.version_label ?? '#' + item.old} → ${item.newDocument?.version_label ?? '#' + item.new}`"
            :value="pairLabel(item)"
          />
        </el-select>
      </div>
      <el-button type="primary" :disabled="pairDiffs.length === 0" @click="exportMarkdown">
        导出 Markdown 审阅摘要
      </el-button>
    </section>

    <section v-if="pairDiffs.length === 0" class="panel">
      <EmptyState
        title="暂无可审阅的对比"
        description="请先到「版本对比」选择新旧两版执行对比，风险条款即可在此形成待处理清单"
      />
    </section>

    <section v-else class="panel">
      <div class="head">
        <h2>审阅清单（{{ pairNotes.length }} 条，待处理 {{ openNotes.length }} 条）</h2>
        <el-alert
          v-if="openNotes.length > 0"
          :title="`仍有 ${openNotes.length} 条待处理事项，导出摘要会逐条列出`"
          type="warning"
          :closable="false"
          show-icon
        />
      </div>
      <ReviewChecklist
        :notes="pairNotes"
        :diffs="pairDiffs"
        empty-title="该对比还没有审阅备注"
        @create="(draft) => noteStore.add(draft)"
        @update="onUpdate"
        @remove="(id) => noteStore.remove(id)"
      />
    </section>
  </div>
</template>

<style scoped>
.review-page { display: grid; gap: 18px; }
.metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.panel { background: #fbfaf4; border: 1px solid #d8d6c8; border-radius: 10px; padding: 18px 20px; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.pair-select { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #4a5248; }
.head { display: grid; gap: 10px; margin-bottom: 14px; }
.head h2 { margin: 0; font-size: 16px; color: #274335; }
@media (max-width: 900px) { .metrics { grid-template-columns: repeat(2, 1fr); } }
</style>
