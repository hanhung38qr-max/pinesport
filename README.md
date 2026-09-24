# 天天跳绳 · 无广告版（PineSport）

uni-app (Vue3) 跳绳 App：**无任何广告**，数据只存本机。核心是摄像头视觉计数。

## 功能

| 模块 | 说明 |
|------|------|
| 摄像头计数 | 轻量帧差运动能量计数（无模型、无联网）；H5 可选骨架预览（MoveNet） |
| 自动开始 | 全身入画 + 捕捉到跳跃节奏 → 倒数 3/2/1 自动开跑 |
| 历史统计 | 周 / 月 / 全部图表 + 每场明细 |
| 目标与成就 | 每日目标、连续打卡、14 枚徽章 |
| 纯本地存储 | `uni.setStorageSync`，无账号无后端无上传 |

## 计数方案选型（对比）

| 方案 | 端侧成本 | 准确度 | 结论 |
|------|---------|--------|------|
| OpenPose | 高（需 GPU/大模型） | 高（多人） | 手机端过重，弃 |
| MediaPipe PoseLandmarker | 低（WASM，端侧） | 高 | ✅ H5 骨架预览，模型/wasm 全本地 |
| MediaPipe BlazePose | 中 | 高 | 可作备选 |
| **帧差运动检测** | 极低 | 中 | ✅ App 默认计数（不加载 TF） |

默认计数：帧差运动能量（64×48 灰度）→ EMA 相对基线 → 迟滞阈值 + 300ms 不应期；运动纵向跨度用于"全身入画"判定与自动开始。

> App 端不打包 TensorFlow/MoveNet（H5 才动态加载骨架），避免 WebView 崩溃与包体膨胀。
> 骨架 = MediaPipe PoseLandmarker：`pose_landmarker_lite.task`(5.8MB) 与 wasm 均打包进 `src/static/mediapipe/`，运行时零下载、离线可用；启动即后台预加载+预热。

## 开发

```bash
npm install

# H5 调试（摄像头需 localhost 或 HTTPS）
npm run dev:h5

# App 调试 / 打包（配合 HBuilderX 或 uni-app CLI 云打包）
npm run dev:app
npm run build:app-android
npm run build:app-ios
```

## 目录

```
src/
  pages/index     首页（今日目标环 + 7 日柱状图）
  pages/count     计数（摄像头，自动倒数开始）
  pages/history   历史统计
  pages/goals     目标与成就
  pages/settings  设置（体重、目标、音效、灵敏度）
  utils/store.js  本地存储与日聚合
  utils/motion-count.js  帧差计数（App 默认）
  utils/pose-engine.js  MediaPipe PoseLandmarker 封装（仅 H5，全本地）
  utils/jump-detector.js  跳跃峰值检测
  utils/achievements.js  成就规则
  utils/audio.js  计数提示音（WebAudio，无音频资源）
```

## 隐私

- 摄像头画面只在本机处理，不录制、不上传
- 所有记录保存在设备本地存储
- 无广告 SDK、无统计埋点
