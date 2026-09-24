<template>
  <view class="count-page">
    <!-- Custom nav -->
    <view class="nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav__back" @click="goBack">‹</view>
      <text class="nav__title">开始跳绳</text>
      <view class="nav__spacer" />
    </view>

    <!-- Mode tabs -->
    <view class="modes">
      <view
        v-for="m in modes"
        :key="m.id"
        class="modes__item"
        :class="{ active: mode === m.id }"
        @click="switchMode(m.id)"
      >{{ m.label }}</view>
    </view>

    <!-- Camera preview -->
    <view v-if="mode === 'camera'" class="cam" id="camBox">
      <view v-if="!camReady && !camError" class="cam__overlay">
        <text class="cam__hint">正在启动摄像头…</text>
        <text class="cam__sub">轻量帧差计数，无需下载模型</text>
      </view>
      <view v-if="camError" class="cam__overlay">
        <text class="cam__hint">摄像头不可用</text>
        <text class="cam__sub">{{ camError }}</text>
        <view class="cam__actions">
          <button class="btn-ghost" @click="startCamera">重试</button>
          <button class="btn-ghost" @click="switchMode('sensor')">改用体感</button>
          <button class="btn-ghost" @click="switchMode('manual')">手动计数</button>
        </view>
      </view>

      <view v-if="camReady && (running || poseVisible || skeletonOn)" class="cam__fps">
        {{ fps }} FPS · {{ confText }} · {{ poseStatus }}
      </view>
      <view v-if="mode === 'camera' && camReady && !running" class="cam__guide">
        {{ skeletonOn ? '绿色人形 = 已识别 · 全身入画后点「开始」' : '帧差计数：人影上下起伏自动 +1' }}
      </view>
      <view v-if="mode === 'camera' && camReady" class="cam__toggle" @click="toggleSkeleton">
        {{ skeletonOn ? '关闭骨架' : '骨架预览' }}
      </view>
    </view>

    <!-- Sensor mode -->
    <view v-else-if="mode === 'sensor'" class="sensor">
      <view class="sensor__icon">📳</view>
      <text class="sensor__title">体感计数</text>
      <text class="sensor__desc">手机放在口袋或拿在手中，跳动时自动计数。灵敏度：{{ sensitivityLabel }}</text>
      <view class="sensor__sens">
        <view
          v-for="s in sensitivities"
          :key="s.id"
          class="sensor__chip"
          :class="{ active: settings.cameraSensitivity === s.id }"
          @click="setSensitivity(s.id)"
        >{{ s.label }}</view>
      </view>
      <view v-if="running" class="sensor__wave">
        <view class="sensor__bar" :style="{ height: sensorBarH + 'px' }" />
      </view>
    </view>

    <!-- Manual mode -->
    <view v-else class="manual">
      <view class="manual__big" @click="tapCount">{{ jumps }}</view>
      <text class="manual__hint">点击大数字 +1</text>
      <view class="manual__plus" v-if="showPlus">+1</view>
    </view>

    <!-- HUD -->
    <view class="hud">
      <view class="hud__item">
        <text class="hud__v">{{ jumps }}</text>
        <text class="hud__k">次数</text>
      </view>
      <view class="hud__item">
        <text class="hud__v">{{ fmtDuration(elapsed) }}</text>
        <text class="hud__k">时长</text>
      </view>
      <view class="hud__item">
        <text class="hud__v">{{ calories }}</text>
        <text class="hud__k">千卡</text>
      </view>
      <view class="hud__item">
        <text class="hud__v">{{ rpm }}</text>
        <text class="hud__k">次/分</text>
      </view>
    </view>

    <!-- Controls -->
    <view class="controls">
      <button v-if="!running && !finished" class="btn-primary controls__main" @click="start">
        开始
      </button>
      <block v-else-if="running">
        <button class="btn-ghost" @click="pause">暂停</button>
        <button class="btn-primary controls__main" @click="finish">结束</button>
      </block>
      <block v-else>
        <button class="btn-ghost" @click="resetAll">重来</button>
        <button class="btn-primary controls__main" @click="saveSession">保存记录</button>
      </block>
    </view>

    <!-- Result sheet -->
    <view v-if="finished" class="result-mask" @click.self="finished = false">
      <view class="result card">
        <text class="result__t">本次跳绳完成 🎉</text>
        <view class="result__grid">
          <view><text class="result__v">{{ jumps }}</text><text class="result__k">下数</text></view>
          <view><text class="result__v">{{ fmtDuration(elapsed) }}</text><text class="result__k">时长</text></view>
          <view><text class="result__v">{{ calories }}</text><text class="result__k">千卡</text></view>
          <view><text class="result__v">{{ rpm }}</text><text class="result__k">次/分</text></view>
        </view>
        <view class="result__note" v-if="mode === 'camera' && skeletonOn">AI 识别可能存在误差，可在历史中查看</view>
        <view class="result__note" v-else-if="mode === 'camera'">帧差计数可能存在误差，可在历史中查看</view>
        <button class="btn-primary" @click="saveSession">保存并返回</button>
        <button class="btn-ghost result__skip" @click="discard">不保存</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { onLoad, onShow, onHide } from '@dcloudio/uni-app'
