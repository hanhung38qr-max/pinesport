<template>
  <view class="settings">
    <view class="section-title">训练设置</view>
    <view class="card">
      <view class="cell" @click="editWeight">
        <text class="cell__label">体重 (kg)</text>
        <text class="cell__value">{{ settings.weight }} ›</text>
      </view>
      <view class="cell" @click="editGoal">
        <text class="cell__label">每日目标 (下)</text>
        <text class="cell__value">{{ settings.dailyGoal }} ›</text>
      </view>
      <view class="cell">
        <text class="cell__label">计数音效</text>
        <switch :checked="settings.sound" color="#12B76A" @change="onSound" />
      </view>
      <view class="cell" @click="editSensitivity">
        <text class="cell__label">体感灵敏度</text>
        <text class="cell__value">{{ sensitivityLabel }} ›</text>
      </view>
    </view>

    <view class="section-title">关于</view>
    <view class="card">
      <view class="cell">
        <text class="cell__label">版本</text>
        <text class="cell__value">1.0.0</text>
      </view>
      <view class="cell">
        <text class="cell__label">广告</text>
        <text class="cell__value" style="color: #12b76a">永久无广告</text>
      </view>
      <view class="cell">
        <text class="cell__label">数据存储</text>
        <text class="cell__value">仅本机</text>
      </view>
    </view>

    <view class="danger">
      <button class="btn-danger" @click="clearData">清空全部数据</button>
      <text class="muted">清除后不可恢复，请谨慎操作</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getSettings, saveSettings, clearAllData } from '../../utils/store.js'

const settings = ref(getSettings())

onShow(() => {
  settings.value = getSettings()
})

const sensitivityLabel = computed(
  () => ({ low: '低', normal: '中', high: '高' })[settings.value.cameraSensitivity] || '中'
)

function editWeight() {
  const picks = [45, 50, 55, 60, 65, 70, 75, 80, 90, 100]
  uni.showActionSheet({
    itemList: picks.map((w) => `${w} kg`),
    success: (r) => {
      settings.value = saveSettings({ weight: picks[r.tapIndex] })
    }
  })
}

function editGoal() {
  const picks = [300, 500, 800, 1000, 1500, 2000, 3000]
  uni.showActionSheet({
    itemList: picks.map((n) => `${n} 下`),
    success: (r) => {
      settings.value = saveSettings({ dailyGoal: picks[r.tapIndex] })
    }
  })
}

function editSensitivity() {
  const keys = ['low', 'normal', 'high']
  const labels = ['低', '中', '高']
  uni.showActionSheet({
    itemList: labels,
    success: (r) => {
      settings.value = saveSettings({ cameraSensitivity: keys[r.tapIndex] })
    }
  })
}

function onSound(e) {
  settings.value = saveSettings({ sound: !!e.detail.value })
}

function clearData() {
  uni.showModal({
    title: '确认清空',
    content: '将删除所有跳绳记录、成就与设置，确定继续？',
    success: (r) => {
      if (r.confirm) {
        clearAllData()
        uni.showToast({ title: '已清空', icon: 'success' })
        setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 500)
      }
    }
  })
}
</script>

<style scoped>
.settings {
  padding: 8rpx 24rpx 48rpx;
}
.cell {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 26rpx 4rpx;
  border-bottom: 1rpx solid #f2f4f7;
}
.cell:last-child {
  border-bottom: none;
}
.cell__label {
  font-size: 28rpx;
  color: #344054;
}
.cell__value {
  font-size: 28rpx;
  color: #667085;
  font-weight: 600;
}
.danger {
  margin-top: 48rpx;
  text-align: center;
}
.btn-danger {
  background: #fff;
  color: #f04438;
  border: 2rpx solid #fecdca;
  border-radius: 999rpx;
  height: 88rpx;
  line-height: 84rpx;
  font-weight: 600;
  width: 100%;
}
.btn-danger::after {
  border: none;
}
.danger .muted {
  display: block;
  margin-top: 16rpx;
}
</style>
