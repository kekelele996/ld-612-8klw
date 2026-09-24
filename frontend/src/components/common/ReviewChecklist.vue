<script setup lang="ts">
import { computed, ref, watch } from "vue";
import StatusBadge from "./StatusBadge.vue";
import RiskTag from "./RiskTag.vue";
import EmptyState from "./EmptyState.vue";
import { ReviewStatus, ReviewStatusText, isPendingStatus, type ReviewStatusValue } from "../../constants/ReviewStatus";
import { SectionCategoryText } from "../../constants/SectionCategory";
import { formatDate } from "../../utils/formatters";
import type { DiffResult } from "../../types/DiffResult";
import type { ReviewNote } from "../../types/ReviewNote";

const props = withDefaults(
  defineProps<{
    notes: ReviewNote[];
    diffs?: DiffResult[];
    /** 新建备注时的预填标签（来自风险命中或手动加入） */
    pendingDraft?: { diffId: number; tag: ReviewNote["tag"] } | null;
    reviewer?: string;
    lockedStatusFilter?: ReviewStatusValue | null;
    emptyTitle?: string;
  }>(),
  { reviewer: "合规审阅人", lockedStatusFilter: null, emptyTitle: "暂无审阅备注" }
);

const emit = defineEmits<{
  (event: "create", draft: { diff_result_id: number; tag: ReviewNote["tag"]; comment: string; reviewer: string }): void;
  (event: "update", id: number, patch: Partial<Pick<ReviewNote, "status" | "comment">>): void;
  (event: "remove", id: number): void;
}>();

const statusFilter = ref<ReviewStatusValue | "ALL">(props.lockedStatusFilter ?? "ALL");
watch(
  () => props.lockedStatusFilter,
  (value) => {
    if (value) statusFilter.value = value;
  }
);

const draftComment = ref("");
const draftTag = ref<ReviewNote["tag"]>("MANUAL");
const draftDiffId = ref<number | null>(null);
const editingId = ref<number | null>(null);
const editingText = ref("");

watch(
  () => props.pendingDraft,
  (draft) => {
    if (draft) {
      draftDiffId.value = draft.diffId;
      draftTag.value = draft.tag;
    }
  },
  { immediate: true }
);

const diffTitle = (id: number): string =>
  props.diffs?.find((item) => item.id === id)?.section_title ?? `差异 #${id}`;
const diffRiskLevel = (id: number) => props.diffs?.find((item) => item.id === id)?.risk_level ?? null;

const filteredNotes = computed(() =>
  statusFilter.value === "ALL"
    ? props.notes
    : props.notes.filter((note) => note.status === statusFilter.value)
);

const counts = computed<Record<string, number>>(() => ({
  ALL: props.notes.length,
  ...ReviewStatus.reduce<Record<string, number>>((acc, status) => {
    acc[status] = props.notes.filter((note) => note.status === status).length;
    return acc;
  }, {})
}));

const tagOptions = computed(() =>
  (Object.entries(SectionCategoryText) as [ReviewNote["tag"], string][])
    .filter(([key]) => key !== "OTHER")
    .concat([["MANUAL", "手动标记"]])
);

const submitDraft = () => {
  if (draftDiffId.value === null || !draftComment.value.trim()) return;
  emit("create", {
    diff_result_id: draftDiffId.value,
    tag: draftTag.value,
    comment: draftComment.value,
    reviewer: props.reviewer
  });
  draftComment.value = "";
};

const startEdit = (note: ReviewNote) => {
  editingId.value = note.id;
  editingText.value = note.comment;
};
const saveEdit = () => {
  if (editingId.value !== null) {
    emit("update", editingId.value, { comment: editingText.value });
  }
  editingId.value = null;
};
</script>

