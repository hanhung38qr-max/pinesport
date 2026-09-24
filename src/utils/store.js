const KEY_SETTINGS = 'ps_settings'
const KEY_SESSIONS = 'ps_sessions'

const DEFAULT_SETTINGS = {
  weight: 60,
  dailyGoal: 1000,
  sound: true,
  cameraSensitivity: 'normal'
}

function safeGet(key, fallback) {
  try {
    const raw = uni.getStorageSync(key)
    if (raw === '' || raw === null || raw === undefined) return fallback
    if (typeof raw === 'string') return JSON.parse(raw)
    return raw
  } catch (e) {
    return fallback
  }
}

function safeSet(key, value) {
  try {
    uni.setStorageSync(key, JSON.stringify(value))
  } catch (e) {
    console.error('storage set fail', key, e)
  }
}

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...safeGet(KEY_SETTINGS, {}) }
}

export function saveSettings(patch) {
  const next = { ...getSettings(), ...patch }
  safeSet(KEY_SETTINGS, next)
  return next
}

export function getSessions() {
  const list = safeGet(KEY_SESSIONS, [])
  return Array.isArray(list) ? list : []
}

export function addSession(session) {
  const list = getSessions()
  const item = {
    id: session.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: session.date || formatDateKey(new Date()),
    startTime: session.startTime || Date.now(),
    durationSec: Math.max(0, Math.round(session.durationSec || 0)),
    jumps: Math.max(0, Math.round(session.jumps || 0)),
    calories: Math.max(0, Math.round((session.calories || 0) * 10) / 10),
    mode: session.mode || 'camera'
  }
  list.push(item)
  safeSet(KEY_SESSIONS, list)
  return item
}

export function formatDateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getDailyMap() {
  const map = {}
  for (const s of getSessions()) {
    const k = s.date
    if (!map[k]) map[k] = { date: k, jumps: 0, count: 0, durationSec: 0, calories: 0 }
    map[k].jumps += s.jumps
    map[k].count += 1
    map[k].durationSec += s.durationSec
    map[k].calories += s.calories
  }
  return map
}

export function getTodayStat() {
  const key = formatDateKey(new Date())
  const d = getDailyMap()[key]
  return d || { date: key, jumps: 0, count: 0, durationSec: 0, calories: 0 }
}

export function getDailyGoalProgress() {
  const settings = getSettings()
  const today = getTodayStat()
  const goal = settings.dailyGoal || 1000
  return {
    goal,
    today,
    percent: Math.min(100, Math.round((today.jumps / goal) * 100))
  }
}

export function calcStreak() {
  const daily = getDailyMap()
  let streak = 0
  const d = new Date()
  if (!daily[formatDateKey(d)] || daily[formatDateKey(d)].jumps <= 0) {
    d.setDate(d.getDate() - 1)
  }
  while (true) {
    const k = formatDateKey(d)
    const row = daily[k]
    if (row && row.jumps > 0) {
      streak += 1
      d.setDate(d.getDate() - 1)
    } else {
      break
    }
    if (streak > 3650) break
  }
  return streak
}

export function getTotals() {
  const sessions = getSessions()
  return sessions.reduce(
    (acc, s) => {
      acc.jumps += s.jumps
      acc.durationSec += s.durationSec
      acc.calories += s.calories
      acc.count += 1
      return acc
    },
    { jumps: 0, durationSec: 0, calories: 0, count: 0 }
  )
}

export function estimateCalories({ jumps = 0, durationSec = 0, weight = 60, mode = 'camera' } = {}) {
  const hours = durationSec / 3600
  if (mode === 'sensor' || mode === 'manual') {
    const met = 10.5
    return met * weight * hours
  }
  if (durationSec > 0) {
    const met = 10.5
    return met * weight * hours
  }
  return jumps * 0.14 * (weight / 60)
}

export function clearAllData() {
  try {
    uni.removeStorageSync(KEY_SESSIONS)
    uni.removeStorageSync(KEY_SETTINGS)
  } catch (e) {
    console.error(e)
  }
}
