<script setup lang="ts">
defineProps<{ label: string; value: string | number; hint?: string; tone?: string }>();
</script>

<template>
  <div class="stat" :class="tone">
    <span>{{ label }}</span>
    <strong>{{ value }}</strong>
    <small v-if="hint">{{ hint }}</small>
  </div>
</template>

<style scoped>
.stat {
  background: #fbfaf4;
  border: 1px solid #d8d6c8;
  border-left: 4px solid #274335;
  border-radius: 8px;
  padding: 16px 18px;
}
.stat span {
  display: block;
  color: #596257;
  font-size: 13px;
}
.stat strong {
  display: block;
  font-size: 28px;
  color: #274335;
  margin-top: 2px;
}
.stat small {
  color: #8a8372;
  font-size: 12px;
}
.stat.danger { border-left-color: #c01048; }
.stat.danger strong { color: #c01048; }
.stat.warn { border-left-color: #b54708; }
.stat.warn strong { color: #b54708; }
.stat.info { border-left-color: #175cd3; }
.stat.info strong { color: #175cd3; }
</style>
