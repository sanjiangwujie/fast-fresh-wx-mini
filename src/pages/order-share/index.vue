<template>
  <view class="page">
    <scroll-view class="scroll-view" scroll-y>
      <!-- 订单信息卡片 -->
      <view class="section card">
        <view class="card-header">
          <text class="card-title">订单信息</text>
          <text class="order-status" :class="getStatusClass(order?.payment_status)">
            {{ getPaymentStatusText(order?.payment_status) }}
          </text>
        </view>
        <view class="order-info-list">
          <view class="info-item">
            <text class="info-label">订单号:</text>
            <text class="info-value">{{ order?.id || "" }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">订单金额:</text>
            <text class="info-value price">¥{{ formatPrice(order?.actual_amount || 0) }}</text>
          </view>
          <view class="info-item" v-if="order?.total_amount">
            <text class="info-label">商品总价:</text>
            <text class="info-value">¥{{ formatPrice(order.total_amount) }}</text>
          </view>
          <view class="info-item" v-if="order?.freight_amount">
            <text class="info-label">运费:</text>
            <text class="info-value">¥{{ formatPrice(order.freight_amount) }}</text>
          </view>
          <view class="info-item" v-if="order?.discount_amount">
            <text class="info-label">优惠:</text>
            <text class="info-value discount">-¥{{ formatPrice(order.discount_amount) }}</text>
          </view>
          <view class="info-item" v-if="order?.created_at">
            <text class="info-label">下单时间:</text>
            <text class="info-value">{{ formatTime(order.created_at) }}</text>
          </view>
        </view>
      </view>

      <!-- 收货信息 -->
      <view class="section card" v-if="order?.receiver_name">
        <view class="card-title">收货信息</view>
        <view class="address-info">
          <view class="address-item">
            <text class="address-label">收货人:</text>
            <text class="address-value">{{ order.receiver_name || "" }}</text>
          </view>
          <view class="address-item">
            <text class="address-label">联系电话:</text>
            <text class="address-value">{{ order.receiver_phone || "" }}</text>
          </view>
          <view class="address-item">
            <text class="address-label">详细地址:</text>
            <text class="address-value">{{ order.receiver_address || "" }}</text>
          </view>
          <view class="address-item" v-if="order.receiver_province || order.receiver_city || order.receiver_district">
            <text class="address-label">省市区:</text>
            <text class="address-value">
              {{ [order.receiver_province, order.receiver_city, order.receiver_district].filter(Boolean).join(" ") }}
            </text>
          </view>
        </view>
      </view>

      <!-- 商品列表 -->
      <view class="section card" v-if="order?.order_products && order.order_products.length > 0">
        <view class="card-title">商品信息</view>
        <view class="product-list">
          <view class="product-item" v-for="item in order.order_products" :key="item.id">
            <image class="product-image" :src="item.product_image_url || ''" mode="aspectFill" />
            <view class="product-info">
              <text class="product-name">{{ item.product_name || "" }}</text>
              <view class="product-specs">
                <text class="product-price">¥{{ formatPrice(item.unit_price || 0) }}</text>
                <text class="product-unit" v-if="item.product_unit">/{{ item.product_unit }}</text>
                <text class="product-quantity">x{{ item.quantity }}</text>
              </view>
            </view>
            <view class="product-total">
              <text class="total-price">¥{{ formatPrice(item.total_price || 0) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 订单备注 -->
      <view class="section card" v-if="order?.remark">
        <view class="card-title">订单备注</view>
        <text class="remark-text">{{ order.remark }}</text>
      </view>

      <!-- 付款截图 -->
      <view class="section card" v-if="order?.payment_voucher_url">
        <view class="card-title">付款截图</view>
        <view class="payment-voucher">
          <image
            class="voucher-image"
            :src="order.payment_voucher_url"
            mode="aspectFit"
            @click="handlePreviewImage"
          />
        </view>
      </view>

      <!-- 未支付提示 -->
      <view class="section card" v-if="!order?.payment_voucher_url && order?.payment_status === 'pending' && !isOperator">
        <view class="no-payment">
          <text class="no-payment-icon">⚠️</text>
          <text class="no-payment-text">该订单尚未上传付款截图</text>
          <text class="no-payment-tip">（此页面为查看页面，如需上传截图请前往订单结算页面）</text>
        </view>
      </view>

      <!-- 运营人员操作区域 -->
      <view class="section card" v-if="isOperator">
        <view class="operator-actions">
          <!-- 未支付状态：运营人员可以确认付款 -->
          <view v-if="order?.payment_status === 'pending' || order?.payment_status === 'submitted'">
            <view class="operator-title">运营操作</view>
            <view class="operator-tip">该订单尚未支付，您可以代为确认付款</view>
            
            <!-- 上传付款截图（可选） -->
            <view class="upload-section" v-if="!operatorPaymentVoucherUrl && !operatorUploading">
              <view class="upload-btn" @click="handleOperatorChooseImage">
                <text class="upload-btn-text">上传付款截图（可选）</text>
              </view>
            </view>
            
            <view class="image-preview" v-if="operatorPaymentVoucherUrl">
              <image class="preview-image" :src="operatorPaymentVoucherUrl" mode="aspectFit" @click="handleOperatorPreviewImage" />
              <view class="image-actions">
                <view class="action-btn" @click="handleOperatorChooseImage" :class="{ disabled: operatorUploading }">重新上传</view>
                <view class="action-btn delete" @click="handleOperatorDeleteImage" :class="{ disabled: operatorUploading }">删除</view>
              </view>
            </view>
            
            <!-- 上传进度 -->
            <view class="upload-progress" v-if="operatorUploading">
              <view class="progress-bar">
                <view class="progress-fill" :style="{ width: operatorUploadProgress + '%' }"></view>
              </view>
              <text class="progress-text">{{ operatorUploadProgress }}%</text>
            </view>
            
            <view class="confirm-btn" @click="handleOperatorConfirmPayment" :class="{ disabled: operatorSubmitting || operatorUploading }">
              <text class="confirm-btn-text">{{ operatorSubmitting ? "提交中..." : "确认付款" }}</text>
            </view>
          </view>
          
          <!-- 待确认且已支付状态：运营人员可以确认订单 -->
          <view v-else-if="order?.order_status === 'pending' && (order?.payment_status === 'paid' || order?.payment_status === 'approved')">
            <view class="operator-title">运营操作</view>
            <view class="operator-tip">订单已支付，确认后将锁定库存</view>
            <view class="confirm-btn" @click="handleOperatorConfirmOrder" :class="{ disabled: operatorSubmitting }">
              <text class="confirm-btn-text">{{ operatorSubmitting ? "确认中..." : "确认订单" }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="bottom-spacer"></view>
    </scroll-view>
  </view>
</template>

<script lang="ts">
import { ref, computed, onMounted } from "vue";
import { onLoad, onShareAppMessage } from "@dcloudio/uni-app";
import { getOrderById, updateOrderPaymentVoucher, confirmOrder } from "@/api/order";
import { getUserRoles } from "@/api/user";
import { getUserId, isLoggedIn } from "@/api/auth";
import { uploadToQiniu } from "@/api/upload";
import type { Orders } from "@/types/graphql";

export default {
  setup() {
    const order = ref<Orders | null>(null);
    const orderId = ref<string | number>("");
    const loading = ref(false);
    const isOperator = ref(false);
    
    // 运营人员上传付款截图相关
    const operatorPaymentVoucherUrl = ref<string>("");
    const operatorUploading = ref(false);
    const operatorUploadProgress = ref(0);
    const operatorSubmitting = ref(false);

    // 获取支付状态文本
    const getPaymentStatusText = (status: string | null | undefined) => {
      const statusMap: Record<string, string> = {
        pending: "待支付",
        paid: "已支付",
        failed: "支付失败",
      };
      return statusMap[status || ""] || "未知";
    };

    // 获取支付状态样式类
    const getStatusClass = (status: string | null | undefined) => {
      const statusClassMap: Record<string, string> = {
        pending: "status-pending",
        paid: "status-paid",
        failed: "status-failed",
      };
      return statusClassMap[status || ""] || "";
    };


    // 格式化时间
    const formatTime = (time: string) => {
      if (!time) return "";
      const date = new Date(time);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    };

    // 格式化价格，保留2位小数
    const formatPrice = (price: number | string): string => {
      const numPrice = typeof price === "string" ? parseFloat(price) : price;
      if (isNaN(numPrice)) return "0.00";
      return numPrice.toFixed(2);
    };

    // 预览图片
    const handlePreviewImage = () => {
      if (order.value?.payment_voucher_url) {
        uni.previewImage({
          urls: [order.value.payment_voucher_url],
          current: order.value.payment_voucher_url,
        });
      }
    };

    // 检查用户是否是运营人员
    const checkOperatorRole = async () => {
      if (!isLoggedIn()) {
        isOperator.value = false;
        return;
      }

      try {
        const userId = getUserId();
        if (userId) {
          const roles = await getUserRoles(userId);
          isOperator.value = roles.some((role) => role.role_type === "operator");
        }
      } catch (error) {
        console.error("检查用户角色失败:", error);
        isOperator.value = false;
      }
    };

    // 加载订单详情
    const loadOrderDetail = async () => {
      if (!orderId.value) return;

      loading.value = true;
      try {
        const orderData = await getOrderById(orderId.value);
        if (orderData) {
          order.value = orderData;
          // 如果订单已有付款截图，运营人员也可以看到
          if (orderData.payment_voucher_url && isOperator.value) {
            operatorPaymentVoucherUrl.value = orderData.payment_voucher_url;
          }
        } else {
          uni.showToast({
            title: "订单不存在",
            icon: "none",
          });
        }
      } catch (error) {
        console.error("加载订单详情失败:", error);
        uni.showToast({
          title: "加载失败",
          icon: "none",
        });
      } finally {
        loading.value = false;
      }
    };

    // 运营人员选择图片
    const handleOperatorChooseImage = () => {
      uni.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: async (res) => {
          const tempFilePath = res.tempFilePaths[0];
          await handleOperatorUploadImage(tempFilePath);
        },
        fail: (err) => {
          console.error("选择图片失败:", err);
          uni.showToast({
            title: "选择图片失败",
            icon: "none",
          });
        },
      });
    };

    // 运营人员上传图片
    const handleOperatorUploadImage = async (filePath: string) => {
      operatorUploading.value = true;
      operatorUploadProgress.value = 0;
      
      try {
        const { task, url } = await uploadToQiniu(filePath, (progress) => {
          operatorUploadProgress.value = progress;
        });

        operatorPaymentVoucherUrl.value = url;
        operatorUploadProgress.value = 100;
        
        uni.showToast({
          title: "上传成功",
          icon: "success",
        });
      } catch (error) {
        console.error("上传图片失败:", error);
        operatorUploadProgress.value = 0;
        uni.showToast({
          title: error instanceof Error ? error.message : "上传失败",
          icon: "none",
        });
      } finally {
        operatorUploading.value = false;
      }
    };

    // 运营人员预览图片
    const handleOperatorPreviewImage = () => {
      if (operatorPaymentVoucherUrl.value) {
        uni.previewImage({
          urls: [operatorPaymentVoucherUrl.value],
          current: operatorPaymentVoucherUrl.value,
        });
      }
    };

    // 运营人员删除图片
    const handleOperatorDeleteImage = () => {
      uni.showModal({
        title: "确认删除",
        content: "确定要删除这张付款截图吗？",
        success: (res) => {
          if (res.confirm) {
            operatorPaymentVoucherUrl.value = "";
          }
        },
      });
    };

    // 运营人员确认付款
    const handleOperatorConfirmPayment = async () => {
      if (operatorSubmitting.value || operatorUploading.value) return;

      operatorSubmitting.value = true;
      try {
        await updateOrderPaymentVoucher(orderId.value, operatorPaymentVoucherUrl.value || null);
        
        uni.showToast({
          title: "付款已确认",
          icon: "success",
        });

        // 刷新订单信息
        await loadOrderDetail();
      } catch (error) {
        console.error("确认付款失败:", error);
        uni.showToast({
          title: error instanceof Error ? error.message : "确认失败",
          icon: "none",
        });
      } finally {
        operatorSubmitting.value = false;
      }
    };

    // 运营人员确认订单
    const handleOperatorConfirmOrder = async () => {
      if (operatorSubmitting.value) return;

      uni.showModal({
        title: "确认订单",
        content: "确认后将锁定库存，是否继续？",
        success: async (res) => {
          if (res.confirm) {
            operatorSubmitting.value = true;
            try {
              await confirmOrder(orderId.value);
              
              uni.showToast({
                title: "订单已确认",
                icon: "success",
              });

              // 刷新订单信息
              await loadOrderDetail();
            } catch (error) {
              console.error("确认订单失败:", error);
              uni.showToast({
                title: error instanceof Error ? error.message : "确认失败",
                icon: "none",
              });
            } finally {
              operatorSubmitting.value = false;
            }
          }
        },
      });
    };

    // 小程序分享配置
    onShareAppMessage(() => {
      if (!order.value) {
        return {
          title: "订单详情",
          path: `/pages/order-share/index?id=${orderId.value}`,
        };
      }
      return {
        title: `订单${order.value.id} - ${getPaymentStatusText(order.value.payment_status)}`,
        desc: `订单金额：¥${formatPrice(order.value.actual_amount || 0)}`,
        path: `/pages/order-share/index?id=${order.value.id}`,
        imageUrl: order.value.payment_voucher_url || "",
      };
    });

    onLoad(async (options: any) => {
      if (options.id) {
        orderId.value = options.id;
        // 先检查用户角色
        await checkOperatorRole();
        // 然后加载订单详情
        await loadOrderDetail();
      } else {
        uni.showToast({
          title: "订单ID缺失",
          icon: "none",
        });
      }
    });

    return {
      order,
      loading,
      isOperator,
      operatorPaymentVoucherUrl,
      operatorUploading,
      operatorUploadProgress,
      operatorSubmitting,
      getPaymentStatusText,
      getStatusClass,
      formatTime,
      formatPrice,
      handlePreviewImage,
      handleOperatorChooseImage,
      handleOperatorPreviewImage,
      handleOperatorDeleteImage,
      handleOperatorConfirmPayment,
      handleOperatorConfirmOrder,
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
  height: 100vh;
  padding-bottom: env(safe-area-inset-bottom);
}

.bottom-spacer {
  height: 60rpx;
}

/* 区块样式 */
.section {
  margin-bottom: 20rpx;
}

.section.card {
  background-color: #fff;
  padding: 30rpx;
  border-radius: 16rpx;
  margin: 20rpx;
  margin-bottom: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.order-status {
  font-size: 26rpx;
  padding: 6rpx 20rpx;
  border-radius: 20rpx;
}

.status-pending {
  color: #ff9500;
  background-color: #fff4e6;
}

.status-paid {
  color: #3cc51f;
  background-color: #e8f5e9;
}

.status-failed {
  color: #ff3b30;
  background-color: #ffe6e6;
}

/* 订单信息列表 */
.order-info-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 28rpx;
  color: #666;
}

.info-value {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.info-value.price {
  color: #ff6b35;
  font-weight: bold;
  font-size: 32rpx;
}

.info-value.discount {
  color: #ff6b35;
}

/* 收货信息 */
.address-info {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.address-item {
  display: flex;
  align-items: flex-start;
}

.address-label {
  font-size: 28rpx;
  color: #666;
  min-width: 140rpx;
}

.address-value {
  flex: 1;
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
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

/* 订单备注 */
.remark-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
}

/* 付款截图 */
.payment-voucher {
  margin-top: 20rpx;
}

.voucher-image {
  width: 100%;
  max-height: 800rpx;
  border-radius: 12rpx;
  background-color: #f5f5f5;
}

/* 未支付提示 */
.no-payment {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 40rpx;
}

.no-payment-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.no-payment-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 12rpx;
}

.no-payment-tip {
  font-size: 24rpx;
  color: #ccc;
  text-align: center;
}

/* 运营人员操作区域 */
.operator-actions {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.operator-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.operator-tip {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

.upload-section {
  margin: 16rpx 0;
}

.upload-btn {
  padding: 20rpx 0;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  text-align: center;
  border: 1rpx dashed #d0d0d0;
}

.upload-btn-text {
  font-size: 28rpx;
  color: #666;
}

.image-preview {
  position: relative;
  margin: 16rpx 0;
}

.preview-image {
  width: 100%;
  max-height: 600rpx;
  border-radius: 12rpx;
}

.image-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
}

.action-btn {
  flex: 1;
  padding: 20rpx 0;
  text-align: center;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333;
}

.action-btn.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.action-btn.delete {
  background-color: #fff4e6;
  color: #ff9500;
}

/* 上传进度 */
.upload-progress {
  margin: 16rpx 0;
  padding: 20rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
}

.progress-bar {
  width: 100%;
  height: 8rpx;
  background-color: #e0e0e0;
  border-radius: 4rpx;
  overflow: hidden;
  margin-bottom: 12rpx;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3cc51f 0%, #2ea517 100%);
  border-radius: 4rpx;
  transition: width 0.3s ease;
}

.progress-text {
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #666;
}

/* 确认按钮 */
.confirm-btn {
  padding: 28rpx 0;
  background: linear-gradient(135deg, #3cc51f 0%, #2ea517 100%);
  border-radius: 12rpx;
  text-align: center;
  box-shadow: 0 4rpx 12rpx rgba(60, 197, 31, 0.3);
  margin-top: 8rpx;
}

.confirm-btn.disabled {
  background-color: #ccc;
  box-shadow: none;
  opacity: 0.6;
}

.confirm-btn-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #fff;
}
</style>
