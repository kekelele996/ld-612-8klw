import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import DocumentsPage from "../pages/DocumentsPage.vue";
import ComparePage from "../pages/ComparePage.vue";
import RisksPage from "../pages/RisksPage.vue";
import ReviewPage from "../pages/ReviewPage.vue";

export const routes = [
  { path: "/", redirect: "/documents" },
  {
    path: "/documents",
    name: "文档导入",
    component: DocumentsPage,
    meta: { desc: "粘贴政策文本、自动分段、版本列表" }
  },
  {
    path: "/compare",
    name: "版本对比",
    component: ComparePage,
    meta: { desc: "编号/标题对齐、两侧原文、变化类型过滤" }
  },
  {
    path: "/risks",
    name: "风险标注",
    component: RisksPage,
    meta: { desc: "编号/标题对齐、两侧原文、变化类型过滤" }
  },
  {
    path: "/review",
    name: "审阅清单",
    component: ReviewPage,
    meta: { desc: "备注状态处理与 Markdown 摘要导出" }
  }
] as RouteRecordRaw[];

export const appRouter = createRouter({
  history: createWebHistory(),
  routes
});

// 侧边导航沿用的轻量路由表（App.vue 使用）
export const navRoutes = routes
  .filter((route) => route.name)
  .map((route) => ({ name: route.name as string, route: route.path, desc: route.meta?.desc as string }));
