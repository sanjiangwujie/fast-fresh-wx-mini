<template>
  <view class="page">
    <!-- 用户信息 -->
    <view class="user-section">
      <view class="user-info" @click="handleUserInfoClick">
        <image class="user-avatar" :src="userInfo?.avatar_url || '/static/default-avatar.png'" mode="aspectFill" />
        <view class="user-details">
          <text class="user-name">{{ userInfo?.nickname || "未登录" }}</text>
          <text class="user-phone" v-if="userInfo?.phone">{{ userInfo.phone }}</text>
          <text class="login-tip" v-if="!isLoggedIn()">点击登录</text>
        </view>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-section">
      <view class="menu-item" @click="handleMenuClick('orders')">
        <text class="menu-text">我的订单</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="handleMenuClick('address')">
        <text class="menu-text">收货地址</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 果农管理功能 -->
    <view class="menu-section" v-if="hasFarmerRole">
      <view class="section-header">
        <text class="section-title">果农管理</text>
      </view>
      <view class="menu-item" @click="handleMenuClick('batches')">
        <view class="menu-icon-wrapper">
          <text class="menu-icon">📦</text>
          <text class="menu-text">批次管理</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 运营管理功能 -->
    <view class="menu-section" v-if="hasOperatorRole">
      <view class="section-header">
        <text class="section-title">运营管理</text>
      </view>
      <view class="menu-item" @click="handleMenuClick('products')">
        <view class="menu-icon-wrapper">
          <text class="menu-icon">🛍️</text>
          <text class="menu-text">商品管理</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="handleMenuClick('order-manage')">
        <view class="menu-icon-wrapper">
          <text class="menu-icon">📋</text>
          <text class="menu-text">订单管理</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 其他功能 -->
    <view class="menu-section">
      <view class="menu-item" @click="handleMenuClick('settings')">
        <text class="menu-text">设置</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="handleMenuClick('about')">
        <text class="menu-text">关于我们</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout-section" v-if="isLoggedIn()">
      <view class="logout-btn" @click="handleLogout">
        <text class="logout-text">退出登录</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { ref, computed } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { getUser, getUserRoles } from "@/api/user";
import { getUserId, getUserInfo, clearLoginInfo, isLoggedIn } from "@/api/auth";
import type { Users } from "@/types/graphql";

export default {
  setup() {
    const userInfo = ref<Users | null>(null);
    const userRoles = ref<Array<{ role_type?: string | null }>>([]);

    // 加载用户信息
    const loadUserInfo = async () => {
      // 先尝试从本地存储读取
      const localUserInfo = getUserInfo();
      if (localUserInfo) {
        // 从本地存储读取的用户信息，id是字符串类型
        userInfo.value = {
          id: localUserInfo.id as any, // 临时使用any，实际从服务器获取时会转换为正确的类型
          phone: localUserInfo.phone,
          nickname: localUserInfo.nickname,
          avatar_url: localUserInfo.avatar_url,
        } as any;
      }

      // 如果已登录，从服务器获取最新信息
      if (isLoggedIn()) {
        try {
          const userId = getUserId();
          if (userId) {
            const result = await getUser(userId);
            if (result) {
              userInfo.value = result;
              // 更新本地存储
              uni.setStorageSync("userInfo", {
                id: String(result.id),
                phone: result.phone,
                nickname: result.nickname,
                avatar_url: result.avatar_url,
              });
            }

            // 加载用户角色
            try {
              const roles = await getUserRoles(userId);
              userRoles.value = roles;
            } catch (error) {
              console.error("加载用户角色失败:", error);
              userRoles.value = [];
            }
          }
        } catch (error) {
          console.error("加载用户信息失败:", error);
          // 如果获取失败，可能是token过期，清除登录状态
          if (!localUserInfo) {
            clearLoginInfo();
            userInfo.value = null;
            userRoles.value = [];
          }
        }
      } else {
        // 未登录，跳转到登录页
        userInfo.value = null;
        userRoles.value = [];
      }
    };

    // 检查是否有果农角色
    const hasFarmerRole = computed(() => {
      return userRoles.value.some((role) => role.role_type === "farmer");
    });

    // 检查是否有运营角色
    const hasOperatorRole = computed(() => {
      return userRoles.value.some((role) => role.role_type === "operator");
    });

    // 处理菜单点击
    const handleMenuClick = (type: string) => {
      console.log("[个人中心] 点击菜单:", type);
      
      if (!isLoggedIn()) {
        console.log("[个人中心] 未登录，跳转到登录页");
        uni.navigateTo({
          url: "/pages/login/index",
        });
        return;
      }

      switch (type) {
        case "orders":
          console.log("[个人中心] 跳转到订单列表");
          uni.navigateTo({
            url: "/pages/orders/index",
          });
          break;
        case "address":
          console.log("[个人中心] 跳转到收货地址管理");
          uni.navigateTo({
            url: "/pages/address-manage/index",
          });
          break;
        case "batches":
          console.log("[个人中心] 跳转到批次管理");
          uni.navigateTo({
            url: "/pages/batch-manage/index",
          });
          break;
        case "products":
          console.log("[个人中心] 跳转到商品管理");
          uni.navigateTo({
            url: "/pages/product-manage/index",
          });
          break;
        case "order-manage":
          console.log("[个人中心] 跳转到订单管理");
          uni.navigateTo({
            url: "/pages/order-manage/index",
            success: () => {
              console.log("[个人中心] 订单管理页面跳转成功");
            },
            fail: (err) => {
              console.error("[个人中心] 订单管理页面跳转失败:", err);
              uni.showToast({
                title: "页面跳转失败",
                icon: "none",
              });
            },
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
        default:
          console.warn("[个人中心] 未知的菜单类型:", type);
      }
    };

    // 退出登录
    const handleLogout = () => {
      uni.showModal({
        title: "提示",
        content: "确定要退出登录吗？",
        success: (res) => {
          if (res.confirm) {
            clearLoginInfo();
            userInfo.value = null;
            uni.showToast({
              title: "已退出登录",
              icon: "success",
            });
          }
        },
      });
    };

    // 点击用户信息区域，如果未登录则跳转到登录页
    const handleUserInfoClick = () => {
      if (!isLoggedIn()) {
        uni.navigateTo({
          url: "/pages/login/index",
        });
      }
    };

    onLoad(() => {
      loadUserInfo();
    });

    onShow(() => {
      loadUserInfo();
    });

    return {
      userInfo,
      hasFarmerRole,
      hasOperatorRole,
      handleMenuClick,
      handleLogout,
      handleUserInfoClick,
      isLoggedIn,
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

.login-tip {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 8rpx;
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

.menu-icon-wrapper {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.menu-icon {
  font-size: 36rpx;
}

.menu-text {
  font-size: 30rpx;
  color: #333;
}

.menu-arrow {
  font-size: 28rpx;
  color: #999;
}

.section-header {
  padding: 20rpx 40rpx;
  background-color: #f9f9f9;
  border-bottom: 1rpx solid #f5f5f5;
}

.section-title {
  font-size: 26rpx;
  color: #666;
  font-weight: 500;
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
