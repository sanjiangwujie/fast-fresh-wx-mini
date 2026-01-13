<template>
  <view class="page">
    <!-- 顶部标题栏 -->
    <view class="header-bar" v-if="cartItems.length > 0">
      <text class="header-title">三江无界</text>
      <view class="header-manage-btn" @click="handleToggleManageMode">
        <text class="header-manage-text">{{ isManageMode ? "完成" : "管理" }}</text>
      </view>
    </view>

    <!-- 购物车列表（可滚动区域） -->
    <scroll-view class="cart-scroll-view" scroll-y v-if="cartItems.length > 0">
      <view class="cart-list">
        <view class="cart-item" v-for="item in cartItems" :key="item.id">
          <view class="cart-item-checkbox" @click="handleToggleSelect(item, isManageMode)">
            <text class="checkbox-icon" :class="{ checked: isManageMode ? item.is_manage_selected : item.is_selected }">✓</text>
          </view>
          <image 
            class="cart-item-image" 
            :src="item.product?.image_url || ''" 
            mode="aspectFill"
            @click="handleGoToProductDetail(item)"
          />
          <view class="cart-item-info" @click="handleGoToProductDetail(item)">
            <view class="cart-item-name-row">
              <text class="cart-item-name">{{ item.product?.name || "" }}</text>
              <view class="cart-status-badge off-shelf" v-if="item.product?.is_off_shelf">
                <text class="badge-text">已下架</text>
              </view>
              <view class="cart-status-badge deleted" v-if="item.product?.is_deleted">
                <text class="badge-text">已删除</text>
              </view>
            </view>
            <view class="cart-item-price-row">
              <text class="cart-item-price">¥{{ item.product?.unit_price || 0 }}</text>
              <text class="cart-item-unit" v-if="item.product?.unit">/{{ item.product.unit }}</text>
            </view>
            <view class="cart-item-status-tip" v-if="item.product?.is_off_shelf || item.product?.is_deleted">
              <text class="tip-text">该商品无法购买，请移除</text>
            </view>
          </view>
          <view class="cart-item-actions">
            <view class="quantity-control" v-if="!isManageMode">
              <view 
                class="quantity-btn" 
                :class="{ disabled: item.quantity <= 1 }"
                @click.stop="handleDecreaseQuantity(item)"
              >-</view>
              <text class="quantity-text">{{ item.quantity }}</text>
              <view class="quantity-btn" @click.stop="handleIncreaseQuantity(item)">+</view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 空购物车 -->
    <view class="empty-cart" v-else>
      <text class="empty-text">购物车是空的</text>
      <view class="empty-btn" @click="handleGoShopping">去逛逛</view>
    </view>

    <!-- 底部结算栏 -->
    <view class="cart-footer" v-if="cartItems.length > 0">
      <view class="footer-checkbox" @click="isManageMode ? handleToggleManageAll() : handleToggleAll()">
        <text class="checkbox-icon" :class="{ checked: isManageMode ? isAllManageSelected : isAllSelected }">✓</text>
        <text class="footer-text">全选</text>
      </view>
      <view class="footer-info" v-if="!isManageMode">
        <text class="footer-total">合计: ¥{{ totalPrice.toFixed(2) }}</text>
      </view>
      <view class="footer-info" v-else>
        <text class="footer-total">已选择: {{ manageSelectedCount }}件</text>
      </view>
      <view v-if="!isManageMode" class="footer-actions">
        <view class="footer-btn" @click="handleCheckout">
          <text class="footer-btn-text">结算({{ selectedCount }})</text>
        </view>
      </view>
      <view v-else class="footer-actions">
        <view class="footer-btn delete-btn-footer" @click="handleBatchDelete" v-if="manageSelectedCount > 0">
          <text class="footer-btn-text">删除({{ manageSelectedCount }})</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { ref, computed, onMounted } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { getCarts, deleteCart, deleteCarts, updateCartQuantity } from "@/api/cart";
import { getUserId, isLoggedIn } from "@/api/auth";
import type { Carts } from "@/types/graphql";

interface CartItemWithManage extends Carts {
  is_manage_selected?: boolean;
}

