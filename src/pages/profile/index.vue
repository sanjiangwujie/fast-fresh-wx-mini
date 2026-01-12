<template>
  <view class="page">
    <!-- 用户信息 -->
    <view class="user-section">
      <view class="user-info">
        <image class="user-avatar" :src="userInfo?.avatar_url || '/static/default-avatar.png'" mode="aspectFill" />
        <view class="user-details">
          <text class="user-name">{{ userInfo?.nickname || "未登录" }}</text>
          <text class="user-phone" v-if="userInfo?.phone">{{ userInfo.phone }}</text>
        </view>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-section">
      <view class="menu-item" @click="handleMenuClick('orders')">
        <text class="menu-text">我的订单</text>
        <text class="menu-arrow">></text>
      </view>
      <view class="menu-item" @click="handleMenuClick('address')">
        <text class="menu-text">收货地址</text>
        <text class="menu-arrow">></text>
      </view>
      <view class="menu-item" @click="handleMenuClick('settings')">
        <text class="menu-text">设置</text>
        <text class="menu-arrow">></text>
      </view>
      <view class="menu-item" @click="handleMenuClick('about')">
        <text class="menu-text">关于我们</text>
        <text class="menu-arrow">></text>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout-section" v-if="userInfo">
      <view class="logout-btn" @click="handleLogout">
        <text class="logout-text">退出登录</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { ref, onMounted } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { getUser } from "@/api/user";
import type { Users } from "@/types/graphql";

export default {
  setup() {
    const userInfo = ref<Users | null>(null);

    // 加载用户信息
    const loadUserInfo = async () => {
      try {
        // TODO: 获取当前用户ID
        const userId = "1"; // 临时使用固定用户ID
        const result = await getUser(userId);
        userInfo.value = result;
      } catch (error) {
        console.error("加载用户信息失败:", error);
      }
    };

    // 处理菜单点击
    const handleMenuClick = (type: string) => {
      switch (type) {
        case "orders":
          uni.navigateTo({
            url: "/pages/orders/index",
          });
          break;
        case "address":
          // TODO: 跳转到收货地址页
          uni.showToast({
            title: "收货地址",
            icon: "none",
          });
          break;
        case "settings":
          // TODO: 跳转到设置页
          uni.showToast({
            title: "设置",
            icon: "none",
          });
          break;
        case "about":
          // TODO: 跳转到关于我们页
          uni.showToast({
            title: "关于我们",
            icon: "none",
          });
          break;
      }
    };

    // 退出登录
    const handleLogout = () => {
      uni.showModal({
        title: "提示",
        content: "确定要退出登录吗？",
        success: (res) => {
          if (res.confirm) {
            // TODO: 清除登录状态
            userInfo.value = null;
            uni.showToast({
              title: "已退出登录",
              icon: "success",
            });
          }
        },
      });
    };

    onLoad(() => {
      loadUserInfo();
    });

    onShow(() => {
      loadUserInfo();
    });

    return {
      userInfo,
      handleMenuClick,
      handleLogout,
    };
  },
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* 用户信息 */
.user-section {
  background: linear-gradient(135deg, #3cc51f 0%, #2ea517 100%);
  padding: 60rpx 40rpx 40rpx;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background-color: #fff;
  margin-right: 30rpx;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
}

.user-details {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 12rpx;
}

.user-phone {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 功能菜单 */
.menu-section {
  background-color: #fff;
  margin-top: 20rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx 40rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-text {
  font-size: 30rpx;
  color: #333;
}

.menu-arrow {
  font-size: 28rpx;
  color: #999;
}

/* 退出登录 */
.logout-section {
  margin-top: 40rpx;
  padding: 0 40rpx;
}

.logout-btn {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  text-align: center;
}

.logout-text {
  font-size: 30rpx;
  color: #ff6b35;
  font-weight: bold;
}
</style>
