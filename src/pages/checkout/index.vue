<template>
  <view class="page">
    <scroll-view class="scroll-view" scroll-y>
      <!-- 商品列表 -->
      <view class="section">
        <view class="section-title">商品信息</view>
        <view class="product-list">
          <view class="product-item" v-for="item in cartItems" :key="item.id">
            <image class="product-image" :src="item.product?.image_url || ''" mode="aspectFill" />
            <view class="product-info">
              <text class="product-name">{{ item.product?.name || "" }}</text>
              <view class="product-specs">
                <text class="product-price">¥{{ item.product?.unit_price || 0 }}</text>
                <text class="product-unit" v-if="item.product?.unit">/{{ item.product.unit }}</text>
                <text class="product-quantity">x{{ item.quantity }}</text>
              </view>
            </view>
            <view class="product-total">
              <text class="total-price">¥{{ calculateItemTotal(item) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 收货信息 -->
      <view class="section">
        <view class="section-title">收货信息</view>
        <view class="address-selector" @click="handleSelectAddress" :class="{ 'has-address': selectedAddress }">
          <view class="address-content" v-if="selectedAddress">
            <view class="address-header">
              <view class="receiver-info">
                <text class="receiver-name">{{ selectedAddress.receiver_name }}</text>
                <text class="receiver-phone">{{ selectedAddress.receiver_phone }}</text>
                <view class="default-badge" v-if="selectedAddress.is_default">
                  <text class="default-badge-text">默认</text>
                </view>
              </view>
              <view class="address-action-hint">
                <text class="hint-text">点击切换</text>
                <text class="hint-icon">›</text>
              </view>
            </view>
            <view class="address-detail">
              <text class="address-text">{{ selectedAddress.receiver_address }}</text>
            </view>
          </view>
          <view class="address-placeholder" v-else>
            <view class="placeholder-content">
              <text class="placeholder-icon">📍</text>
              <text class="placeholder-text">请选择收货地址</text>
        </view>
            <text class="placeholder-arrow">›</text>
        </view>
        </view>
      </view>

      <!-- 订单备注 -->
      <view class="section">
        <view class="section-title">订单备注</view>
        <textarea
          class="remark-input"
          v-model="remark"
          placeholder="选填，对本次购买的说明"
          maxlength="200"
        />
      </view>

      <!-- 价格明细 -->
      <view class="section">
        <view class="section-title">价格明细</view>
        <view class="price-detail">
          <view class="price-row">
            <text class="price-label">商品总价</text>
            <text class="price-value">¥{{ totalAmount.toFixed(2) }}</text>
          </view>
          <view class="price-row">
            <text class="price-label">运费</text>
            <text class="price-value">¥{{ freightAmount.toFixed(2) }}</text>
          </view>
          <view class="price-row" v-if="discountAmount > 0">
            <text class="price-label">优惠</text>
            <text class="price-value discount">-¥{{ discountAmount.toFixed(2) }}</text>
          </view>
          <view class="price-row total-row">
            <text class="price-label">实付金额</text>
            <text class="price-value total-price">¥{{ actualAmount.toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 底部提交按钮 -->
    <view class="bottom-bar">
      <view class="price-info">
        <text class="price-label">实付:</text>
        <text class="price-value">¥{{ actualAmount.toFixed(2) }}</text>
      </view>
      <view class="submit-btn" @click="handleSubmitOrder" :class="{ disabled: submitting }">
        <text class="submit-btn-text">{{ submitting ? "提交中..." : "提交订单" }}</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { ref, computed, onMounted } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { getCarts } from "@/api/cart";
import { createOrder } from "@/api/order";
import { getAddresses } from "@/api/address";
import { getUserId, getUserInfo, isLoggedIn } from "@/api/auth";
import type { Carts, Addresses } from "@/types/graphql";

interface DeliveryAddress {
  receiver_name: string;
  receiver_phone: string;
  detail_address: string;
  receiver_province?: string;
  receiver_city?: string;
  receiver_district?: string;
}

export default {
  setup() {
    const cartItems = ref<Carts[]>([]);
    const remark = ref("");
    const freightAmount = ref(0); // 运费，默认0
    const discountAmount = ref(0); // 优惠金额，默认0
    const submitting = ref(false);
    const selectedAddress = ref<Addresses | null>(null);

    // 计算商品总价
    const totalAmount = computed(() => {
      return cartItems.value.reduce((sum, item) => {
        const price = Number(item.product?.unit_price || 0);
        const quantity = Number(item.quantity || 0);
        return sum + price * quantity;
      }, 0);
    });

    // 计算实付金额
    const actualAmount = computed(() => {
      return totalAmount.value + freightAmount.value - discountAmount.value;
    });

    // 计算单个商品总价
    const calculateItemTotal = (item: Carts) => {
      const price = Number(item.product?.unit_price || 0);
      const quantity = Number(item.quantity || 0);
      return (price * quantity).toFixed(2);
    };

    // 加载购物车数据
    const loadCartItems = async () => {
      // 检查登录状态
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
        const allCarts = await getCarts(userId);
        // 只加载选中的商品
        cartItems.value = allCarts.filter((item) => item.is_selected);
        
        if (cartItems.value.length === 0) {
          uni.showToast({
            title: "请先选择商品",
            icon: "none",
          });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        }
      } catch (error) {
        console.error("加载购物车失败:", error);
        uni.showToast({
          title: "加载失败",
          icon: "none",
        });
      }
    };

    // 加载默认收货地址
    const loadDefaultAddress = async () => {
      if (!isLoggedIn()) return;

      const userId = getUserId();
      if (!userId) return;

      try {
        const addresses = await getAddresses(userId);
        // 优先选择默认地址，否则选择第一个
        const defaultAddr = addresses.find(addr => addr.is_default) || addresses[0];
        if (defaultAddr) {
          selectedAddress.value = defaultAddr;
        }
      } catch (error) {
        console.error("加载收货地址失败:", error);
      }
    };

    // 检查是否有从地址管理页面返回的选中地址
    const checkSelectedAddress = () => {
      const storedAddress = uni.getStorageSync("selectedAddress");
      if (storedAddress) {
        selectedAddress.value = storedAddress;
        uni.removeStorageSync("selectedAddress");
      }
    };

    // 选择收货地址
    const handleSelectAddress = () => {
      uni.navigateTo({
        url: "/pages/address-manage/index",
        });
    };

    // 验证收货信息
    const validateAddress = (): DeliveryAddress | null => {
      if (!selectedAddress.value) {
        uni.showToast({
          title: "请选择收货地址",
          icon: "none",
        });
        return null;
      }

      return {
        receiver_name: selectedAddress.value.receiver_name,
        receiver_phone: selectedAddress.value.receiver_phone,
        detail_address: selectedAddress.value.receiver_address,
        receiver_province: selectedAddress.value.receiver_province || undefined,
        receiver_city: selectedAddress.value.receiver_city || undefined,
        receiver_district: selectedAddress.value.receiver_district || undefined,
      };
    };

    // 提交订单
    const handleSubmitOrder = async () => {
      if (submitting.value) return;

      // 验证
      if (cartItems.value.length === 0) {
        uni.showToast({
          title: "请选择商品",
          icon: "none",
        });
        return;
      }

      // 验证收货信息
      const deliveryAddress = validateAddress();
      if (!deliveryAddress) {
        return;
      }

      // 检查登录状态
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

      // 调试日志：确认用户ID
      console.log("[下单调试] 当前用户ID:", userId);
      console.log("[下单调试] 用户信息:", getUserInfo());

      submitting.value = true;
      try {
        const order = await createOrder({
          userId,
          cartItems: cartItems.value,
          deliveryAddress: deliveryAddress,
          remark: remark.value,
          totalAmount: totalAmount.value,
          freightAmount: freightAmount.value,
          discountAmount: discountAmount.value,
          actualAmount: actualAmount.value,
        });

        uni.showToast({
          title: "订单提交成功",
          icon: "success",
        });

        // 跳转到订单结算页面
        setTimeout(() => {
          uni.redirectTo({
            url: `/pages/order-payment/index?id=${order?.id}`,
          });
        }, 1500);
      } catch (error) {
        console.error("提交订单失败:", error);
        uni.showToast({
          title: "提交订单失败",
          icon: "none",
        });
      } finally {
        submitting.value = false;
      }
    };

    onMounted(() => {
      loadCartItems();
      loadDefaultAddress();
    });

    onShow(() => {
      checkSelectedAddress();
    });

    return {
      cartItems,
      remark,
      freightAmount,
      discountAmount,
      totalAmount,
      actualAmount,
      selectedAddress,
      submitting,
      calculateItemTotal,
      handleSelectAddress,
      handleSubmitOrder,
    };
  },
};
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.scroll-view {
  width: 100%;
  height: calc(100vh - 140rpx);
  padding-bottom: env(safe-area-inset-bottom);
}

.bottom-spacer {
  height: 60rpx;
}

/* 区块样式 */
.section {
  background-color: #fff;
  margin-bottom: 20rpx;
  padding: 30rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

/* 商品列表 */
.product-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.product-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.product-item:last-child {
  border-bottom: none;
}

.product-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background-color: #f5f5f5;
  margin-right: 20rpx;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.product-name {
  font-size: 28rpx;
  color: #333;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.product-specs {
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.product-price {
  font-size: 28rpx;
  font-weight: bold;
  color: #ff6b35;
}

.product-unit {
  font-size: 24rpx;
  color: #999;
}

.product-quantity {
  font-size: 24rpx;
  color: #666;
  margin-left: 8rpx;
}

.product-total {
  margin-left: 20rpx;
}

.total-price {
  font-size: 30rpx;
  font-weight: bold;
  color: #ff6b35;
}

/* 收货地址 */
.address-selector {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  position: relative;
  border: 2rpx solid transparent;
}

.address-selector.has-address {
  border: 2rpx solid #ff9500;
  background: linear-gradient(135deg, #fff9f0 0%, #ffffff 100%);
  box-shadow: 0 4rpx 12rpx rgba(255, 149, 0, 0.15);
}

.address-selector.has-address:active {
  transform: scale(0.98);
  box-shadow: 0 2rpx 8rpx rgba(255, 149, 0, 0.2);
}

.address-content {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.address-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
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

.address-action-hint {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 16rpx;
  background-color: rgba(255, 149, 0, 0.1);
  border-radius: 20rpx;
}

.hint-text {
  font-size: 24rpx;
  color: #ff9500;
}

.hint-icon {
  font-size: 28rpx;
  color: #ff9500;
  font-weight: bold;
}

.address-detail {
  margin-top: 8rpx;
}

.address-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
}

.address-placeholder {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
}

.placeholder-content {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.placeholder-icon {
  font-size: 36rpx;
}

.placeholder-text {
  font-size: 28rpx;
  color: #999;
}

.placeholder-arrow {
  font-size: 32rpx;
  color: #999;
}

/* 订单备注 */
.remark-input {
  width: 100%;
  min-height: 120rpx;
  padding: 20rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  border: 1rpx solid #eee;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
}

/* 价格明细 */
.price-detail {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-label {
  font-size: 28rpx;
  color: #666;
}

.price-value {
  font-size: 28rpx;
  color: #333;
}

.price-value.discount {
  color: #ff6b35;
}

.total-row {
  padding-top: 16rpx;
  border-top: 1rpx solid #f5f5f5;
  margin-top: 8rpx;
}

.total-row .price-label {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.total-row .total-price {
  font-size: 36rpx;
  font-weight: bold;
  color: #ff6b35;
}

/* 地址表单 */
.form-item {
  margin-bottom: 30rpx;
}

.form-item:last-of-type {
  margin-bottom: 0;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
  font-weight: 500;
}

.required {
  color: #ff3b30;
  font-size: 24rpx;
}

.form-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background-color: #fff;
  border-radius: 12rpx;
  border: 1rpx solid #e0e0e0;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
  line-height: 88rpx;
}

.form-input::placeholder {
  color: #999;
  font-size: 28rpx;
}

.form-textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 24rpx;
  background-color: #fff;
  border-radius: 12rpx;
  border: 1rpx solid #e0e0e0;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
  line-height: 1.6;
}

.form-textarea::placeholder {
  color: #999;
  font-size: 28rpx;
}

.form-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 30rpx;
}

.form-btn {
  flex: 1;
  padding: 24rpx 0;
  border-radius: 40rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: bold;
}

.cancel-btn {
  background-color: #f5f5f5;
  color: #666;
}

.confirm-btn {
  background: linear-gradient(135deg, #ff9500 0%, #ff6b00 100%);
  color: #fff;
  box-shadow: 0 4rpx 12rpx rgba(255, 149, 0, 0.3);
}

/* 底部提交栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  background-color: #fff;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #eee;
  z-index: 100;
}

.price-info {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 8rpx;
}

.price-info .price-label {
  font-size: 26rpx;
  color: #666;
}

.price-info .price-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #ff6b35;
}

.submit-btn {
  padding: 24rpx 60rpx;
  background: linear-gradient(135deg, #ff9500 0%, #ff6b00 100%);
  border-radius: 40rpx;
  margin-left: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(255, 149, 0, 0.3);
}

.submit-btn.disabled {
  background-color: #ccc;
}

.submit-btn-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #fff;
}
</style>