export default {
  setup() {
    const cartItems = ref<CartItemWithManage[]>([]);
    const loading = ref(false);
    const isManageMode = ref(false);

    // 计算总价
    const totalPrice = computed(() => {
      return cartItems.value
        .filter((item) => item.is_selected)
        .reduce((sum, item) => {
          const price = Number(item.product?.unit_price || 0);
          const quantity = Number(item.quantity || 0);
          return sum + price * quantity;
        }, 0);
    });

    // 计算选中数量（排除已下架或已删除的商品）
    const selectedCount = computed(() => {
      return cartItems.value.filter(
        (item) => item.is_selected && !item.product?.is_off_shelf && !item.product?.is_deleted
      ).length;
    });

    // 是否全选
    const isAllSelected = computed(() => {
      return cartItems.value.length > 0 && cartItems.value.every((item) => item.is_selected);
    });

    // 检查并修正商品数量（如果数量大于库存，自动调整为库存数量）
    const checkAndFixQuantity = async (item: CartItemWithManage) => {
      const stock = Number(item.product?.unit_stock || 0);
      const currentQuantity = Number(item.quantity || 0);
      
      // 如果库存大于0且当前数量大于库存，需要修正
      if (stock > 0 && currentQuantity > stock) {
        // 先更新UI
        item.quantity = stock;
        
        try {
          // 调用API更新后端数据
          await updateCartQuantity(item.id, stock);
          console.log(`商品 ${item.product?.name} 数量已从 ${currentQuantity} 调整为 ${stock}（库存上限）`);
        } catch (error) {
          console.error("修正数量失败:", error);
          // 如果更新失败，恢复原值
          item.quantity = currentQuantity;
        }
      }
    };

    // 加载购物车
    const loadCarts = async () => {
      if (loading.value) return;

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

      loading.value = true;
      try {
        const result = await getCarts(userId);
        // 为每个商品添加管理模式选中状态
        cartItems.value = result.map((item) => ({
          ...item,
          is_manage_selected: false,
        }));
        
        // 检查并修正每个商品的数量（如果大于库存）
        for (const item of cartItems.value) {
          await checkAndFixQuantity(item);
        }
      } catch (error) {
        console.error("加载购物车失败:", error);
        uni.showToast({
          title: "加载失败",
          icon: "none",
        });
      } finally {
        loading.value = false;
      }
    };

    // 切换选中状态
    const handleToggleSelect = (item: CartItemWithManage, isManage: boolean) => {
      if (isManage) {
        // 管理模式：切换管理选中状态
        item.is_manage_selected = !item.is_manage_selected;
      } else {
        // 正常模式：切换结算选中状态
        // TODO: 调用API更新选中状态
        item.is_selected = !item.is_selected;
      }
    };

    // 全选/取消全选
    const handleToggleAll = () => {
      const allSelected = isAllSelected.value;
      // TODO: 调用API批量更新选中状态
      cartItems.value.forEach((item) => {
        item.is_selected = !allSelected;
      });
    };

    // 减少数量
    const handleDecreaseQuantity = async (item: Carts) => {
      if (item.quantity <= 1) return;
      
      const oldQuantity = Number(item.quantity);
      const newQuantity = oldQuantity - 1;
      // 先更新UI，实现无感更新
      item.quantity = newQuantity;
      
      try {
        // 调用API更新后端数据
        await updateCartQuantity(item.id, newQuantity);
      } catch (error) {
        console.error("减少数量失败:", error);
        // 如果更新失败，恢复原值
        item.quantity = oldQuantity;
        uni.showToast({
          title: "更新失败",
          icon: "none",
        });
      }
    };

    // 增加数量
    const handleIncreaseQuantity = async (item: Carts) => {
      // 检查库存
      const stock = Number(item.product?.unit_stock || 0);
      const currentQuantity = Number(item.quantity || 0);
      
      if (stock > 0 && currentQuantity >= stock) {
        uni.showToast({
          title: "库存不足",
          icon: "none",
        });
        return;
      }
      
      const newQuantity = currentQuantity + 1;
      // 先更新UI，实现无感更新
      item.quantity = newQuantity;
      
      try {
        // 调用API更新后端数据
        await updateCartQuantity(item.id, newQuantity);
      } catch (error) {
        console.error("增加数量失败:", error);
        // 如果更新失败，恢复原值
        item.quantity = currentQuantity;
        uni.showToast({
          title: "更新失败",
          icon: "none",
        });
      }
    };

    // 计算管理模式选中数量
    const manageSelectedCount = computed(() => {
      return cartItems.value.filter((item) => item.is_manage_selected).length;
    });

    // 是否全部选中（管理模式）
    const isAllManageSelected = computed(() => {
      return cartItems.value.length > 0 && cartItems.value.every((item) => item.is_manage_selected);
    });

    // 切换管理模式
    const handleToggleManageMode = () => {
      isManageMode.value = !isManageMode.value;
      // 退出管理模式时，清除所有管理选中状态
      if (!isManageMode.value) {
        cartItems.value.forEach((item) => {
          item.is_manage_selected = false;
        });
      }
    };

    // 管理模式全选/取消全选
    const handleToggleManageAll = () => {
      const allSelected = isAllManageSelected.value;
      cartItems.value.forEach((item) => {
        item.is_manage_selected = !allSelected;
      });
    };

    // 批量删除
    const handleBatchDelete = async () => {
      const selectedItems = cartItems.value.filter((item) => item.is_manage_selected);
      if (selectedItems.length === 0) {
        uni.showToast({
          title: "请选择要删除的商品",
          icon: "none",
        });
        return;
      }

      uni.showModal({
        title: "提示",
        content: `确定要删除选中的${selectedItems.length}件商品吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              const cartIds = selectedItems.map((item) => item.id);
              const deletedCount = await deleteCarts(cartIds);
              if (deletedCount > 0) {
                uni.showToast({
                  title: `已删除${deletedCount}件商品`,
                  icon: "success",
                });
                // 重新加载购物车
                await loadCarts();
                // 退出管理模式
                isManageMode.value = false;
              } else {
                uni.showToast({
                  title: "删除失败",
                  icon: "none",
                });
              }
            } catch (error) {
              console.error("批量删除失败:", error);
              uni.showToast({
                title: "删除失败",
                icon: "none",
              });
            }
          }
        },
      });
    };

    // 去结算
    const handleCheckout = () => {
      const selectedItems = cartItems.value.filter((item) => item.is_selected);
      if (selectedItems.length === 0) {
        uni.showToast({
          title: "请选择商品",
          icon: "none",
        });
        return;
      }

      // 检查是否有已下架或已删除的商品
      const invalidItems = selectedItems.filter(
        (item) => item.product?.is_off_shelf || item.product?.is_deleted
      );

      if (invalidItems.length > 0) {
        uni.showModal({
          title: "提示",
          content: `有${invalidItems.length}个商品已下架或已删除，无法结算。请先移除这些商品。`,
          showCancel: false,
        });
        return;
      }

      // 跳转到结算页面
      uni.navigateTo({
        url: "/pages/checkout/index",
      });
    };

    // 跳转到商品详情页
    const handleGoToProductDetail = (item: Carts) => {
      if (!item.product?.id) {
        uni.showToast({
          title: "商品信息错误",
          icon: "none",
        });
        return;
      }
      uni.navigateTo({
        url: `/pages/product/detail?id=${item.product.id}`,
      });
    };

    // 去逛逛
    const handleGoShopping = () => {
      uni.switchTab({
        url: "/pages/index/index",
      });
    };

    onLoad(() => {
      loadCarts();
    });

    onShow(() => {
      loadCarts();
    });

    return {
      cartItems,
      totalPrice,
      selectedCount,
      isAllSelected,
      isManageMode,
      manageSelectedCount,
      isAllManageSelected,
      handleToggleSelect,
      handleToggleAll,
      handleToggleManageMode,
      handleToggleManageAll,
      handleDecreaseQuantity,
      handleIncreaseQuantity,
      handleBatchDelete,
      handleCheckout,
      handleGoShopping,
      handleGoToProductDetail,
    };
  },
};
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
  overflow: hidden;
}

/* 顶部标题栏 */
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  padding: 20rpx 30rpx;
  padding-top: calc(env(safe-area-inset-top) + 20rpx);
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #eee;
  flex-shrink: 0;
  box-sizing: border-box;
}

.header-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.header-manage-btn {
  padding: 12rpx 32rpx;
  background-color: #f5f5f5;
  border: 1rpx solid #e0e0e0;
  border-radius: 40rpx;
}

.header-manage-text {
  font-size: 28rpx;
  color: #666;
  font-weight: 500;
}

/* 购物车列表滚动区域 */
.cart-scroll-view {
  flex: 1;
  height: 0; /* 配合 flex: 1 使用，让 flex 自动计算高度 */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* 购物车列表 */
.cart-list {
  padding: 20rpx;
}

.cart-item {
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.cart-item-checkbox {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #ddd;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.checkbox-icon {
  font-size: 24rpx;
  color: transparent;
}

.checkbox-icon.checked {
  color: #3cc51f;
}

.cart-item-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  background-color: #f5f5f5;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.cart-item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 160rpx;
  padding-right: 20rpx;
}

.cart-item-name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
  margin-bottom: 8rpx;
}

.cart-item-name {
  font-size: 28rpx;
  color: #333;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

.cart-status-badge {
  padding: 4rpx 10rpx;
  border-radius: 6rpx;
  font-size: 20rpx;
  flex-shrink: 0;
}

.cart-status-badge.off-shelf {
  background-color: #fff3cd;
}

.cart-status-badge.off-shelf .badge-text {
  color: #856404;
  font-weight: 500;
}

.cart-status-badge.deleted {
  background-color: #f8d7da;
}

.cart-status-badge.deleted .badge-text {
  color: #721c24;
  font-weight: 500;
}

.cart-item-status-tip {
  margin-top: 8rpx;
  padding: 8rpx;
  background-color: #fff3cd;
  border-radius: 6rpx;
}

.cart-item-status-tip .tip-text {
  font-size: 22rpx;
  color: #856404;
}

.cart-item-price-row {
  display: flex;
  align-items: baseline;
}

.cart-item-price {
  font-size: 32rpx;
  font-weight: bold;
  color: #ff6b35;
}

.cart-item-unit {
  font-size: 24rpx;
  color: #999;
  margin-left: 4rpx;
}

.cart-item-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-end;
  min-height: 160rpx;
}

.quantity-control {
  display: flex;
  align-items: center;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
}

.quantity-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: #333;
  background-color: #f5f5f5;
  transition: all 0.2s;
}

.quantity-btn.disabled {
  color: #ccc;
  background-color: #f0f0f0;
  pointer-events: none;
}

.quantity-text {
  min-width: 60rpx;
  text-align: center;
  font-size: 28rpx;
  color: #333;
  padding: 0 10rpx;
}


/* 空购物车 */
.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 40rpx;
}

.empty-btn {
  padding: 20rpx 60rpx;
  background-color: #3cc51f;
  border-radius: 40rpx;
  color: #fff;
  font-size: 28rpx;
}

/* 底部结算栏 */
.cart-footer {
  display: flex;
  align-items: center;
  background-color: #fff;
  padding: 12rpx 20rpx;
  padding-bottom: calc(12rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #eee;
  flex-shrink: 0;
  box-sizing: border-box;
}

.footer-checkbox {
  display: flex;
  align-items: center;
  margin-right: 20rpx;
}

.footer-text {
  font-size: 28rpx;
  color: #333;
  margin-left: 10rpx;
}

.footer-info {
  flex: 1;
  text-align: right;
  margin-right: 20rpx;
}

.footer-total {
  font-size: 32rpx;
  font-weight: bold;
  color: #ff6b35;
}

.footer-actions {
  display: flex;
  gap: 20rpx;
  align-items: center;
}

.footer-btn {
  padding: 12rpx 36rpx;
  background-color: #3cc51f;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64rpx;
  box-sizing: border-box;
}

.footer-btn.delete-btn-footer {
  background-color: #ff3b30;
}

.footer-btn-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: bold;
  line-height: 1;
}
</style>
