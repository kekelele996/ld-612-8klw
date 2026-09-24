<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import { navRoutes } from "./router/routes";
import { usePolicyDocumentStore } from "./stores/PolicyDocumentStore";
import { usePolicySectionStore } from "./stores/PolicySectionStore";
import { useDiffResultStore } from "./stores/DiffResultStore";
import { useReviewNoteStore } from "./stores/ReviewNoteStore";

const route = useRoute();
const documentStore = usePolicyDocumentStore();
const sectionStore = usePolicySectionStore();
const diffStore = useDiffResultStore();
const noteStore = useReviewNoteStore();

// 应用启动即从 localStorage 恢复全部业务数据
onMounted(async () => {
  await Promise.all([
    documentStore.load(),
    sectionStore.load(),
    diffStore.load(),
    noteStore.load()
  ]);
});
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-title">隐私政策差异对比器</div>
        <div class="brand-sub">policy-diff · 本地审阅</div>
      </div>
      <nav class="nav">
        <RouterLink
          v-for="item in navRoutes"
          :key="item.route"
          :to="item.route"
          class="nav-item"
          :class="{ active: route.path === item.route }"
        >
          <span class="nav-name">{{ item.name }}</span>
          <span class="nav-desc">{{ item.desc }}</span>
        </RouterLink>
      </nav>
      <div class="sidebar-foot">数据仅保存在本浏览器 localStorage</div>
    </aside>
    <main class="page">
      <RouterView />
    </main>
  </div>
</template>
