/**
 * 姿态跳绳计数：基于髋关节(23/24)纵向位移的一跳状态机。
 *
 * 关键设计：
 *  - 在「落地帧」计数，而不是起跳帧 —— 起跳瞬间最容易和摆绳噪声混在一起，
 *    落地是整个周期里髋部回到基线、最确定的时刻。
 *  - 基线极慢跟随（只在地面态更新），避免空中被拉偏。
 *  - 最小跳高阈值：过滤走路/挪步造成的亚阈值抖动。
 *  - 不应期：避免一次跳跃被重复计数。
 */

const DEFAULT_OPTS = {
  minJump: 0.02, // 最小跳高（归一化帧高的比例）
  landRatio: 0.35, // 落地判定：幅度回落到峰值的该比例以下
  refractoryMs: 320, // 不应期
  baselineAlpha: 0.01, // 基线跟随速度（地面态）
  resetGapMs: 500 // 丢失人脸/人体超过该时长则重置状态机
}

export class PoseJumpCounter {
  constructor(options = {}) {
    const o = { ...DEFAULT_OPTS, ...options }
    this.minJump = o.minJump
    this.landRatio = o.landRatio
    this.refractoryMs = o.refractoryMs
    this.baselineAlpha = o.baselineAlpha
    this.resetGapMs = o.resetGapMs
    this.reset()
  }

  reset() {
    this.baseline = null
    this.phase = 'ground'
    this.peak = 0
    this.lastCountAt = 0
    this.lastSeenAt = 0
    this.jumps = 0
  }

  setMinJump(v) {
    this.minJump = Math.max(0.004, v)
  }

  /**
   * @param {Array<{x:number,y:number,visibility:number}>} landmarks 33 点
   * @param {number} now 时间戳(ms)
   * @returns {number} 1 表示本次落地计一跳，0 表示无
   */
  analyze(landmarks, now = Date.now()) {
    if (!landmarks || landmarks.length < 25) return this._handleMissing(now)

    const lh = landmarks[23]
    const rh = landmarks[24]
    if (!lh || !rh) return this._handleMissing(now)

    const vL = lh.visibility ?? 1
    const vR = rh.visibility ?? 1
    if (vL < 0.2 || vR < 0.2) return this._handleMissing(now)

    const hipY = (lh.y + rh.y) / 2
    this.lastSeenAt = now

    if (this.baseline == null) {
      this.baseline = hipY
      this.phase = 'ground'
      this.peak = 0
      return 0
    }

    // 幅度：正值 = 高于基线（跳起来了）
    const amp = this.baseline - hipY

    if (this.phase === 'ground') {
      // 只在地面态缓慢跟基线；空中不动基线
      if (amp < this.minJump * 0.5) {
        this.baseline += (hipY - this.baseline) * this.baselineAlpha
      }
      if (amp > this.minJump) {
        this.phase = 'air'
        this.peak = amp
      }
      return 0
    }

    // 空中：追踪峰值
    if (amp > this.peak) this.peak = amp

    // 落地：幅度回落到峰值 landRatio 以下，且过了不应期
    if (amp < this.peak * this.landRatio && now - this.lastCountAt >= this.refractoryMs) {
      this.lastCountAt = now
      this.jumps += 1
      this.phase = 'ground'
      this.peak = 0
      // 落地后基线直接对齐当前位置，避免残留偏差
      this.baseline = hipY
      return 1
    }

    // 长时间悬空视为丢失（例如人走出画面顶部）
    if (now - this.lastCountAt > this.resetGapMs && this.phase === 'air' && amp < 0) {
      this.phase = 'ground'
      this.peak = 0
    }

    return 0
  }

  _handleMissing(now) {
    if (this.lastSeenAt && now - this.lastSeenAt > this.resetGapMs) {
      this.baseline = null
      this.phase = 'ground'
      this.peak = 0
    }
    return 0
  }

  get ready() {
    return this.baseline != null
  }
}

/** 灵敏度 → 最小跳高阈值（越小越灵敏） */
export function poseMinJumpFor(sensitivity) {
  const map = { low: 0.035, normal: 0.02, high: 0.012 }
  return map[sensitivity] ?? 0.02
}