<template>
  <div class="checklist">
    <div class="filters">
      <button
        class="chip"
        :class="{ active: statusFilter === 'ALL' }"
        @click="statusFilter = 'ALL'"
      >
        全部 {{ counts.ALL }}
      </button>
      <button
        v-for="status in ReviewStatus"
        :key="status"
        class="chip"
        :class="{ active: statusFilter === status, attention: status === 'OPEN' && counts[status] > 0 }"
        @click="statusFilter = status"
      >
        {{ ReviewStatusText[status] }} {{ counts[status] ?? 0 }}
      </button>
    </div>

    <div v-if="draftDiffId !== null" class="draft">
      <div class="draft-head">
        <el-select v-model="draftTag" size="small" style="width: 150px">
          <el-option v-for="[value, text] in tagOptions" :key="value" :label="text" :value="value" />
        </el-select>
        <span>关联条款：《{{ diffTitle(draftDiffId) }}》</span>
      </div>
      <el-input
        v-model="draftComment"
        type="textarea"
        :rows="2"
        placeholder="写下需要向业务方追问的问题，例如：精确位置是否取得单独同意？是否提供关闭入口？"
      />
      <div class="draft-actions">
        <el-button size="small" text @click="draftDiffId = null">取消</el-button>
        <el-button size="small" type="primary" :disabled="!draftComment.trim()" @click="submitDraft">
          加入清单
        </el-button>
      </div>
    </div>

    <div v-if="filteredNotes.length === 0">
      <EmptyState :title="emptyTitle" description="在版本对比中对命中风险的条款点击“追问并加入清单”" />
    </div>

    <ul v-else class="note-list">
      <li v-for="note in filteredNotes" :key="note.id" class="note" :class="{ pending: isPendingStatus(note.status) }">
        <div class="note-head">
          <StatusBadge :value="note.status" kind="status" />
          <span class="tag">{{ SectionCategoryText[note.tag as keyof typeof SectionCategoryText] ?? "手动标记" }}</span>
          <span class="section">《{{ diffTitle(note.diff_result_id) }}》</span>
          <RiskTag :level="diffRiskLevel(note.diff_result_id)" />
          <span class="time">{{ formatDate(note.updated_at) }}</span>
        </div>
        <p v-if="editingId !== note.id" class="comment">{{ note.comment }}</p>
        <div v-else class="editing">
          <el-input v-model="editingText" type="textarea" :rows="2" />
          <div>
            <el-button size="small" @click="editingId = null">放弃</el-button>
            <el-button size="small" type="primary" @click="saveEdit">保存</el-button>
          </div>
        </div>
        <div class="note-actions">
          <template v-if="editingId !== note.id">
            <el-button size="small" text @click="startEdit(note)">编辑</el-button>
            <el-button size="small" text type="danger" @click="emit('remove', note.id)">删除</el-button>
          </template>
          <div class="status-actions" v-if="editingId !== note.id">
            <el-button
              v-for="status in ReviewStatus.filter((s) => s !== note.status)"
              :key="status"
              size="small"
              :type="status === 'CONFIRMED' ? 'danger' : status === 'RESOLVED' ? 'success' : 'default'"
              @click="emit('update', note.id, { status })"
            >
              标记为{{ ReviewStatusText[status] }}
            </el-button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.checklist { display: grid; gap: 12px; }
.filters { display: flex; gap: 8px; flex-wrap: wrap; }
.chip {
  border: 1px solid #c9c2b2;
  background: #fbfaf4;
  color: #4a5248;
  border-radius: 999px;
  padding: 4px 14px;
  font-size: 13px;
}
.chip.active { background: #274335; color: #f5f1e6; border-color: #274335; }
.chip.attention:not(.active) { border-color: #b54708; color: #b54708; }
.draft { border: 1px solid #d9c7a3; background: #fffaf1; border-radius: 10px; padding: 12px; display: grid; gap: 8px; }
.draft-head { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #4a4638; }
.draft-actions { display: flex; justify-content: flex-end; gap: 8px; }
.note-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.note { border: 1px solid #d8d6c8; border-radius: 10px; padding: 12px 14px; background: #fffdf8; display: grid; gap: 8px; }
.note.pending { border-left: 4px solid #b54708; }
.note-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; color: #8a8372; }
.note-head .tag { color: #7d4d18; font-weight: 700; }
.note-head .section { color: #4a5248; }
.note-head .time { margin-left: auto; }
.comment { margin: 0; font-size: 13px; line-height: 1.8; color: #3c423b; white-space: pre-wrap; }
.editing { display: grid; gap: 8px; justify-items: end; }
.note-actions { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.status-actions { display: flex; gap: 6px; flex-wrap: wrap; }
</style>
