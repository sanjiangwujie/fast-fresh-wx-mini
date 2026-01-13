<template>
  <view class="page">
    <view class="header">
      <text class="header-title">收货地址</text>
    </view>

    <scroll-view class="scroll-view" scroll-y v-if="addresses.length > 0">
      <view class="address-list">
        <view 
          class="address-item" 
          v-for="address in addresses" 
          :key="address.id"
          @click="handleSelectAddress(address)"
        >
          <view class="address-content">
            <view class="address-header">
              <view class="receiver-info">
                <text class="receiver-name">{{ address.receiver_name }}</text>
                <text class="receiver-phone">{{ address.receiver_phone }}</text>
                <view class="default-badge" v-if="address.is_default">
                  <text class="default-badge-text">默认</text>
                </view>
              </view>
              <view class="address-actions">
                <view class="action-btn" @click.stop="handleEditAddress(address)">
                  <text class="action-btn-text">编辑</text>
                </view>
                <view class="action-btn delete" @click.stop="handleDeleteAddress(address)">
                  <text class="action-btn-text">删除</text>
                </view>
              </view>
            </view>
            <view class="address-detail">
              <text class="address-text">{{ address.receiver_address }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="empty-state" v-else>
      <text class="empty-icon">📍</text>
      <text class="empty-text">暂无收货地址</text>
      <text class="empty-hint">点击下方按钮添加收货地址</text>
    </view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <view class="add-btn" @click="handleAddAddress">
        <text class="add-btn-text">+ 新增收货地址</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { ref, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getAddresses, deleteAddress, setDefaultAddress } from "@/api/address";
import { getUserId, isLoggedIn } from "@/api/auth";
import type { Addresses } from "@/types/graphql";

export default {
  setup() {
    const addresses = ref<Addresses[]>([]);
    const fromCheckout = ref(false); // 是否来自下单页面

    // 加载收货地址列表
    const loadAddresses = async () => {
      if (!isLoggedIn()) {
        uni.navigateTo({
          url: "/pages/login/index",
        });
        return;
      }

      const userId = getUserId();
      if (!userId) {
        uni.navigateTo({
          url: "/pages/login/index",
        });
        return;
      }

      try {
        addresses.value = await getAddresses(userId);
      } catch (error) {
        console.error("加载收货地址失败:", error);
        uni.showToast({
          title: "加载失败",
          icon: "none",
        });
      }
    };

    // 新增收货地址
    const handleAddAddress = () => {
      uni.navigateTo({
        url: "/pages/address-edit/index",
      });
    };

    // 编辑收货地址
    const handleEditAddress = (address: Addresses) => {
      uni.navigateTo({
        url: `/pages/address-edit/index?id=${address.id}`,
      });
    };

    // 删除收货地址
    const handleDeleteAddress = async (address: Addresses) => {
      uni.showModal({
        title: "确认删除",
        content: "确定要删除这个收货地址吗？",
        success: async (res) => {
          if (res.confirm) {
            try {
              await deleteAddress(address.id);
              uni.showToast({
                title: "删除成功",
                icon: "success",
              });
              await loadAddresses();
            } catch (error) {
              console.error("删除收货地址失败:", error);
              uni.showToast({
                title: "删除失败",
                icon: "none",
              });
            }
          }
        },
      });
    };

    // 选择收货地址（用于下单页面）
    const handleSelectAddress = (address: Addresses) => {
      // 检查是否来自下单页面
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      if (prevPage && prevPage.route === "pages/checkout/index") {
        // 将选中的地址存储到本地存储
        uni.setStorageSync("selectedAddress", address);
        uni.navigateBack();
      }
    };

    onMounted(() => {
      loadAddresses();
    });

    onShow(() => {
      loadAddresses();
    });

    return {
      addresses,
      handleAddAddress,
      handleEditAddress,
      handleDeleteAddress,
      handleSelectAddress,
    };
  },
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 120rpx;
}

.header {
  padding: 40rpx 30rpx 30rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #e0e0e0;
}

.header-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.scroll-view {
  height: calc(100vh - 200rpx);
}

.address-list {
  padding: 20rpx;
}

.address-item {
  background-color: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.address-content {
  width: 100%;
}

.address-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16rpx;
}

.receiver-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
}

.receiver-name {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
}

.receiver-phone {
  font-size: 28rpx;
  color: #666;
}

.default-badge {
  padding: 4rpx 12rpx;
  background: linear-gradient(135deg, #ff9500 0%, #ff6b00 100%);
  border-radius: 8rpx;
}

.default-badge-text {
  font-size: 20rpx;
  color: #fff;
  font-weight: 500;
}

.address-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  padding: 8rpx 16rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
}

.action-btn.delete {
  background-color: #fff5f5;
}

.action-btn-text {
  font-size: 24rpx;
  color: #666;
}

.action-btn.delete .action-btn-text {
  color: #ff4444;
}

.address-detail {
  margin-top: 12rpx;
}

.address-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 40rpx;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #999;
  margin-bottom: 16rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #ccc;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background-color: #fff;
  border-top: 1rpx solid #e0e0e0;
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.add-btn {
  padding: 28rpx;
  background: linear-gradient(135deg, #ff9500 0%, #ff6b00 100%);
  border-radius: 40rpx;
  text-align: center;
  box-shadow: 0 4rpx 12rpx rgba(255, 149, 0, 0.3);
}

.add-btn-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #fff;
}
</style>
