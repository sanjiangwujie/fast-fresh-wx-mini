<template>
  <view class="page">
    <view class="header">
      <text class="header-title">选择批次</text>
    </view>

    <scroll-view class="scroll-view" scroll-y @scrolltolower="loadMore" v-if="batches.length > 0">
      <view class="batch-list">
        <view class="batch-item" v-for="batch in batches" :key="batch.id" @click="handleSelectBatch(batch)">
          <image class="batch-image" :src="batch.image_url || '/static/default-avatar.png'" mode="aspectFill" />
          <view class="batch-info">
            <text class="batch-id">批次 #{{ batch.id }}</text>
            <text class="batch-time">{{ formatTime(batch.created_at) }}</text>
            <view class="batch-status" v-if="batch.product">
              <text class="status-text status-active">已生成商品</text>
            </view>
            <view class="batch-status" v-else>
              <text class="status-text status-pending">待生成商品</text>
            </view>
          </view>
        </view>
      </view>
      <view class="load-more" v-if="hasMore">
        <text class="load-more-text">加载中...</text>
      </view>
    </scroll-view>

    <view class="empty-state" v-else>
      <text class="empty-text">暂无批次数据</text>
    </view>
  </view>
</template>

<script lang="ts">
import { ref, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getBatchesWithoutProduct } from "@/api/batch";
import { isLoggedIn } from "@/api/auth";
import type { Batches } from "@/types/graphql";

export default {
  setup() {
    const batches = ref<Batches[]>([]);
    const loading = ref(false);
    const hasMore = ref(true);
    const offset = ref(0);
    const limit = 20;

    // 加载批次列表（只显示未生成商品的批次）
    const loadBatches = async (reset = false) => {
      if (loading.value) return;

      if (!isLoggedIn()) {
        uni.navigateTo({
          url: "/pages/login/index",
        });
        return;
      }

      loading.value = true;
      try {
        if (reset) {
          offset.value = 0;
          batches.value = [];
        }

        const result = await getBatchesWithoutProduct({
          limit,
          offset: offset.value,
        });

        if (reset) {
          batches.value = result;
        } else {
          batches.value = [...batches.value, ...result];
        }

        hasMore.value = result.length === limit;
        offset.value += result.length;
      } catch (error) {
        console.error("加载批次失败:", error);
        uni.showToast({
          title: "加载失败",
          icon: "none",
        });
      } finally {
        loading.value = false;
      }
    };

    // 加载更多
    const loadMore = () => {
      if (hasMore.value && !loading.value) {
        loadBatches(false);
      }
    };

    // 格式化时间
    const formatTime = (time: string) => {
      const date = new Date(time);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };

    // 选择批次
    const handleSelectBatch = (batch: Batches) => {
      // 保存到本地存储，返回上一页
      uni.setStorageSync("selectedBatch", batch);
      uni.navigateBack();
    };

    onLoad(() => {
      loadBatches(true);
    });

    return {
      batches,
      loading,
      hasMore,
      loadMore,
      formatTime,
      handleSelectBatch,
    };
  },
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header {
  background-color: #fff;
  padding: 30rpx 40rpx;
  border-bottom: 1rpx solid #eee;
}

.header-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.scroll-view {
  height: calc(100vh - 120rpx);
}

.batch-list {
  padding: 20rpx;
}

.batch-item {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.batch-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background-color: #f5f5f5;
  margin-right: 24rpx;
}

.batch-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.batch-id {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.batch-time {
  font-size: 24rpx;
  color: #999;
}

.batch-status {
  margin-top: 8rpx;
}

.status-text {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
}

.status-active {
  background-color: #e8f5e9;
  color: #2ea517;
}

.status-pending {
  background-color: #fff3e0;
  color: #ff9800;
}

.load-more {
  padding: 40rpx;
  text-align: center;
}

.load-more-text {
  font-size: 26rpx;
  color: #999;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 40rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}
</style>
