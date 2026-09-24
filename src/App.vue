<script>
export default {
  onLaunch() {
    // #ifdef H5
    // 启动即后台预加载骨架模型 + 预热着色器，进计数页秒开
    import('./utils/pose-engine.js')
      .then((m) => m.preload())
      .catch(() => {})
    // #endif
  },
  onShow() {},
  onHide() {}
}
</script>

<style>
page {
  background-color: #f5f7fa;
  color: #101828;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC',
    'Helvetica Neue', Arial, sans-serif;
  font-size: 28rpx;
  line-height: 1.5;
}

view,
text,
button {
  box-sizing: border-box;
}

.btn-primary {
  background: linear-gradient(135deg, #12b76a 0%, #039855 100%);
  color: #fff;
  border: none;
  border-radius: 999rpx;
  font-weight: 600;
  font-size: 32rpx;
  padding: 0 48rpx;
  height: 96rpx;
  line-height: 96rpx;
  box-shadow: 0 8px 20px rgba(18, 183, 106, 0.35);
}
.btn-primary::after {
  border: none;
}
.btn-ghost {
  background: #fff;
  color: #101828;
  border: 2rpx solid #e4e7ec;
  border-radius: 999rpx;
  font-weight: 600;
  font-size: 30rpx;
  height: 88rpx;
  line-height: 84rpx;
  padding: 0 40rpx;
}
.btn-ghost::after {
  border: none;
}
.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.06);
}
.muted {
  color: #667085;
  font-size: 24rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #101828;
  margin: 32rpx 0 16rpx;
  padding: 0 8rpx;
}
</style>
