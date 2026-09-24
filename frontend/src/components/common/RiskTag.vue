<script setup lang="ts">
import { computed } from "vue";
import {
  PrivacyRiskLevelColor,
  PrivacyRiskLevelAdvice,
  type PrivacyRiskLevelValue
} from "../../constants/PrivacyRiskLevel";
import { formatStatus } from "../../utils/formatters";

const props = defineProps<{
  level: PrivacyRiskLevelValue | string | null;
  showAdvice?: boolean;
}>();

const color = computed(() =>
  props.level ? PrivacyRiskLevelColor[props.level as PrivacyRiskLevelValue] ?? "#667085" : "#667085"
);
const label = computed(() => (props.level ? formatStatus(props.level) : "无风险"));
const advice = computed(() =>
  props.level ? PrivacyRiskLevelAdvice[props.level as PrivacyRiskLevelValue] ?? "" : "未命中风险关键词"
);
</script>

<template>
  <el-tooltip v-if="showAdvice" :content="advice" placement="top">
    <span class="risk-tag" :style="{ background: color }">{{ label }}</span>
  </el-tooltip>
  <span v-else class="risk-tag" :style="{ background: color }">{{ label }}</span>
</template>

<style scoped>
.risk-tag {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 2px 12px;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  line-height: 20px;
  white-space: nowrap;
}
</style>
