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

function playTone({ freq = 880, durationMs = 60, gain = 0.06, type = 'sine', when = 0, freqEnd = null }) {
  const c = ensureCtx()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  const t0 = c.currentTime + when
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + durationMs / 1000)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000)
  osc.connect(g)
  g.connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + durationMs / 1000 + 0.03)
}

function playNoise({ durationMs = 80, gain = 0.05, when = 0 }) {
  const c = ensureCtx()
  if (!c) return
  const t0 = c.currentTime + when
  const len = Math.max(1, Math.floor(c.sampleRate * (durationMs / 1000)))
  const buffer = c.createBuffer(1, len, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < len; i++) {
    const t = i / len
    data[i] = (Math.random() * 2 - 1) * (1 - t) * (1 - t)
  }
  const src = c.createBufferSource()
  src.buffer = buffer
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 2400
  filter.Q.value = 0.8
  const g = c.createGain()
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000)
  src.connect(filter)
  filter.connect(g)
  g.connect(c.destination)
  src.start(t0)
  src.stop(t0 + durationMs / 1000 + 0.02)
}

let lastBeepAt = 0

/** 每次跳跃：嗖（绳过）+ 轻点（落地），十下重音 */
export function countBeep(count) {
  if (!enabled) return
  const now = Date.now()
  if (now - lastBeepAt < 160) return
  lastBeepAt = now
  resumeAudio()

  const isMilestone = count > 0 && count % 10 === 0
  const isFifty = count > 0 && count % 50 === 0

  // rope whoosh
  playTone({ freq: 520, freqEnd: 1600, durationMs: 70, gain: isMilestone ? 0.07 : 0.045, type: 'sine' })
  playNoise({ durationMs: 70, gain: isMilestone ? 0.055 : 0.03 })

  // landing click
  playTone({
    freq: isMilestone ? 980 : 720,
    durationMs: isMilestone ? 90 : 45,
    gain: isMilestone ? 0.08 : 0.05,
    type: 'triangle',
    when: 0.05
  })

  if (isFifty) {
    playTone({ freq: 1240, durationMs: 110, gain: 0.07, type: 'sine', when: 0.14 })
  }
}

export function milestoneBeep() {
  if (!enabled) return
  playTone({ freq: 660, durationMs: 100, gain: 0.07, type: 'triangle' })
  playTone({ freq: 880, durationMs: 100, gain: 0.07, type: 'triangle', when: 0.11 })
  playTone({ freq: 1320, durationMs: 160, gain: 0.08, type: 'triangle', when: 0.22 })
}

export function startBeep() {
  if (!enabled) return
  playTone({ freq: 660, durationMs: 80, gain: 0.06, type: 'sine' })
  playTone({ freq: 990, durationMs: 120, gain: 0.06, type: 'sine', when: 0.09 })
}

export function stopBeep() {
  if (!enabled) return
  playTone({ freq: 660, durationMs: 80, gain: 0.05, type: 'sine' })
  playTone({ freq: 440, durationMs: 140, gain: 0.05, type: 'sine', when: 0.08 })
}

export function errorBeep() {
  if (!enabled) return
  playTone({ freq: 220, durationMs: 180, gain: 0.06, type: 'square' })
}
