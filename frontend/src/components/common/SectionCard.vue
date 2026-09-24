<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";
import type { PolicySection } from "../../types/PolicySection";
import RiskTag from "./RiskTag.vue";
import RiskEvidence from "./RiskEvidence.vue";
import { PrivacyRiskLevelOptions, NoRiskText } from "../../constants/PrivacyRiskLevel";
import type { RiskLevelOrNone } from "../../types/PrivacyRiskLevel";

const props = defineProps<{
  section: PolicySection;
  editable?: boolean;
  onOverrideRisk?: (id: number, level: RiskLevelOrNone) => Promise<void> | void;
  onSaveContent?: (id: number, patch: Pick<PolicySection, "heading" | "content">) => Promise<void> | void;
}>();

const showEvidence = ref(false);
const editing = ref(false);
const headingDraft = ref("");
const contentDraft = ref("");

const startEdit = () => {
  headingDraft.value = props.section.heading;
  contentDraft.value = props.section.content;
  editing.value = true;
};

const saveEdit = async () => {
  if (!headingDraft.value.trim() || !contentDraft.value.trim()) {
    ElMessage.warning("标题和正文都不能为空");
    return;
  }
  await props.onSaveContent?.(props.section.id, {
    heading: headingDraft.value,
    content: contentDraft.value
  });
  editing.value = false;
  ElMessage.success("条款已保存，风险等级已重新评估");
};

const onLevelChange = async (value: string) => {
  await props.onOverrideRisk?.(props.section.id, value as RiskLevelOrNone);
  ElMessage.success("风险等级已人工调整");
};
</script>

<template>
  <el-card class="section-card" shadow="never">
    <template #header>
      <div class="section-card-head">
        <div class="section-card-title">
          <span class="section-card-no">{{ section.section_no }}</span>
          <strong v-if="!editing">{{ section.heading }}</strong>
          <el-input v-else v-model="headingDraft" size="small" class="section-card-edit-title" />
          <el-tag v-if="section.category !== '一般条款'" size="small" type="warning" effect="plain">{{ section.category }}</el-tag>
        </div>
        <div class="section-card-actions">
          <RiskTag :level="section.risk_level" :score="section.risk_score" :manual="section.risk_manual" :show-score="false" />
          <el-button link type="primary" size="small" @click="showEvidence = !showEvidence">
            {{ showEvidence ? "收起依据" : `命中依据(${section.risk_hits.length})` }}
          </el-button>
          <el-button v-if="editable && !editing" link type="primary" size="small" @click="startEdit">编辑</el-button>
        </div>
      </div>
    </template>

    <p v-if="!editing" class="section-card-content">{{ section.content }}</p>
    <el-input v-else v-model="contentDraft" type="textarea" :rows="6" />

    <RiskEvidence v-if="showEvidence" :hits="section.risk_hits" :score="section.risk_score" :manual="section.risk_manual" />

    <div v-if="editing" class="section-card-edit-bar">
      <el-select
        :model-value="section.risk_level"
        size="small"
        style="width: 150px"
        @change="onLevelChange"
      >
        <el-option value="NONE" :label="NoRiskText" />
        <el-option v-for="option in PrivacyRiskLevelOptions" :key="option.value" :value="option.value" :label="option.label" />
      </el-select>
      <div class="section-card-edit-buttons">
        <el-button size="small" @click="editing = false">取消</el-button>
        <el-button size="small" type="primary" @click="saveEdit">保存并重评风险</el-button>
      </div>
    </div>
  </el-card>
</template>
