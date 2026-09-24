import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import DocumentsPage from "../pages/DocumentsPage.vue";
import ComparePage from "../pages/ComparePage.vue";
import RisksPage from "../pages/RisksPage.vue";
import ReviewPage from "../pages/ReviewPage.vue";

export const routes: RouteRecordRaw[] = [
  { path: "/", redirect: "/documents" },
  { path: "/documents", name: "文档导入", component: DocumentsPage },
  { path: "/compare", name: "版本对比", component: ComparePage },
  { path: "/risks", name: "风险标注", component: RisksPage },
  { path: "/review", name: "审阅清单", component: ReviewPage }
];

export const router = createRouter({
  history: createWebHistory(),
  routes
});
