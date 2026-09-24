<script setup lang="ts">
import { computed, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import ImportPanel from "../components/common/ImportPanel.vue";
import SectionCard from "../components/common/SectionCard.vue";
import EmptyState from "../components/common/EmptyState.vue";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import { formatDate } from "../utils/formatters";
import type { PolicySection } from "../types/PolicySection";
import type { RiskLevelOrNone } from "../types/PrivacyRiskLevel";

const documentStore = usePolicyDocumentStore();
const sectionStore = usePolicySectionStore();

const importing = ref(false);
const titleDraft = ref("示例服务个人信息保护政策");
const versionDraft = ref("");
const expandedDoc = ref<number | null>(null);

const sortedDocuments = computed(() =>
  [...documentStore.rows].sort((a, b) => b.imported_at.localeCompare(a.imported_at))
);

const onImport = async (payload: { title: string; version_label: string; raw_text: string }) => {
  if (!payload.version_label.trim()) {
    ElMessage.warning("请先填写版本标签");
    return;
  }
  importing.value = true;
  try {
    const doc = await documentStore.importDocument({
      title: payload.title || "未命名隐私政策",
      version_label: payload.version_label,
      raw_text: payload.raw_text
    });
    await sectionStore.load();
    ElMessage.success(`已导入并分段为 ${doc.section_count} 个条款，风险标注完成`);
    versionDraft.value = "";
    expandedDoc.value = doc.id;
  } catch (error) {
    ElMessage.error(documentStore.error || (error as Error).message || "导入失败");
  } finally {
    importing.value = false;
  }
};

const toggleDoc = (id: number) => {
  expandedDoc.value = expandedDoc.value === id ? null : id;
};

const onOverrideRisk = async (id: number, level: RiskLevelOrNone) => {
  await sectionStore.overrideRisk(id, level);
};

const onSaveContent = async (id: number, patch: Pick<PolicySection, "heading" | "content">) => {
  await sectionStore.updateContent(id, patch);
};

const onDelete = async (id: number, label: string) => {
  try {
    await ElMessageBox.confirm(`确认删除「${label}」？其条款、对比结果与相关备注会一并清除。`, "删除版本", {
      type: "warning"
    });
    await documentStore.remove(id);
    ElMessage.success("版本已删除");
  } catch {
    // 用户取消
  }
};

const docRiskCount = (id: number) =>
  sectionStore.byDocument(id).filter((section) => section.risk_level === "HIGH" || section.risk_level === "CRITICAL").length;
</script>

<template>
  <section>
    <header class="page-head">
      <h1>文档导入</h1>
      <p>粘贴两版隐私政策正文，系统自动按编号和标题分段，并在导入时完成风险标注。</p>
    </header>

    <ImportPanel
      v-model:title-draft="titleDraft"
      v-model:version-draft="versionDraft"
      :loading="importing"
      @import="onImport"
    />

    <h2 style="margin: 24px 0 12px; font-size: 17px">已导入版本（{{ documentStore.rows.length }}）</h2>
    <EmptyState v-if="sortedDocuments.length === 0" />
    <div v-else class="panel-stack">
      <el-card v-for="document in sortedDocuments" :key="document.id" shadow="never" class="doc-card">
        <template #header>
          <div class="doc-meta-row">
            <el-tag effect="dark" type="success">v{{ document.version_label.replace(/^v/i, "") }}</el-tag>
            <strong>{{ document.title }}</strong>
            <span class="stat-card-hint">{{ document.section_count }} 个条款 · 导入于 {{ formatDate(document.imported_at) }}</span>
            <el-tag v-if="docRiskCount(document.id) > 0" type="danger" size="small" effect="plain">
              {{ docRiskCount(document.id) }} 条高风险
            </el-tag>
            <div style="margin-left: auto" class="doc-meta-row">
              <el-button size="small" @click="toggleDoc(document.id)">
                {{ expandedDoc === document.id ? "收起条款" : `查看条款(${document.section_count})` }}
              </el-button>
              <el-button size="small" type="danger" plain @click="onDelete(document.id, `${document.version_label}`)">
                删除
              </el-button>
            </div>
          </div>
        </template>
        <div v-if="expandedDoc === document.id" class="panel-stack">
          <SectionCard
            v-for="section in sectionStore.byDocument(document.id)"
            :key="section.id"
            :section="section"
            editable
            :on-override-risk="onOverrideRisk"
            :on-save-content="onSaveContent"
          />
          <EmptyState
            v-if="sectionStore.byDocument(document.id).length === 0"
            title="该版本没有分段结果"
            hint="可重新导入包含编号标题的政策文本"
          />
        </div>
      </el-card>
    </div>
  </section>
</template>
