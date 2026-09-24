import { JumpDetector } from './jump-detector.js'

const PROC_W = 64
const PROC_H = 48
const SAMPLE_EVERY = 2

export class MotionCounter {
  constructor(options = {}) {
    this.w = options.w || PROC_W
    this.h = options.h || PROC_H
    this.energyFloor = options.energyFloor ?? 0.0015
    this.rowThr = options.rowThr ?? 0.02
    this.canvas = null
    this.ctx = null
    this.prevGray = null
    this.energy = 0
    this.motionSpan = 0
    this.frame = 0
    this.detector = new JumpDetector({
      threshold: options.threshold ?? 0.016,
      refractoryMs: options.refractoryMs ?? 300,
      baselineAlpha: 0.22,
      signalAlpha: 0.5
    })
  }

  setThreshold(v) {
    this.detector.setThreshold(v)
  }

  reset() {
    this.prevGray = null
    this.energy = 0
    this.motionSpan = 0
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

  sample(video) {
    const ctx = this._ensure()
    if (!ctx || !video || video.readyState < 2 || !video.videoWidth) return 0

    this.frame++
    const hadPrev = !!this.prevGray
    if (hadPrev && this.frame % SAMPLE_EVERY !== 0) return 0

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
    const rowMotion = new Float32Array(h)
    let diffSum = 0
    for (let y = 0; y < h; y++) {
      let rs = 0
      let rd = 0
      const rowOff = y * w
      for (let x = 0; x < w; x++) {
        const i = (rowOff + x) * 4
        const g = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8
        gray[rowOff + x] = g
        rs += g
        if (hadPrev) {
          const d = Math.abs(g - this.prevGray[rowOff + x])
          rd += d
          diffSum += d
        }
      }
      rowMotion[y] = rd / w / 255
    }

    this.prevGray = gray
    if (!hadPrev) {
      this.energy = 0
      this.motionSpan = 0
      return 0
    }

    const energy = diffSum / (w * h * 255)
    this.energy = energy

    let minRow = -1
    let maxRow = -1
    for (let y = 0; y < h; y++) {
      if (rowMotion[y] > this.rowThr) {
        if (minRow < 0) minRow = y
        maxRow = y
      }
    }
    this.motionSpan = minRow < 0 ? 0 : (maxRow - minRow) / h

    if (energy < this.energyFloor) return this.detector.push(0)
    return this.detector.push(energy)
  }
}

export function motionThresholdFor(sensitivity) {
  const map = { low: 0.024, normal: 0.012, high: 0.007 }
  return map[sensitivity] ?? 0.012
}