import { JumpDetector } from '../../utils/jump-detector.js'
import { MotionCounter, motionThresholdFor } from '../../utils/motion-count.js'
import {
  ensureOverlayCanvas,
  drawSkeleton,
  drawHumanTemplate,
  clearOverlay
} from '../../utils/skeleton-draw.js'
import { getSettings, addSession, estimateCalories } from '../../utils/store.js'
import { fmtDuration } from '../../utils/format.js'
import {
  setSoundEnabled,
  resumeAudio,
  countBeep,
  milestoneBeep,
  startBeep,
  stopBeep,
  errorBeep
} from '../../utils/audio.js'
import { evaluateAchievements } from '../../utils/achievements.js'

const modes = [
  { id: 'camera', label: '摄像头' },
  { id: 'sensor', label: '体感' },
  { id: 'manual', label: '手动' }
]
const sensitivities = [
  { id: 'low', label: '低' },
  { id: 'normal', label: '中' },
  { id: 'high', label: '高' }
]

const statusBarHeight = ref(20)
const mode = ref('camera')
const settings = ref(getSettings())

const jumps = ref(0)
const elapsed = ref(0)
const running = ref(false)
const finished = ref(false)
const saved = ref(false)

const camReady = ref(false)
const camError = ref('')
const fps = ref(0)
const conf = ref(0)
const energyView = ref(0)
const poseVisible = ref(false)
const poseStatusMsg = ref('')
const modelReady = ref(false)
const skeletonOn = ref(false)
const isH5 = typeof process !== 'undefined' && process.env && process.env.UNI_PLATFORM === 'h5'
const poseStatus = computed(() => {
  if (poseStatusMsg.value) return poseStatusMsg.value
  if (!skeletonOn.value) return energyView.value > 0.004 ? '检测到运动' : '画面静止'
  if (!modelReady.value) return '骨架模型加载中…'
  if (conf.value >= 0.45) return '已锁定人形'
  if (conf.value >= 0.25) return '识别中'
  return '未检测到人'
})

const showPlus = ref(false)
const sensorBarH = ref(8)

const detector = new JumpDetector()
const motionCounter = new MotionCounter()

let timer = null
let rafId = null
let mediaStream = null
let videoEl = null
let skeletonCanvas = null
let audioTimer = null
let sensorTimer = null
let jumpTimestamps = []
let frameCount = 0
let fpsTimer = null
let startTime = 0
let baseElapsed = 0
let loopRunning = false
let poseEngine = null
let skipFrame = false

async function ensurePoseEngine() {
  if (poseEngine) return poseEngine
  // #ifdef H5
  poseEngine = await import('../../utils/pose-engine.js')
  return poseEngine
  // #endif
  // #ifndef H5
  throw new Error('skeleton only on H5')
  // #endif
}

const calories = computed(() => {
  const v = estimateCalories({
    jumps: jumps.value,
    durationSec: elapsed.value,
    weight: settings.value.weight,
    mode: mode.value
  })
  return Math.round(v * 10) / 10
})

const rpm = computed(() => {
  if (elapsed.value < 5) return 0
  return Math.round((jumps.value / elapsed.value) * 60)
})

const confText = computed(() =>
  skeletonOn.value ? `${Math.round(conf.value * 100)}%` : `${(energyView.value * 100).toFixed(1)}%`
)
const sensitivityLabel = computed(
  () => sensitivities.find((s) => s.id === settings.value.cameraSensitivity)?.label || '中'
)

