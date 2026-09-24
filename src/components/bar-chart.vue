<template>
  <view class="chart">
    <view class="chart__bars">
      <view v-for="(b, i) in bars" :key="i" class="chart__col">
        <view class="chart__value" v-if="b.value > 0">{{ b.value }}</view>
        <view
          class="chart__bar"
          :class="{ active: b.active }"
          :style="{ height: barHeight(b) }"
        />
        <view class="chart__label" :class="{ active: b.active }">{{ b.label }}</view>
      </view>
    </view>
    <view class="chart__meta" v-if="meta">{{ meta }}</view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  meta: { type: String, default: '' }
})

const maxVal = computed(() => {
  const m = Math.max(1, ...props.data.map((d) => d.value || 0))
  return m
})

const bars = computed(() => props.data)

function barHeight(b) {
  const ratio = (b.value || 0) / maxVal.value
  const h = Math.max(4, Math.round(ratio * 120))
  return `${h}px`
}
</script>

<style scoped>
.chart {
  background: #fff;
  border-radius: 16px;
  padding: 20px 12px 16px;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.06);
}
.chart__bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  min-height: 160px;
  gap: 4px;
}
.chart__col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
}
.chart__value {
  font-size: 10px;
  color: #667085;
  margin-bottom: 4px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chart__bar {
  width: 70%;
  max-width: 28px;
  border-radius: 6px 6px 4px 4px;
  background: linear-gradient(180deg, #6ce9a6 0%, #12b76a 100%);
  opacity: 0.45;
  transition: height 0.3s ease;
}
.chart__bar.active {
  opacity: 1;
  box-shadow: 0 4px 10px rgba(18, 183, 106, 0.35);
}
.chart__label {
  margin-top: 8px;
  font-size: 11px;
  color: #98a2b3;
  white-space: nowrap;
}
.chart__label.active {
  color: #12b76a;
  font-weight: 600;
}
.chart__meta {
  margin-top: 12px;
  text-align: center;
  font-size: 12px;
  color: #667085;
}
</style>
