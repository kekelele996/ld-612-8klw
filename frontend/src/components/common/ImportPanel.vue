<script setup lang="ts">
import { reactive } from "vue";
import { usePolicyParser } from "../../hooks/usePolicyParser";
import { SAMPLE_OLD_POLICY, SAMPLE_NEW_POLICY } from "../../mocks/seedData";
import type { PolicyDocumentImport } from "../../types/PolicyDocument";
import RiskTag from "./RiskTag.vue";
import EmptyState from "./EmptyState.vue";

const props = defineProps<{
  submitting?: boolean;
  submitLabel?: string;
  modelValue?: PolicyDocumentImport | null;
}>();

const emit = defineEmits<{
  (event: "submit", form: PolicyDocumentImport): void;
}>();

const form = reactive<PolicyDocumentImport>({
  title: props.modelValue?.title ?? "某App隐私政策",
  version_label: props.modelValue?.version_label ?? "",
  raw_text: props.modelValue?.raw_text ?? ""
});

const { rawText, parseError, previewSections, sectionCount, parse } = usePolicyParser();

const onInput = () => {
  form.raw_text = rawText.value;
};

const loadSample = (which: "old" | "new") => {
  const text = which === "old" ? SAMPLE_OLD_POLICY : SAMPLE_NEW_POLICY;
  form.title = "某App隐私政策";
  form.version_label = which === "old" ? "v2025.03" : "v2026.08";
  parse(text);
  onInput();
};

const submit = () => {
  emit("submit", { ...form });
};
</script>

<template>
  <div class="import-panel">
    <div class="form-grid">
      <label>
        <span>文档标题</span>
        <el-input v-model="form.title" placeholder="例如：某App隐私政策" />
      </label>
      <label class="version">
        <span>版本标签 <em>*</em></span>
        <el-input v-model="form.version_label" placeholder="例如：v2026.08 / 2026-08-15 版" />
      </label>
    </div>

    <label class="textarea">
      <span>政策正文 <em>*</em>（支持“第X条 / 1. / 一、”章节头，粘贴后自动分段）</span>
      <el-input
        v-model="rawText"
        type="textarea"
        :rows="14"
        placeholder="将整份隐私政策粘贴到这里……"
        @input="parse(rawText); onInput()"
      />
    </label>

    <div class="toolbar">
      <div class="samples">
        <el-button text @click="loadSample('old')">载入旧版示例</el-button>
        <el-button text @click="loadSample('new')">载入新版示例</el-button>
      </div>
      <div class="meta">
        <el-tag v-if="sectionCount > 0" type="success">已识别 {{ sectionCount }} 个章节</el-tag>
        <el-tag v-else-if="parseError" type="danger">{{ parseError }}</el-tag>
        <el-button type="primary" :loading="submitting" @click="submit">
          {{ submitLabel ?? "导入并自动分段" }}
        </el-button>
      </div>
    </div>

    <div v-if="parseError && rawText" class="error-hint">{{ parseError }}</div>

    <div v-if="previewSections.length > 0" class="preview">
      <h4>分段预览（导入前可核对编号、标题与风险预判）</h4>
      <div class="preview-list">
        <div v-for="(section, index) in previewSections" :key="index" class="preview-item">
          <div class="preview-head">
            <span class="no">{{ section.section_no }}</span>
            <strong>{{ section.heading }}</strong>
            <RiskTag :level="section.risk.level" show-advice />
          </div>
          <p>{{ section.content.slice(0, 90) }}{{ section.content.length > 90 ? "…" : "" }}</p>
        </div>
      </div>
    </div>
    <EmptyState
      v-else-if="!rawText"
      title="等待导入政策文本"
      description="可直接粘贴，或点击上方按钮载入内置的新旧两版示例"
    />
  </div>
</template>

<style scoped>
.import-panel { display: grid; gap: 14px; }
.form-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }
label { display: grid; gap: 6px; font-size: 13px; color: #4a5248; }
label em { color: #c01048; font-style: normal; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.samples { display: flex; gap: 4px; }
.meta { display: flex; align-items: center; gap: 10px; }
.error-hint { color: #b42318; font-size: 13px; }
.preview { border-top: 1px dashed #c9c2b2; padding-top: 12px; }
.preview h4 { margin: 0 0 10px; font-size: 14px; color: #274335; }
.preview-list { display: grid; gap: 8px; max-height: 320px; overflow: auto; padding-right: 4px; }
.preview-item { border: 1px solid #e0dccb; border-radius: 8px; padding: 10px 12px; background: #fffdf6; }
.preview-head { display: flex; align-items: center; gap: 8px; }
.preview-head .no { font-size: 12px; color: #7d4d18; background: #f3e9d6; padding: 1px 8px; border-radius: 6px; font-weight: 700; }
.preview-head strong { font-size: 13px; flex: 1; }
.preview-item p { margin: 6px 0 0; font-size: 12px; color: #6b7167; line-height: 1.7; }
@media (max-width: 760px) { .form-grid { grid-template-columns: 1fr; } }
</style>
