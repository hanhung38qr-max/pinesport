const EDGES = [
  [0, 1], [0, 2], [1, 3], [2, 4],
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
  [5, 11], [6, 12], [11, 12],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [0, 5], [0, 6]
]

const DRAW_CONF = 0.12
const EDGE_COLOR = '#12B76A'
const JOINT_COLOR = '#6CE9A6'
const HIP_COLOR = '#FEC84B'

export function ensureOverlayCanvas(box) {
  if (!box) return null
  let canvas = box.querySelector('canvas.cam__skeleton')
  if (canvas) return canvas
  canvas = document.createElement('canvas')
  canvas.className = 'cam__skeleton'
  // 运行时创建的元素拿不到 scoped 样式，必须内联：绝对定位铺满并压在视频上
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;'
  box.appendChild(canvas)
  return canvas
}

export function resizeOverlay(canvas, box) {
  if (!canvas || !box) return null
  const rect = box.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.max(1, Math.round(rect.width))
  const h = Math.max(1, Math.round(rect.height))
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
  }
  return { w, h, dpr }
}

export function clearOverlay(canvas) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
}

// 离屏剪影缓存：key -> canvas（不透明人体，一次性构建）
const tmplCache = new Map()

function buildSilhouette(w, h, dpr) {
  const key = `${w}x${h}x${dpr}`
  if (tmplCache.has(key)) return tmplCache.get(key)
  if (typeof document === 'undefined') return null

  const off = document.createElement('canvas')
  off.width = Math.max(1, Math.round(w * dpr))
  off.height = Math.max(1, Math.round(h * dpr))
  const c = off.getContext('2d')
  if (!c) return null
  c.setTransform(dpr, 0, 0, dpr, 0, 0)

  const H = Math.min(h * 0.86, w * 2.6)
  const cx = w * 0.5
  const top = (h - H) * 0.46
  const Y = (f) => top + f * H

  // 7.5 头身，椭圆头 + 细颈 + 圆肩
  const headRx = 0.050 * H
  const headRy = 0.066 * H
  const headCy = Y(0.066)
  const shoulderY = Y(0.205)
  const shHW = 0.115 * H
  const waistY = Y(0.44)
  const waHW = 0.078 * H
  const hipY = Y(0.52)
  const hiHW = 0.095 * H
  const elbowY = Y(0.42)
  const wristY = Y(0.60)
  const kneeY = Y(0.73)
  const ankleY = Y(0.95)

  const SOLID = '#12B76A'
  c.fillStyle = SOLID
  c.strokeStyle = SOLID
  c.lineCap = 'round'
  c.lineJoin = 'round'

  const seg = (x1, y1, x2, y2, lw) => {
    c.lineWidth = lw
    c.beginPath()
    c.moveTo(x1, y1)
    c.lineTo(x2, y2)
    c.stroke()
  }
  const disc = (x, y, r) => {
    c.beginPath()
    c.arc(x, y, r, 0, Math.PI * 2)
    c.fill()
  }

  // 头（椭圆）
  c.beginPath()
  c.ellipse(cx, headCy, headRx, headRy, 0, 0, Math.PI * 2)
  c.fill()
  // 颈
  seg(cx, headCy + headRy * 0.4, cx, shoulderY, 0.055 * H)

  // 躯干：圆肩 → 收腰 → 髋
  c.beginPath()
  c.moveTo(cx - shHW + shHW * 0.35, shoulderY - shHW * 0.28)
  c.quadraticCurveTo(cx, shoulderY - shHW * 0.42, cx + shHW - shHW * 0.35, shoulderY - shHW * 0.28)
  c.quadraticCurveTo(cx + shHW, shoulderY - shHW * 0.1, cx + shHW, shoulderY + shHW * 0.25)
  c.bezierCurveTo(cx + shHW, shoulderY + 0.12 * H, cx + waHW, waistY - 0.05 * H, cx + waHW, waistY)
  c.bezierCurveTo(cx + waHW, waistY + 0.05 * H, cx + hiHW, hipY - 0.05 * H, cx + hiHW, hipY)
  c.quadraticCurveTo(cx, hipY + 0.04 * H, cx - hiHW, hipY)
  c.bezierCurveTo(cx - hiHW, hipY - 0.05 * H, cx - waHW, waistY + 0.05 * H, cx - waHW, waistY)
  c.bezierCurveTo(cx - waHW, waistY - 0.05 * H, cx - shHW, shoulderY + 0.12 * H, cx - shHW, shoulderY + shHW * 0.25)
  c.quadraticCurveTo(cx - shHW, shoulderY - shHW * 0.1, cx - shHW + shHW * 0.35, shoulderY - shHW * 0.28)
  c.closePath()
  c.fill()

  for (const s of [-1, 1]) {
    const sx = cx + s * shHW * 0.82
    const ex = cx + s * (shHW + 0.014 * H)
    const wx = cx + s * (shHW + 0.006 * H)
    // 手臂：上臂粗 → 前臂细 → 手
    seg(sx, shoulderY + 0.012 * H, ex, elbowY, 0.07 * H)
    seg(ex, elbowY, wx, wristY, 0.05 * H)
    disc(wx, wristY + 0.022 * H, 0.03 * H)
    // 腿：大腿粗 → 小腿细 → 脚
    const hx = cx + s * hiHW * 0.5
    const kx = cx + s * hiHW * 0.48
    const ax = cx + s * hiHW * 0.42
    seg(hx, hipY, kx, kneeY, 0.10 * H)
    seg(kx, kneeY, ax, ankleY, 0.065 * H)
    seg(ax, ankleY, ax + s * 0.055 * H, ankleY + 0.015 * H, 0.05 * H)
  }

  tmplCache.set(key, off)
  return off
}

