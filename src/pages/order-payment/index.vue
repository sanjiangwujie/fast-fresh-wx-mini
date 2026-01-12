<template>
  <view class="page">
    <scroll-view class="scroll-view" scroll-y>
      <!-- 订单信息 -->
      <view class="section">
        <view class="section-title">订单信息</view>
        <view class="order-info">
          <text class="order-label">订单号:</text>
          <text class="order-value">{{ order?.id || "" }}</text>
        </view>
        <view class="order-info">
          <text class="order-label">订单金额:</text>
          <text class="order-value price">¥{{ formatPrice(order?.actual_amount || 0) }}</text>
        </view>
        <view class="order-info">
          <text class="order-label">订单状态:</text>
          <text class="order-value" :class="getStatusClass(order?.payment_status)">
            {{ getPaymentStatusText(order?.payment_status) }}
          </text>
        </view>
      </view>

      <!-- 商品列表 -->
      <view class="section" v-if="order?.order_products && order.order_products.length > 0">
        <view class="section-title">商品信息</view>
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

      <!-- 收货信息 -->
      <view class="section" v-if="order?.receiver_name">
        <view class="section-title">收货信息</view>
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

      <!-- 付款截图 -->
      <view class="section">
        <view class="section-title">付款截图</view>
        <!-- 已支付状态：只显示截图，不可编辑 -->
        <view v-if="isPaid">
          <view class="image-preview" v-if="paymentVoucherUrl">
            <image class="preview-image" :src="paymentVoucherUrl" mode="aspectFit" @click="handlePreviewImage" />
          </view>
          <view class="no-payment" v-else>
            <text class="no-payment-icon">📷</text>
            <text class="no-payment-text">暂无付款截图</text>
          </view>
        </view>
        <!-- 未支付状态：可以上传和编辑 -->
        <view v-else>
          <view class="upload-area" v-if="!paymentVoucherUrl" @click="handleChooseImage">
            <view class="upload-icon">📷</view>
            <text class="upload-text">点击上传付款截图</text>
          </view>
          <view class="image-preview" v-else>
            <image class="preview-image" :src="paymentVoucherUrl" mode="aspectFit" @click="handlePreviewImage" />
            <view class="image-actions">
              <view class="action-btn" @click="handleChooseImage">重新上传</view>
              <view class="action-btn delete" @click="handleDeleteImage">删除</view>
            </view>
          </view>
          <view class="upload-tip" v-if="uploading">
            <text>上传中...</text>
          </view>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="bottom-spacer"></view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar" :class="{ 'single-btn': isPaid }">
      <button class="share-btn" open-type="share" :class="{ 'full-width': isPaid }">
        <text class="share-btn-text">分享给运营</text>
      </button>
      <!-- 未支付状态：显示确认付款按钮 -->
      <view v-if="!isPaid" class="submit-btn" @click="handleSubmitPayment" :class="{ disabled: submitting }">
        <text class="submit-btn-text">{{ submitting ? "提交中..." : "确认付款" }}</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { ref, computed, onMounted } from "vue";
import { onLoad, onShareAppMessage } from "@dcloudio/uni-app";
import { getOrderById, updateOrderPaymentVoucher } from "@/api/order";
import type { Orders } from "@/types/graphql";

