<script setup lang="ts">
import { usePolicyParser } from "../../hooks/usePolicyParser";

const props = defineProps<{
  loading?: boolean;
  titleDraft: string;
  versionDraft: string;
}>();

const emit = defineEmits<{
  (e: "update:titleDraft", value: string): void;
  (e: "update:versionDraft", value: string): void;
  (e: "import", payload: { title: string; version_label: string; raw_text: string }): void;
}>();

const { rawText, preview, sectionCount, error } = usePolicyParser();

const submit = () => {
  emit("import", {
    title: props.titleDraft,
    version_label: props.versionDraft,
    raw_text: rawText.value
  });
};
</script>

<template>
  <el-card class="import-panel" shadow="never">
    <template #header>
      <div class="import-panel-head">
        <strong>导入新版本隐私政策</strong>
        <span class="import-panel-tip">支持「一、」「第1条」「1. 标题」三种编号，粘贴后自动分段并标注风险</span>
      </div>
    </template>

    <el-form label-position="top" @submit.prevent>
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item label="政策名称">
            <el-input :model-value="titleDraft" @update:model-value="emit('update:titleDraft', $event)" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="版本标签（如 v3.1（2026-10-01））">
            <el-input
              :model-value="versionDraft"
              placeholder="请填写新版本标签"
              @update:model-value="emit('update:versionDraft', $event)"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="政策正文">
        <el-input
          v-model="rawText"
          type="textarea"
          :rows="12"
          placeholder="将完整隐私政策文本粘贴到此处，标题需独占一行（如：二、我们如何收集和使用您的个人信息）"
        />
      </el-form-item>
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
        show-icon
        style="margin-bottom: 10px"
      />
      <el-alert
        v-else-if="rawText.trim() && !preview.valid"
        title="尚未识别到条款标题，请确认标题独占一行并带编号"
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 10px"
      />
      <div class="import-panel-footer">
        <div v-if="preview.valid" class="import-panel-preview">
          <el-tag type="success" effect="plain">已识别 {{ sectionCount }} 个条款</el-tag>
          <span v-if="preview.preamble" class="import-panel-preamble">序言 {{ preview.preamble.length }} 字</span>
          <div class="import-panel-sections">
            <el-tooltip v-for="section in preview.sections.slice(0, 8)" :key="section.order_index" placement="top">
              <template #content>
                <div style="max-width: 360px">
                  <p>{{ section.section_no }} {{ section.heading }}</p>
                  <p>{{ section.content.slice(0, 120) }}…</p>
                </div>
              </template>
              <el-tag size="small" class="import-panel-section-tag">
                {{ section.section_no }} {{ section.heading }}
              </el-tag>
            </el-tooltip>
            <el-tag v-if="sectionCount > 8" size="small">+{{ sectionCount - 8 }}</el-tag>
          </div>
        </div>
        <el-button type="primary" :loading="loading" :disabled="!preview.valid" @click="submit">
          导入并自动分段
        </el-button>
      </div>
    </el-form>
  </el-card>
</template>
