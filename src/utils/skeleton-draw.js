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
