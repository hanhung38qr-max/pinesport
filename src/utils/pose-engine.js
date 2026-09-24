let tfMod = null
let pdMod = null
let detector = null
let initPromise = null
let backendReady = false
let inferBusy = false
let loadFailed = false

function withTimeout(promise, ms, label = 'op') {
  let timer = null
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timeout ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}

async function loadLibs() {
  if (tfMod && pdMod) return
  const [tf, webgl, cpu, pd] = await Promise.all([
    import(/* @vite-ignore */ '@tensorflow/tfjs-core'),
    import(/* @vite-ignore */ '@tensorflow/tfjs-backend-webgl'),
    import(/* @vite-ignore */ '@tensorflow/tfjs-backend-cpu'),
    import(/* @vite-ignore */ '@tensorflow-models/pose-detection')
  ])
  tfMod = tf
  pdMod = pd
  // side-effect registers backends
  void webgl
  void cpu
}

async function ensureBackend() {
  if (backendReady) return
  await loadLibs()
  try {
    await withTimeout(tfMod.setBackend('webgl'), 3000, 'setBackend')
    await withTimeout(tfMod.ready(), 5000, 'tf.ready')
    backendReady = true
  } catch (e) {
    await tfMod.setBackend('cpu')
    await withTimeout(tfMod.ready(), 8000, 'tf.ready-cpu')
    backendReady = true
  }
}

export async function getDetector() {
  if (detector) return detector
  if (loadFailed) throw new Error('model previously failed')
  if (initPromise) return initPromise

  initPromise = (async () => {
    await ensureBackend()
    const det = await withTimeout(
      pdMod.createDetector(pdMod.SupportedModels.MoveNet, {
        modelType: pdMod.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableTracking: false
      }),
      25000,
      'load MoveNet'
    )
    detector = det
    return det
  })()

  try {
    return await initPromise
  } catch (e) {
    initPromise = null
    loadFailed = true
    throw e
  }
}

export function isModelReady() {
  return !!detector
}

/** 单飞推理：上一帧没跑完直接跳过，避免堆积卡死 */
export async function estimatePose(video) {
  if (inferBusy) return null
  if (!detector) return null
  inferBusy = true
  try {
    const poses = await withTimeout(
      detector.estimatePoses(video, { maxPoses: 1, flipHorizontal: false }),
      1200,
      'estimate'
    )
    return poses && poses.length ? poses[0] : null
  } finally {
    inferBusy = false
  }
}

export function disposeDetector() {
  if (detector && typeof detector.dispose === 'function') {
    try {
      detector.dispose()
    } catch (e) {
      /* ignore */
    }
  }
  detector = null
  initPromise = null
  inferBusy = false
  loadFailed = false
}
