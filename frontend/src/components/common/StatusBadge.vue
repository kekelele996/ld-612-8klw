<script setup lang="ts">
import { computed } from "vue";
import { DiffTypeColor, DiffTypeText } from "../../constants/DiffType";
import { PrivacyRiskLevelColor, PrivacyRiskLevelText } from "../../constants/PrivacyRiskLevel";
import { ReviewStatusColor, ReviewStatusText } from "../../constants/ReviewStatus";
import { SectionCategoryColor, SectionCategoryText } from "../../constants/SectionCategory";

const props = defineProps<{
  value: string;
  kind?: "diff" | "risk" | "status" | "category";
}>();

const palette = computed(() => {
  switch (props.kind) {
    case "diff":
      return { color: DiffTypeColor[props.value as keyof typeof DiffTypeColor] ?? "#667085", text: DiffTypeText[props.value as keyof typeof DiffTypeText] ?? props.value };
    case "risk":
      return { color: PrivacyRiskLevelColor[props.value as keyof typeof PrivacyRiskLevelColor] ?? "#667085", text: PrivacyRiskLevelText[props.value as keyof typeof PrivacyRiskLevelText] ?? props.value };
    case "category":
      return { color: SectionCategoryColor[props.value as keyof typeof SectionCategoryColor] ?? "#667085", text: SectionCategoryText[props.value as keyof typeof SectionCategoryText] ?? props.value };
    case "status":
    default:
      return { color: ReviewStatusColor[props.value as keyof typeof ReviewStatusColor] ?? "#667085", text: ReviewStatusText[props.value as keyof typeof ReviewStatusText] ?? props.value };
  }
});
</script>

<template>
  <span class="status-badge" :style="{ color: palette.color, borderColor: palette.color }">{{ palette.text }}</span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  border: 1px solid currentColor;
  background: color-mix(in srgb, currentColor 8%, #fff);
  border-radius: 999px;
  padding: 1px 10px;
  font-size: 12px;
  font-weight: 700;
  line-height: 20px;
  white-space: nowrap;
}
</style>
