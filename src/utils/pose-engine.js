import * as tf from '@tensorflow/tfjs-core'
import '@tensorflow/tfjs-backend-webgl'
import '@tensorflow/tfjs-backend-cpu'
import * as poseDetection from '@tensorflow-models/pose-detection'

let detector = null
let initPromise = null
let backendReady = false

async function ensureBackend() {
  if (backendReady) return
  try {
    await tf.setBackend('webgl')
    await tf.ready()
    backendReady = true
  } catch (e) {
    await tf.setBackend('cpu')
    await tf.ready()
    backendReady = true
  }
}

export async function getDetector() {
  if (detector) return detector
  if (initPromise) return initPromise

  initPromise = (async () => {
    await ensureBackend()
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableTracking: false
      }
    )
    return detector
  })()

  try {
    return await initPromise
  } catch (e) {
    initPromise = null
    throw e
  }
}

export async function estimatePose(video) {
  const det = await getDetector()
  const poses = await det.estimatePoses(video, {
    maxPoses: 1,
    flipHorizontal: false
  })
  return poses && poses.length ? poses[0] : null
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
}
