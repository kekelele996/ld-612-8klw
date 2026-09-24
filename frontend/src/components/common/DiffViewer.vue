<script setup lang="ts">
import { computed, ref } from "vue";
import StatusBadge from "./StatusBadge.vue";
import RiskTag from "./RiskTag.vue";
import EmptyState from "./EmptyState.vue";
import { DiffTypeText, DiffTypeColor } from "../../constants/DiffType";
import { SectionCategoryText } from "../../constants/SectionCategory";
import type { DiffLine, DiffMark } from "../../types/DiffLine";
import type { DiffResult } from "../../types/DiffResult";
import type { PolicySection } from "../../types/PolicySection";
import type { ReviewNote } from "../../types/ReviewNote";

const props = defineProps<{
  diff: DiffResult;
  oldLabel?: string;
  newLabel?: string;
  notes?: ReviewNote[];
  defaultExpanded?: boolean;
  /** 只看变化条款时仍渲染未变化行以外的完整正文 */
  showFullText?: boolean;
}>();

const emit = defineEmits<{
  (event: "add-note", payload: { diffId: number; tag: ReviewNote["tag"] }): void;
  (event: "toggle", diffId: number): void;
}>();

const expanded = ref(props.defaultExpanded ?? props.diff.diff_type !== "UNCHANGED");

const oldSection = computed(() => props.diff.old_section as PolicySection | null);
const newSection = computed(() => props.diff.new_section as PolicySection | null);

const hasLineDiff = computed(() => props.diff.old_lines.length + props.diff.new_lines.length > 0);

const renderLine = (line: DiffLine): { text: string; marks: DiffMark[] } => ({
  text: line.text,
  marks: [...line.marks].sort((a, b) => a.start - b.start)
});

const highlightSegments = (line: DiffLine): { text: string; type: DiffMark["type"] | null }[] => {
  const { text, marks } = renderLine(line);
  if (marks.length === 0) return [{ text, type: null }];
  const segments: { text: string; type: DiffMark["type"] | null }[] = [];
  let cursor = 0;
  marks.forEach((mark) => {
    if (mark.start > cursor) segments.push({ text: text.slice(cursor, mark.start), type: null });
    segments.push({ text: text.slice(mark.start, mark.end), type: mark.type });
    cursor = mark.end;
  });
  if (cursor < text.length) segments.push({ text: text.slice(cursor), type: null });
  return segments;
};

const lineState = (line: DiffLine): "ins" | "del" | "plain" | "empty" => {
  if (!line.text) return "empty";
  return line.marks.some((mark) => mark.type === "ins")
    ? "ins"
    : line.marks.some((mark) => mark.type === "del")
      ? "del"
      : "plain";
};

const toggle = () => {
  expanded.value = !expanded.value;
  emit("toggle", props.diff.id);
};
</script>

