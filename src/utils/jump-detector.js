export class JumpDetector {
  constructor(options = {}) {
    this.threshold = options.threshold ?? 0.018
    this.refractoryMs = options.refractoryMs ?? 280
    this.baselineAlpha = options.baselineAlpha ?? 0.08
    this.signalAlpha = options.signalAlpha ?? 0.45
    this.armed = true
    this.lastCountAt = 0
    this.baseline = null
    this.smooth = null
    this.osc = 0
    this.history = []
  }

  reset() {
    this.armed = true
    this.lastCountAt = 0
    this.baseline = null
    this.smooth = null
    this.osc = 0
    this.history = []
  }

  setThreshold(v) {
    this.threshold = Math.max(0.005, v)
  }

  push(signal, now = Date.now()) {
    if (signal == null || Number.isNaN(signal)) return 0

    if (this.smooth == null) {
      this.smooth = signal
      this.baseline = signal
      return 0
    }

    this.smooth = this.smooth + (signal - this.smooth) * this.signalAlpha
    this.baseline = this.baseline + (this.smooth - this.baseline) * this.baselineAlpha
    const osc = this.smooth - this.baseline
    this.osc = osc
    this.history.push({ t: now, v: osc })
    if (this.history.length > 90) this.history.shift()

    if (!this.armed) {
      if (osc < -this.threshold * 0.35) this.armed = true
      return 0
    }

    if (osc > this.threshold && now - this.lastCountAt >= this.refractoryMs) {
      this.armed = false
      this.lastCountAt = now
      return 1
    }
    return 0
  }
}

export function bodyCenterY(keypoints, imageHeight) {
  if (!keypoints || keypoints.length < 17) return null

  const score = (i) => (keypoints[i] ? keypoints[i].score ?? 0 : 0)
  const y = (i) => (keypoints[i] ? keypoints[i].y : null)

  const ls = score(5),
    rs = score(6),
    lh = score(11),
    rh = score(12)

  const parts = []
  if (lh > 0.25 && rh > 0.25) {
    parts.push((y(11) + y(12)) / 2)
  }
  if (ls > 0.25 && rs > 0.25) {
    parts.push((y(5) + y(6)) / 2)
  }
  if (score(0) > 0.3) parts.push(y(0))

  if (!parts.length) return null
  const mean = parts.reduce((a, b) => a + b, 0) / parts.length
  const denom = imageHeight || 1
  return mean / denom
}
