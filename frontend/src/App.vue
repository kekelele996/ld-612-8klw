<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { routes } from "./router/routes";
import { useReviewNoteStore } from "./stores/ReviewNoteStore";
import { storeToRefs } from "pinia";

const route = useRoute();
const noteStore = useReviewNoteStore();
const { openRows } = storeToRefs(noteStore);
noteStore.load();

const navItems = computed(() =>
  routes
    .filter((item) => typeof item.path === "string" && item.name)
    .map((item) => ({ path: item.path as string, name: item.name as string }))
);

const isActive = (path: string) => (path === "/documents" ? route.path === "/" || route.path === "/documents" : route.path.startsWith(path));
</script>

<template>
  <div class="shell">
    <aside>
      <div class="brand">隐私政策<br />差异对比器</div>
      <p class="subtitle">policy-diff · 本地合规审阅</p>
      <nav>
        <RouterLink v-for="item in navItems" :key="item.path" :to="item.path" class="nav-item" :class="{ active: isActive(item.path) }">
          {{ item.name }}
          <span v-if="item.path === '/review' && openRows.length" class="dot">{{ openRows.length }}</span>
        </RouterLink>
      </nav>
      <div class="aside-foot">
        <span class="badge">数据仅存本地浏览器</span>
      </div>
    </aside>
    <main class="page">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.shell { min-height: 100vh; display: grid; grid-template-columns: 248px 1fr; }
aside { background: #223126; color: #f5f1e6; padding: 26px 18px; display: flex; flex-direction: column; gap: 6px; }
.brand { font-size: 19px; font-weight: 800; line-height: 1.35; }
.subtitle { margin: 0 0 18px; color: #b9c0b0; font-size: 12px; letter-spacing: .04em; }
nav { display: grid; gap: 6px; }
.nav-item {
  display: flex; align-items: center; justify-content: space-between;
  color: #d8dccf; text-decoration: none;
  padding: 10px 14px; border-radius: 8px; font-size: 14px;
}
.nav-item:hover { background: #2f4235; color: #fff; }
.nav-item.active { background: #f5f1e6; color: #223126; font-weight: 700; }
.nav-item .dot {
  background: #d39b46; color: #223126; border-radius: 999px;
  min-width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 800; padding: 0 6px;
}
.aside-foot { margin-top: auto; }
.aside-foot .badge { font-size: 11px; color: #9fb09f; border: 1px solid #3a4f3e; border-radius: 999px; padding: 3px 10px; display: inline-block; }
.page { padding: 26px 30px 40px; background: #eef1e8; min-width: 0; }
@media (max-width: 760px) {
  .shell { grid-template-columns: 1fr; }
  aside { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 10px; }
  nav { display: flex; flex-wrap: wrap; }
  .subtitle, .aside-foot { display: none; }
}
</style>