onLoad(() => {
  try {
    const sys = uni.getSystemInfoSync()
    statusBarHeight.value = sys.statusBarHeight || 20
  } catch (e) {
    /* ignore */
  }
  settings.value = getSettings()
  setSoundEnabled(settings.value.sound)
})

onMounted(() => {
  if (mode.value === 'camera') startCamera()
})

onShow(() => {
  settings.value = getSettings()
  setSoundEnabled(settings.value.sound)
  if (mode.value === 'camera' && !camReady.value && !camError.value) {
    startCamera()
  }
})

onHide(() => {
  /* keep state */
})

onUnmounted(() => {
  teardownCamera()
  stopSensor()
  clearTimers()
})

watch(mode, (m, old) => {
  if (old === 'camera' && m !== 'camera') teardownCamera()
  if (old === 'sensor' && m !== 'sensor') stopSensor()
  if (m === 'camera') startCamera()
  if (m === 'sensor') startSensorPreview()
  detector.reset()
})

function switchMode(m) {
  if (running.value) {
    uni.showToast({ title: '请先结束本次', icon: 'none' })
    return
  }
  mode.value = m
}

function setSensitivity(id) {
  settings.value = { ...settings.value, cameraSensitivity: id }
  applySensitivity()
}

function applySensitivity() {
  const map = { low: 0.03, normal: 0.018, high: 0.01 }
  detector.setThreshold(map[settings.value.cameraSensitivity] || 0.018)
  motionCounter.setThreshold(motionThresholdFor(settings.value.cameraSensitivity))
}

async function toggleSkeleton() {
  if (skeletonOn.value) {
    skeletonOn.value = false
    poseVisible.value = false
    conf.value = 0
    if (skeletonCanvas) clearOverlay(skeletonCanvas)
    return
  }
  if (!isH5) {
    uni.showToast({ title: '骨架预览暂仅 H5 可用', icon: 'none' })
    return
  }
  skeletonOn.value = true
  poseStatusMsg.value = '正在加载骨架模型…'
  try {
    const eng = await ensurePoseEngine()
    await eng.getDetector()
    modelReady.value = true
    poseStatusMsg.value = ''
    if (!loopRunning) loop()
  } catch (e) {
    console.error('model load', e)
    modelReady.value = false
    poseStatusMsg.value = '骨架加载失败'
    skeletonOn.value = false
    uni.showToast({ title: '骨架模型加载失败', icon: 'none' })
  }
}

function stopMediaStream() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => {
      try {
        t.stop()
      } catch (e) {
        /* ignore */
      }
    })
    mediaStream = null
  }
  if (videoEl) {
    try {
      videoEl.srcObject = null
    } catch (e) {
      /* ignore */
    }
    if (videoEl.parentNode) videoEl.parentNode.removeChild(videoEl)
    videoEl = null
  }
}

let camStartSeq = 0

async function startCamera() {
  const seq = ++camStartSeq
  camError.value = ''
  camReady.value = false
  applySensitivity()
  stopMediaStream()

  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const secure =
      typeof location !== 'undefined' &&
      (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    camError.value = secure
      ? '当前浏览器不提供摄像头 API'
      : '非安全上下文无摄像头（需 localhost 或 HTTPS）'
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 }
      },
      audio: false
    })
    if (seq !== camStartSeq) {
      stream.getTracks().forEach((t) => t.stop())
      return
    }
    mediaStream = stream
    await nextTick()
    if (seq !== camStartSeq) return
    const box = document.getElementById('camBox') || document.querySelector('.cam')
    if (!box) {
      camError.value = '预览容器未就绪'
      stopMediaStream()
      return
    }
    videoEl = document.createElement('video')
    videoEl.className = 'cam__video'
    videoEl.autoplay = true
    videoEl.muted = true
    videoEl.playsInline = true
    videoEl.setAttribute('playsinline', '')
    videoEl.setAttribute('webkit-playsinline', '')
    videoEl.srcObject = mediaStream
    box.insertBefore(videoEl, box.firstChild)
    skeletonCanvas = ensureOverlayCanvas(box)
    drawHumanTemplate(skeletonCanvas)
    try {
      await videoEl.play()
    } catch (e) {
      /* autoplay may need gesture */
    }
    if (seq !== camStartSeq) return

    camReady.value = true
    camError.value = ''
    poseStatusMsg.value = ''
    modelReady.value = false
    motionCounter.reset()
    if (!loopRunning) loop()
  } catch (e) {
    if (seq !== camStartSeq) return
    console.error(e)
    stopMediaStream()
    const name = e && e.name
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      camError.value = '摄像头权限被拒绝，请在浏览器地址栏或系统设置中允许'
    } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      camError.value = '未检测到可用摄像头'
    } else if (name === 'NotReadableError' || name === 'TrackStartError') {
      camError.value = '摄像头被其他应用占用，关闭后重试'
    } else {
      camError.value = '无法打开摄像头：' + (e && e.message ? e.message : name || '未知错误')
    }
    if (mode.value === 'camera') errorBeep()
  }
}

