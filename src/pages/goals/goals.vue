<template>
  <view class="goals">
    <view class="card goal-card">
      <view class="goal-card__head">
        <text class="goal-card__title">每日目标</text>
        <text class="goal-card__edit" @click="editGoal">修改</text>
      </view>
      <view class="goal-card__body">
        <view class="ring" :style="{ background: ringBg }">
          <view class="ring__inner">
            <text class="ring__v">{{ todayJumps }}</text>
            <text class="ring__k">/ {{ settings.dailyGoal }} 下</text>
          </view>
        </view>
        <view class="goal-card__side">
          <view class="side-item">
            <text class="side-v">{{ percent }}%</text>
            <text class="side-k">今日完成度</text>
          </view>
          <view class="side-item">
            <text class="side-v">{{ streak }} 天</text>
            <text class="side-k">连续打卡</text>
          </view>
          <view class="side-item">
            <text class="side-v">{{ round1(todayCal) }}</text>
            <text class="side-k">今日千卡</text>
          </view>
        </view>
      </view>
      <button v-if="percent >= 100" class="btn-primary" @click="goCount">目标已达成，再跳一组 🔥</button>
      <button v-else class="btn-primary" @click="goCount">还差 {{ Math.max(0, settings.dailyGoal - todayJumps) }} 下</button>
    </view>

    <view class="section-title">成就徽章</view>
    <view class="badges">
      <view
        v-for="a in list"
        :key="a.id"
        class="badge card"
        :class="{ locked: !a.unlocked }"
        @click="onBadge(a)"
      >
        <view class="badge__icon">{{ a.unlocked ? a.icon : '🔒' }}</view>
        <text class="badge__title">{{ a.title }}</text>
        <text class="badge__desc">{{ a.desc }}</text>
      </view>
    </view>

    <view class="section-title">累计数据</view>
    <view class="card totals">
      <view class="totals__row">
        <text>累计下数</text>
        <text class="totals__v">{{ totals.jumps }}</text>
      </view>
      <view class="totals__row">
        <text>累计时长</text>
        <text class="totals__v">{{ fmtDuration(totals.durationSec) }}</text>
      </view>
      <view class="totals__row">
        <text>累计千卡</text>
        <text class="totals__v">{{ round1(totals.calories) }}</text>
      </view>
      <view class="totals__row">
        <text>训练场次</text>
        <text class="totals__v">{{ totals.count }}</text>
      </view>
      <view class="totals__row">
        <text>解锁成就</text>
        <text class="totals__v">{{ unlockedCount }} / {{ list.length }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  getSettings,
  saveSettings,
  getTodayStat,
  getTotals,
  calcStreak
} from '../../utils/store.js'
import { listAchievements } from '../../utils/achievements.js'
import { fmtDuration } from '../../utils/format.js'

const settings = ref(getSettings())
const todayJumps = ref(0)
const todayCal = ref(0)
const totals = ref(getTotals())
const streak = ref(calcStreak())
const list = ref(listAchievements())

onShow(refresh)

function refresh() {
  settings.value = getSettings()
  const t = getTodayStat()
  todayJumps.value = t.jumps
  todayCal.value = t.calories
  totals.value = getTotals()
  streak.value = calcStreak()
  list.value = listAchievements()
}

const percent = computed(() => {
  const g = settings.value.dailyGoal || 1000
  return Math.min(100, Math.round((todayJumps.value / g) * 100))
})

const ringBg = computed(
  () => `conic-gradient(#12B76A 0deg ${percent.value * 3.6}deg, #E8ECF2 ${percent.value * 3.6}deg 360deg)`
)

const unlockedCount = computed(() => list.value.filter((a) => a.unlocked).length)

function editGoal() {
  const opts = [500, 800, 1000, 1500, 2000, 3000]
  uni.showActionSheet({
    itemList: opts.map((n) => `${n} 下`),
    success: (r) => {
      saveSettings({ dailyGoal: opts[r.tapIndex] })
      refresh()
    }
  })
}

function onBadge(a) {
  uni.showModal({
    title: a.unlocked ? `${a.icon} ${a.title}` : '未解锁',
    content: a.desc,
    showCancel: false
  })
}

function goCount() {
  uni.switchTab({ url: '/pages/count/count' })
}

function round1(n) {
  return Math.round((n || 0) * 10) / 10
}
</script>

<style scoped>
.goals {
  padding: 24rpx 24rpx 48rpx;
}
.goal-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}
.goal-card__title {
  font-size: 30rpx;
  font-weight: 800;
}
.goal-card__edit {
  color: #12b76a;
  font-size: 26rpx;
  font-weight: 600;
}
.goal-card__body {
  display: flex;
  align-items: center;
  gap: 28rpx;
  margin-bottom: 24rpx;
}
.ring {
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ring__inner {
  width: 168rpx;
  height: 168rpx;
  border-radius: 50%;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.ring__v {
  font-size: 44rpx;
  font-weight: 800;
  line-height: 1;
}
.ring__k {
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #98a2b3;
}
.goal-card__side {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.side-v {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
}
.side-k {
  display: block;
  font-size: 20rpx;
  color: #98a2b3;
}
.goal-card .btn-primary {
  width: 100%;
}
.badges {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.badge {
  padding: 24rpx;
}
.badge.locked {
  opacity: 0.55;
  background: #f8fafc;
}
.badge__icon {
  font-size: 44rpx;
  margin-bottom: 8rpx;
}
.badge__title {
  display: block;
  font-weight: 700;
  font-size: 28rpx;
}
.badge__desc {
  display: block;
  margin-top: 6rpx;
  color: #98a2b3;
  font-size: 22rpx;
}
.totals__row {
  display: flex;
  justify-content: space-between;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f2f4f7;
  font-size: 26rpx;
  color: #475467;
}
.totals__row:last-child {
  border-bottom: none;
}
.totals__v {
  font-weight: 800;
  color: #101828;
}
</style>
