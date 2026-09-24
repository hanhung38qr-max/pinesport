let vision = null
let landmarker = null
let initPromise = null
let loadFailed = false
let warmed = false
let lastVideoTs = 0

const WASM_BASE_CANDIDATES = ['/static/mediapipe/wasm', 'static/mediapipe/wasm']
const MODEL_CANDIDATES = [
  '/static/mediapipe/pose_landmarker_lite.task',
  'static/mediapipe/pose_landmarker_lite.task'
]

async function firstExisting(candidates) {
  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.ok) return url
    } catch (e) {
      /* try next */
    }
  }
  return candidates[0]
}

async function loadLibs() {
  if (vision) return
  const mod = await import(/* @vite-ignore */ '@mediapipe/tasks-vision')
  const wasmBase = await firstExisting(WASM_BASE_CANDIDATES)
  vision = await mod.FilesetResolver.forVisionTasks(wasmBase)
  visionMod = mod
}

let visionMod = null

async function createLandmarker(delegate) {
  const modelUrl = await firstExisting(MODEL_CANDIDATES)
  return visionMod.PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: modelUrl, delegate },
    runningMode: 'VIDEO',
    numPoses: 1
  })
}

export async function getDetector() {
  if (landmarker) return landmarker
  if (loadFailed) throw new Error('model previously failed')
  if (initPromise) return initPromise

  initPromise = (async () => {
    await loadLibs()
    try {
      landmarker = await createLandmarker('GPU')
    } catch (e) {
      landmarker = await createLandmarker('CPU')
    }
    await warmUp()
    return landmarker
  })()

  try {
    return await initPromise
  } catch (e) {
    initPromise = null
    loadFailed = true
    throw e
  }
}

/** 空跑一帧预热，避免首帧卡顿 */
async function warmUp() {
  if (warmed) return
  warmed = true
  try {
    const c = document.createElement('canvas')
    c.width = 192
    c.height = 192
    const g = c.getContext('2d')
    if (g) {
      g.fillStyle = '#000'
      g.fillRect(0, 0, 192, 192)
    }
    landmarker.detectForVideo(c, 1)
  } catch (e) {
    /* non-fatal */
  }
}

export function isModelReady() {
  return !!landmarker
}

/** 返回 33 个归一化 landmark [{x,y,visibility}] 或 null */
export function estimatePose(video) {
  if (!landmarker) return null
  if (!video || video.readyState < 2) return null
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const ts = now <= lastVideoTs ? lastVideoTs + 1 : now
  lastVideoTs = ts
  try {
    const res = landmarker.detectForVideo(video, ts)
    const lm = res && res.landmarks && res.landmarks[0]
    if (!lm || !lm.length) return null
    return lm
  } catch (e) {
    return null
  }
}

/** 启动时后台预加载，进计数页秒开 */
export function preload() {
  return getDetector().catch(() => null)
}

export function disposeDetector() {
  if (landmarker && typeof landmarker.close === 'function') {
    try {
      landmarker.close()
    } catch (e) {
      /* ignore */
    }
  }
  landmarker = null
  initPromise = null
  loadFailed = false
  warmed = false
}
