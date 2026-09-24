<script setup lang="ts">
import { computed } from "vue";
import type { ReviewStatus } from "../../types/ReviewStatus";
import type { DiffType } from "../../types/DiffType";
import { ReviewStatusTone, ReviewStatusText } from "../../constants/ReviewStatus";
import { DiffTypeTone, DiffTypeText } from "../../constants/DiffType";

// 复用组件：审阅状态 / 差异类型共用一个徽标，由 kind 区分取哪套枚举
const props = defineProps<{
  value: string;
  kind?: "status" | "diff";
}>();

const tone = computed(() =>
  props.kind === "diff"
    ? DiffTypeTone[props.value as DiffType] ?? "info"
    : ReviewStatusTone[props.value as ReviewStatus] ?? "info"
);
const label = computed(() =>
  props.kind === "diff"
    ? DiffTypeText[props.value as DiffType] ?? props.value
    : ReviewStatusText[props.value as ReviewStatus] ?? props.value
);
</script>

<template>
  <el-tag :type="tone" size="small" effect="plain" class="status-badge">{{ label }}</el-tag>
</template>
