<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { ElMessage } from "element-plus";
import RiskTag from "../components/common/RiskTag.vue";
import StatusBadge from "../components/common/StatusBadge.vue";
import StatCard from "../components/common/StatCard.vue";
import EmptyState from "../components/common/EmptyState.vue";
import ReviewChecklist from "../components/common/ReviewChecklist.vue";
import { usePolicyDocumentStore } from "../stores/PolicyDocumentStore";
import { useDiffResultStore } from "../stores/DiffResultStore";
import { useReviewNoteStore } from "../stores/ReviewNoteStore";
import { SectionCategoryText, SECTION_CATEGORY_ORDER } from "../constants/SectionCategory";
import { PrivacyRiskLevelText, PrivacyRiskLevelWeight } from "../constants/PrivacyRiskLevel";
import { isAppError } from "../utils/AppError";
import { truncate } from "../utils/formatters";
import type { PolicySection } from "../types/PolicySection";
import type { ReviewNote } from "../types/ReviewNote";
import type { RiskHit } from "../types/RiskHit";
import type { SectionCategory } from "../types/SectionCategory";

interface RiskSectionRow {
  key: string;
  documentId: number;
  versionLabel: string;
  section: PolicySection;
  hits: RiskHit[];
}

const documentStore = usePolicyDocumentStore();
const diffStore = useDiffResultStore();
const noteStore = useReviewNoteStore();
const { rows: diffRows } = storeToRefs(diffStore);

const activeCategory = ref<Exclude<SectionCategory, "OTHER">>("THIRD_PARTY_SHARING");
const pendingDraft = ref<{ diffId: number; tag: ReviewNote["tag"] } | null>(null);

onMounted(async () => {
  await Promise.all([documentStore.load(), diffStore.load(), noteStore.load()]);
});

/** 从最新对比结果的风险命中构建可浏览清单（等级与依据可解释） */
const riskRows = computed<RiskSectionRow[]>(() => {
  const rows: RiskSectionRow[] = [];
  for (const diff of diffRows.value) {
    for (const hit of diff.risks) {
      if (hit.category !== activeCategory.value) continue;
      const section = (hit.side === "old" ? diff.old_section : diff.new_section) as PolicySection | null;
      if (!section) continue;
      const documentId = hit.side === "old" ? diff.old_document_id : diff.new_document_id;
      const document = documentStore.getById(documentId);
      rows.push({
        key: `${diff.id}-${hit.category}-${hit.side}`,
        documentId,
        versionLabel: document?.version_label ?? `#${documentId}`,
        section,
        hits: diff.risks.filter((item) => item.category === activeCategory.value)
      });
    }
  }
  return rows.sort((a, b) => {
    const wa = Math.max(...a.hits.map((hit) => PrivacyRiskLevelWeight[hit.level]));
    const wb = Math.max(...b.hits.map((hit) => PrivacyRiskLevelWeight[hit.level]));
    return wb - wa;
  });
});

const categoryCounts = computed(() => {
  const counts: Record<string, number> = {
    THIRD_PARTY_SHARING: 0,
    LOCATION: 0,
    SENSITIVE_INFO: 0,
    RETENTION: 0
  };
  const seen = new Set<string>();
  diffRows.value.forEach((diff) => {
    diff.risks.forEach((hit) => {
      const key = `${diff.id}-${hit.category}`;
      if (!seen.has(key)) {
        seen.add(key);
        counts[hit.category] += 1;
      }
    });
  });
  return counts;
});

const criticalCount = computed(
  () =>
    new Set(
      diffRows.value
        .filter((diff) => diff.risk_level === "CRITICAL" || diff.risk_level === "HIGH")
        .map((diff) => diff.id)
    ).size
);

const onAddNote = (row: RiskSectionRow) => {
  const diff = diffRows.value.find(
    (item) =>
      (item.old_section as PolicySection | null)?.id === row.section.id ||
      (item.new_section as PolicySection | null)?.id === row.section.id
  );
  if (!diff) {
    ElMessage.warning("该条款不在最近一次版本对比中，请先到「版本对比」执行对比");
    return;
  }
  pendingDraft.value = { diffId: diff.id, tag: row.section.category as ReviewNote["tag"] };
};

const createNote = async (draft: {
  diff_result_id: number;
  tag: ReviewNote["tag"];
  comment: string;
  reviewer: string;
}) => {
  try {
    await noteStore.add(draft);
    pendingDraft.value = null;
    ElMessage.success("已加入审阅清单");
  } catch (err) {
    ElMessage.error(isAppError(err) ? err.message : "添加失败");
  }
};

const pairNotes = computed<ReviewNote[]>(() => noteStore.rows);
</script>

