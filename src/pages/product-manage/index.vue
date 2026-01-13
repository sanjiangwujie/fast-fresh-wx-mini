<template>
  <view class="page">
    <view class="header">
      <text class="header-title">商品管理</text>
      <view class="header-action" @click="handleCreateProduct">
        <text class="action-text">从批次生成商品</text>
      </view>
    </view>

    <scroll-view class="scroll-view" scroll-y @scrolltolower="loadMore" v-if="products.length > 0">
      <view class="product-list">
        <view class="product-item" v-for="product in products" :key="product.id">
          <view class="product-content" @click="handleViewProduct(product.id)">
            <image class="product-image" :src="product.image_url || '/static/default-avatar.png'" mode="aspectFill" />
            <view class="product-info">
              <view class="product-name-row">
                <text class="product-name">{{ product.name }}</text>
                <view class="product-status-badges">
                  <view class="status-badge off-shelf" v-if="product.is_off_shelf">
                    <text class="badge-text">已下架</text>
                  </view>
                  <view class="status-badge deleted" v-if="product.is_deleted">
                    <text class="badge-text">已删除</text>
                  </view>
                </view>
              </view>
              <view class="product-specs">
                <text class="product-price">¥{{ product.unit_price || 0 }}</text>
                <text class="product-unit" v-if="product.unit">/{{ product.unit }}</text>
              </view>
              <view class="product-meta">
                <text class="product-stock">库存: {{ product.unit_stock || 0 }}</text>
                <text class="product-sales">销量: {{ product.sales || 0 }}</text>
              </view>
            </view>
            <text class="product-arrow">›</text>
          </view>
          <view class="product-actions">
            <view 
              class="action-btn" 
              :class="{ 'off-shelf': !product.is_off_shelf, 'on-shelf': product.is_off_shelf }"
              @click.stop="handleToggleShelf(product)"
            >
              <text class="action-btn-text">{{ product.is_off_shelf ? '上架' : '下架' }}</text>
            </view>
            <view class="action-btn delete" @click.stop="handleDeleteProduct(product)">
              <text class="action-btn-text">删除</text>
            </view>
          </view>
        </view>
      </view>
      <view class="load-more" v-if="hasMore">
        <text class="load-more-text">加载中...</text>
      </view>
    </scroll-view>

    <view class="empty-state" v-else>
      <text class="empty-text">暂无商品数据</text>
    </view>
  </view>
</template>

<script lang="ts">
import { ref, onMounted } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { getProducts, offShelfProduct, onShelfProduct, deleteProduct } from "@/api/product";
import { isLoggedIn } from "@/api/auth";
import type { Products } from "@/types/graphql";

export default {
  setup() {
    const products = ref<Products[]>([]);
    const loading = ref(false);
    const hasMore = ref(true);
    const offset = ref(0);
    const limit = 20;

    // 加载商品列表
    const loadProducts = async (reset = false) => {
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
          products.value = [];
        }

        const result = await getProducts({
          limit,
          offset: offset.value,
          order_by: [{ created_at: "desc" as any }],
          includeDeleted: true, // 管理员查看时包含已删除的商品
        });

        if (reset) {
          products.value = result;
        } else {
          products.value = [...products.value, ...result];
        }

        hasMore.value = result.length === limit;
        offset.value += result.length;
      } catch (error) {
        console.error("加载商品失败:", error);
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
        loadProducts(false);
      }
    };

    // 查看商品详情
    const handleViewProduct = (productId: string | number) => {
      uni.navigateTo({
        url: `/pages/product-edit/index?id=${productId}`,
      });
    };

    // 从批次生成商品
    const handleCreateProduct = () => {
      uni.navigateTo({
        url: "/pages/product-create/index",
      });
    };

    // 切换上下架状态
    const handleToggleShelf = async (product: Products) => {
      try {
        if (product.is_off_shelf) {
          await onShelfProduct(product.id);
          uni.showToast({
            title: "商品已上架",
            icon: "success",
          });
        } else {
          await offShelfProduct(product.id);
          uni.showToast({
            title: "商品已下架",
            icon: "success",
          });
        }
        // 重新加载商品列表
        await loadProducts(true);
      } catch (error) {
        console.error("操作失败:", error);
        uni.showToast({
          title: "操作失败",
          icon: "none",
        });
      }
    };

    // 删除商品
    const handleDeleteProduct = async (product: Products) => {
      uni.showModal({
        title: "确认删除",
        content: `确定要删除商品"${product.name}"吗？删除后用户将无法看到该商品。`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await deleteProduct(product.id);
              uni.showToast({
                title: "删除成功",
                icon: "success",
              });
              // 重新加载商品列表
              await loadProducts(true);
            } catch (error) {
              console.error("删除商品失败:", error);
              uni.showToast({
                title: "删除失败",
                icon: "none",
              });
            }
          }
        },
      });
    };

    onLoad(() => {
      loadProducts(true);
    });

    onShow(() => {
      loadProducts(true);
    });

    return {
      products,
      loading,
      hasMore,
      loadMore,
      handleViewProduct,
      handleCreateProduct,
      handleToggleShelf,
      handleDeleteProduct,
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
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.header-action {
  padding: 12rpx 24rpx;
  background: linear-gradient(135deg, #3cc51f 0%, #2ea517 100%);
  border-radius: 8rpx;
}

.action-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 500;
}

.scroll-view {
  height: calc(100vh - 120rpx);
}

.product-list {
  padding: 20rpx;
}

.product-item {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.product-content {
  display: flex;
  align-items: center;
  flex: 1;
}

.product-image {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background-color: #f5f5f5;
  margin-right: 24rpx;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.product-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}

.product-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.product-status-badges {
  display: flex;
  gap: 8rpx;
}

.status-badge {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
}

.status-badge.off-shelf {
  background-color: #fff3cd;
}

.status-badge.off-shelf .badge-text {
  color: #856404;
}

.status-badge.deleted {
  background-color: #f8d7da;
}

.status-badge.deleted .badge-text {
  color: #721c24;
}

.badge-text {
  font-size: 20rpx;
  font-weight: 500;
}

.product-actions {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.action-btn {
  flex: 1;
  padding: 12rpx 20rpx;
  border-radius: 8rpx;
  text-align: center;
  font-size: 24rpx;
}

.action-btn.off-shelf {
  background-color: #fff3cd;
}

.action-btn.off-shelf .action-btn-text {
  color: #856404;
}

.action-btn.on-shelf {
  background-color: #d4edda;
}

.action-btn.on-shelf .action-btn-text {
  color: #155724;
}

.action-btn.delete {
  background-color: #f8d7da;
}

.action-btn.delete .action-btn-text {
  color: #721c24;
}

.action-btn-text {
  font-size: 24rpx;
  font-weight: 500;
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

.product-meta {
  display: flex;
  gap: 24rpx;
  margin-top: 8rpx;
}

.product-stock,
.product-sales {
  font-size: 24rpx;
  color: #666;
}

.product-arrow {
  font-size: 28rpx;
  color: #999;
  margin-left: 20rpx;
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
