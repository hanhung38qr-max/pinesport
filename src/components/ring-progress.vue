<template>
  <view class="ring">
    <view class="ring__svg">
      <view class="ring__track" />
      <view
        class="ring__fill"
        :style="{ background: fillGradient }"
      />
      <view class="ring__inner">
        <slot />
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  percent: { type: Number, default: 0 },
  size: { type: Number, default: 180 },
  stroke: { type: Number, default: 12 },
  color: { type: String, default: '#12B76A' }
})

const fillGradient = computed(() => {
  const p = Math.max(0, Math.min(100, props.percent))
  return `conic-gradient(${props.color} 0deg ${p * 3.6}deg, #E8ECF2 ${p * 3.6}deg 360deg)`
})
</script>

<style scoped>
.ring {
  display: flex;
  justify-content: center;
}
.ring__svg {
  position: relative;
  border-radius: 50%;
}
.ring__track,
.ring__fill {
  position: absolute;
  inset: 0;
  border-radius: 50%;
}
.ring__fill {
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - var(--s)), #000 calc(100% - var(--s) + 1px));
  mask: radial-gradient(farthest-side, transparent calc(100% - var(--s)), #000 calc(100% - var(--s) + 1px));
}
.ring__inner {
  position: absolute;
  inset: var(--s);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  box-shadow: inset 0 0 0 1px rgba(16, 24, 40, 0.04);
}
</style>
