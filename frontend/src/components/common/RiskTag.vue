<script setup lang="ts">
import { computed } from "vue";
import type { RiskLevelOrNone } from "../../types/PrivacyRiskLevel";
import { PrivacyRiskLevelTone, PrivacyRiskLevelText, NoRiskText } from "../../constants/PrivacyRiskLevel";
import { formatScore } from "../../utils/formatters";

const props = withDefaults(
  defineProps<{
    level: RiskLevelOrNone;
    score?: number;
    manual?: boolean;
    showScore?: boolean;
    size?: "small" | "default";
  }>(),
  { score: 0, manual: false, showScore: true, size: "default" }
);

const label = computed(() =>
  props.level && props.level !== "NONE" ? PrivacyRiskLevelText[props.level] : NoRiskText
);
const tone = computed(() =>
  props.level && props.level !== "NONE" ? PrivacyRiskLevelTone[props.level] : "info"
);
</script>

<template>
  <el-tag :type="tone" :size="size" effect="dark" class="risk-tag">
    {{ label }}
    <span v-if="showScore && level !== 'NONE'" class="risk-tag-score">{{ formatScore(score) }}</span>
    <el-tooltip v-if="manual" content="等级已由人工调整" placement="top">
      <span class="risk-tag-manual">人工</span>
    </el-tooltip>
  </el-tag>
</template>
