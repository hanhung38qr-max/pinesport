import { JumpDetector } from './jump-detector.js'

const PROC_W = 64
const PROC_H = 48
const SAMPLE_EVERY = 3

export class MotionCounter {
  constructor(options = {}) {
    this.w = options.w || PROC_W
    this.h = options.h || PROC_H
    this.energyFloor = options.energyFloor ?? 0.0028
    this.canvas = null
    this.ctx = null
    this.prevGray = null
    this.prevRow = null
    this.energy = 0
    this.dy = 0
    this.frame = 0
    this.detector = new JumpDetector({
      threshold: options.threshold ?? 0.9,
      refractoryMs: options.refractoryMs ?? 300,
      baselineAlpha: 0.12,
      signalAlpha: 0.5
    })
  }

  setThreshold(v) {
    this.detector.setThreshold(v)
  }

  reset() {
    this.prevGray = null
    this.prevRow = null
    this.energy = 0
    this.dy = 0
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
    if (this.frame % SAMPLE_EVERY !== 0 && hadPrev) return 0

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
    const rowSum = new Float32Array(h)
    let diffSum = 0
    for (let y = 0; y < h; y++) {
      let rs = 0
      const rowOff = y * w
      for (let x = 0; x < w; x++) {
        const i = (rowOff + x) * 4
        const g = (data[i] * 77 + data[i + 1] * 150 + data[i + 2] * 29) >> 8
        gray[rowOff + x] = g
        rs += g
        if (hadPrev) diffSum += Math.abs(g - this.prevGray[rowOff + x])
      }
      rowSum[y] = rs / w
    }

    const energy = hadPrev ? diffSum / (w * h * 255) : 0
    this.energy = energy

    let dy = 0
    if (hadPrev && this.prevRow) {
      const maxShift = 5
      let best = 0
      let bestSad = Infinity
      for (let s = -maxShift; s <= maxShift; s++) {
        let sad = 0
        let n = 0
        for (let y = maxShift; y < h - maxShift; y++) {
          sad += Math.abs(rowSum[y] - this.prevRow[y + s])
          n++
        }
        sad /= n
        if (sad < bestSad) {
          bestSad = sad
          best = s
        }
      }
      dy = best
    }
    this.dy = dy

    this.prevGray = gray
    this.prevRow = rowSum

    if (!hadPrev) return 0
    if (energy < this.energyFloor) return this.detector.push(0)
    return this.detector.push(dy)
  }
}

export function motionThresholdFor(sensitivity) {
  const map = { low: 1.5, normal: 0.9, high: 0.5 }
  return map[sensitivity] ?? 0.9
}
