<template>
  <view class="page">
    <!-- 搜索栏 -->
    <view class="search-bar" @click="handleSearchClick">
      <view class="search-input-wrapper">
        <text class="search-placeholder">🔍 搜索商品</text>
      </view>
    </view>

    <!-- 顶部 origins category_name 横向滚动 -->
    <view class="origin-categories-section">
      <scroll-view class="origin-categories-scroll" scroll-x>
        <view class="origin-categories-container">
          <view
            class="origin-category-item"
            :class="{ active: selectedOriginCategory === item }"
            v-for="(item, index) in originCategories"
            :key="index"
            @click="handleOriginCategoryClick(item)"
          >
            <text class="origin-category-text">{{ item || "全部" }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 主体内容 -->
    <view class="content-section">
      <!-- 左侧 categories 列表 -->
      <view class="categories-sidebar">
        <scroll-view class="categories-scroll" scroll-y>
          <view
            class="category-item"
            :class="{ active: selectedCategoryId === (category.id === null ? null : category.id) }"
            v-for="category in categories"
            :key="category.id || 'all'"
            @click="handleCategoryClick(category.id === null ? null : category.id)"
          >
            <text class="category-text">{{ category.name }}</text>
          </view>
        </scroll-view>
      </view>

      <!-- 右侧产品双列 -->
      <view class="products-content">
        <scroll-view class="products-scroll" scroll-y @scrolltolower="handleScrollToLower">
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

          <!-- 加载更多 -->
          <view class="load-more" v-if="loading">
            <text>加载中...</text>
          </view>
          <view class="load-more" v-if="!hasMore && products.length > 0">
            <text>没有更多了</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { onLoad, onPullDownRefresh } from "@dcloudio/uni-app";
import { getProducts } from "@/api/product";
import { getCategories, getCategoryNames } from "@/api/category";
import type { Products, Categories, Products_Bool_Exp } from "@/types/graphql";
import { Order_By } from "@/types/graphql";

export default {
  setup() {
    const originCategories = ref<string[]>([]);
    const selectedOriginCategory = ref<string | null>(null);
    
    const categories = ref<Categories[]>([]);
    const selectedCategoryId = ref<number | null>(null);

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

    // 加载分类类别（category_name 去重）
    const loadCategoryNames = async () => {
      try {
        const result = await getCategoryNames();
        // 在开头添加"全部"选项
        originCategories.value = ["全部", ...result];
        // 默认选中"全部"
        selectedOriginCategory.value = "全部";
      } catch (error) {
        console.error("加载分类类别失败:", error);
      }
    };

    // 加载 categories 列表
    const loadCategories = async () => {
      try {
        console.log("开始加载 categories...");
        const result = await getCategories();
        console.log("categories 加载结果:", result);
        // 将"全部"选项放到第一项（使用 Partial 类型）
        categories.value = [
          { id: null as any, name: "全部", category_name: null, created_at: "", updated_at: "" } as any,
          ...result,
        ];
        // 默认选中"全部"
        selectedCategoryId.value = null;
      } catch (error) {
        console.error("加载 categories 失败:", error);
        uni.showToast({
          title: "加载分类失败",
          icon: "none",
        });
      }
    };

    // 加载产品列表
    const loadProducts = async (refresh = false) => {
      if (loading.value) return;

      loading.value = true;
      try {
        const currentPage = refresh ? 1 : page.value;
        
        // 构建筛选条件
        const where: Products_Bool_Exp = {
          unit_stock: {
            _gt: 0,
          },
        };

        // 添加 categories category_name 筛选
        if (selectedOriginCategory.value && selectedOriginCategory.value !== "全部") {
          where.category = {
            category_name: {
              _eq: selectedOriginCategory.value,
            },
          };
        }

        // 添加 categories 筛选
        if (selectedCategoryId.value) {
          where.category_categories = {
            _eq: selectedCategoryId.value,
          };
        }

        const result = await getProducts({
          where: where as any,
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

    // 处理 origins category 点击
    const handleOriginCategoryClick = (category: string) => {
      selectedOriginCategory.value = category;
      loadProducts(true);
    };

    // 处理 category 点击
    const handleCategoryClick = (categoryId: number | null) => {
      selectedCategoryId.value = categoryId;
      loadProducts(true);
    };

    // 处理产品点击
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

    // 滚动到底部加载更多
    const handleScrollToLower = () => {
      if (hasMore.value && !loading.value) {
        loadProducts();
      }
    };

    onLoad(() => {
      loadCategoryNames().then(() => {
        console.log("category names 加载完成");
      });
      loadCategories().then(() => {
        console.log("categories 加载完成");
      });
      loadProducts(true).then(() => {
        console.log("products 加载完成");
      });
    });

    onPullDownRefresh(() => {
      Promise.all([
        loadCategoryNames(),
        loadCategories(),
        loadProducts(true),
      ]).finally(() => {
        uni.stopPullDownRefresh();
      });
    });

    return {
      originCategories,
      selectedOriginCategory,
      categories,
      selectedCategoryId,
      products,
      leftColumnProducts,
      rightColumnProducts,
      loading,
      hasMore,
      handleOriginCategoryClick,
      handleCategoryClick,
      handleProductClick,
      handleScrollToLower,
      handleSearchClick,
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
}

/* 搜索栏 */
.search-bar {
  background-color: #fff;
  padding: 20rpx 30rpx;
  padding-top: calc(env(safe-area-inset-top) + 20rpx);
  border-bottom: 1rpx solid #eee;
  flex-shrink: 0;
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

/* 顶部 origins category_name 横向滚动 */
.origin-categories-section {
  background-color: #fff;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #eee;
}

.origin-categories-scroll {
  white-space: nowrap;
  width: 100%;
}

.origin-categories-container {
  display: flex;
  padding: 0 20rpx;
}

.origin-category-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx 24rpx;
  margin-right: 20rpx;
  border-radius: 40rpx;
  background-color: #f5f5f5;
  white-space: nowrap;
}

.origin-category-item.active {
  background-color: #3cc51f;
}

.origin-category-text {
  font-size: 26rpx;
  color: #333;
}

.origin-category-item.active .origin-category-text {
  color: #fff;
}

/* 主体内容 */
.content-section {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧 categories 列表 */
.categories-sidebar {
  width: 180rpx;
  background-color: #fff;
  border-right: 1rpx solid #eee;
}

.categories-scroll {
  height: 100%;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30rpx 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
  position: relative;
}

.category-item.active {
  background-color: #f5f5f5;
}

.category-item.active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6rpx;
  background-color: #3cc51f;
}

.category-text {
  font-size: 26rpx;
  color: #333;
}

.category-item.active .category-text {
  color: #3cc51f;
  font-weight: bold;
}

/* 右侧产品双列 */
.products-content {
  flex: 1;
  background-color: #f5f5f5;
}

.products-scroll {
  height: 100%;
}

.products-container {
  display: flex;
  gap: 20rpx;
  padding: 20rpx;
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
