import { JumpDetector } from './jump-detector.js'

const PROC_W = 48
const PROC_H = 96
const SAMPLE_EVERY = 1
const DELTA_SEC = 0.13

export class MotionCounter {
  constructor(options = {}) {
    this.w = options.w || PROC_W
    this.h = options.h || PROC_H
    this.deltaSec = options.deltaSec ?? DELTA_SEC
    this.rowThr = options.rowThr ?? 0.03
    this.canvas = null
    this.ctx = null
    this.buf = []
    this.energy = 0
    this.motionSpan = 0
    this.frame = 0
    this.detector = new JumpDetector({
      threshold: options.threshold ?? 0.0015,
      refractoryMs: options.refractoryMs ?? 300,
      baselineAlpha: 0.03,
      signalAlpha: 1
    })
  }

  setThreshold(v) {
    this.detector.setThreshold(v)
  }

  reset() {
    this.buf = []
    this.energy = 0
    this.motionSpan = 0
    this.spanHold = 0
    this.frame = 0
    this.detector.reset()
  }

  _ensure() {
    if (this.ctx) return this.ctx
    if (typeof document === 'undefined') return null
    this.canvas = document.createElement('canvas')
    this.canvas.width = this.w
    this.canvas.height = this.h
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })
    return this.ctx
  }

  sample(video, now = Date.now()) {
    const ctx = this._ensure()
    if (!ctx || !video || video.readyState < 2 || !video.videoWidth) return 0

    this.frame++
    if (this.buf.length && now - this.buf[this.buf.length - 1].t < 1000 / 45) {
      // 上限 ~45Hz 采样
    }
    if (this.frame % SAMPLE_EVERY !== 0 && this.buf.length) return 0

    const { w, h } = this
    try {
      ctx.drawImage(video, 0, 0, w, h)
    } catch (e) {
      return 0
    }
    let data
    try {
      data = ctx.getImageData(0, 0, w, h).data
    } catch (e) {
      return 0
    }
    const gray = new Float32Array(w * h)
    for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
      gray[i] = (data[p] * 77 + data[p + 1] * 150 + data[p + 2] * 29) >> 8
    }
    return this.analyze(gray, now)
  }

  /** 纯函数入口：灰度帧 + 时间戳(ms)。返回是否计一次跳 */
  analyze(gray, now = Date.now()) {
    const { w, h } = this
    this.buf.push({ g: gray, t: now })
    const cutoff = now - this.deltaSec * 1000
    while (this.buf.length > 2 && this.buf[1].t <= cutoff) this.buf.shift()
    if (this.buf.length > 12) this.buf.shift()

    const ref = this.buf.length > 1 && this.buf[0].t <= cutoff ? this.buf[0] : null
    if (!ref) {
      this.energy = 0
      this.motionSpan = 0
      return 0
    }

    const rg = ref.g
    const rowDiff = new Float32Array(h)
    let diffSum = 0
    for (let y = 0; y < h; y++) {
      let rd = 0
      const rowOff = y * w
      for (let x = 0; x < w; x++) {
        rd += Math.abs(gray[rowOff + x] - rg[rowOff + x])
      }
      rowDiff[y] = rd / w / 255
      diffSum += rd
    }
    const energy = diffSum / w / h / 255
    this.energy = energy

    let minRow = -1
    let maxRow = -1
    for (let y = 0; y < h; y++) {
      if (rowDiff[y] > this.rowThr) {
        if (minRow < 0) minRow = y
        maxRow = y
      }
    }
    this.motionSpan = minRow < 0 ? 0 : (maxRow - minRow + 1) / h
    this.spanHold = Math.max(this.motionSpan, (this.spanHold || 0) * 0.92)

    return this.detector.push(energy, now)
  }
}

export function motionThresholdFor(sensitivity) {
  const map = { low: 0.003, normal: 0.0015, high: 0.0009 }
  return map[sensitivity] ?? 0.0015
}
