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
            <text class="origin-category-text">{{ (typeof item === 'string' ? item : String(item || "全部")) }}</text>
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
                  <view class="product-name-row">
                    <text class="product-name">{{ item.name }}</text>
                    <view class="product-status-badge off-shelf" v-if="item.is_off_shelf">
                      <text class="badge-text">已下架</text>
                    </view>
                  </view>
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
                  <view class="product-name-row">
                    <text class="product-name">{{ item.name }}</text>
                    <view class="product-status-badge off-shelf" v-if="item.is_off_shelf">
                      <text class="badge-text">已下架</text>
                    </view>
                  </view>
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
import { onLoad, onShow, onPullDownRefresh } from "@dcloudio/uni-app";
import { getProducts } from "@/api/product";
import { getCategories, getCategoryNames } from "@/api/category";
import type { Products, Categories, Products_Bool_Exp } from "@/types/graphql";
import { Order_By } from "@/types/graphql";

export default {
  setup() {
    // 顶部一级分类列表（category_name 去重）
    const originCategories = ref<string[]>([]);
    const selectedOriginCategory = ref<string | null>("全部");
    
    // 左侧二级分类列表（categories 表的 name）
    const allCategories = ref<Categories[]>([]); // 所有分类数据
    const categories = ref<Categories[]>([]); // 过滤后的分类列表
    const selectedCategoryId = ref<number | null>(null);

    const products = ref<Products[]>([]);
    const loading = ref(false);
    const hasMore = ref(true);
    const page = ref(1);
    const pageSize = 20;
    const lastProductsLoadedAt = ref<number>(0);

    // 双列表瀑布流：将商品列表分成两列
    const leftColumnProducts = computed(() => {
      return products.value.filter((_, index) => index % 2 === 0);
    });

    const rightColumnProducts = computed(() => {
      return products.value.filter((_, index) => index % 2 === 1);
    });

    // 根据选中的 category_name 过滤 categories
    const filterCategoriesByOriginCategory = () => {
      if (selectedOriginCategory.value === "全部" || !selectedOriginCategory.value) {
        // 显示所有分类
        categories.value = [
          { id: null as any, name: "全部", category_name: null, created_at: "", updated_at: "" } as any,
          ...allCategories.value,
        ];
      } else {
        // 只显示匹配 category_name 的分类
        const filtered = allCategories.value.filter(
          (cat) => cat.category_name === selectedOriginCategory.value
        );
        categories.value = [
          { id: null as any, name: "全部", category_name: selectedOriginCategory.value, created_at: "", updated_at: "" } as any,
          ...filtered,
        ];
      }
      // 重置选中的二级分类
      selectedCategoryId.value = null;
    };

    // 加载顶部一级分类列表（category_name 去重）
    const loadCategoryNames = async (preserveSelection = false) => {
      try {
        const result = await getCategoryNames();
        // 确保result是字符串数组
        const categoryNames: string[] = [];
        if (Array.isArray(result)) {
          result.forEach(item => {
            if (item != null && typeof item === 'string' && item.trim()) {
              categoryNames.push(item);
            }
          });
        }
        // 在开头添加"全部"选项
        originCategories.value = ["全部", ...categoryNames];
        // 只有在不保留选择时才默认选中"全部"
        if (!preserveSelection) {
        selectedOriginCategory.value = "全部";
        }
      } catch (error) {
        console.error("加载分类类别失败:", error);
      }
    };

    // 加载所有 categories 列表（categories 表的 name）
    const loadCategories = async () => {
      try {
        const result = await getCategories();
        // 保存所有分类数据
        allCategories.value = result;
        // 根据选中的一级分类过滤
        filterCategoriesByOriginCategory();
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
          // page 表示“下一页要加载的页码”，刷新后应从第 2 页开始
          page.value = 2;
        } else {
          products.value.push(...result);
        }

        hasMore.value = result.length === pageSize;
        if (!refresh) {
          page.value++;
        }
        lastProductsLoadedAt.value = Date.now();
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

    // 根据category_name选择分类（从首页金刚区跳转过来时使用）
    const selectCategoryByName = async (categoryName: string) => {
      try {
        // 先加载所有数据
        await Promise.all([
          loadCategoryNames(),
          loadCategories(),
        ]);
        
        // 设置选中的一级分类（category_name）
        if (originCategories.value.includes(categoryName)) {
          selectedOriginCategory.value = categoryName;
          // 过滤左侧分类列表
          filterCategoriesByOriginCategory();
          // 加载商品列表
          await loadProducts(true);
        } else {
          // 如果找不到匹配的分类，使用默认加载
          selectedOriginCategory.value = "全部";
          filterCategoriesByOriginCategory();
          await loadProducts(true);
        }
      } catch (error) {
        console.error("根据category_name选择分类失败:", error);
        // 出错时使用默认加载
        selectedOriginCategory.value = "全部";
        filterCategoriesByOriginCategory();
        await loadProducts(true);
      }
    };

    // 处理顶部一级分类点击（category_name）
    const handleOriginCategoryClick = (categoryName: string | any) => {
      // 确保categoryName是字符串类型
      const categoryStr = typeof categoryName === 'string' ? categoryName : String(categoryName || "全部");
      
      // 设置选中的一级分类
      selectedOriginCategory.value = categoryStr;
      
      // 根据选中的一级分类过滤左侧分类列表
      filterCategoriesByOriginCategory();
      
      // 重新加载商品列表
      loadProducts(true);
    };

    // 处理左侧二级分类点击（categories 表的 name）
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

    onLoad((options: any) => {
      // 检查是否有category_name参数（从URL参数或storage中获取）
      let categoryName = options?.category_name;
      
      // 如果URL参数中没有，尝试从storage中获取（用于tabBar页面跳转）
      if (!categoryName) {
        categoryName = uni.getStorageSync("category_name_param");
        if (categoryName) {
          uni.removeStorageSync("category_name_param");
        }
      }
      
      if (categoryName) {
        // 如果有category_name参数，自动选择对应分类
        selectCategoryByName(decodeURIComponent(categoryName));
      } else {
        // 否则正常加载
        loadCategoryNames();
        loadCategories();
        loadProducts(true);
      }
    });

    // tabBar 页面二次进入时 onLoad 不会再触发（例如从首页金刚区 switchTab 过来）
    // 这里在 onShow 再读取一次参数，避免“第一次正常、第二次失效”的问题
    onShow(() => {
      const categoryName = uni.getStorageSync("category_name_param");
      if (categoryName) {
        uni.removeStorageSync("category_name_param");
        selectCategoryByName(decodeURIComponent(categoryName));
        return;
      }

      // 正常切回分类页时自动刷新商品列表（节流，避免频繁请求）
      if (Date.now() - lastProductsLoadedAt.value > 10_000) {
        loadProducts(true);
      }
    });

    // 下拉刷新（需要 pages.json 为该页开启 enablePullDownRefresh）
    onPullDownRefresh(async () => {
      await loadProducts(true);
      uni.stopPullDownRefresh();
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

.product-name-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.product-name {
  font-size: 28rpx;
  color: #333;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  margin-bottom: 0;
  flex: 1;
}

.product-status-badge {
  flex-shrink: 0;
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  line-height: 1;
  border: 1rpx solid transparent;
  backdrop-filter: blur(8rpx);
}

.product-status-badge.off-shelf {
  background-color: rgba(0, 0, 0, 0.55);
  border-color: rgba(255, 255, 255, 0.25);
}

.badge-text {
  font-size: 20rpx;
  color: #fff;
  font-weight: 600;
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