function teardownCamera() {
  loopRunning = false
  motionCounter.reset()
  camStartSeq++
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  stopMediaStream()
  if (skeletonCanvas) {
    clearOverlay(skeletonCanvas)
    if (skeletonCanvas.parentNode) skeletonCanvas.parentNode.removeChild(skeletonCanvas)
    skeletonCanvas = null
  }
  poseVisible.value = false
  conf.value = 0
  camReady.value = false
}

async function loop() {
  if (loopRunning) return
  loopRunning = true
  let inflight = false

  const tick = async () => {
    if (!loopRunning || !camReady.value) return
    if (inflight) {
      rafId = requestAnimationFrame(tick)
      return
    }
    if (!videoEl || videoEl.readyState < 2) {
      rafId = requestAnimationFrame(tick)
      return
    }

    // 隔帧推理，降低主线程压力
    if (skipFrame) {
      skipFrame = false
      rafId = requestAnimationFrame(tick)
      return
    }
    skipFrame = true

    inflight = true
    frameCount++
    try {
      // 轻量帧差计数（始终）
      if (running.value) {
        const inc = motionCounter.sample(videoEl)
        energyView.value = motionCounter.energy
        if (inc > 0) onJump()
      } else {
        motionCounter.sample(videoEl)
        energyView.value = motionCounter.energy
      }

      // 可选骨架预览（仅 H5 开关打开时）；否则画人形站位板
      const eng = poseEngine
      if (skeletonOn.value && eng && eng.isModelReady()) {
        const pose = await eng.estimatePose(videoEl)
        if (!pose || !pose.keypoints || !pose.keypoints.length) {
          poseVisible.value = false
          conf.value = 0
          if (skeletonCanvas) drawHumanTemplate(skeletonCanvas)
        } else {
          if (skeletonCanvas) {
            drawSkeleton(skeletonCanvas, pose.keypoints, videoEl, { mirror: true })
          }
          const torso =
            pose.keypoints.reduce((a, k) => a + (k.score || 0), 0) / pose.keypoints.length
          conf.value = torso
          poseVisible.value = torso >= 0.2
        }
      } else if (!skeletonOn.value) {
        if (skeletonCanvas) drawHumanTemplate(skeletonCanvas, { alpha: running.value ? 0.35 : 0.55 })
        poseVisible.value = false
        conf.value = 0
      }
    } catch (e) {
      /* drop frame */
    } finally {
      inflight = false
      if (loopRunning) rafId = requestAnimationFrame(tick)
    }
  }

  rafId = requestAnimationFrame(tick)
}

function onJump() {
  jumps.value += 1
  jumpTimestamps.push(Date.now())
  countBeep(jumps.value)
  if (jumps.value > 0 && jumps.value % 100 === 0) {
    milestoneBeep()
    uni.vibrateShort?.({})
  }
}

function tapCount() {
  resumeAudio()
  onJump()
  showPlus.value = true
  setTimeout(() => (showPlus.value = false), 400)
}

// --- sensor mode ---
function sensorMagnitude(x, y, z) {
  return Math.sqrt(x * x + y * y + z * z)
}

function startSensorPreview() {
  applySensitivity()
}

function startSensor() {
  applySensitivity()
  detector.reset()
  jumpTimestamps = []
  try {
    uni.startAccelerometer({
      interval: 'game',
      success: () => {},
      fail: () => {
        uni.showToast({ title: '体感不可用', icon: 'none' })
      }
    })
  } catch (e) {
    /* ignore */
  }
  sensorTimer && clearInterval(sensorTimer)
  sensorTimer = null

  uni.onAccelerometerChange((res) => {
    const { x = 0, y = 0, z = 0 } = res || {}
    const mag = sensorMagnitude(x, y, z)
    // normalize around 1g
    const signal = mag - 1
    sensorBarH.value = Math.min(120, Math.max(8, Math.round(Math.abs(signal) * 400)))
    if (!running.value) return
    const inc = detector.push(signal)
    if (inc > 0) onJump()
  })
}