<template>
  <article class="diff-viewer" :data-type="diff.diff_type">
    <header class="head" @click="toggle">
      <span class="type" :style="{ background: DiffTypeColor[diff.diff_type] }">
        {{ DiffTypeText[diff.diff_type] }}
      </span>
      <div class="title">
        <strong>{{ diff.section_title }}</strong>
        <span class="nos">
          <template v-if="diff.old_section_no">旧 {{ diff.old_section_no }}</template>
          <template v-if="diff.old_section_no && diff.new_section_no && diff.old_section_no !== diff.new_section_no"> → </template>
          <template v-if="diff.new_section_no">新 {{ diff.new_section_no }}</template>
        </span>
      </div>
      <RiskTag v-if="diff.risk_level" :level="diff.risk_level" />
      <el-badge v-if="notes && notes.length" :value="notes.length" type="warning" />
      <el-button text size="small">{{ expanded ? "收起" : "展开" }}</el-button>
    </header>

    <p class="summary">{{ diff.summary }}</p>

    <div v-show="expanded" class="body">
      <!-- 双侧原文：无行级差异时展示完整正文，新增/移除一侧为空态 -->
      <div v-if="!hasLineDiff" class="columns plain-text">
        <section class="pane old">
          <h5>{{ oldLabel ?? "旧版原文" }}</h5>
          <pre v-if="oldSection">{{ oldSection.content }}</pre>
          <EmptyState v-else title="旧版无此条款" description="该条款为新版新增" />
        </section>
        <section class="pane new">
          <h5>{{ newLabel ?? "新版原文" }}</h5>
          <pre v-if="newSection">{{ newSection.content }}</pre>
          <EmptyState v-else title="新版已删除" description="该条款仅存在于旧版" />
        </section>
      </div>

      <!-- 行级 + 行内差异 -->
      <div v-else class="columns line-diff">
        <section class="pane old">
          <h5>{{ oldLabel ?? "旧版原文" }}</h5>
          <div class="lines">
            <div
              v-for="(line, index) in diff.old_lines"
              :key="`o-${index}`"
              class="line"
              :class="lineState(line)"
            >
              <span class="gutter">{{ line.text ? index + 1 : "" }}</span>
              <code>
                <template v-for="(seg, si) in highlightSegments(line)" :key="si">
                  <span v-if="seg.type === 'del'" class="del-text">{{ seg.text }}</span>
                  <template v-else>{{ seg.text }}</template>
                </template>
                <span v-if="!line.text">&nbsp;</span>
              </code>
            </div>
          </div>
        </section>
        <section class="pane new">
          <h5>{{ newLabel ?? "新版原文" }}</h5>
          <div class="lines">
            <div
              v-for="(line, index) in diff.new_lines"
              :key="`n-${index}`"
              class="line"
              :class="lineState(line)"
            >
              <span class="gutter">{{ line.text ? index + 1 : "" }}</span>
              <code>
                <template v-for="(seg, si) in highlightSegments(line)" :key="si">
                  <span v-if="seg.type === 'ins'" class="ins-text">{{ seg.text }}</span>
                  <template v-else>{{ seg.text }}</template>
                </template>
                <span v-if="!line.text">&nbsp;</span>
              </code>
            </div>
          </div>
        </section>
      </div>

      <!-- 命中依据：等级、关键词、证据句、定级理由，可解释 -->
      <section v-if="diff.risks.length" class="risks">
        <h5>风险命中依据</h5>
        <div v-for="risk in diff.risks" :key="`${risk.category}-${risk.side}`" class="risk-item">
          <div class="risk-head">
            <RiskTag :level="risk.level" />
            <StatusBadge :value="risk.category" kind="category" />
            <span class="side">{{ risk.side === "old" ? "旧版命中" : "新版命中" }}</span>
            <span class="score">规则权重 {{ risk.score }} 分</span>
          </div>
          <p class="reason">{{ risk.reason }}</p>
          <ul class="evidence">
            <li v-for="(sentence, i) in risk.evidence" :key="i">
              <span class="kw">{{ risk.matchedKeywords[i] ? `「${risk.matchedKeywords[i]}」` : "证据" }}</span>
              {{ sentence }}
            </li>
          </ul>
          <el-button
            size="small"
            text
            type="primary"
            @click="emit('add-note', { diffId: diff.id, tag: risk.category })"
          >
            就「{{ SectionCategoryText[risk.category] }}」追问并加入清单
          </el-button>
        </div>
      </section>

      <section v-if="notes && notes.length" class="notes">
        <h5>审阅备注（{{ notes.length }}）</h5>
        <slot name="notes" />
      </section>

      <div v-if="diff.risks.length === 0 && diff.diff_type !== 'UNCHANGED'" class="manual">
        <el-button size="small" @click="emit('add-note', { diffId: diff.id, tag: 'MANUAL' })">
          手动加入审阅清单
        </el-button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.diff-viewer { border: 1px solid #d8d6c8; border-radius: 10px; background: #fbfaf4; overflow: hidden; }
.diff-viewer[data-type="REMOVED"] { border-left: 4px solid #b42318; }
.diff-viewer[data-type="ADDED"] { border-left: 4px solid #1a7f37; }
.diff-viewer[data-type="MODIFIED"] { border-left: 4px solid #b54708; }
.diff-viewer[data-type="MOVED"] { border-left: 4px solid #175cd3; }
.head { display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; }
.type { flex: none; color: #fff; border-radius: 6px; padding: 2px 10px; font-size: 12px; font-weight: 700; }
.title { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.title strong { font-size: 15px; }
.nos { font-size: 12px; color: #8a8372; }
.summary { margin: 0; padding: 0 16px 10px; font-size: 12px; color: #7d7665; }
.body { border-top: 1px dashed #d8d6c8; padding: 14px 16px 16px; display: grid; gap: 14px; }
.columns { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pane { border: 1px solid #e2ddcb; border-radius: 8px; overflow: hidden; background: #fff; min-width: 0; }
.pane h5 { margin: 0; padding: 8px 12px; font-size: 13px; background: #f3efe2; color: #4a4638; }
.pane pre { margin: 0; padding: 10px 12px; white-space: pre-wrap; word-break: break-word; font-family: inherit; font-size: 13px; line-height: 1.8; }
.lines { font-size: 13px; line-height: 1.8; }
.line { display: flex; align-items: flex-start; }
.line .gutter { flex: none; width: 34px; text-align: right; padding-right: 8px; color: #b3ac99; user-select: none; font-size: 11px; }
.line code { flex: 1; margin: 0; padding: 0 10px 0 8px; white-space: pre-wrap; word-break: break-word; }
.line.del { background: #fdecec; }
.line.ins { background: #e9f7ee; }
.del-text { background: #f6c9c4; text-decoration: line-through; text-decoration-color: #b42318; }
.ins-text { background: #bfe8cd; }
.risks, .notes { display: grid; gap: 8px; }
.risks h5, .notes h5 { margin: 0; font-size: 13px; color: #274335; }
.risk-item { border: 1px solid #ecd9c0; border-radius: 8px; padding: 10px 12px; background: #fffaf1; display: grid; gap: 6px; }
.risk-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.side { font-size: 12px; color: #7d4d18; font-weight: 700; }
.score { font-size: 12px; color: #8a8372; }
.reason { margin: 0; font-size: 13px; color: #4a4638; }
.evidence { margin: 0; padding-left: 18px; font-size: 12px; color: #6b6455; display: grid; gap: 2px; }
.evidence .kw { color: #b42318; font-weight: 700; }
.manual { display: flex; justify-content: flex-end; }
@media (max-width: 900px) { .columns { grid-template-columns: 1fr; } }
</style>
