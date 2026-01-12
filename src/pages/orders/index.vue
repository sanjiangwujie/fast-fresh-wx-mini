<template>
  <view class="page">
    <!-- 状态筛选标签 -->
    <view class="status-tabs">
      <scroll-view class="status-tabs-scroll" scroll-x>
        <view class="status-tabs-container">
          <view
            class="status-tab-item"
            :class="{ active: selectedStatus === item.value }"
            v-for="item in statusTabs"
            :key="item.value"
            @click="handleStatusClick(item.value)"
          >
            <text class="status-tab-text">{{ item.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 订单列表 -->
    <view class="orders-list" v-if="orders.length > 0">
      <view class="order-item" v-for="order in orders" :key="order.id" @click="handleOrderClick(order)">
        <!-- 订单头部 -->
        <view class="order-header">
          <text class="order-number">订单号: {{ order.id }}</text>
          <view class="status-container">
            <text class="order-status" :class="getStatusClass(order.order_status)">
              {{ getStatusText(order.order_status, order.payment_status) }}
            </text>
            <!-- 当订单状态为pending时，显示支付状态 -->
            <text 
              v-if="order.order_status === 'pending'" 
              class="payment-status" 
              :class="getPaymentStatusClass(order.payment_status)"
            >
              {{ getPaymentStatusText(order.payment_status) }}
            </text>
          </view>
        </view>

        <!-- 订单商品列表 -->
        <view class="order-products">
          <view class="order-product-item" v-for="product in order.order_products" :key="product.id">
            <image
              class="product-image"
              :src="product.product_image_url || ''"
              mode="aspectFill"
            />
            <view class="product-info">
              <text class="product-name">{{ product.product_name || "" }}</text>
              <view class="product-spec">
                <text class="product-price">¥{{ formatPrice(product.unit_price || 0) }}</text>
                <text class="product-unit" v-if="product.product_unit">/{{ product.product_unit }}</text>
                <text class="product-quantity"> × {{ product.quantity || 0 }}</text>
              </view>
            </view>
            <view class="product-total">
              <text class="product-total-price">¥{{ formatPrice(product.total_price || 0) }}</text>
            </view>
          </view>
        </view>

        <!-- 订单底部 -->
        <view class="order-footer">
          <text class="order-time">{{ formatTime(order.created_at) }}</text>
          <view class="order-total">
            <text class="order-total-label">合计:</text>
            <text class="order-total-price">¥{{ formatPrice(order.actual_amount || 0) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空订单 -->
    <view class="empty-orders" v-else>
      <text class="empty-text">暂无订单</text>
      <view class="empty-btn" @click="handleGoShopping">去逛逛</view>
    </view>

    <!-- 加载更多 -->
    <view class="load-more" v-if="loading">
      <text>加载中...</text>
    </view>
    <view class="load-more" v-if="!hasMore && orders.length > 0">
      <text>没有更多了</text>
    </view>
  </view>
</template>

<script lang="ts">
import { ref, onMounted } from "vue";
import { onLoad, onPullDownRefresh, onReachBottom } from "@dcloudio/uni-app";
import { getOrders } from "@/api/order";
import type { Orders, Orders_Order_By } from "@/types/graphql";
import { Order_By } from "@/types/graphql";

export default {
  setup() {
    const orders = ref<Orders[]>([]);
    const loading = ref(false);
    const hasMore = ref(true);
    const page = ref(1);
    const pageSize = 20;
    const selectedStatus = ref<string | null>(null);

    // 状态标签（只保留4种订单状态）
    const statusTabs = [
      { label: "全部", value: null },
      { label: "待确认", value: "pending" },
      { label: "已确认", value: "confirmed" },
      { label: "已完成", value: "completed" },
      { label: "已取消", value: "cancelled" },
    ];

    // 获取状态文本
    const getStatusText = (orderStatus: string | null | undefined, paymentStatus?: string | null | undefined) => {
      const statusMap: Record<string, string> = {
        pending: "待确认",
        confirmed: "已确认",
        cancelled: "已取消",
        completed: "已完成",
      };
      return statusMap[orderStatus || ""] || "未知";
    };

    // 获取支付状态文本
    const getPaymentStatusText = (status: string | null | undefined) => {
      const statusMap: Record<string, string> = {
        pending: "待支付",
        paid: "已支付",
        submitted: "已提交",
        approved: "审核通过",
        rejected: "审核拒绝",
      };
      return statusMap[status || ""] || "";
    };

    // 获取支付状态样式类
    const getPaymentStatusClass = (status: string | null | undefined) => {
      const statusClassMap: Record<string, string> = {
        pending: "payment-pending",
        paid: "payment-paid",
        submitted: "payment-submitted",
        approved: "payment-approved",
        rejected: "payment-rejected",
      };
      return statusClassMap[status || ""] || "";
    };

    // 格式化价格，保留2位小数
    const formatPrice = (price: number | string): string => {
      const numPrice = typeof price === "string" ? parseFloat(price) : price;
      if (isNaN(numPrice)) return "0.00";
      return numPrice.toFixed(2);
    };

    // 获取状态样式类
    const getStatusClass = (status: string | null | undefined) => {
      const statusClassMap: Record<string, string> = {
        pending: "status-pending",
        confirmed: "status-confirmed",
        cancelled: "status-cancelled",
        completed: "status-completed",
      };
      return statusClassMap[status || ""] || "";
    };

    // 格式化时间
    const formatTime = (time: string) => {
      if (!time) return "";
      const date = new Date(time);
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${month}-${day} ${hours}:${minutes}`;
    };

    // 加载订单列表
    const loadOrders = async (refresh = false) => {
      if (loading.value) return;

      loading.value = true;
      try {
        const currentPage = refresh ? 1 : page.value;

        // TODO: 获取当前用户ID
        const userId = "1"; // 临时使用固定用户ID

        const orderBy: Orders_Order_By[] = [
          {
            created_at: Order_By.Desc,
          },
        ] as any;

        const result = await getOrders(userId, {
          order_status: selectedStatus.value,
          order_by: orderBy,
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
        });

        if (refresh) {
          orders.value = result;
          page.value = 1;
        } else {
          orders.value.push(...result);
        }

        hasMore.value = result.length === pageSize;
        if (!refresh) {
          page.value++;
        }
      } catch (error) {
        console.error("加载订单失败:", error);
        uni.showToast({
          title: "加载失败",
          icon: "none",
        });
      } finally {
        loading.value = false;
      }
    };

    // 处理状态点击
    const handleStatusClick = (status: string | null) => {
      selectedStatus.value = status;
      loadOrders(true);
    };

    // 处理订单点击
    const handleOrderClick = (order: Orders) => {
      // 跳转到订单结算页（订单详情页）
      uni.navigateTo({
        url: `/pages/order-payment/index?id=${order.id}`,
      });
    };

    // 去逛逛
    const handleGoShopping = () => {
      uni.switchTab({
        url: "/pages/index/index",
      });
    };

    onLoad(() => {
      loadOrders(true);
    });

    onPullDownRefresh(() => {
      loadOrders(true).finally(() => {
        uni.stopPullDownRefresh();
      });
    });

    onReachBottom(() => {
      if (hasMore.value && !loading.value) {
        loadOrders();
      }
    });

    return {
      orders,
      loading,
      hasMore,
      selectedStatus,
      statusTabs,
      getStatusText,
      getStatusClass,
      getPaymentStatusText,
      getPaymentStatusClass,
      formatPrice,
      formatTime,
      handleStatusClick,
      handleOrderClick,
      handleGoShopping,
    };
  },
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* 状态筛选标签 */
.status-tabs {
  background-color: #fff;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #eee;
}

.status-tabs-scroll {
  white-space: nowrap;
  width: 100%;
}

.status-tabs-container {
  display: flex;
  padding: 0 20rpx;
}

.status-tab-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx 24rpx;
  margin-right: 20rpx;
  border-radius: 40rpx;
  background-color: #f5f5f5;
  white-space: nowrap;
}

.status-tab-item.active {
  background-color: #3cc51f;
}

.status-tab-text {
  font-size: 26rpx;
  color: #333;
}

.status-tab-item.active .status-tab-text {
  color: #fff;
}

/* 订单列表 */
.orders-list {
  padding: 20rpx;
}

.order-item {
  background-color: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  padding: 30rpx;
}

/* 订单头部 */
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
  margin-bottom: 20rpx;
}

.order-number {
  font-size: 28rpx;
  color: #666;
}

.status-container {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.order-status {
  font-size: 26rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.payment-status {
  font-size: 24rpx;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.payment-pending {
  color: #ff9500;
  background-color: #fff4e6;
}

.payment-paid {
  color: #3cc51f;
  background-color: #e8f5e9;
}

.payment-submitted {
  color: #1890ff;
  background-color: #e6f7ff;
}

.payment-approved {
  color: #3cc51f;
  background-color: #e8f5e9;
}

.payment-rejected {
  color: #ff3b30;
  background-color: #ffe6e6;
}

.status-pending {
  color: #ff9500;
  background-color: #fff4e6;
}

.status-confirmed {
  color: #3cc51f;
  background-color: #e8f5e9;
}

.status-cancelled {
  color: #999;
  background-color: #f5f5f5;
}

.status-completed {
  color: #1890ff;
  background-color: #e6f7ff;
}

/* 订单商品列表 */
.order-products {
  margin-bottom: 20rpx;
}

.order-product-item {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.order-product-item:last-child {
  margin-bottom: 0;
}

.product-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  margin-right: 20rpx;
  background-color: #f5f5f5;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.product-name {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.product-spec {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: #999;
}

.product-price {
  color: #ff6b35;
  font-weight: bold;
}

.product-unit {
  color: #999;
}

.product-quantity {
  color: #666;
  margin-left: 12rpx;
}

.product-total {
  margin-left: 20rpx;
}

.product-total-price {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
}

/* 订单底部 */
.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20rpx;
  border-top: 1rpx solid #f5f5f5;
}

.order-time {
  font-size: 24rpx;
  color: #999;
}

.order-total {
  display: flex;
  align-items: center;
}

.order-total-label {
  font-size: 26rpx;
  color: #666;
  margin-right: 12rpx;
}

.order-total-price {
  font-size: 32rpx;
  color: #ff6b35;
  font-weight: bold;
}

/* 空订单 */
.empty-orders {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 40rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 40rpx;
}

.empty-btn {
  background-color: #3cc51f;
  color: #fff;
  padding: 20rpx 60rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
}

/* 加载更多 */
.load-more {
  text-align: center;
  padding: 30rpx;
  font-size: 24rpx;
  color: #999;
}
</style>
