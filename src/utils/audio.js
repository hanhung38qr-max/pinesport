let ctx = null
let enabled = true

function ensureCtx() {
  if (ctx) return ctx
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  } catch (e) {
    ctx = null
  }
  return ctx
}

export function setSoundEnabled(v) {
  enabled = !!v
}

export function resumeAudio() {
  const c = ensureCtx()
  if (c && c.state === 'suspended') {
    c.resume().catch(() => {})
  }
}

export function beep({ freq = 880, durationMs = 60, gain = 0.06, type = 'sine' } = {}) {
  if (!enabled) return
  const c = ensureCtx()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})

  const t0 = c.currentTime
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + durationMs / 1000)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + durationMs / 1000 + 0.02)
}

let lastBeepAt = 0
export function countBeep(count) {
  const now = Date.now()
  if (now - lastBeepAt < 180) return
  lastBeepAt = now
  if (count % 10 === 0) {
    beep({ freq: 1180, durationMs: 90, gain: 0.07 })
  } else {
    beep({ freq: 760, durationMs: 45, gain: 0.05 })
  }
}

export function milestoneBeep() {
  beep({ freq: 660, durationMs: 100, gain: 0.07, type: 'triangle' })
  setTimeout(() => beep({ freq: 880, durationMs: 100, gain: 0.07, type: 'triangle' }), 110)
  setTimeout(() => beep({ freq: 1320, durationMs: 160, gain: 0.08, type: 'triangle' }), 220)
}

export function errorBeep() {
  beep({ freq: 220, durationMs: 180, gain: 0.06, type: 'square' })
}