export default {
  setup() {
    const order = ref<Orders | null>(null);
    const orderId = ref<string | number>("");
    const paymentVoucherUrl = ref<string>("");
    const uploading = ref(false);
    const submitting = ref(false);

    // 判断是否已支付
    const isPaid = computed(() => {
      return order.value?.payment_status === "paid";
    });

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

    // 格式化价格，保留2位小数
    const formatPrice = (price: number | string): string => {
      const numPrice = typeof price === "string" ? parseFloat(price) : price;
      if (isNaN(numPrice)) return "0.00";
      return numPrice.toFixed(2);
    };

    // 加载订单详情
    const loadOrderDetail = async () => {
      if (!orderId.value) return;

      try {
        const orderData = await getOrderById(orderId.value);
        if (orderData) {
          order.value = orderData;
          if (orderData.payment_voucher_url) {
            paymentVoucherUrl.value = orderData.payment_voucher_url;
          }
        } else {
          uni.showToast({
            title: "订单不存在",
            icon: "none",
          });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        }
      } catch (error) {
        console.error("加载订单详情失败:", error);
        uni.showToast({
          title: "加载失败",
          icon: "none",
        });
      }
    };

    // 选择图片
    const handleChooseImage = () => {
      uni.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: async (res) => {
          const tempFilePath = res.tempFilePaths[0];
          await uploadImage(tempFilePath);
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

    // 上传图片
    const uploadImage = async (filePath: string) => {
      uploading.value = true;
      try {
        // TODO: 替换为实际的后端API地址，可以从环境变量或配置文件中读取
        // 示例：const backendUrl = process.env.VUE_APP_API_BASE_URL || "https://your-backend-url.com";
        const backendUrl = "https://your-backend-url.com"; // 需要配置实际的后端地址
        const uploadUrl = `${backendUrl}/api/upload/form`;

        // 使用uni.uploadFile上传
        const uploadResult = await new Promise<any>((resolve, reject) => {
          uni.uploadFile({
            url: uploadUrl,
            filePath: filePath,
            name: "file",
            formData: {},
            header: {
              // 如果需要认证，在这里添加header
            },
            success: (res) => {
              try {
                const data = JSON.parse(res.data);
                if (data.success && data.data) {
                  // 处理单个文件或多个文件的情况
                  const fileData = Array.isArray(data.data) ? data.data[0] : data.data;
                  resolve(fileData);
                } else {
                  reject(new Error(data.message || "上传失败"));
                }
              } catch (e) {
                reject(new Error("解析响应失败"));
              }
            },
            fail: (err) => {
              reject(err);
            },
          });
        });

        if (uploadResult.url) {
          paymentVoucherUrl.value = uploadResult.url;
          uni.showToast({
            title: "上传成功",
            icon: "success",
          });
        } else {
          throw new Error("上传响应中缺少URL");
        }
      } catch (error) {
        console.error("上传图片失败:", error);
        uni.showToast({
          title: error instanceof Error ? error.message : "上传失败",
          icon: "none",
        });
      } finally {
        uploading.value = false;
      }
    };

    // 预览图片
    const handlePreviewImage = () => {
      if (paymentVoucherUrl.value) {
        uni.previewImage({
          urls: [paymentVoucherUrl.value],
          current: paymentVoucherUrl.value,
        });
      }
    };

    // 删除图片
    const handleDeleteImage = () => {
      uni.showModal({
        title: "确认删除",
        content: "确定要删除这张付款截图吗？",
        success: (res) => {
          if (res.confirm) {
            paymentVoucherUrl.value = "";
          }
        },
      });
    };

    // 提交付款
    const handleSubmitPayment = async () => {
      if (submitting.value) return;

      submitting.value = true;
      try {
        // 付款截图为非必填，有则更新，没有也可以提交
        await updateOrderPaymentVoucher(orderId.value, paymentVoucherUrl.value || null);
        
        uni.showToast({
          title: paymentVoucherUrl.value ? "付款信息已提交" : "订单已确认",
          icon: "success",
        });

        // 刷新订单信息
        await loadOrderDetail();
      } catch (error) {
        console.error("提交付款失败:", error);
        uni.showToast({
          title: "提交失败",
          icon: "none",
        });
      } finally {
        submitting.value = false;
      }
    };

    // 小程序分享配置
    onShareAppMessage(() => {
      // 确保分享路径指向只读的订单分享页面
      const sharePath = order.value 
        ? `/pages/order-share/index?id=${order.value.id}`
        : `/pages/order-share/index?id=${orderId.value}`;
      
      console.log("分享路径:", sharePath); // 调试用
      
      return {
        title: order.value 
          ? `订单${order.value.id} - ${getPaymentStatusText(order.value.payment_status)}`
          : "订单详情",
        desc: order.value 
          ? `订单金额：¥${formatPrice(order.value.actual_amount || 0)}`
          : "订单详情查看",
        path: sharePath,
        imageUrl: paymentVoucherUrl.value || "",
      };
    });

    onLoad((options: any) => {
      if (options.id) {
        orderId.value = options.id;
        loadOrderDetail();
      } else {
        uni.showToast({
          title: "订单ID缺失",
          icon: "none",
        });
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      }
    });

    return {
      order,
      paymentVoucherUrl,
      uploading,
      submitting,
      isPaid,
      getPaymentStatusText,
      getStatusClass,
      formatPrice,
      handleChooseImage,
      handlePreviewImage,
      handleDeleteImage,
      handleSubmitPayment,
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

/* 订单信息 */
.order-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.order-info:last-child {
  border-bottom: none;
}

.order-label {
  font-size: 28rpx;
  color: #666;
}

.order-value {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.order-value.price {
  color: #ff6b35;
  font-weight: bold;
  font-size: 32rpx;
}

.status-pending {
  color: #ff9500;
}

.status-paid {
  color: #3cc51f;
}

.status-failed {
  color: #ff3b30;
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

/* 上传区域 */
.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
  border: 2rpx dashed #d0d0d0;
  border-radius: 12rpx;
  background-color: #fafafa;
}

.upload-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.upload-text {
  font-size: 28rpx;
  color: #999;
}

.image-preview {
  position: relative;
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

.action-btn.delete {
  background-color: #fff4e6;
  color: #ff9500;
}

.upload-tip {
  margin-top: 20rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 20rpx;
  background-color: #fff;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #eee;
  z-index: 100;
}

.share-btn {
  flex: 1;
  padding: 24rpx 0;
  background-color: #f5f5f5;
  border-radius: 40rpx;
  border: none;
  line-height: normal;
  display: flex;
  align-items: center;
  justify-content: center;
}

.share-btn.full-width {
  flex: none;
  width: 100%;
}

.share-btn::after {
  border: none;
}

.share-btn-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.submit-btn {
  flex: 1;
  padding: 24rpx 0;
  background: linear-gradient(135deg, #ff9500 0%, #ff6b00 100%);
  border-radius: 40rpx;
  text-align: center;
  box-shadow: 0 4rpx 12rpx rgba(255, 149, 0, 0.3);
}

.submit-btn.disabled {
  background-color: #ccc;
  box-shadow: none;
}

.submit-btn-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #fff;
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
}
</style>