/**
 * 人形站位板（类天天跳绳）：半透明人体剪影，提示全身入画位置。
 * 离屏构建不透明剪影后整体半透明合成 —— 无关节黑洞、无重叠发暗。
 */
export function drawHumanTemplate(canvas, opts = {}) {
  if (!canvas) return
  const box = canvas.parentElement
  const size = resizeOverlay(canvas, box)
  if (!size) return
  const { w, h, dpr } = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (opts.clear !== false) ctx.clearRect(0, 0, w, h)

  const off = buildSilhouette(w, h, dpr)
  if (!off) return

  const alpha = opts.alpha ?? 0.5
  const glow = opts.glow || 'rgba(18,183,106,0.65)'

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.shadowColor = glow
  ctx.shadowBlur = 16
  ctx.drawImage(off, 0, 0, w, h)
  ctx.restore()

  // 站位虚线
  const H = Math.min(h * 0.86, w * 2.6)
  const cx = w * 0.5
  const top = (h - H) * 0.46
  const ankleY = top + 0.95 * H
  const shHW = 0.115 * H
  ctx.save()
  ctx.globalAlpha = alpha * 0.8
  ctx.setLineDash([7, 9])
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.006)
  ctx.strokeStyle = 'rgba(108,233,166,0.9)'
  ctx.beginPath()
  ctx.moveTo(cx - shHW * 1.6, ankleY + 0.05 * H)
  ctx.lineTo(cx + shHW * 1.6, ankleY + 0.05 * H)
  ctx.stroke()
  ctx.restore()
}

