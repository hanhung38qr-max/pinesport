<template>
  <view class="home">
    <view class="hero card">
      <view class="hero__row">
        <view>
          <text class="hero__hi">你好，运动家</text>
          <text class="hero__sub">无广告 · 本地记录 · 摄像头 AI 计数</text>
        </view>
        <view class="hero__badge" @click="goSettings">⚙️</view>
      </view>

      <view class="hero__ring-wrap">
        <view class="hero__ring" :style="{ background: ringBg }">
          <view class="hero__ring-inner">
            <text class="hero__num">{{ progress.today.jumps }}</text>
            <text class="hero__unit">/ {{ progress.goal }} 下</text>
            <text class="hero__pct">{{ progress.percent }}%</text>
          </view>
        </view>
      </view>

      <button class="btn-primary hero__cta" @click="goCount">开始跳绳</button>
    </view>

    <view class="stats">
      <view class="stat card">
        <text class="stat__v">{{ progress.today.count }}</text>
        <text class="stat__k">今日次数</text>
      </view>
      <view class="stat card">
        <text class="stat__v">{{ fmtDuration(progress.today.durationSec) }}</text>
        <text class="stat__k">今日时长</text>
      </view>
      <view class="stat card">
        <text class="stat__v">{{ round1(progress.today.calories) }}</text>
        <text class="stat__k">千卡</text>
      </view>
    </view>

    <view class="section-title">最近 7 天</view>
    <bar-chart :data="weekData" :meta="weekMeta" />

    <view class="section-title">总览</view>
    <view class="overview card">
      <view class="overview__item">
        <text class="overview__v">{{ totals.jumps }}</text>
        <text class="overview__k">累计下数</text>
      </view>
      <view class="overview__item">
        <text class="overview__v">{{ streak }}</text>
        <text class="overview__k">连续天数</text>
      </view>
      <view class="overview__item">
        <text class="overview__v">{{ unlockedCount }}/{{ achievementTotal }}</text>
        <text class="overview__k">已解锁成就</text>
      </view>
    </view>

    <view class="tips card">
      <text class="tips__t">摄像头计数说明</text>
      <text class="tips__b">将手机立稳，全身入画，跳起时 AI 识别身体起伏自动 +1。光线充足、背景干净效果更好。也可切换体感 / 手动模式。</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import BarChart from '../../components/bar-chart.vue'
import {
  getDailyGoalProgress,
  getTotals,
  calcStreak,
  getDailyMap
} from '../../utils/store.js'
import { fmtDuration, lastNDays, weekdayLabel } from '../../utils/format.js'
import { evaluateAchievements } from '../../utils/achievements.js'

const progress = ref(getDailyGoalProgress())
const totals = ref(getTotals())
const streak = ref(calcStreak())
const dailyMap = ref(getDailyMap())
const achievements = ref(evaluateAchievements())

function refresh() {
  progress.value = getDailyGoalProgress()
  totals.value = getTotals()
  streak.value = calcStreak()
  dailyMap.value = getDailyMap()
  achievements.value = evaluateAchievements()
}

onShow(refresh)

const ringBg = computed(() => {
  const p = progress.value.percent
  return `conic-gradient(#12B76A 0deg ${p * 3.6}deg, #E8ECF2 ${p * 3.6}deg 360deg)`
})

const weekData = computed(() => {
  const days = lastNDays(7)
  const todayKey = days[days.length - 1]
  return days.map((k) => ({
    label: weekdayLabel(k),
    value: dailyMap.value[k]?.jumps || 0,
    active: k === todayKey
  }))
})

const weekMeta = computed(() => {
  const sum = weekData.value.reduce((a, b) => a + b.value, 0)
  return `本周累计 ${sum} 下`
})

const unlockedCount = computed(() => achievements.value.earned.length)
const achievementTotal = computed(() => achievements.value.list.length)

function round1(n) {
  return Math.round((n || 0) * 10) / 10
}

function goCount() {
  uni.switchTab({ url: '/pages/count/count' })
}

function goSettings() {
  uni.navigateTo({ url: '/pages/settings/settings' })
}
</script>

<style scoped>
.home {
  padding: 24rpx 24rpx 48rpx;
}
.hero__row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.hero__hi {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
}
.hero__sub {
  display: block;
  margin-top: 6rpx;
  color: #667085;
  font-size: 24rpx;
}
.hero__badge {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  background: #f2f4f7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
}
.hero__ring-wrap {
  display: flex;
  justify-content: center;
  margin: 36rpx 0 28rpx;
}
.hero__ring {
  width: 340rpx;
  height: 340rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.hero__ring-inner {
  width: 290rpx;
  height: 290rpx;
  border-radius: 50%;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 0 0 1px rgba(16, 24, 40, 0.04);
}
.hero__num {
  font-size: 72rpx;
  font-weight: 800;
  line-height: 1;
}
.hero__unit {
  margin-top: 8rpx;
  color: #667085;
  font-size: 24rpx;
}
.hero__pct {
  margin-top: 6rpx;
  color: #12b76a;
  font-weight: 700;
  font-size: 26rpx;
}
.hero__cta {
  width: 100%;
}
.stats {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}
.stat {
  flex: 1;
  text-align: center;
  padding: 24rpx 8rpx;
}
.stat__v {
  display: block;
  font-size: 36rpx;
  font-weight: 800;
}
.stat__k {
  display: block;
  margin-top: 6rpx;
  color: #98a2b3;
  font-size: 22rpx;
}
.overview {
  display: flex;
  justify-content: space-around;
  text-align: center;
}
.overview__v {
  display: block;
  font-size: 34rpx;
  font-weight: 800;
}
.overview__k {
  display: block;
  margin-top: 4rpx;
  color: #98a2b3;
  font-size: 22rpx;
}
.tips {
  margin-top: 24rpx;
}
.tips__t {
  display: block;
  font-weight: 700;
  margin-bottom: 8rpx;
}
.tips__b {
  color: #667085;
  font-size: 24rpx;
  line-height: 1.6;
}
</style>
