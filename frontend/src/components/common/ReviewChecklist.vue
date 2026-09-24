<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import type { DiffResult } from "../../types/DiffResult";
import type { ReviewNote } from "../../types/ReviewNote";
import type { ReviewStatus } from "../../types/ReviewStatus";
import StatusBadge from "./StatusBadge.vue";
import EmptyState from "./EmptyState.vue";
import { ReviewStatusOptions, ReviewStatusText } from "../../constants/ReviewStatus";
import { NOTE_TAGS } from "../../constants/noteTags";
import { formatDate } from "../../utils/formatters";

const props = defineProps<{
  notes: ReviewNote[];
  diffs?: DiffResult[];
  // 传入某条差异时只展示该差异的备注，并允许直接新建；不传则展示全部
  diffId?: number;
  statusFilter?: ReviewStatus | "";
  showFilter?: boolean;
  onCreate?: (input: { diff_result_id: number; tag: string; comment: string; reviewer: string }) => Promise<void> | void;
  onUpdate?: (id: number, patch: Partial<Pick<ReviewNote, "tag" | "comment" | "reviewer">>) => Promise<void> | void;
  onStatus?: (id: number, status: ReviewStatus) => Promise<void> | void;
  onDelete?: (id: number) => Promise<void> | void;
}>();

const internalFilter = ref<ReviewStatus | "">("");
const activeFilter = computed(() => (props.showFilter === false ? "" : props.statusFilter ?? internalFilter.value));

const diffMap = computed(() => new Map((props.diffs ?? []).map((diff) => [diff.id, diff])));
const diffLabel = (note: ReviewNote) => {
  const diff = diffMap.value.get(note.diff_result_id);
  return diff ? `${diff.section_no} ${diff.new_heading || diff.old_heading}` : `#${note.diff_result_id}`;
};

const filteredNotes = computed(() =>
  activeFilter.value ? props.notes.filter((note) => note.status === activeFilter.value) : props.notes
);

const commentDraft = ref("");
const tagDraft = ref(NOTE_TAGS[0]);
const reviewerDraft = ref("合规同事");
const targetDiffId = ref(props.diffId ?? 0);

watch(
  () => props.diffId,
  (value) => {
    if (value) targetDiffId.value = value;
  }
);

const editingId = ref(0);
const editComment = ref("");
const editTag = ref("");

const submit = async () => {
  if (!commentDraft.value.trim()) {
    ElMessage.warning("请先填写备注内容");
    return;
  }
  if (!targetDiffId.value) {
    ElMessage.warning("请选择关联的差异条款");
    return;
  }
  await props.onCreate?.({
    diff_result_id: targetDiffId.value,
    tag: tagDraft.value,
    comment: commentDraft.value,
    reviewer: reviewerDraft.value || "合规同事"
  });
  commentDraft.value = "";
  ElMessage.success("备注已加入审阅清单");
};

const startEdit = (note: ReviewNote) => {
  editingId.value = note.id;
  editComment.value = note.comment;
  editTag.value = note.tag;
};

const saveEdit = async (note: ReviewNote) => {
  await props.onUpdate?.(note.id, { comment: editComment.value, tag: editTag.value });
  editingId.value = 0;
};

const nextStatus = (status: ReviewStatus): ReviewStatus => {
  const flow: ReviewStatus[] = ["OPEN", "CONFIRMED", "RESOLVED"];
  const index = flow.indexOf(status);
  return index === -1 || index === flow.length - 1 ? "RESOLVED" : flow[index + 1];
};
</script>

<template>
  <div class="review-checklist">
    <div v-if="showFilter !== false" class="review-checklist-filter">
      <el-radio-group v-model="internalFilter" size="small" type="button">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button v-for="option in ReviewStatusOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </el-radio-button>
      </el-radio-group>
      <span class="review-checklist-count">共 {{ filteredNotes.length }} 条</span>
    </div>

    <el-card v-if="onCreate" shadow="never" class="review-checklist-create">
      <div class="review-checklist-create-row">
        <el-select v-if="!diffId" v-model="targetDiffId" placeholder="关联差异条款" size="small" filterable>
          <el-option
            v-for="diff in diffs"
            :key="diff.id"
            :value="diff.id"
            :label="`${diff.section_no} ${diff.new_heading || diff.old_heading}（${diff.diff_type}）`"
          />
        </el-select>
        <el-select v-else v-model="targetDiffId" size="small" style="width: 160px">
          <el-option :value="diffId" :label="diffLabel({ diff_result_id: diffId } as ReviewNote)" />
        </el-select>
        <el-select v-model="tagDraft" size="small" style="width: 150px">
          <el-option v-for="tag in NOTE_TAGS" :key="tag" :value="tag" :label="tag" />
        </el-select>
        <el-input v-model="reviewerDraft" size="small" style="width: 130px" placeholder="审阅人" />
      </div>
      <el-input
        v-model="commentDraft"
        type="textarea"
        :rows="2"
        placeholder="填写追问内容、法务意见或处理结论…"
        class="review-checklist-create-comment"
      />
      <div class="review-checklist-create-actions">
        <el-button type="primary" size="small" @click="submit">加入审阅清单</el-button>
      </div>
    </el-card>

    <EmptyState v-if="filteredNotes.length === 0" title="没有符合条件的备注" hint="可在上方添加，或切换状态筛选" />

    <el-collapse v-else class="review-checklist-list">
      <el-collapse-item v-for="note in filteredNotes" :key="note.id" :name="note.id">
        <template #title>
          <div class="review-checklist-item">
            <StatusBadge :value="note.status" />
            <el-tag size="small" effect="plain" type="info">{{ note.tag }}</el-tag>
            <span class="review-checklist-item-diff">{{ diffLabel(note) }}</span>
            <span class="review-checklist-item-meta">{{ note.reviewer }} · {{ formatDate(note.updated_at) }}</span>
          </div>
        </template>
        <div v-if="editingId !== note.id" class="review-checklist-detail">
          <p>{{ note.comment }}</p>
          <div class="review-checklist-actions">
            <el-select
              :model-value="note.status"
              size="small"
              style="width: 120px"
              @change="(value: unknown) => onStatus?.(note.id, value as ReviewStatus)"
            >
              <el-option
                v-for="option in ReviewStatusOptions"
                :key="option.value"
                :value="option.value"
                :label="ReviewStatusText[option.value]"
              />
            </el-select>
            <el-button size="small" @click="startEdit(note)">编辑</el-button>
            <el-button size="small" type="success" plain @click="onStatus?.(note.id, nextStatus(note.status))">
              推进到「{{ ReviewStatusText[nextStatus(note.status)] }}」
            </el-button>
            <el-button size="small" type="danger" plain @click="onDelete?.(note.id)">删除</el-button>
          </div>
        </div>
        <div v-else class="review-checklist-detail">
          <el-select v-model="editTag" size="small" style="width: 150px; margin-bottom: 8px">
            <el-option v-for="tag in NOTE_TAGS" :key="tag" :value="tag" :label="tag" />
          </el-select>
          <el-input v-model="editComment" type="textarea" :rows="3" />
          <div class="review-checklist-actions">
            <el-button size="small" @click="editingId = 0">取消</el-button>
            <el-button size="small" type="primary" @click="saveEdit(note)">保存</el-button>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>
