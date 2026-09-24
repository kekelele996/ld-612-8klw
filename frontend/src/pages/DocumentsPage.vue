<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { ElMessage, ElMessageBox } from "element-plus";
import ImportPanel from "../components/common/ImportPanel.vue";
import SectionCard from "../components/common/SectionCard.vue";
import EmptyState from "../components/common/EmptyState.vue";
import StatCard from "../components/common/StatCard.vue";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { isAppError } from "../utils/AppError";
import { formatDate } from "../utils/formatters";
import type { PolicyDocumentImport } from "../types/PolicyDocument";
import type { PolicySection } from "../types/PolicySection";

const documentStore = usePolicyDocumentStore();
const { sorted, loading } = storeToRefs(documentStore);

const submitting = ref(false);
const expandedId = ref<number | null>(null);

const totalSections = computed(() =>
  sorted.value.reduce((sum, doc) => sum + doc.normalized_sections.length, 0)
);
const riskSectionCount = computed(() =>
  sorted.value.reduce(
    (sum, doc) => sum + doc.normalized_sections.filter((section) => section.risk_level !== null).length,
    0
  )
);

onMounted(() => documentStore.load());

const onImport = async (form: PolicyDocumentImport) => {
  submitting.value = true;
  try {
    const doc = await documentStore.importDocument(form);
    ElMessage.success(`导入成功：自动分段 ${doc.normalized_sections.length} 条`);
    expandedId.value = doc.id;
  } catch (error) {
    ElMessage.error(isAppError(error) ? error.message : "导入失败，请检查原文格式");
  } finally {
    submitting.value = false;
  }
};

const confirmDelete = async (id: number, title: string) => {
  try {
    await ElMessageBox.confirm(`确认删除《${title}》？该版本的分段与相关差异将一并清除。`, "删除确认", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消"
    });
    await documentStore.remove(id);
    ElMessage.success("已删除");
  } catch {
    // 用户取消
  }
};

const toggle = (id: number) => {
  expandedId.value = expandedId.value === id ? null : id;
};

const sectionsOf = (id: number): PolicySection[] =>
  sorted.value.find((doc) => doc.id === id)?.normalized_sections ?? [];
</script>

<template>
  <div class="documents-page">
    <section class="metrics">
      <StatCard label="已导入版本" :value="sorted.length" hint="浏览器本地保存，重开自动恢复" />
      <StatCard label="自动分段总数" :value="totalSections" />
      <StatCard label="含风险预判段落" :value="riskSectionCount" tone="warn" />
    </section>

    <section class="panel">
      <h2>导入新版本</h2>
      <ImportPanel :submitting="submitting" @submit="onImport" />
    </section>

    <section class="panel">
      <h2>已导入版本</h2>
      <div v-loading="loading">
        <EmptyState
          v-if="sorted.length === 0"
          title="还没有导入任何政策"
          description="粘贴新旧两版文本，或用示例按钮快速体验完整流程"
        />
        <div v-else class="doc-list">
          <article v-for="doc in sorted" :key="doc.id" class="doc-item">
            <header @click="toggle(doc.id)">
              <div class="doc-meta">
                <strong>{{ doc.title }}</strong>
                <el-tag size="small" type="info">{{ doc.version_label }}</el-tag>
                <span class="time">导入于 {{ formatDate(doc.imported_at) }}</span>
              </div>
              <div class="doc-actions" @click.stop>
                <el-button text size="small" @click="toggle(doc.id)">
                  {{ expandedId === doc.id ? "收起分段" : `查看 ${doc.normalized_sections.length} 个分段` }}
                </el-button>
                <el-button text size="small" type="danger" @click="confirmDelete(doc.id, doc.title)">
                  删除
                </el-button>
              </div>
            </header>
            <div v-if="expandedId === doc.id" class="section-grid">
              <SectionCard
                v-for="section in sectionsOf(doc.id)"
                :key="section.id"
                :section="section"
                compact
              />
            </div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.documents-page { display: grid; gap: 18px; }
.metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.panel { background: #fbfaf4; border: 1px solid #d8d6c8; border-radius: 10px; padding: 18px 20px; }
.panel h2 { margin: 0 0 14px; font-size: 16px; color: #274335; }
.doc-list { display: grid; gap: 10px; }
.doc-item { border: 1px solid #e2ddcb; border-radius: 10px; background: #fff; overflow: hidden; }
.doc-item header { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; flex-wrap: wrap; }
.doc-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.doc-meta strong { font-size: 15px; }
.doc-meta .time { font-size: 12px; color: #8a8372; }
.section-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; padding: 0 16px 16px; }
@media (max-width: 760px) { .metrics { grid-template-columns: 1fr; } }
</style>
