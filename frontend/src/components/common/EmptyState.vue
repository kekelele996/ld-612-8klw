<script setup lang="ts">
withDefaults(defineProps<{ title?: string; hint?: string }>(), {
  title: "暂无数据",
  hint: "可先在「文档导入」中粘贴两版隐私政策"
});
</script>

<template>
  <el-empty class="empty-state" :description="title">
    <template v-if="$slots.default"><slot /></template>
    <p v-else class="empty-state-hint">{{ hint }}</p>
  </el-empty>
</template>
