<template>
  <view class="page">
    <view class="card">
      <text class="title">联系我们</text>
      <text class="desc">如需咨询/合作/售后，请扫码添加。</text>

      <view v-if="loading" class="loading">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else>
        <view v-if="qrUrl" class="qr-box" @click="previewQr">
          <image class="qr-image" :src="qrUrl" mode="aspectFill" />
          <text class="hint">点击预览，长按识别</text>
        </view>
        <view v-else class="empty">
          <text class="empty-text">暂未配置二维码</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getAppConfig } from "@/api/app";

const loading = ref(false);
const qrUrl = ref<string>("");

const load = async () => {
  loading.value = true;
  try {
    const config = await getAppConfig();
    qrUrl.value = config?.contact_code || config?.wechat_code || "";
  } catch (e) {
    console.error("[联系我们] 加载失败:", e);
    uni.showToast({ title: "加载失败", icon: "none" });
  } finally {
    loading.value = false;
  }
};

const previewQr = () => {
  if (!qrUrl.value) return;
  uni.previewImage({
    urls: [qrUrl.value],
    current: qrUrl.value,
  });
};

onLoad(() => {
  load();
});
</script>

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
}

.title {
  font-size: 40rpx;
  font-weight: 700;
  color: #222;
}

.desc {
  margin-top: 10rpx;
  font-size: 28rpx;
  color: #666;
}

.qr-box {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24rpx;
  background-color: #fafafa;
  border-radius: 16rpx;
}

.qr-image {
  width: 420rpx;
  height: 420rpx;
  border-radius: 12rpx;
  background-color: #f5f5f5;
}

.hint {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: #999;
}

.empty {
  margin-top: 24rpx;
  padding: 40rpx 24rpx;
  background-color: #fafafa;
  border-radius: 16rpx;
  text-align: center;
}

.empty-text {
  font-size: 26rpx;
  color: #999;
}

.loading {
  margin-top: 24rpx;
  padding: 40rpx 24rpx;
  background-color: #fafafa;
  border-radius: 16rpx;
  text-align: center;
}

.loading-text {
  font-size: 26rpx;
  color: #999;
}
</style>

