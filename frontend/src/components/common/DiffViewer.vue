<script setup lang="ts">
import { computed, ref } from "vue";
import type { DiffResult } from "../../types/DiffResult";
import { diffChars, type TextSegment } from "../../utils/textLcs";
import StatusBadge from "./StatusBadge.vue";
import RiskTag from "./RiskTag.vue";
import RiskEvidence from "./RiskEvidence.vue";
import { formatPercent } from "../../utils/formatters";
import type { RiskHit } from "../../types/RiskHit";

const props = defineProps<{
  diff: DiffResult;
  riskHits?: RiskHit[];
  riskManual?: boolean;
  defaultCollapsed?: boolean;
}>();

const expanded = ref(!props.defaultCollapsed);

// 对两侧原文分别计算行内片段：旧侧把新增片段淡化、突出删除；新侧突出插入
const oldSegments = computed<(TextSegment & { muted?: boolean })[]>(() =>
  diffChars(props.diff.old_content, props.diff.new_content).map((segment) =>
    segment.type === "insert" ? { ...segment, type: "equal" as const, muted: true } : segment
  )
);
const newSegments = computed<TextSegment[]>(() =>
  diffChars(props.diff.old_content, props.diff.new_content)
);
</script>

<template>
  <el-card class="diff-viewer" :class="`is-${diff.diff_type.toLowerCase()}`" shadow="never">
    <template #header>
      <div class="diff-viewer-head" @click="expanded = !expanded">
        <StatusBadge kind="diff" :value="diff.diff_type" />
        <span class="diff-viewer-no">{{ diff.section_no || "—" }}</span>
        <strong class="diff-viewer-heading">{{ diff.new_heading || diff.old_heading }}</strong>
        <RiskTag :level="diff.risk_level" size="small" :show-score="false" />
        <el-button link type="primary" size="small">{{ expanded ? "收起" : "展开" }}</el-button>
      </div>
    </template>

    <div v-show="expanded" class="diff-viewer-body">
      <el-alert :title="diff.summary" type="info" :closable="false" show-icon class="diff-viewer-summary" />
      <div v-if="diff.diff_type === 'MODIFIED' || diff.diff_type === 'MOVED'" class="diff-viewer-similarity">
        内容相似度：<strong>{{ formatPercent(diff.similarity) }}</strong>
        <span v-if="diff.diff_type === 'MOVED'">（编号由「{{ diff.section_no }}」变动，按标题对应）</span>
      </div>

      <el-row :gutter="12" class="diff-viewer-cols">
        <el-col :xs="24" :sm="12">
          <div class="diff-pane is-old">
            <div class="diff-pane-title">旧版原文{{ diff.old_heading ? `｜${diff.old_heading}` : "" }}</div>
            <p v-if="diff.old_content" class="diff-pane-content">
              <template v-for="(segment, index) in oldSegments" :key="`o-${index}`">
                <span v-if="segment.type === 'delete'" class="diff-text-delete">{{ segment.text }}</span>
                <span v-else-if="segment.muted" class="diff-text-muted">{{ segment.text }}</span>
                <span v-else>{{ segment.text }}</span>
              </template>
            </p>
            <p v-else class="diff-pane-empty">（旧版无此条款）</p>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12">
          <div class="diff-pane is-new">
            <div class="diff-pane-title">新版原文{{ diff.new_heading ? `｜${diff.new_heading}` : "" }}</div>
            <p v-if="diff.new_content" class="diff-pane-content">
              <template v-for="(segment, index) in newSegments" :key="`n-${index}`">
                <span v-if="segment.type === 'insert'" class="diff-text-insert">{{ segment.text }}</span>
                <span v-else>{{ segment.text }}</span>
              </template>
            </p>
            <p v-else class="diff-pane-empty">（新版已移除该条款）</p>
          </div>
        </el-col>
      </el-row>

      <RiskEvidence v-if="riskHits && riskHits.length" :hits="riskHits" :score="0" :manual="riskManual" compact />
    </div>
  </el-card>
</template>
