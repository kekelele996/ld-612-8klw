<script setup lang="ts">
defineProps<{ label: string; value: string | number; hint?: string; tone?: "default" | "danger" | "warning" | "success" }>();
</script>

<template>
  <div class="stat-card" :class="`is-${tone ?? 'default'}`">
    <span class="stat-card-label">{{ label }}</span>
    <strong class="stat-card-value">{{ value }}</strong>
    <span v-if="hint" class="stat-card-hint">{{ hint }}</span>
  </div>
</template>
