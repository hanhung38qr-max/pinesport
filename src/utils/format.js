export function fmtDuration(sec) {
  const s = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

export function fmtDateLabel(dateKey) {
  const [y, m, d] = (dateKey || '').split('-').map(Number)
  if (!y) return dateKey
  return `${m}月${d}日`
}

export function weekdayLabel(dateKey) {
  const [y, m, d] = (dateKey || '').split('-').map(Number)
  if (!y) return ''
  const dt = new Date(y, m - 1, d)
  return ['日', '一', '二', '三', '四', '五', '六'][dt.getDay()]
}

export function lastNDays(n) {
  const out = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    d.setDate(d.getDate() - i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    out.push(`${y}-${m}-${day}`)
  }
  return out
}

export function startOfWeekKey(base = new Date()) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  return d
}

export function startOfMonthKey(base = new Date()) {
  return new Date(base.getFullYear(), base.getMonth(), 1)
}
