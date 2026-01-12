<template>
  <view class="page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrapper">
        <input
          class="search-input"
          v-model="searchKeyword"
          placeholder="搜索商品"
          confirm-type="search"
          @confirm="handleSearch"
          @input="handleInput"
        />
        <view class="search-icon" @click="handleSearch">🔍</view>
      </view>
      <view class="cancel-btn" @click="handleCancel">取消</view>
    </view>

    <!-- 搜索历史（未搜索时显示） -->
    <view class="search-history-section" v-if="!hasSearched && searchHistory.length > 0">
      <view class="section-header">
        <text class="section-title">搜索历史</text>
        <text class="clear-btn" @click="handleClearHistory">清除</text>
      </view>
      <view class="history-tags">
        <view
          class="history-tag"
          v-for="(item, index) in searchHistory"
          :key="index"
          @click="handleHistoryClick(item)"
        >
          <text>{{ item }}</text>
        </view>
      </view>
    </view>

    <!-- 全部商品/搜索结果 -->
    <scroll-view
      class="search-results"
      scroll-y
      @scrolltolower="handleLoadMore"
    >
      <!-- 商品列表 -->
      <view class="products-container" v-if="displayProducts.length > 0">
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

      <!-- 空状态 -->
      <view class="empty-state" v-if="hasSearched && displayProducts.length === 0 && !loading">
        <view class="empty-icon">🔍</view>
        <text class="empty-text">没有找到相关商品</text>
        <text class="empty-tip">试试其他关键词吧</text>
      </view>

      <!-- 加载更多 -->
      <view class="load-more" v-if="loading">
        <text>加载中...</text>
      </view>
      <view class="load-more" v-if="!hasMore && displayProducts.length > 0">
        <text>没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script lang="ts">