function stopSensor() {
  try {
    uni.stopAccelerometer({})
  } catch (e) {
    /* ignore */
  }
  if (sensorTimer) {
    clearInterval(sensorTimer)
    sensorTimer = null
  }
  try {
    uni.offAccelerometerChange(() => {})
  } catch (e) {
    /* ignore */
  }
}

// --- session control ---
function start() {
  resumeAudio()
  setSoundEnabled(settings.value.sound)
  finished.value = false
  saved.value = false
  running.value = true
  detector.reset()
  jumpTimestamps = []
  startTime = Date.now()
  baseElapsed = 0
  if (jumps.value === 0) elapsed.value = 0

  clearTimers()
  timer = setInterval(() => {
    if (running.value) {
      elapsed.value = baseElapsed + Math.floor((Date.now() - startTime) / 1000)
    }
  }, 250)

  fpsTimer = setInterval(() => {
    fps.value = frameCount
    frameCount = 0
  }, 1000)

  if (mode.value === 'sensor') startSensor()
  if (mode.value === 'camera') {
    if (!camReady.value) startCamera()
    else if (!loopRunning) loop()
    motionCounter.reset()
  }
  startBeep()
}

function pause() {
  running.value = false
  baseElapsed = elapsed.value
  stopSensor()
  stopBeep()
}

function finish() {
  running.value = false
  baseElapsed = elapsed.value
  stopSensor()
  finished.value = true
  stopBeep()
}

function clearTimers() {
  if (timer) clearInterval(timer)
  if (fpsTimer) clearInterval(fpsTimer)
  timer = null
  fpsTimer = null
}

function resetAll() {
  finished.value = false
  jumps.value = 0
  elapsed.value = 0
  baseElapsed = 0
  detector.reset()
  motionCounter.reset()
  jumpTimestamps = []
  clearTimers()
}

function saveSession() {
  if (saved.value) {
    uni.switchTab({ url: '/pages/history/history' })
    return
  }
  if (jumps.value <= 0 && elapsed.value < 5) {
    uni.showToast({ title: '数据太少，未保存', icon: 'none' })
    resetAll()
    return
  }
  const session = addSession({
    jumps: jumps.value,
    durationSec: elapsed.value,
    calories: calories.value,
    mode: mode.value,
    startTime: Date.now() - elapsed.value * 1000
  })
  saved.value = true
  const newly = evaluateAchievements().newly
  if (newly.length) {
    uni.showModal({
      title: '解锁成就',
      content: newly.map((n) => `${n.icon} ${n.title}`).join('、'),
      showCancel: false
    })
  } else {
    uni.showToast({ title: '已保存', icon: 'success' })
  }
  resetAll()
  setTimeout(() => uni.switchTab({ url: '/pages/history/history' }), 600)
  return session
}

function discard() {
  finished.value = false
  resetAll()
}

