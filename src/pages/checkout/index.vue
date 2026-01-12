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

      <!-- 收货地址 -->
      <view class="section">
        <view class="section-title">收货地址</view>
        <view class="address-card" @click="handleSelectAddress">
          <view class="address-content" v-if="deliveryAddress">
            <view class="address-header">
              <text class="receiver-name">{{ deliveryAddress.receiver_name || "" }}</text>
              <text class="receiver-phone">{{ deliveryAddress.receiver_phone || "" }}</text>
            </view>
            <text class="address-detail">
              {{ deliveryAddress.province || "" }}{{ deliveryAddress.city || "" }}{{ deliveryAddress.district || "" }}{{ deliveryAddress.detail_address || "" }}
            </text>
          </view>
          <view class="address-placeholder" v-else>
            <text class="placeholder-text">请选择或输入收货地址</text>
          </view>
          <text class="address-arrow">></text>
        </view>
      </view>

      <!-- 地址输入表单（当没有地址时显示） -->
      <view class="section" v-if="showAddressForm">
        <view class="section-title">填写收货信息</view>
        <view class="form-item">
          <text class="form-label">收货人</text>
          <input class="form-input" v-model="addressForm.receiver_name" placeholder="请输入收货人姓名" />
        </view>
        <view class="form-item">
          <text class="form-label">联系电话</text>
          <input class="form-input" v-model="addressForm.receiver_phone" type="number" placeholder="请输入联系电话" />
        </view>
        <view class="form-item">
          <text class="form-label">所在地区</text>
          <input class="form-input" v-model="addressForm.region" placeholder="省/市/区" @click="handleSelectRegion" />
        </view>
        <view class="form-item">
          <text class="form-label">详细地址</text>
          <textarea class="form-textarea" v-model="addressForm.detail_address" placeholder="请输入详细地址" />
        </view>
        <view class="form-item">
          <text class="form-label">邮政编码</text>
          <input class="form-input" v-model="addressForm.postal_code" type="number" placeholder="选填" />
        </view>
        <view class="form-actions">
          <view class="form-btn cancel-btn" @click="handleCancelAddressForm">取消</view>
          <view class="form-btn confirm-btn" @click="handleConfirmAddress">确认</view>
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
import { onLoad } from "@dcloudio/uni-app";
import { getCarts } from "@/api/cart";
import { createOrder } from "@/api/order";
import type { Carts } from "@/types/graphql";

interface DeliveryAddress {
  receiver_name: string;
  receiver_phone: string;
  province: string;
  city: string;
  district: string;
  detail_address: string;
  postal_code?: string;
}