import { ref, computed, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { searchProducts, getProducts } from "@/api/product";
import type { Products } from "@/types/graphql";

const SEARCH_HISTORY_KEY = "search_history";
const MAX_HISTORY_COUNT = 10;

export default {
  setup() {
    const searchKeyword = ref("");
    const searchResults = ref<Products[]>([]);
    const allProducts = ref<Products[]>([]);
    const hasSearched = ref(false);
    const loading = ref(false);
    const hasMore = ref(true);
    const currentPage = ref(0);
    const pageSize = ref(20);
    const searchHistory = ref<string[]>([]);

    // 加载搜索历史
    const loadSearchHistory = () => {
      try {
        const history = uni.getStorageSync(SEARCH_HISTORY_KEY);
        if (Array.isArray(history)) {
          searchHistory.value = history;
        }
      } catch (error) {
        console.error("加载搜索历史失败:", error);
      }
    };

    // 保存搜索历史
    const saveSearchHistory = (keyword: string) => {
      if (!keyword || keyword.trim() === "") return;

      const keywordTrimmed = keyword.trim();
      // 移除重复项
      let history = searchHistory.value.filter((item) => item !== keywordTrimmed);
      // 添加到开头
      history.unshift(keywordTrimmed);
      // 限制数量
      history = history.slice(0, MAX_HISTORY_COUNT);
      searchHistory.value = history;

      try {
        uni.setStorageSync(SEARCH_HISTORY_KEY, history);
      } catch (error) {
        console.error("保存搜索历史失败:", error);
      }
    };

    // 清除搜索历史
    const handleClearHistory = () => {
      uni.showModal({
        title: "提示",
        content: "确定要清除搜索历史吗？",
        success: (res) => {
          if (res.confirm) {
            searchHistory.value = [];
            try {
              uni.removeStorageSync(SEARCH_HISTORY_KEY);
            } catch (error) {
              console.error("清除搜索历史失败:", error);
            }
          }
        },
      });
    };

    // 点击历史记录
    const handleHistoryClick = (keyword: string) => {
      searchKeyword.value = keyword;
      handleSearch();
    };

    // 输入处理
    const handleInput = (e: any) => {
      searchKeyword.value = e.detail.value;
    };

    // 加载全部商品
    const loadAllProducts = async (page: number = 0, isNewLoad: boolean = false) => {
      if (loading.value || (!hasMore.value && !isNewLoad)) return;

      loading.value = true;
      try {
        const offset = page * pageSize.value;
        const results = await getProducts({
          limit: pageSize.value,
          offset: offset,
          order_by: [{ created_at: "desc" }],
        });

        if (isNewLoad) {
          allProducts.value = results;
        } else {
          allProducts.value = [...allProducts.value, ...results];
        }

        // 判断是否还有更多
        hasMore.value = results.length >= pageSize.value;

        if (results.length > 0) {
          currentPage.value = page;
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

    // 执行搜索
    const handleSearch = async () => {
      const keyword = searchKeyword.value.trim();
      if (!keyword) {
        // 如果关键词为空，显示全部商品
        hasSearched.value = false;
        searchResults.value = [];
        currentPage.value = 0;
        hasMore.value = true;
        await loadAllProducts(0, true);
        return;
      }

      // 保存搜索历史
      saveSearchHistory(keyword);

      // 重置状态
      searchResults.value = [];
      currentPage.value = 0;
      hasMore.value = true;
      hasSearched.value = true;

      // 执行搜索
      await loadSearchResults(keyword, 0, true);
    };

    // 加载搜索结果
    const loadSearchResults = async (keyword: string, page: number, isNewSearch: boolean = false) => {
      if (loading.value || (!hasMore.value && !isNewSearch)) return;

      loading.value = true;
      try {
        const offset = page * pageSize.value;
        const results = await searchProducts(keyword, pageSize.value, offset);

        if (isNewSearch) {
          searchResults.value = results;
        } else {
          searchResults.value = [...searchResults.value, ...results];
        }

        // 判断是否还有更多
        hasMore.value = results.length >= pageSize.value;

        if (results.length > 0) {
          currentPage.value = page;
        }
      } catch (error) {
        console.error("搜索失败:", error);
        uni.showToast({
          title: "搜索失败",
          icon: "none",
        });
      } finally {
        loading.value = false;
      }
    };

    // 加载更多
    const handleLoadMore = () => {
      if (loading.value || !hasMore.value) return;
      
      if (hasSearched.value) {
        // 加载更多搜索结果
        const keyword = searchKeyword.value.trim();
        if (keyword) {
          loadSearchResults(keyword, currentPage.value + 1, false);
        }
      } else {
        // 加载更多全部商品
        loadAllProducts(currentPage.value + 1, false);
      }
    };

    // 点击商品
    const handleProductClick = (product: Products) => {
      uni.navigateTo({
        url: `/pages/product/detail?id=${product.id}`,
      });
    };

    // 取消搜索
    const handleCancel = () => {
      uni.navigateBack();
    };

    // 显示的商品列表（搜索时显示搜索结果，否则显示全部商品）
    const displayProducts = computed(() => {
      return hasSearched.value ? searchResults.value : allProducts.value;
    });

    // 双列布局：左列商品
    const leftColumnProducts = computed(() => {
      return displayProducts.value.filter((_, index) => index % 2 === 0);
    });

    // 双列布局：右列商品
    const rightColumnProducts = computed(() => {
      return displayProducts.value.filter((_, index) => index % 2 === 1);
    });

    onLoad((options: any) => {
      // 如果从其他页面传入关键词，直接搜索
      if (options.keyword) {
        searchKeyword.value = decodeURIComponent(options.keyword);
        handleSearch();
      } else {
        loadSearchHistory();
        // 没有关键词时，加载全部商品
        loadAllProducts(0, true);
      }
    });

    return {
      searchKeyword,
      hasSearched,
      loading,
      hasMore,
      searchHistory,
      displayProducts,
      leftColumnProducts,
      rightColumnProducts,
      handleInput,
      handleSearch,
      handleLoadMore,
      handleProductClick,
      handleCancel,
      handleClearHistory,
      handleHistoryClick,
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
  display: flex;
  align-items: center;
  background-color: #fff;
  padding: 20rpx 30rpx;
  border-bottom: 1rpx solid #eee;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 10;
}

.search-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #f5f5f5 0%, #f0f0f0 100%);
  border-radius: 50rpx;
  padding: 0 30rpx;
  margin-right: 20rpx;
  box-shadow: inset 0 2rpx 4rpx rgba(0, 0, 0, 0.05);
  min-height: 80rpx;
}

.search-input {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 30rpx;
  color: #333;
}

.search-icon {
  font-size: 36rpx;
  color: #999;
  margin-left: 10rpx;
  padding: 10rpx;
  cursor: pointer;
  flex-shrink: 0;
}

.cancel-btn {
  font-size: 30rpx;
  color: #666;
  padding: 10rpx 16rpx;
  font-weight: 500;
  min-width: 80rpx;
  text-align: center;
  flex-shrink: 0;
}

/* 搜索历史 */
.search-history-section {
  padding: 30rpx;
  background-color: #fff;
  margin-top: 20rpx;
  border-radius: 20rpx 20rpx 0 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.clear-btn {
  font-size: 26rpx;
  color: #999;
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  transition: all 0.2s;
}

.clear-btn:active {
  background-color: #f5f5f5;
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.history-tag {
  padding: 14rpx 28rpx;
  background: linear-gradient(135deg, #f8f8f8 0%, #f0f0f0 100%);
  border-radius: 50rpx;
  font-size: 26rpx;
  color: #333;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.05);
  transition: all 0.2s;
}

.history-tag:active {
  transform: scale(0.98);
  background: linear-gradient(135deg, #f0f0f0 0%, #e8e8e8 100%);
}

/* 搜索结果 */
.search-results {
  flex: 1;
  height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.products-container {
  display: flex;
  padding: 20rpx;
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
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
}

.product-item:active {
  transform: scale(0.98);
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.product-image {
  width: 100%;
  height: 300rpx;
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
}

.product-info {
  padding: 20rpx;
}

.product-name {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
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
  font-size: 24rpx;
  color: #999;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 200rpx 0;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
  opacity: 0.3;
}

.empty-text {
  font-size: 32rpx;
  color: #666;
  margin-bottom: 16rpx;
  font-weight: 500;
}

.empty-tip {
  font-size: 26rpx;
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