export function drawSkeleton(canvas, keypoints, video, opts = {}) {
  if (!canvas || !keypoints || !keypoints.length) return
  const box = canvas.parentElement
  const size = resizeOverlay(canvas, box)
  if (!size) return
  const { w, h, dpr } = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const vw = video && video.videoWidth ? video.videoWidth : 640
  const vh = video && video.videoHeight ? video.videoHeight : 480
  const scale = Math.max(w / vw, h / vh)
  const drawW = vw * scale
  const drawH = vh * scale
  const offX = (w - drawW) / 2
  const offY = (h - drawH) / 2
  const mirror = opts.mirror !== false

  const toXY = (kp) => {
    let nx = kp.x / vw
    if (mirror) nx = 1 - nx
    const ny = kp.y / vh
    return {
      x: offX + nx * drawW,
      y: offY + ny * drawH,
      score: kp.score ?? 0
    }
  }

  const pts = keypoints.map(toXY)
  const lw = Math.max(3, Math.min(w, h) * 0.01)
  const r = Math.max(5, Math.min(w, h) * 0.012)

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowColor = 'rgba(18,183,106,0.6)'
  ctx.shadowBlur = 10

  // bones
  for (const [a, b] of EDGES) {
    const pa = pts[a]
    const pb = pts[b]
    if (!pa || !pb) continue
    if (pa.score < DRAW_CONF || pb.score < DRAW_CONF) continue
    const weak = pa.score < 0.35 || pb.score < 0.35
    ctx.globalAlpha = weak ? 0.45 : 1
    ctx.strokeStyle = EDGE_COLOR
    ctx.lineWidth = lw
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // torso fill (5-6-12-11)
  const torso = [pts[5], pts[6], pts[12], pts[11]]
  if (torso.every((p) => p && p.score >= DRAW_CONF)) {
    ctx.beginPath()
    ctx.moveTo(torso[0].x, torso[0].y)
    for (let i = 1; i < torso.length; i++) ctx.lineTo(torso[i].x, torso[i].y)
    ctx.closePath()
    ctx.fillStyle = 'rgba(18,183,106,0.12)'
    ctx.fill()
  }

  // hip / pelvis block — 明确画出髋部（左右髋 + 连线 + 中点）
  const lh = pts[11]
  const rh = pts[12]
  if (lh && rh && lh.score >= DRAW_CONF && rh.score >= DRAW_CONF) {
    ctx.shadowBlur = 8
    ctx.strokeStyle = HIP_COLOR
    ctx.lineWidth = lw + 1
    ctx.beginPath()
    ctx.moveTo(lh.x, lh.y)
    ctx.lineTo(rh.x, rh.y)
    ctx.stroke()

    const hx = (lh.x + rh.x) / 2
    const hy = (lh.y + rh.y) / 2
    const gap = Math.hypot(rh.x - lh.x, rh.y - lh.y) || 20
    // 左右髋关节大圆点
    for (const p of [lh, rh]) {
      ctx.beginPath()
      ctx.fillStyle = HIP_COLOR
      ctx.arc(p.x, p.y, r + 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(3,152,85,0.9)'
      ctx.lineWidth = 2
      ctx.stroke()
    }
    // 骨盆中点标记
    ctx.beginPath()
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.arc(hx, hy, r * 0.55, 0, Math.PI * 2)
    ctx.fill()
    // 小环强调
    ctx.beginPath()
    ctx.strokeStyle = HIP_COLOR
    ctx.lineWidth = 2
    ctx.arc(hx, hy, gap * 0.35, 0, Math.PI * 2)
    ctx.stroke()
  }

  // all joints
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    if (!p || p.score < DRAW_CONF) continue
    if (i === 11 || i === 12) continue
    ctx.shadowBlur = 4
    ctx.beginPath()
    ctx.fillStyle = p.score > 0.5 ? JOINT_COLOR : '#FEC84B'
    ctx.globalAlpha = p.score < 0.3 ? 0.55 : 1
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.strokeStyle = 'rgba(3,152,85,0.9)'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  // jump signal crosshair on hip center
  if (lh && rh && lh.score >= DRAW_CONF && rh.score >= DRAW_CONF) {
    const cx = (lh.x + rh.x) / 2
    const cy = (lh.y + rh.y) / 2
    ctx.shadowBlur = 0
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(cx - 22, cy)
    ctx.lineTo(cx + 22, cy)
    ctx.moveTo(cx, cy - 22)
    ctx.lineTo(cx, cy + 22)
    ctx.stroke()
    ctx.setLineDash([])
  }

  ctx.shadowBlur = 0
  ctx.globalAlpha = 1
}