export default {
  setup() {
    const cartItems = ref<Carts[]>([]);
    const deliveryAddress = ref<DeliveryAddress | null>(null);
    const remark = ref("");
    const freightAmount = ref(0); // 运费，默认0
    const discountAmount = ref(0); // 优惠金额，默认0
    const submitting = ref(false);
    const showAddressForm = ref(false);
    
    const addressForm = ref({
      receiver_name: "",
      receiver_phone: "",
      province: "",
      city: "",
      district: "",
      region: "",
      detail_address: "",
      postal_code: "",
    });

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
      try {
        // TODO: 获取当前用户ID
        const userId = "1"; // 临时使用固定用户ID
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

    // 选择收货地址
    const handleSelectAddress = () => {
      // 如果没有地址，显示地址输入表单
      if (!deliveryAddress.value) {
        showAddressForm.value = true;
      } else {
        // 如果有地址，可以编辑
        showAddressForm.value = true;
        addressForm.value = {
          receiver_name: deliveryAddress.value.receiver_name || "",
          receiver_phone: deliveryAddress.value.receiver_phone || "",
          province: deliveryAddress.value.province || "",
          city: deliveryAddress.value.city || "",
          district: deliveryAddress.value.district || "",
          region: `${deliveryAddress.value.province || ""}${deliveryAddress.value.city || ""}${deliveryAddress.value.district || ""}`,
          detail_address: deliveryAddress.value.detail_address || "",
          postal_code: deliveryAddress.value.postal_code || "",
        };
      }
    };

    // 选择地区
    const handleSelectRegion = () => {
      // TODO: 实现地区选择器（可以使用uni-app的picker组件）
      uni.showToast({
        title: "地区选择功能待实现",
        icon: "none",
      });
      // 临时示例：手动输入
      uni.showModal({
        title: "提示",
        content: "请手动输入省/市/区，格式：省 市 区",
        showCancel: false,
      });
    };

    // 确认地址
    const handleConfirmAddress = () => {
      if (!addressForm.value.receiver_name) {
        uni.showToast({
          title: "请输入收货人姓名",
          icon: "none",
        });
        return;
      }
      if (!addressForm.value.receiver_phone) {
        uni.showToast({
          title: "请输入联系电话",
          icon: "none",
        });
        return;
      }
      if (!addressForm.value.detail_address) {
        uni.showToast({
          title: "请输入详细地址",
          icon: "none",
        });
        return;
      }

      // 如果没有选择地区，尝试从region解析
      if (!addressForm.value.province && addressForm.value.region) {
        // 简单解析，实际应该使用地区选择器
        const parts = addressForm.value.region.split(/[省市区县]/);
        if (parts.length >= 3) {
          addressForm.value.province = parts[0] + "省";
          addressForm.value.city = parts[1] + "市";
          addressForm.value.district = parts[2] + "区";
        }
      }

      deliveryAddress.value = {
        receiver_name: addressForm.value.receiver_name,
        receiver_phone: addressForm.value.receiver_phone,
        province: addressForm.value.province || "",
        city: addressForm.value.city || "",
        district: addressForm.value.district || "",
        detail_address: addressForm.value.detail_address,
        postal_code: addressForm.value.postal_code || "",
      };

      showAddressForm.value = false;
      uni.showToast({
        title: "地址已保存",
        icon: "success",
      });
    };

    // 取消地址表单
    const handleCancelAddressForm = () => {
      showAddressForm.value = false;
      // 重置表单
      addressForm.value = {
        receiver_name: "",
        receiver_phone: "",
        province: "",
        city: "",
        district: "",
        region: "",
        detail_address: "",
        postal_code: "",
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

      if (!deliveryAddress.value) {
        uni.showToast({
          title: "请选择收货地址",
          icon: "none",
        });
        return;
      }

      submitting.value = true;
      try {
        // TODO: 获取当前用户ID
        const userId = "1"; // 临时使用固定用户ID

        const order = await createOrder({
          userId,
          cartItems: cartItems.value,
          deliveryAddress: deliveryAddress.value,
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

        // 跳转到订单详情或订单列表
        setTimeout(() => {
          uni.redirectTo({
            url: `/pages/orders/index`,
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

    onLoad((options: any) => {
      // 如果有传递地址信息，可以在这里处理
      if (options.address) {
        try {
          deliveryAddress.value = JSON.parse(decodeURIComponent(options.address));
        } catch (e) {
          console.error("解析地址信息失败:", e);
        }
      }
      loadCartItems();
    });

    return {
      cartItems,
      deliveryAddress,
      remark,
      freightAmount,
      discountAmount,
      totalAmount,
      actualAmount,
      submitting,
      calculateItemTotal,
      handleSelectAddress,
      handleSelectRegion,
      handleConfirmAddress,
      handleCancelAddressForm,
      handleSubmitOrder,
      showAddressForm,
      addressForm,
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
  height: calc(100vh - 100rpx);
}

.bottom-spacer {
  height: 20rpx;
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
.address-card {
  display: flex;
  align-items: center;
  padding: 30rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  border: 1rpx solid #eee;
}

.address-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.address-header {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.receiver-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.receiver-phone {
  font-size: 28rpx;
  color: #666;
}

.address-detail {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

.address-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx 0;
}

.placeholder-text {
  font-size: 28rpx;
  color: #999;
}

.address-arrow {
  font-size: 32rpx;
  color: #999;
  margin-left: 20rpx;
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

.form-label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 20rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  border: 1rpx solid #eee;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
}

.form-textarea {
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
  background-color: #3cc51f;
  color: #fff;
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
  background-color: #3cc51f;
  border-radius: 40rpx;
  margin-left: 20rpx;
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
