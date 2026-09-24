<script setup lang="ts">
import { computed } from "vue";
import RiskTag from "./RiskTag.vue";
import StatusBadge from "./StatusBadge.vue";
import { truncate } from "../../utils/formatters";
import type { PolicySection } from "../../types/PolicySection";

const props = defineProps<{
  section: PolicySection;
  compact?: boolean;
  documentLabel?: string;
}>();

const emit = defineEmits<{ (event: "inspect", section: PolicySection): void }>();

const preview = computed(() =>
  props.compact ? truncate(props.section.content, 160) : props.section.content
);
</script>

<template>
  <article class="section-card" :class="{ clickable: compact }" @click="compact && emit('inspect', section)">
    <header>
      <div class="heading">
        <span class="no">{{ section.section_no }}</span>
        <strong>{{ section.heading }}</strong>
      </div>
      <div class="tags">
        <StatusBadge v-if="section.category !== 'OTHER'" :value="section.category" kind="category" />
        <RiskTag :level="section.risk_level" />
      </div>
    </header>
    <p class="content" :class="{ clamp: compact }">{{ preview }}</p>
    <footer v-if="documentLabel">
      <span>{{ documentLabel }}</span>
      <slot name="meta" />
    </footer>
    <footer v-else-if="$slots.meta"><slot name="meta" /></footer>
  </article>
</template>

<style scoped>
.section-card {
  background: #fbfaf4;
  border: 1px solid #d8d6c8;
  border-radius: 10px;
  padding: 16px 18px;
  display: grid;
  gap: 10px;
}
.section-card.clickable { cursor: pointer; transition: border-color .15s; }
.section-card.clickable:hover { border-color: #274335; }
header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.heading { display: flex; align-items: baseline; gap: 8px; }
.no {
  flex: none;
  font-size: 12px;
  font-weight: 700;
  color: #7d4d18;
  background: #f3e9d6;
  border-radius: 6px;
  padding: 1px 8px;
}
.heading strong { font-size: 15px; color: #223126; }
.tags { display: flex; gap: 6px; flex: none; }
.content {
  margin: 0;
  white-space: pre-wrap;
  font-size: 13px;
  line-height: 1.8;
  color: #3c423b;
}
.content.clamp {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
footer { display: flex; justify-content: space-between; font-size: 12px; color: #8a8372; }
</style>
