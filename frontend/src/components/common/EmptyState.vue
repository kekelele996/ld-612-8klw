<script setup lang="ts">
defineProps<{ title?: string; description?: string }>();
</script>

<template>
  <div class="empty">
    <strong>{{ title ?? "暂无数据" }}</strong>
    <span v-if="description">{{ description }}</span>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  display: grid;
  gap: 6px;
  justify-items: center;
  text-align: center;
  border: 1px dashed #b8b09f;
  border-radius: 10px;
  padding: 36px 20px;
  color: #7d7665;
  background: #fbfaf4;
}
.empty strong { color: #4a5248; font-size: 15px; }
.empty span { font-size: 13px; }
</style>
