import { getDailyMap, getSessions, getTotals, calcStreak, formatDateKey } from './store.js'

const DEFS = [
  { id: 'first', title: '启程', desc: '完成第一次跳绳', icon: '🌟', check: (ctx) => ctx.sessionCount >= 1 },
  { id: 's100', title: '百分选手', desc: '单次跳满 100 下', icon: '💯', check: (ctx) => ctx.maxSingle >= 100 },
  { id: 's300', title: '轻盈三佰', desc: '单次跳满 300 下', icon: '🏃', check: (ctx) => ctx.maxSingle >= 300 },
  { id: 's500', title: '半千达人', desc: '单次跳满 500 下', icon: '⚡', check: (ctx) => ctx.maxSingle >= 500 },
  { id: 's1000', title: '千下宗师', desc: '单次跳满 1000 下', icon: '👑', check: (ctx) => ctx.maxSingle >= 1000 },
  { id: 'd500', title: '日进五百', desc: '单日累计 500 下', icon: '📈', check: (ctx) => ctx.maxDaily >= 500 },
  { id: 'd1000', title: '日进千数', desc: '单日累计 1000 下', icon: '🎯', check: (ctx) => ctx.maxDaily >= 1000 },
  { id: 'd2000', title: '日进两千', desc: '单日累计 2000 下', icon: '🔥', check: (ctx) => ctx.maxDaily >= 2000 },
  { id: 'streak3', title: '三日不辍', desc: '连续打卡 3 天', icon: '📅', check: (ctx) => ctx.streak >= 3 },
  { id: 'streak7', title: '一周铁人', desc: '连续打卡 7 天', icon: '🏅', check: (ctx) => ctx.streak >= 7 },
  { id: 'streak30', title: '月度惯主', desc: '连续打卡 30 天', icon: '🏆', check: (ctx) => ctx.streak >= 30 },
  { id: 't10k', title: '万次俱乐部', desc: '累计跳满 10000 下', icon: '💎', check: (ctx) => ctx.totalJumps >= 10000 },
  { id: 't50k', title: '五万传奇', desc: '累计跳满 50000 下', icon: '🌟', check: (ctx) => ctx.totalJumps >= 50000 },
  { id: 'h10', title: '十小时训练', desc: '累计跳绳 10 小时', icon: '⏱️', check: (ctx) => ctx.totalHours >= 10 }
]

export function buildAchievementContext() {
  const sessions = getSessions()
  const totals = getTotals()
  const daily = getDailyMap()
  let maxSingle = 0
  for (const s of sessions) maxSingle = Math.max(maxSingle, s.jumps)
  let maxDaily = 0
  for (const k of Object.keys(daily)) maxDaily = Math.max(maxDaily, daily[k].jumps)

  return {
    sessionCount: sessions.length,
    maxSingle,
    maxDaily,
    streak: calcStreak(),
    totalJumps: totals.jumps,
    totalHours: totals.durationSec / 3600,
    today: daily[formatDateKey(new Date())] || { jumps: 0 }
  }
}

export function evaluateAchievements() {
  const ctx = buildAchievementContext()
  let raw = []
  try {
    raw = uni.getStorageSync('ps_earned') || []
    if (typeof raw === 'string') raw = raw ? JSON.parse(raw) : []
  } catch (e) {
    raw = []
  }
  if (!Array.isArray(raw)) raw = []
  const earned = new Set(raw)
  const newly = []
  for (const def of DEFS) {
    if (!earned.has(def.id) && def.check(ctx)) {
      earned.add(def.id)
      newly.push(def)
    }
  }
  if (newly.length) {
    try {
      uni.setStorageSync('ps_earned', JSON.stringify(Array.from(earned)))
    } catch (e) {
      /* ignore */
    }
  }
  return { list: DEFS, earned: Array.from(earned), newly }
}

export function listAchievements() {
  const { list, earned } = evaluateAchievements()
  return list.map((d) => ({ ...d, unlocked: earned.includes(d.id) }))
}
