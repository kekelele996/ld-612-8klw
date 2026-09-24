<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import SectionCard from "../components/common/SectionCard.vue";
import EmptyState from "../components/common/EmptyState.vue";
import StatCard from "../components/common/StatCard.vue";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import { RiskCategoryOptions } from "../constants/RiskCategory";
import { PrivacyRiskLevelOptions, PrivacyRiskLevelText } from "../constants/PrivacyRiskLevel";
import type { RiskCategory } from "../types/RiskCategory";
import type { PrivacyRiskLevel } from "../types/PrivacyRiskLevel";
import type { PolicySection } from "../types/PolicySection";
import type { RiskLevelOrNone } from "../types/PrivacyRiskLevel";

const documentStore = usePolicyDocumentStore();
const sectionStore = usePolicySectionStore();

// 默认看“新版本”（对比页选的新文档）；store 异步恢复后同步
const { selectedNewId } = storeToRefs(documentStore);
const documentId = ref(selectedNewId.value || documentStore.rows[0]?.id || 0);
watch(selectedNewId, (value) => {
  if (value) documentId.value = value;
});

const levelFilter = ref<PrivacyRiskLevel | "">("");
const categoryFilter = ref<RiskCategory | "">("");
const onlyManual = ref(false);

const sections = computed(() =>
  sectionStore.byDocument(documentId.value).sort((a, b) => b.risk_score - a.risk_score)
);

const filteredSections = computed(() =>
  sections.value.filter((section) => {
    if (levelFilter.value && section.risk_level !== levelFilter.value) return false;
    if (categoryFilter.value && !section.risk_hits.some((hit) => hit.category === categoryFilter.value && hit.weight > 0)) {
      return false;
    }
    if (onlyManual.value && !section.risk_manual) return false;
    return true;
  })
);

const levelCounts = computed(() => {
  const counts: Record<PrivacyRiskLevel, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  sections.value.forEach((section) => {
    if (section.risk_level !== "NONE") counts[section.risk_level as PrivacyRiskLevel] += 1;
  });
  return counts;
});

const categoryCounts = computed(() => {
  const counts = {} as Record<RiskCategory, number>;
  RiskCategoryOptions.forEach((option) => {
    counts[option.value] = sections.value.filter((s) =>
      s.risk_hits.some((hit) => hit.category === option.value && hit.weight > 0)
    ).length;
  });
  return counts;
});

// 风险升级追踪：相比旧版同编号条款的等级变化
const oldSectionsMap = computed(() => {
  const oldRows = sectionStore.byDocument(documentStore.selectedOldId);
  return new Map(oldRows.map((row) => [row.section_no, row]));
});

const riskDelta = (section: PolicySection): string => {
  const old = oldSectionsMap.value.get(section.section_no);
  if (!old || old.risk_level === section.risk_level) return "";
  const order = ["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const oldIndex = order.indexOf(old.risk_level);
  const newIndex = order.indexOf(section.risk_level);
  if (newIndex > oldIndex) {
    return `较旧版升级（${old.risk_level === "NONE" ? "未命中" : PrivacyRiskLevelText[old.risk_level as PrivacyRiskLevel]} → ${PrivacyRiskLevelText[section.risk_level as PrivacyRiskLevel]}）`;
  }
  return `较旧版下降（${PrivacyRiskLevelText[old.risk_level as PrivacyRiskLevel]} → ${section.risk_level === "NONE" ? "未命中" : PrivacyRiskLevelText[section.risk_level as PrivacyRiskLevel]}）`;
};

const onOverrideRisk = async (id: number, level: RiskLevelOrNone) => {
  await sectionStore.overrideRisk(id, level);
};

const onSaveContent = async (id: number, patch: Pick<PolicySection, "heading" | "content">) => {
  await sectionStore.updateContent(id, patch);
};

const riskyPriority = computed(() =>
  sections.value
    .filter((section) => section.risk_level === "CRITICAL" || section.risk_level === "HIGH")
    .slice(0, 5)
);
</script>

<template>
  <section>
    <header class="page-head">
      <h1>风险标注</h1>
      <p>
        对第三方共享、定位、敏感信息、长期保存条款自动评级；每条等级都附带命中关键词、原文片段与计分依据，可人工调整。
      </p>
    </header>

    <div class="page-toolbar">
      <el-select v-model="documentId" style="width: 320px">
        <el-option
          v-for="doc in documentStore.byOldest"
          :key="doc.id"
          :value="doc.id"
          :label="`${doc.version_label}｜${doc.title}`"
        />
      </el-select>
      <el-select v-model="levelFilter" placeholder="风险等级" clearable style="width: 150px">
        <el-option
          v-for="option in PrivacyRiskLevelOptions"
          :key="option.value"
          :value="option.value"
          :label="option.label"
        />
      </el-select>
      <el-select v-model="categoryFilter" placeholder="风险类目" clearable style="width: 160px">
        <el-option
          v-for="option in RiskCategoryOptions"
          :key="option.value"
          :value="option.value"
          :label="option.label"
        />
      </el-select>
      <el-checkbox v-model="onlyManual">仅看人工调整</el-checkbox>
    </div>

    <div class="metrics">
      <StatCard label="严重" :value="levelCounts.CRITICAL" tone="danger" />
      <StatCard label="高" :value="levelCounts.HIGH" tone="warning" />
      <StatCard label="中" :value="levelCounts.MEDIUM" tone="success" />
      <StatCard label="低" :value="levelCounts.LOW" />
      <StatCard
        v-for="option in RiskCategoryOptions"
        :key="option.value"
        :label="option.label"
        :value="categoryCounts[option.value]"
        :hint="`命中条款数`"
      />
    </div>

    <el-alert
      v-if="riskyPriority.length > 0"
      type="error"
      :closable="false"
      show-icon
      style="margin-bottom: 14px"
      title="建议优先追问"
    >
      <div class="risk-summary-bar">
        <el-tag
          v-for="section in riskyPriority"
          :key="section.id"
          type="danger"
          effect="dark"
        >
          {{ section.section_no }} {{ section.heading }}（{{ section.risk_score }}/100）
        </el-tag>
      </div>
    </el-alert>

    <EmptyState v-if="sections.length === 0" title="该版本还没有条款" hint="请先到「文档导入」导入政策" />
    <EmptyState v-else-if="filteredSections.length === 0" title="没有符合筛选条件的条款" hint="调整等级或类目筛选" />
    <div v-else class="panel-stack">
      <div v-for="section in filteredSections" :key="section.id">
        <el-alert
          v-if="riskDelta(section)"
          :title="riskDelta(section)"
          :type="riskDelta(section).includes('升级') ? 'warning' : 'success'"
          :closable="false"
          show-icon
          style="margin-bottom: 6px"
        />
        <SectionCard
          :section="section"
          editable
          :on-override-risk="onOverrideRisk"
          :on-save-content="onSaveContent"
        />
      </div>
    </div>
  </section>
</template>
