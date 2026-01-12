<template>
  <view class="page">
    <!-- 搜索栏 -->
    <view class="search-bar" @click="handleSearchClick">
      <view class="search-input-wrapper">
        <text class="search-placeholder">🔍 搜索商品</text>
      </view>
    </view>

    <!-- 轮播图 -->
    <view class="banner-section" v-if="banners.length > 0">
      <swiper
        class="banner-swiper"
        indicator-dots
        autoplay
        circular
        interval="3000"
        duration="500"
        indicator-color="rgba(255, 255, 255, 0.5)"
        indicator-active-color="#3cc51f"
      >
        <swiper-item v-for="(item, index) in banners" :key="item.id">
          <image class="banner-image" :src="item.media_file_url || ''" mode="aspectFill" @click="handleBannerClick(item)" />
        </swiper-item>
      </swiper>
    </view>

    <!-- 金刚区 -->
    <view class="kingkong-section">
      <view
        class="kingkong-item"
        v-for="(item, index) in kingkongItems"
        :key="index"
        @click="handleKingkongClick(item)"
      >
        <image class="kingkong-icon" :src="item.icon" mode="aspectFit" />
        <text class="kingkong-text">{{ item.text }}</text>
      </view>
    </view>

    <!-- 商品列表（双列表瀑布流） -->
    <view class="products-section">
      <view class="products-title">热门商品</view>
      <view class="products-container">
        <!-- 左列 -->
        <view class="products-column">
          <view
            class="product-item"
            v-for="(item, index) in leftColumnProducts"
            :key="item.id"
            @click="handleProductClick(item)"
          >
            <image class="product-image" :src="item.image_url || ''" mode="aspectFill" />
            <view class="product-info">
              <text class="product-name">{{ item.name }}</text>
              <view class="product-price-row">
                <text class="product-price">¥{{ item.unit_price || 0 }}</text>
                <text class="product-unit" v-if="item.unit">/{{ item.unit }}</text>
              </view>
              <view class="product-stock-row">
                <text class="product-stock">库存: {{ item.unit_stock || 0 }}</text>
                <text class="product-sales">已售: {{ item.sales || 0 }}</text>
              </view>
            </view>
          </view>
        </view>

        <!-- 右列 -->
        <view class="products-column">
          <view
            class="product-item"
            v-for="(item, index) in rightColumnProducts"
            :key="item.id"
            @click="handleProductClick(item)"
          >
            <image class="product-image" :src="item.image_url || ''" mode="aspectFill" />
            <view class="product-info">
              <text class="product-name">{{ item.name }}</text>
              <view class="product-price-row">
                <text class="product-price">¥{{ item.unit_price || 0 }}</text>
                <text class="product-unit" v-if="item.unit">/{{ item.unit }}</text>
              </view>
              <view class="product-stock-row">
                <text class="product-stock">库存: {{ item.unit_stock || 0 }}</text>
                <text class="product-sales">已售: {{ item.sales || 0 }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 加载更多 -->
    <view class="load-more" v-if="loading">
      <text>加载中...</text>
    </view>
    <view class="load-more" v-if="!hasMore && products.length > 0">
      <text>没有更多了</text>
    </view>
  </view>
</template>

<script lang="ts">
import { ref, computed, onMounted } from "vue";
import { onLoad, onPullDownRefresh, onReachBottom } from "@dcloudio/uni-app";
import { getProducts } from "@/api/product";
import { getBanners } from "@/api/banner";
import type { Products, Banners } from "@/types/graphql";
import { Order_By } from "@/types/graphql";

interface KingkongItem {
  icon: string;
  text: string;
  link?: string;
}

export default {
  setup() {
    const banners = ref<Banners[]>([]);

    const kingkongItems = ref<KingkongItem[]>([
      { icon: "/static/kingkong/kingkong1.png", text: "新鲜水果" },
      { icon: "/static/kingkong/kingkong2.png", text: "时令蔬菜" },
      { icon: "/static/kingkong/kingkong3.png", text: "精选肉类" },
      { icon: "/static/kingkong/kingkong4.png", text: "海鲜水产" },
      { icon: "/static/kingkong/kingkong5.png", text: "粮油调味" },
      { icon: "/static/kingkong/kingkong6.png", text: "休闲零食" },
      { icon: "/static/kingkong/kingkong7.png", text: "酒水饮料" },
      { icon: "/static/kingkong/kingkong8.png", text: "更多分类" },
    ]);

    const products = ref<Products[]>([]);
    const loading = ref(false);
    const hasMore = ref(true);
    const page = ref(1);
    const pageSize = 20;

    // 双列表瀑布流：将商品列表分成两列
    const leftColumnProducts = computed(() => {
      return products.value.filter((_, index) => index % 2 === 0);
    });

    const rightColumnProducts = computed(() => {
      return products.value.filter((_, index) => index % 2 === 1);
    });

    // 加载轮播图
    const loadBanners = async () => {
      try {
        const result = await getBanners({
          where: {
            media_file_type: { _eq: "image" },
            media_file_url: { _is_null: false },
          },
          order_by: [
            {
              created_at: "desc" as any,
            },
          ],
          limit: 10,
        });
        // 过滤掉没有URL的banner
        banners.value = result.filter((banner) => banner.media_file_url);
      } catch (error) {
        console.error("加载轮播图失败:", error);
        uni.showToast({
          title: "加载轮播图失败",
          icon: "none",
        });
      }
    };

    // 处理轮播图点击
    const handleBannerClick = (banner: Banners) => {
      // TODO: 根据banner的link跳转到相应页面
      console.log("点击轮播图:", banner);
    };

    // 加载商品列表
    const loadProducts = async (refresh = false) => {
      if (loading.value) return;

      loading.value = true;
      try {
        const currentPage = refresh ? 1 : page.value;
        const result = await getProducts({
          where: {
            unit_stock: {
              _gt: 0,
            },
          },
          order_by: [
            {
              created_at: Order_By.Desc,
            },
          ] as any,
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
        });

        if (refresh) {
          products.value = result;
          page.value = 1;
        } else {
          products.value.push(...result);
        }

        hasMore.value = result.length === pageSize;
        if (!refresh) {
          page.value++;
        }
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

    // 处理金刚区点击
    const handleKingkongClick = (item: KingkongItem) => {
      uni.switchTab({
        url: "/pages/categories/index",
      });
    };

    // 处理商品点击
    const handleProductClick = (product: Products) => {
      uni.navigateTo({
        url: `/pages/product/detail?id=${product.id}`,
      });
    };

    // 处理搜索点击
    const handleSearchClick = () => {
      uni.navigateTo({
        url: "/pages/search/index",
      });
    };

    onLoad(() => {
      loadBanners();
      loadProducts(true);
    });

    onPullDownRefresh(() => {
      Promise.all([loadBanners(), loadProducts(true)]).finally(() => {
        uni.stopPullDownRefresh();
      });
    });

    onReachBottom(() => {
      if (hasMore.value && !loading.value) {
        loadProducts();
      }
    });

    return {
      banners,
      kingkongItems,
      products,
      leftColumnProducts,
      rightColumnProducts,
      loading,
      hasMore,
      handleBannerClick,
      handleKingkongClick,
      handleProductClick,
      handleSearchClick,
    };
  },
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

/* 搜索栏 */
.search-bar {
  background-color: #fff;
  padding: 20rpx 30rpx;
  padding-top: calc(env(safe-area-inset-top) + 20rpx);
  border-bottom: 1rpx solid #eee;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 40rpx;
  padding: 20rpx 30rpx;
}

.search-placeholder {
  font-size: 28rpx;
  color: #999;
}

/* 轮播图 */
.banner-section {
  width: 100%;
  height: 360rpx;
  background-color: #fff;
}

.banner-swiper {
  width: 100%;
  height: 100%;
}

.banner-image {
  width: 100%;
  height: 100%;
}

/* 金刚区 */
.kingkong-section {
  display: flex;
  flex-wrap: wrap;
  background-color: #fff;
  padding: 30rpx 20rpx;
  margin-bottom: 20rpx;
}

.kingkong-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 25%;
  margin-bottom: 30rpx;
}

.kingkong-icon {
  width: 80rpx;
  height: 80rpx;
  margin-bottom: 10rpx;
}

.kingkong-text {
  font-size: 24rpx;
  color: #333;
}

/* 商品列表 */
.products-section {
  background-color: #fff;
  padding: 20rpx;
}

.products-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.products-container {
  display: flex;
  gap: 20rpx;
}

.products-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.product-item {
  background-color: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.product-image {
  width: 100%;
  height: 300rpx;
  background-color: #f5f5f5;
}

.product-info {
  padding: 20rpx;
}

.product-name {
  font-size: 28rpx;
  color: #333;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  margin-bottom: 12rpx;
}

.product-price-row {
  display: flex;
  align-items: baseline;
  margin-bottom: 8rpx;
}

.product-price {
  font-size: 32rpx;
  font-weight: bold;
  color: #ff6b35;
}

.product-unit {
  font-size: 24rpx;
  color: #999;
  margin-left: 4rpx;
}

.product-stock-row {
  display: flex;
  justify-content: space-between;
  font-size: 22rpx;
  color: #999;
}


/* 加载更多 */
.load-more {
  text-align: center;
  padding: 40rpx 0;
  font-size: 24rpx;
  color: #999;
}
</style>
