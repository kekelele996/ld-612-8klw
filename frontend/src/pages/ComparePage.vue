<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { ElMessage } from "element-plus";
import DiffViewer from "../components/common/DiffViewer.vue";
import EmptyState from "../components/common/EmptyState.vue";
import StatCard from "../components/common/StatCard.vue";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { usePolicySectionStore } from "../stores/PolicySectionStore";
import { useDiffResultStore } from "../stores/DiffResultStore";
import { useDiffFilter } from "../hooks/useDiffFilter";
import { DiffTypeOptions, DiffTypeText } from "../constants/DiffType";
import type { DiffType } from "../types/DiffType";
import type { PolicySection } from "../types/PolicySection";

const router = useRouter();
const documentStore = usePolicyDocumentStore();
const sectionStore = usePolicySectionStore();
const diffStore = useDiffResultStore();

const { selectedOldId, selectedNewId } = storeToRefs(documentStore);
const oldId = ref(selectedOldId.value);
const newId = ref(selectedNewId.value);
// localStorage 恢复是异步的，store 载入后把选择同步过来
watch(selectedOldId, (value) => {
  if (value && !oldId.value) oldId.value = value;
});
watch(selectedNewId, (value) => {
  if (value && !newId.value) newId.value = value;
});

watch([oldId, newId], ([o, n]) => {
  documentStore.selectPair(o, n);
});

const pairDiffs = computed(() => diffStore.byPair(oldId.value, newId.value));
const { activeTypes, filtered, toggleType, resetFilter } = useDiffFilter(pairDiffs);

const stats = computed(() => diffStore.pairStats(oldId.value, newId.value));

const oldDoc = computed(() => documentStore.getById(oldId.value));
const newDoc = computed(() => documentStore.getById(newId.value));

const sectionMap = computed(() => new Map(sectionStore.rows.map((section) => [section.id, section])));
const hitsFor = (sectionId: number) => sectionMap.value.get(sectionId)?.risk_hits ?? [];
const manualFor = (sectionId: number) => sectionMap.value.get(sectionId)?.risk_manual ?? false;

const hasPair = computed(() => pairDiffs.value.length > 0);

const generate = async () => {
  if (oldId.value === newId.value) {
    ElMessage.error("请选择两版不同的政策");
    return;
  }
  try {
    await diffStore.generate(oldId.value, newId.value);
    ElMessage.success(`已生成 ${diffStore.byPair(oldId.value, newId.value).length} 条差异`);
  } catch (error) {
    ElMessage.error(diffStore.error || (error as Error).message);
  }
};

const typeCount = (type: DiffType) => stats.value[type];

const riskStats = computed(() => {
  const sections: PolicySection[] = sectionStore.byDocument(newId.value);
  return {
    critical: sections.filter((s) => s.risk_level === "CRITICAL").length,
    high: sections.filter((s) => s.risk_level === "HIGH").length,
    total: sections.length
  };
});

const goRisks = () => router.push("/risks");
</script>

<template>
  <section>
    <header class="page-head">
      <h1>版本对比</h1>
      <p>章节先按编号对应、编号变化时按标题对应；内容变化时两侧原文并排保留并标注变化类型。</p>
    </header>

    <div class="page-toolbar">
      <el-select v-model="oldId" placeholder="旧版本" style="width: 280px">
        <el-option
          v-for="doc in documentStore.byOldest"
          :key="`old-${doc.id}`"
          :value="doc.id"
          :label="`${doc.version_label}（${doc.section_count} 条）`"
        />
      </el-select>
      <span>→</span>
      <el-select v-model="newId" placeholder="新版本" style="width: 280px">
        <el-option
          v-for="doc in documentStore.byOldest"
          :key="`new-${doc.id}`"
          :value="doc.id"
          :label="`${doc.version_label}（${doc.section_count} 条）`"
        />
      </el-select>
      <el-button type="primary" :loading="diffStore.generating" @click="generate">生成 / 刷新对比</el-button>
      <div class="spacer" />
      <el-button link type="primary" @click="goRisks">查看风险标注 →</el-button>
    </div>

    <template v-if="hasPair">
      <div class="metrics">
        <StatCard label="新增条款" :value="typeCount('ADDED')" tone="success" />
        <StatCard label="移除条款" :value="typeCount('REMOVED')" tone="danger" />
        <StatCard label="改写条款" :value="typeCount('MODIFIED')" tone="warning" />
        <StatCard label="移动条款" :value="typeCount('MOVED')" />
        <StatCard label="未变化" :value="typeCount('UNCHANGED')" />
        <StatCard label="新版严重/高风险" :value="`${riskStats.critical}/${riskStats.high}`" tone="danger" :hint="`共 ${riskStats.total} 条`" />
      </div>

      <div class="page-toolbar">
        <el-radio-group size="small">
          <el-radio-button :value="''" :class="{ 'filter-active': activeTypes.length === 0 }" @click="resetFilter">
            全部（{{ pairDiffs.length }}）
          </el-radio-button>
          <el-radio-button
            v-for="option in DiffTypeOptions"
            :key="option.value"
            :value="option.value"
            :class="{ 'filter-active': activeTypes.includes(option.value) }"
            @click="toggleType(option.value)"
          >
            {{ DiffTypeText[option.value] }}（{{ typeCount(option.value) }}）
          </el-radio-button>
        </el-radio-group>
      </div>

      <div class="panel-stack">
        <DiffViewer
          v-for="diff in filtered"
          :key="diff.id"
          :diff="diff"
          :risk-hits="hitsFor(diff.new_section_id || diff.old_section_id)"
          :risk-manual="manualFor(diff.new_section_id || diff.old_section_id)"
          :default-collapsed="diff.diff_type === 'UNCHANGED'"
        />
        <EmptyState
          v-if="filtered.length === 0"
          title="当前筛选下没有差异"
          hint="点击上方按钮切换变化类型"
        />
      </div>
    </template>

    <EmptyState v-else title="还没有版本对比结果" hint="请在上方选择新旧两版政策后点击「生成 / 刷新对比」">
      <el-button type="primary" :disabled="!oldDoc || !newDoc" @click="generate">立即生成对比</el-button>
    </EmptyState>
  </section>
</template>
