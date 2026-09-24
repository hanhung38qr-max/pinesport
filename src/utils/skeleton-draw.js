const EDGES = [
  [0, 1], [0, 2], [1, 3], [2, 4],
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
  [5, 11], [6, 12], [11, 12],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [0, 5], [0, 6]
]

const EDGE_COLOR = '#12B76A'
const JOINT_COLOR = '#6CE9A6'
const HIGH_CONF = 0.35

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
  if (!canvas || !box) return
  const rect = box.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.max(1, Math.round(rect.width))
  const h = Math.max(1, Math.round(rect.height))
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr
    canvas.height = h * dpr
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

/**
 * Draw COCO-17 skeleton on overlay canvas.
 * Video is CSS-mirrored (scaleX(-1)), so keypoints.x must be flipped.
 * object-fit: cover mapping: scale = max(cw/vw, ch/vh)
 */
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

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.008)
  ctx.strokeStyle = EDGE_COLOR
  ctx.shadowColor = 'rgba(18,183,106,0.55)'
  ctx.shadowBlur = 8

  for (const [a, b] of EDGES) {
    const pa = pts[a]
    const pb = pts[b]
    if (!pa || !pb) continue
    if (pa.score < HIGH_CONF || pb.score < HIGH_CONF) continue
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)
    ctx.stroke()
  }

  ctx.shadowBlur = 4
  for (const p of pts) {
    if (p.score < HIGH_CONF) continue
    ctx.beginPath()
    ctx.fillStyle = p.score > 0.5 ? JOINT_COLOR : '#FEC84B'
    ctx.arc(p.x, p.y, Math.max(4, Math.min(w, h) * 0.01), 0, Math.PI * 2)
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = 'rgba(3,152,85,0.9)'
    ctx.stroke()
  }

  // body-center marker (jump signal source)
  const hips = [pts[11], pts[12]].filter((p) => p && p.score >= HIGH_CONF)
  if (hips.length) {
    const cx = hips.reduce((s, p) => s + p.x, 0) / hips.length
    const cy = hips.reduce((s, p) => s + p.y, 0) / hips.length
    ctx.shadowBlur = 0
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.moveTo(cx - 18, cy)
    ctx.lineTo(cx + 18, cy)
    ctx.moveTo(cx, cy - 18)
    ctx.lineTo(cx, cy + 18)
    ctx.stroke()
    ctx.setLineDash([])
  }

  ctx.shadowBlur = 0
}