<template>
  <div class="risks-page">
    <section class="metrics">
      <StatCard label="高/严重条款" :value="criticalCount" tone="danger" hint="优先追问" />
      <StatCard
        v-for="category in SECTION_CATEGORY_ORDER.filter((c) => c !== 'OTHER')"
        :key="category"
        :label="SectionCategoryText[category]"
        :value="categoryCounts[category] ?? 0"
        :tone="(categoryCounts[category] ?? 0) > 0 ? 'warn' : ''"
      />
    </section>

    <section class="panel">
      <h2>风险类别</h2>
      <div class="tabs">
        <button
          v-for="category in SECTION_CATEGORY_ORDER.filter((c) => c !== 'OTHER')"
          :key="category"
          class="tab"
          :class="{ active: activeCategory === category }"
          @click="activeCategory = category as Exclude<SectionCategory, 'OTHER'>"
        >
          {{ SectionCategoryText[category] }}
          <em>{{ categoryCounts[category] ?? 0 }}</em>
        </button>
      </div>
    </section>

    <section v-if="riskRows.length" class="risk-list">
      <article v-for="row in riskRows" :key="row.key" class="risk-card">
        <header>
          <div class="meta">
            <el-tag size="small">{{ row.versionLabel }}</el-tag>
            <strong>{{ row.section.heading }}</strong>
            <span class="no">{{ row.section.section_no }}</span>
          </div>
          <RiskTag :level="row.hits[0]?.level ?? null" show-advice />
        </header>
        <p class="content">{{ truncate(row.section.content, 220) }}</p>
        <div v-for="hit in row.hits" :key="`${hit.category}-${hit.side}`" class="hit">
          <div class="hit-head">
            <StatusBadge :value="hit.category" kind="category" />
            <span>{{ PrivacyRiskLevelText[hit.level] }}风险</span>
            <span class="side">{{ hit.side === 'old' ? '旧版' : '新版' }} · 权重 {{ hit.score }} 分</span>
          </div>
          <p class="reason">{{ hit.reason }}</p>
          <ul class="evidence">
            <li v-for="(sentence, i) in hit.evidence" :key="i">
              <b>{{ hit.matchedKeywords[i] ?? "证据" }}</b>：{{ sentence }}
            </li>
          </ul>
        </div>
        <footer>
          <el-button size="small" type="warning" @click="onAddNote(row)">追问并加入审阅清单</el-button>
        </footer>
      </article>
    </section>

    <EmptyState
      v-else
      title="当前类别暂无命中"
      description="先在「版本对比」中执行一次对比；扫描覆盖第三方共享、定位、敏感信息与长期保存四类关键词"
    />

    <section v-if="pendingDraft" class="panel">
      <h2>新增审阅备注</h2>
      <ReviewChecklist :notes="[]" :pending-draft="pendingDraft" @create="createNote" />
    </section>

    <section v-if="pairNotes.length" class="panel">
      <h2>本页相关备注</h2>
      <ReviewChecklist
        :notes="pairNotes"
        :diffs="diffRows"
        locked-status-filter="OPEN"
        empty-title="暂无待处理备注"
        @update="(id, patch) => noteStore.update(id, patch)"
        @remove="(id) => noteStore.remove(id)"
      />
    </section>
  </div>
</template>

<style scoped>
.risks-page { display: grid; gap: 18px; }
.metrics { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }
.panel { background: #fbfaf4; border: 1px solid #d8d6c8; border-radius: 10px; padding: 18px 20px; }
.panel h2 { margin: 0 0 12px; font-size: 16px; color: #274335; }
.tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.tab { border: 1px solid #c9c2b2; background: #fff; border-radius: 8px; padding: 8px 16px; font-size: 14px; cursor: pointer; display: flex; gap: 8px; align-items: center; }
.tab em { font-style: normal; background: #f3e9d6; border-radius: 999px; padding: 0 8px; font-size: 12px; }
.tab.active { background: #274335; color: #f5f1e6; border-color: #274335; }
.risk-list { display: grid; gap: 12px; }
.risk-card { background: #fbfaf4; border: 1px solid #d8d6c8; border-left: 4px solid #c01048; border-radius: 10px; padding: 16px 18px; display: grid; gap: 10px; }
.risk-card header { display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap; }
.meta { display: flex; align-items: center; gap: 8px; }
.meta strong { font-size: 15px; }
.meta .no { font-size: 12px; color: #7d4d18; background: #f3e9d6; padding: 1px 8px; border-radius: 6px; }
.content { margin: 0; font-size: 13px; color: #3c423b; line-height: 1.8; white-space: pre-wrap; }
.hit { border: 1px solid #ecd9c0; background: #fffaf1; border-radius: 8px; padding: 10px 12px; display: grid; gap: 6px; }
.hit-head { display: flex; gap: 10px; align-items: center; font-size: 12px; color: #7d4d18; }
.hit-head .side { margin-left: auto; color: #8a8372; }
.reason { margin: 0; font-size: 13px; }
.evidence { margin: 0; padding-left: 18px; font-size: 12px; color: #6b6455; display: grid; gap: 2px; }
.evidence b { color: #b42318; }
footer { display: flex; justify-content: flex-end; }
@media (max-width: 1000px) { .metrics { grid-template-columns: repeat(2, 1fr); } }
</style>
