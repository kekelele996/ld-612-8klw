<script setup lang="ts">
import type { RiskHit } from "../../types/RiskHit";
import { RiskCategoryText } from "../../constants/RiskCategory";

withDefaults(
  defineProps<{
    hits: RiskHit[];
    score: number;
    manual?: boolean;
    compact?: boolean;
  }>(),
  { manual: false, compact: false }
);
</script>

<template>
  <div class="risk-evidence">
    <div v-if="hits.length === 0" class="risk-evidence-empty">未命中第三方共享、定位、敏感信息或长期保存相关规则。</div>
    <ul v-else class="risk-evidence-list">
      <li v-for="(hit, index) in compact ? hits.slice(0, 3) : hits" :key="`${hit.category}-${hit.keyword}-${index}`" class="risk-evidence-item">
        <el-tag size="small" :type="hit.kind === 'TRIGGER' ? 'danger' : 'success'" effect="plain">
          {{ RiskCategoryText[hit.category] }}
        </el-tag>
        <span class="risk-evidence-keyword">{{ hit.keyword }}</span>
        <span class="risk-evidence-weight">{{ hit.kind === "TRIGGER" ? `+${hit.weight}` : "缓释" }}</span>
        <code class="risk-evidence-snippet">…{{ hit.snippet }}…</code>
      </li>
    </ul>
    <p v-if="compact && hits.length > 3" class="risk-evidence-more">另有 {{ hits.length - 3 }} 条命中，展开查看全部依据。</p>
    <p class="risk-evidence-rule">
      计分规则：同一类目取最高有效触发权重，其余类目按 30% 折算后求和（满分 100）；
      阈值 40/60/80 对应中 / 高 / 严重。<span v-if="manual">当前等级已被人工覆盖。</span>
    </p>
  </div>
</template>
