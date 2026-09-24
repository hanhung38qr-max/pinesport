<template>
  <view class="history">
    <view class="segment">
      <view
        v-for="s in segments"
        :key="s.id"
        class="segment__item"
        :class="{ active: range === s.id }"
        @click="range = s.id"
      >{{ s.label }}</view>
    </view>

    <view class="summary card">
      <view class="summary__item">
        <text class="summary__v">{{ summary.jumps }}</text>
        <text class="summary__k">下数</text>
      </view>
      <view class="summary__item">
        <text class="summary__v">{{ fmtDuration(summary.durationSec) }}</text>
        <text class="summary__k">时长</text>
      </view>
      <view class="summary__item">
        <text class="summary__v">{{ round1(summary.calories) }}</text>
        <text class="summary__k">千卡</text>
      </view>
      <view class="summary__item">
        <text class="summary__v">{{ summary.count }}</text>
        <text class="summary__k">场次</text>
      </view>
    </view>

    <bar-chart :data="chartData" :meta="chartMeta" />

    <view class="section-title">明细</view>
    <view v-if="filtered.length" class="list">
      <view v-for="s in filtered" :key="s.id" class="row card" @click="showDetail(s)">
        <view class="row__left">
          <text class="row__date">{{ s.date }}</text>
          <text class="row__mode">{{ modeLabel(s.mode) }} · {{ fmtTime(s.startTime) }}</text>
        </view>
        <view class="row__right">
          <text class="row__jumps">{{ s.jumps }} 下</text>
          <text class="row__meta">{{ fmtDuration(s.durationSec) }} · {{ round1(s.calories) }} 千卡</text>
        </view>
      </view>
    </view>
    <view v-else class="empty card">
      <text class="empty__t">暂无记录</text>
      <text class="empty__b">去「计数」页完成第一次跳绳吧</text>
      <button class="btn-primary" @click="goCount">去跳绳</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import BarChart from '../../components/bar-chart.vue'
import { getSessions, getDailyMap, formatDateKey } from '../../utils/store.js'
import { fmtDuration, lastNDays, startOfWeekKey, weekdayLabel } from '../../utils/format.js'

const segments = [
  { id: 'week', label: '周' },
  { id: 'month', label: '月' },
  { id: 'all', label: '全部' }
]

const range = ref('week')
const sessions = ref([])
const dailyMap = ref({})

onShow(refresh)
watch(range, refresh)

function refresh() {
  sessions.value = getSessions().slice().reverse()
  dailyMap.value = getDailyMap()
}

const filtered = computed(() => {
  if (range.value === 'all') return sessions.value
  const now = new Date()
  if (range.value === 'week') {
    const start = startOfWeekKey(now)
    return sessions.value.filter((s) => {
      const [y, m, d] = s.date.split('-').map(Number)
      return new Date(y, m - 1, d) >= start
    })
  }
  // month
  return sessions.value.filter((s) => {
    const [y, m] = s.date.split('-').map(Number)
    return y === now.getFullYear() && m === now.getMonth() + 1
  })
})

const summary = computed(() =>
  filtered.value.reduce(
    (a, s) => {
      a.jumps += s.jumps
      a.durationSec += s.durationSec
      a.calories += s.calories
      a.count += 1
      return a
    },
    { jumps: 0, durationSec: 0, calories: 0, count: 0 }
  )
)

const chartData = computed(() => {
  if (range.value === 'week') {
    const days = lastNDays(7)
    const todayKey = days[days.length - 1]
    return days.map((k) => ({
      label: weekdayLabel(k),
      value: dailyMap.value[k]?.jumps || 0,
      active: k === todayKey
    }))
  }
  if (range.value === 'month') {
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const today = now.getDate()
    const step = daysInMonth > 20 ? 3 : 1
    const out = []
    for (let d = 1; d <= daysInMonth; d += step) {
      let sum = 0
      for (let x = d; x < Math.min(d + step, daysInMonth + 1); x++) {
        const key = formatDateKey(new Date(now.getFullYear(), now.getMonth(), x))
        sum += dailyMap.value[key]?.jumps || 0
      }
      out.push({ label: String(d), value: sum, active: d <= today && d + step > today })
    }
    return out
  }
  // all: last 14 days with data aggregated by week-ish buckets (last 14 days)
  const days = lastNDays(14)
  return days.map((k) => ({
    label: k.slice(8),
    value: dailyMap.value[k]?.jumps || 0,
    active: k === days[days.length - 1]
  }))
})

const chartMeta = computed(() => {
  const labels = { week: '最近 7 天', month: '本月按天', all: '最近 14 天' }
  return labels[range.value]
})

function modeLabel(m) {
  return { camera: '摄像头AI', sensor: '体感', manual: '手动' }[m] || m
}

function fmtTime(ts) {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function round1(n) {
  return Math.round((n || 0) * 10) / 10
}

function showDetail(s) {
  uni.showModal({
    title: `${s.date} · ${s.jumps} 下`,
    content: `时长 ${fmtDuration(s.durationSec)}，消耗约 ${round1(s.calories)} 千卡，模式：${modeLabel(s.mode)}`,
    showCancel: false
  })
}

function goCount() {
  uni.switchTab({ url: '/pages/count/count' })
}
</script>

<style scoped>
.history {
  padding: 24rpx 24rpx 48rpx;
}
.segment {
  display: flex;
  background: #eaecf0;
  border-radius: 999rpx;
  padding: 6rpx;
  margin-bottom: 20rpx;
}
.segment__item {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  border-radius: 999rpx;
  color: #667085;
  font-size: 26rpx;
}
.segment__item.active {
  background: #fff;
  color: #101828;
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.08);
}
.summary {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.summary__item {
  flex: 1;
  text-align: center;
}
.summary__v {
  display: block;
  font-size: 32rpx;
  font-weight: 800;
}
.summary__k {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #98a2b3;
}
.list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
}
.row__date {
  display: block;
  font-weight: 700;
  font-size: 28rpx;
}
.row__mode {
  display: block;
  margin-top: 6rpx;
  color: #98a2b3;
  font-size: 22rpx;
}
.row__right {
  text-align: right;
}
.row__jumps {
  display: block;
  color: #12b76a;
  font-weight: 800;
  font-size: 30rpx;
}
.row__meta {
  display: block;
  margin-top: 4rpx;
  color: #667085;
  font-size: 22rpx;
}
.empty {
  text-align: center;
  padding: 60rpx 32rpx;
}
.empty__t {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
}
.empty__b {
  display: block;
  margin: 12rpx 0 32rpx;
  color: #98a2b3;
  font-size: 24rpx;
}
</style>
