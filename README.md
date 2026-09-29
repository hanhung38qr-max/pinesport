# 天天跳绳 · 无广告版（PineSport）

uni-app (Vue3) 跳绳 App：**无任何广告**，数据只存本机。核心是摄像头视觉计数。

## 功能

| 模块 | 说明 |
|------|------|
| 摄像头计数 | 髋部姿态周期计数（MediaPipe 落地帧判定）；模型失败时回退帧差能量 |
| 骨架预览 | MediaPipe 33 点叠加（本地模型，零下载） |
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

> **计数原理**：髋关节(23/24) 纵向位移 → 极慢基线归一化 → 一跳状态机。**在落地帧计数**（起跳瞬间易与摆绳噪声混淆，落地是髋部回基线最确定的时刻），配最小跳高阈值过滤走路/挪步，320ms 不应期防重复。合成帧实测：2Hz/2.5Hz/1.5Hz 精确 100%，静止与走路 0 误报。
>
> App 端不打包 MediaPipe wasm（H5 才加载），wasm 崩溃风险下回退帧差能量计数。骨架模型与 wasm 均在 `src/static/mediapipe/`，运行时零下载、离线可用；启动即后台预加载+预热。

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