function goBack() {
  if (running.value) {
    uni.showModal({
      title: '退出计数',
      content: '当前正在进行，确定退出且不保存吗？',
      success: (r) => {
        if (r.confirm) {
          running.value = false
          teardownCamera()
          stopSensor()
          clearTimers()
          uni.switchTab({ url: '/pages/index/index' })
        }
      }
    })
    return
  }
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style scoped>
.count-page {
  min-height: 100vh;
  height: 100vh;
  background: #0b1220;
  color: #fff;
  display: flex;
  flex-direction: column;
  padding-bottom: 40rpx;
  overflow: hidden;
}
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 24rpx;
  background: rgba(0, 0, 0, 0.35);
  position: relative;
  z-index: 10;
}
.nav__back {
  width: 64rpx;
  height: 64rpx;
  font-size: 48rpx;
  line-height: 60rpx;
  text-align: center;
  opacity: 0.9;
}
.nav__title {
  font-size: 32rpx;
  font-weight: 700;
}
.nav__spacer {
  width: 64rpx;
}
.modes {
  display: flex;
  gap: 12rpx;
  padding: 16rpx 24rpx;
}
.modes__item {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  font-size: 26rpx;
}
.modes__item.active {
  background: #12b76a;
  color: #fff;
  font-weight: 700;
}
.cam {
  position: relative;
  flex: 1;
  min-height: 480rpx;
  height: 0;
  margin: 0 24rpx;
  border-radius: 24rpx;
  overflow: hidden;
  background: #111827;
}
.cam__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  transform: scaleX(-1);
  transform-origin: center center;
  background: #000;
  z-index: 1;
}
.cam__skeleton {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 3;
}
.cam__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 40rpx;
  text-align: center;
  z-index: 5;
}
.cam__hint {
  font-size: 30rpx;
  font-weight: 600;
}
.cam__sub {
  color: rgba(255, 255, 255, 0.6);
  font-size: 24rpx;
}
.cam__actions {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
}
.cam__actions .btn-ghost {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
}
.cam__fps {
  position: absolute;
  top: 16rpx;
  left: 16rpx;
  background: rgba(0, 0, 0, 0.5);
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  color: #6ce9a6;
  z-index: 6;
}
.cam__guide {
  position: absolute;
  bottom: 16rpx;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(0, 0, 0, 0.45);
  padding: 12rpx;
  z-index: 6;
}
.cam__toggle {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  background: rgba(0, 0, 0, 0.5);
  border: 1rpx solid rgba(255, 255, 255, 0.25);
  color: #6ce9a6;
  padding: 6rpx 18rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  z-index: 6;
}
.sensor,
.manual {
  flex: 1;
  min-height: 520rpx;
  margin: 0 24rpx;
  border-radius: 24rpx;
  background: #111827;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  position: relative;
}
.sensor__icon {
  font-size: 80rpx;
}
.sensor__title {
  margin-top: 16rpx;
  font-size: 34rpx;
  font-weight: 700;
}
.sensor__desc {
  margin-top: 12rpx;
  color: rgba(255, 255, 255, 0.65);
  font-size: 24rpx;
  text-align: center;
}
.sensor__sens {
  display: flex;
  gap: 12rpx;
  margin-top: 24rpx;
}
.sensor__chip {
  padding: 10rpx 28rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.08);
  font-size: 24rpx;
}
.sensor__chip.active {
  background: #12b76a;
  font-weight: 700;
}
.sensor__wave {
  margin-top: 40rpx;
  height: 130rpx;
  display: flex;
  align-items: flex-end;
}
.sensor__bar {
  width: 40rpx;
  border-radius: 8rpx;
  background: linear-gradient(180deg, #6ce9a6, #12b76a);
  transition: height 0.08s linear;
}
.manual__big {
  font-size: 160rpx;
  font-weight: 800;
  line-height: 1;
  color: #6ce9a6;
  padding: 40rpx;
}
.manual__hint {
  color: rgba(255, 255, 255, 0.6);
  font-size: 26rpx;
}
.manual__plus {
  position: absolute;
  top: 30%;
  font-size: 64rpx;
  font-weight: 800;
  color: #12b76a;
  animation: floatUp 0.4s ease-out;
}
@keyframes floatUp {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-60rpx);
  }
}
.hud {
  display: flex;
  justify-content: space-around;
  padding: 28rpx 16rpx 8rpx;
}
.hud__item {
  text-align: center;
}
.hud__v {
  display: block;
  font-size: 44rpx;
  font-weight: 800;
  color: #fff;
}
.hud__k {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.55);
}
.controls {
  display: flex;
  gap: 20rpx;
  padding: 24rpx 32rpx;
  align-items: center;
}
.controls__main {
  flex: 1;
}
.controls .btn-ghost {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.25);
}
.result-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
  padding: 40rpx;
}
.result {
  width: 100%;
  max-width: 640rpx;
  background: #fff;
  color: #101828;
  border-radius: 28rpx;
  padding: 40rpx 32rpx;
}
.result__t {
  display: block;
  text-align: center;
  font-size: 34rpx;
  font-weight: 800;
  margin-bottom: 28rpx;
}
.result__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
  text-align: center;
  margin-bottom: 24rpx;
}
.result__v {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
}
.result__k {
  display: block;
  color: #98a2b3;
  font-size: 22rpx;
}
.result__note {
  text-align: center;
  color: #667085;
  font-size: 22rpx;
  margin-bottom: 24rpx;
}
.result .btn-primary,
.result .btn-ghost {
  width: 100%;
  margin-top: 16rpx;
}
.result__skip {
  margin-top: 16rpx;
}
</style>
