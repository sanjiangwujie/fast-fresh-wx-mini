<template>
  <view class="page">
    <view class="card">
      <text class="title">关于我们</text>
      <text class="subtitle">三江无界 · 新鲜直达</text>
      <text class="desc">
        三江无界是一款面向社区与家庭的生鲜小程序，我们希望把“看得见的品质”和“更短的流通链路”带到每一次下单里。
        我们与产地与果农合作，提供透明的来源信息、稳定的履约体验，以及更省心的售后服务。
      </text>
    </view>

    <view class="card">
      <text class="section-title">我们在做什么</text>
      <view class="bullet">
        <text class="dot">•</text>
        <text class="bullet-text">精选水果与应季农产品，优先新鲜与口感。</text>
      </view>
      <view class="bullet">
        <text class="dot">•</text>
        <text class="bullet-text">支持批次管理与商品追踪，信息更透明。</text>
      </view>
      <view class="bullet">
        <text class="dot">•</text>
        <text class="bullet-text">尽量缩短链路，提升配送效率与到手体验。</text>
      </view>
    </view>

    <view class="card">
      <text class="section-title">服务承诺</text>
      <view class="tag-row">
        <text class="tag">品质把关</text>
        <text class="tag">新鲜优先</text>
        <text class="tag">售后响应</text>
      </view>
      <text class="desc">
        我们重视每一次反馈。如果你对商品或服务有任何建议，欢迎通过运营人员/管理员渠道与我们联系，我们会尽快处理并持续优化。
      </text>
    </view>

    <view class="footer">
      <text class="footer-text">Version 1.0.1</text>
    </view>
  </view>
</template>

<script setup lang="ts"></script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 24rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
  padding: 24rpx 24rpx calc(24rpx + constant(safe-area-inset-bottom));
  box-sizing: border-box;
}

.card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
}

.title {
  font-size: 40rpx;
  font-weight: 700;
  color: #222;
}

.subtitle {
  margin-top: 10rpx;
  font-size: 26rpx;
  color: #666;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 18rpx;
}

.desc {
  margin-top: 18rpx;
  font-size: 28rpx;
  line-height: 44rpx;
  color: #444;
}

.bullet {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.dot {
  font-size: 28rpx;
  line-height: 44rpx;
  color: #3cc51f;
}

.bullet-text {
  flex: 1;
  font-size: 28rpx;
  line-height: 44rpx;
  color: #444;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 18rpx;
}

.tag {
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #2ea517;
  background-color: rgba(60, 197, 31, 0.10);
}

.footer {
  padding: 12rpx 0;
  text-align: center;
}

.footer-text {
  font-size: 24rpx;
  color: #999;
}
</style>

