# 天天跳绳 · 无广告版（PineSport）

uni-app (Vue3) 跳绳 App：**无任何广告**，数据只存本机。核心是摄像头视觉计数。

## 功能

| 模块 | 说明 |
|------|------|
| 摄像头计数 | 默认轻量帧差计数（无模型、无联网），人影上下起伏自动 +1；H5 可选骨架预览（MoveNet） |
| 体感计数 | 加速度计峰值检测（摄像头不可用时的降级方案） |
| 手动计数 | 点按 +1 |
| 历史统计 | 周 / 月 / 全部图表 + 每场明细 |
| 目标与成就 | 每日目标、连续打卡、14 枚徽章 |
| 纯本地存储 | `uni.setStorageSync`，无账号无后端无上传 |

## 计数方案选型（对比）

| 方案 | 端侧成本 | 准确度 | 结论 |
|------|---------|--------|------|
| OpenPose | 高（需 GPU/大模型） | 高（多人） | 手机端过重，弃 |
| MoveNet Lightning | 低（单人 192px，WebGL） | 高 | H5 骨架预览可选 |
| MediaPipe BlazePose | 中 | 高 | 可作备选 |
| **帧差运动检测** | 极低 | 中 | ✅ App 默认计数（不加载 TF） |

默认计数：行剖面位移（帧差 Y 对齐）→ EMA 相对基线 → 迟滞阈值 + 300ms 不应期。体感模式共用同一套峰值检测。

> App 端不打包 TensorFlow/MoveNet（H5 才动态加载骨架），避免 WebView 崩溃与包体膨胀。

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
  pages/count     计数（摄像头 / 体感 / 手动）
  pages/history   历史统计
  pages/goals     目标与成就
  pages/settings  设置（体重、目标、音效、灵敏度）
  utils/store.js  本地存储与日聚合
  utils/motion-count.js  帧差计数（App 默认）
  utils/pose-engine.js  MoveNet 封装（仅 H5 动态加载）
  utils/jump-detector.js  跳跃峰值检测
  utils/achievements.js  成就规则
  utils/audio.js  计数提示音（WebAudio，无音频资源）
```

## 隐私

- 摄像头画面只在本机处理，不录制、不上传
- 所有记录保存在设备本地存储
- 无广告 SDK、无统计埋点
