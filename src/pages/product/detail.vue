<template>
  <view class="page">
    <!-- 悬浮返回按钮 -->
    <view class="back-button-wrapper" @click="handleGoBack">
      <view class="back-button">
        <text class="back-icon">‹</text>
      </view>
    </view>
    
    <scroll-view class="scroll-view" scroll-y v-if="product">
      <!-- 产品图片和视频轮播 -->
      <view class="product-image-section">
        <swiper 
          class="product-swiper" 
          :indicator-dots="false" 
          :autoplay="false" 
          :circular="true" 
          @change="handleSwiperChange"
        >
          <swiper-item v-for="(media, index) in productMedia" :key="media.id || index">
            <!-- 媒体分类标签 -->
            <view 
              class="media-category-badge" 
              :class="{ 'badge-up': media.type === 'video' }"
              v-if="media.mediaCategory"
            >
              <text class="category-text">{{ getMediaCategoryText(media.mediaCategory) }}</text>
            </view>
            <!-- 图片 -->
            <image 
              v-if="media.type === 'image'" 
              class="product-image" 
              :src="media.url" 
              mode="aspectFill" 
            />
            <!-- 视频 -->
            <view 
              v-else-if="media.type === 'video'" 
              class="video-wrapper"
              @click="handleVideoWrapperClick(index)"
            >
              <video
                :id="`video-${index}`"
                class="product-video"
                :src="media.url"
                :poster="media.poster"
                :controls="currentVideoIndex === index"
                :show-center-play-btn="currentVideoIndex !== index || !isVideoPlaying"
                :enable-play-gesture="true"
                :show-play-btn="currentVideoIndex !== index || !isVideoPlaying"
                :enable-fullscreen="true"
                :show-fullscreen-btn="currentVideoIndex === index"
                object-fit="contain"
                :autoplay="false"
                @play="handleVideoPlay(index)"
                @pause="handleVideoPause(index)"
                @ended="handleVideoEnded(index)"
                @error="handleVideoError(index)"
              ></video>
              <!-- 视频加载失败提示 -->
              <view 
                v-if="videoErrors.has(index)"
                class="video-error-overlay"
              >
                <view class="error-content">
                  <text class="error-icon">⚠️</text>
                  <text class="error-text">视频加载失败</text>
                </view>
              </view>
              <!-- 播放按钮覆盖层：只在未播放或不是当前视频时显示，且视频未加载失败 -->
              <view 
                v-else-if="!(currentVideoIndex === index && isVideoPlaying)"
                class="video-play-overlay" 
                @click.stop="handleVideoClick(index)"
              >
                <view class="play-button">
                  <text class="play-icon">▶</text>
                </view>
              </view>
            </view>
          </swiper-item>
        </swiper>
        <view 
          class="image-indicator" 
          :class="{ 'indicator-up': isCurrentMediaVideo }"
          v-if="productMedia.length > 1"
        >
          <text>{{ currentImageIndex + 1 }}/{{ productMedia.length }}</text>
        </view>
      </view>

      <!-- 产品价格和基本信息 -->
      <view class="product-price-section">
        <view class="price-header">
          <view class="price-left">
            <text class="product-price">{{ product.unit_price || 0 }}</text>
            <text class="product-unit" v-if="product.unit">元/{{ product.unit }}</text>
            <text class="product-grade" v-if="mediaTypeLabel">{{ mediaTypeLabel }}</text>
          </view>
          <view class="price-right">
            <text class="product-stock">剩余: {{ product.unit_stock || 0 }}{{ product.unit || "件" }}</text>
            <button class="share-button" open-type="share">
              <text class="share-icon-symbol">↗</text>
              <text class="share-text">分享</text>
            </button>
          </view>
        </view>
        <view class="product-name-row">
          <text class="product-name-full">{{ product.name || "" }}</text>
          <view class="product-status-badge off-shelf" v-if="product.is_off_shelf">
            <text class="badge-text">已下架</text>
          </view>
        </view>
        <view class="product-status-tip" v-if="product.is_off_shelf">
          <text class="tip-text">该商品已下架，暂时无法购买</text>
        </view>
      </view>

      <!-- 产品详细指标 -->
      <view class="product-metrics-section" v-if="hasMetrics">
        <view class="metrics-grid">
          <view class="metric-item" v-if="(product as any).gross_weight && retailUnit">
            <text class="metric-label">毛重</text>
            <text class="metric-value">{{ (product as any).gross_weight }}{{ retailUnit }}</text>
          </view>
          <view class="metric-item" v-if="(product as any).net_weight && retailUnit">
            <text class="metric-label">净重</text>
            <text class="metric-value">{{ (product as any).net_weight }}{{ retailUnit }}</text>
          </view>
          <view class="metric-item" v-if="calculatedNetPrice && retailUnit">
            <text class="metric-label">净果价</text>
            <text class="metric-value net-price-value">{{ calculatedNetPrice }}元/{{ retailUnit }}</text>
          </view>
        </view>
      </view>

      <!-- 店铺名 -->
      <view class="store-section" v-if="product.batch?.farmer?.user">
        <text class="store-name">店铺名: {{ product.batch.farmer.user.nickname || product.batch.farmer.user.phone }}</text>
      </view>


      <!-- 商品描述 -->
      <view class="product-description-section" v-if="(product as any).detail_html">
        <view class="section-header">
          <text class="section-title">商品描述</text>
        </view>
        <view class="description-content">
          <rich-text :nodes="(product as any).detail_html"></rich-text>
        </view>
      </view>

      <!-- 规格参数 -->
      <view class="specs-section">
        <view class="section-header">
          <text class="section-title">规格参数</text>
        </view>
        <view class="specs-content">
          <view class="spec-item" v-if="product.category">
            <text class="spec-label">分类</text>
            <text class="spec-value">{{ getCategoryPath() }}</text>
          </view>
          <view class="spec-item" v-if="product.unit">
            <text class="spec-label">包装</text>
            <text class="spec-value">{{ product.unit }}</text>
          </view>
          <view class="spec-item" v-if="product.origin?.category_name">
            <text class="spec-label">产地分类</text>
            <text class="spec-value">{{ product.origin.category_name }}</text>
          </view>
          <view class="spec-item" v-if="product.origin?.name">
            <text class="spec-label">产地名称</text>
            <text class="spec-value">{{ product.origin.name }}</text>
          </view>
        </view>
      </view>

      <!-- 售后须知 -->
      <view class="after-sales-section" v-if="(product as any).after_sales_html">
        <view class="section-header">
          <text class="section-title">售后须知</text>
        </view>
        <view class="after-sales-content">
          <rich-text :nodes="(product as any).after_sales_html"></rich-text>
        </view>
      </view>

      <!-- 行情预测 -->
      <view class="market-forecast-section" v-if="product">
        <view class="section-header">
          <text class="section-title">行情预测</text>
        </view>
        <view class="forecast-content" v-if="priceForecast">
          <!-- 趋势预测 -->
          <view class="forecast-item">
            <view class="forecast-header">
              <text class="forecast-label">未来3~5天行情预测</text>
              <view class="trend-badge" :class="trendClass">
                <text class="trend-text">{{ priceForecast.forecast }}</text>
              </view>
            </view>
            <view class="forecast-details" v-if="priceForecast && priceForecast.currentPrice > 0">
              <view class="forecast-detail-item" v-if="priceForecast.confidence > 0">
                <text class="detail-label">置信度:</text>
                <text class="detail-value">{{ (priceForecast.confidence * 100).toFixed(0) }}%</text>
              </view>
              <view class="forecast-detail-item">
                <text class="detail-label">当前价格:</text>
                <text class="detail-value">¥{{ priceForecast.currentPrice.toFixed(2) }}</text>
              </view>
              <view class="forecast-detail-item" v-if="priceForecast.predictedPrice > 0">
                <text class="detail-label">预测价格:</text>
                <text class="detail-value">¥{{ priceForecast.predictedPrice.toFixed(2) }}</text>
              </view>
              <view class="forecast-detail-item" v-if="priceForecast.priceRange && priceForecast.priceRange.min > 0 && priceForecast.priceRange.max > 0">
                <text class="detail-label">价格区间:</text>
                <text class="detail-value">¥{{ priceForecast.priceRange.min.toFixed(2) }} - ¥{{ priceForecast.priceRange.max.toFixed(2) }}</text>
              </view>
            </view>
            <view class="forecast-empty" v-else-if="priceForecast">
              <text class="empty-text">{{ priceForecast.forecast || '暂无预测数据' }}</text>
            </view>
          </view>
          
          <!-- 过去7日单价图表 -->
          <view class="forecast-item" v-if="priceChartData && priceChartData.length > 0">
            <text class="forecast-label">过去7日单价</text>
            <PriceLineChart 
              :data="priceChartData" 
              :unit="product.unit || '件'"
              :use-mock-data="false"
              canvas-id="priceChart"
            />
          </view>
        </view>
        <view class="forecast-loading" v-else-if="forecastLoading">
          <text class="loading-text">加载行情数据中...</text>
        </view>
      </view>

      <!-- 价格变动历史 -->
      <view class="price-history-section" v-if="product">
        <view class="section-header">
          <text class="section-title">价格变动历史</text>
        </view>
        <view class="history-content" v-if="priceHistory && priceHistory.length > 0">
          <view 
            class="history-item" 
            v-for="(item, index) in priceHistory" 
            :key="item.id"
          >
            <view class="history-left">
              <view class="history-price">¥{{ item.unit_price.toFixed(2) }}</view>
              <view class="history-time">{{ formatFullDate(item.recorded_at) }}</view>
            </view>
            <view class="history-right">
              <view class="history-change-type" :class="getChangeTypeClass(item.change_type)">
                {{ getChangeTypeText(item.change_type) }}
              </view>
              <view class="history-change" v-if="index < priceHistory.length - 1">
                <text 
                  class="change-arrow"
                  :class="getChangeDirectionClass(item.unit_price, priceHistory[index + 1].unit_price)"
                >
                  {{ getChangeDirection(item.unit_price, priceHistory[index + 1].unit_price) }}
                </text>
                <text class="change-amount">
                  {{ getChangeAmount(item.unit_price, priceHistory[index + 1].unit_price) }}
                </text>
              </view>
            </view>
          </view>
        </view>
        <view class="history-empty" v-else-if="!historyLoading">
          <text class="empty-text">暂无价格变动记录</text>
        </view>
        <view class="history-loading" v-else>
          <text class="loading-text">加载中...</text>
        </view>
      </view>

      <!-- 底部留白 -->
      <view class="bottom-spacer" style="height: 140rpx;"></view>
    </scroll-view>

    <!-- 加载中 -->
    <view class="loading-section" v-if="loading">
      <text>加载中...</text>
    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar-wrapper" v-if="product">
      <view class="bottom-bar">
        <view class="bottom-icons">
          <view class="icon-item" @click="handleGoStore">
            <view class="icon-button icon-button-store">
              <image class="icon-image" src="/static/product/product-home.png" mode="aspectFit" />
            </view>
            <text class="icon-text">店铺</text>
          </view>
          <view class="icon-item" @click="handleGoCart">
            <view class="icon-button icon-button-cart">
              <image class="icon-image" src="/static/product/product-cart.png" mode="aspectFit" />
              <view class="cart-badge" v-if="cartItemCount > 0">
                <text class="cart-badge-text">{{ cartItemCount }}</text>
              </view>
            </view>
            <text class="icon-text">购物车</text>
          </view>
        </view>
        <view 
          class="add-cart-btn" 
          :class="{ disabled: product.is_off_shelf || product.is_deleted }"
          @click="handleAddToCart"
        >
          <text class="btn-text">{{ product.is_off_shelf || product.is_deleted ? '商品已下架' : '加入购物车' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { ref, computed, nextTick } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { 
  getProductById, 
  getProductPriceForecast, 
  getAllProductPriceHistory,
  type PriceForecast,
  type PriceHistoryItem
} from "@/api/product";
import { addToCart, getCarts } from "@/api/cart";
import { getUserId, isLoggedIn } from "@/api/auth";
import type { Products } from "@/types/graphql";
import PriceLineChart, { type PriceDataPoint } from "@/components/PriceLineChart.vue";

// 声明全局 getCurrentPages
declare function getCurrentPages(): any[];

export default {
  components: {
    PriceLineChart,
  },
  
  // 小程序分享配置 - 必须在页面配置中定义（不能放在 setup 中）
  onShareAppMessage(res: any) {
    console.log("=== 商品分享触发 ===");
    console.log("分享来源:", res.from);
    console.log("分享目标:", res.target);
    
    // 获取当前页面的商品信息
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const options = currentPage.options || {};
    const productId = options.id || "";
    
    // 尝试从页面实例获取商品信息（如果页面实例有存储）
    const pageData = (currentPage as any).$vm || currentPage;
    const product = pageData?.product || null;
    
    console.log("分享商品ID:", productId);
    console.log("商品信息:", product);
    
    const sharePath = `/pages/product/detail?id=${productId}`;
    
    // 构建分享标题
    let shareTitle = "商品详情";
    let imageUrl = "";
    
    if (product && product.id) {
      const price = product.unit_price || 0;
      const unit = product.unit || "";
      shareTitle = product.name 
        ? `${product.name} - ¥${price}${unit ? '/' + unit : ''}`
        : "商品详情";
      imageUrl = product.image_url || "";
    } else if (productId) {
      shareTitle = `商品${productId}详情`;
    }
    
    const shareConfig: any = {
      title: shareTitle,
      path: sharePath,
    };
    
    // 如果有商品图片，添加图片
    if (imageUrl) {
      shareConfig.imageUrl = imageUrl;
    }
    
    console.log("分享配置:", shareConfig);
    console.log("================");
    
    return shareConfig;
  },
  
  setup() {
    const product = ref<Products | null>(null);
    const productId = ref<string | number>("");
    const loading = ref(false);
    const currentImageIndex = ref(0);
    const currentVideoIndex = ref(-1);
    const isVideoPlaying = ref(false);
    const videoErrors = ref<Set<number>>(new Set()); // 记录加载失败的视频索引
    const priceForecast = ref<PriceForecast | null>(null);
    const forecastLoading = ref(false);
    const priceHistory = ref<PriceHistoryItem[]>([]);
    const historyLoading = ref(false);
    const cartItemCount = ref(0);

    interface MediaItem {
      id: string | number;
      type: "image" | "video";
      url: string;
      poster?: string;
      mediaCategory?: string; // 媒体分类：picking/packing/loading/departure
    }

    // 产品媒体列表（优先显示批次媒体文件，如果没有则显示主图）
    const productMedia = computed(() => {
      const mediaList: MediaItem[] = [];
      
      // 优先添加批次媒体文件（图片和视频）
      if (product.value?.batch?.batch_media_files && Array.isArray(product.value.batch.batch_media_files) && product.value.batch.batch_media_files.length > 0) {
        product.value.batch.batch_media_files.forEach((media: any) => {
          const fileUrl = media.file_url || media.fileUrl;
          const mediaCategory = media.media_category || media.mediaCategory;
          const mediaId = media.id;
          
          if (fileUrl && mediaId) {
            // 使用 id 而不是 url 来去重，因为不同媒体文件可能有相同的 URL
            const existingMedia = mediaList.find((m) => m.id === mediaId);
            if (!existingMedia) {
              const mediaItem: MediaItem = {
                id: mediaId,
                type: (media.file_type === "image" || media.fileType === "image") ? "image" : "video",
                url: fileUrl,
                mediaCategory: mediaCategory || undefined, // 添加媒体分类
              };
              // 如果是视频，添加封面图
              if (mediaItem.type === "video" && product.value?.image_url) {
                mediaItem.poster = product.value.image_url;
              }
              mediaList.push(mediaItem);
            }
          }
        });
      }
      
      // 如果没有批次媒体文件，则添加主图作为后备
      if (mediaList.length === 0 && product.value?.image_url) {
        mediaList.push({
          id: "main-image",
          type: "image",
          url: product.value.image_url,
        });
      }
      
      return mediaList.length > 0 ? mediaList : [{ id: "placeholder", type: "image" as const, url: "" }];
    });

    // 媒体类型标签：根据 batch_media_files 中是否有视频或图片显示相应标签
    const mediaTypeLabel = computed(() => {
      // 直接检查 batch_media_files
      if (!product.value?.batch?.batch_media_files || !Array.isArray(product.value.batch.batch_media_files) || product.value.batch.batch_media_files.length === 0) {
        return null;
      }
      
      const batchMediaFiles = product.value.batch.batch_media_files;
      
      // 检查是否有视频
      const hasVideo = batchMediaFiles.some((media: any) => {
        const fileType = media.file_type || media.fileType;
        const fileUrl = media.file_url || media.fileUrl;
        return (fileType === "video") && fileUrl;
      });
      
      if (hasVideo) {
        return "实拍视频";
      }
      
      // 检查是否有图片
      const hasImage = batchMediaFiles.some((media: any) => {
        const fileType = media.file_type || media.fileType;
        const fileUrl = media.file_url || media.fileUrl;
        return (fileType === "image") && fileUrl;
      });
      
      if (hasImage) {
        return "实拍图片";
      }
      
      // 既没有视频也没有图片，不显示标签
      return null;
    });

    // 判断当前媒体是否是视频
    const isCurrentMediaVideo = computed(() => {
      if (currentImageIndex.value < 0 || currentImageIndex.value >= productMedia.value.length) {
        return false;
      }
      const currentMedia = productMedia.value[currentImageIndex.value];
      return currentMedia.type === "video";
    });

    // 获取分类路径（显示 category_name/name）
    const getCategoryPath = () => {
      if (!product.value?.category) return "";
      const categoryName = product.value.category.category_name || "";
      const name = product.value.category.name || "";
      if (categoryName && name) {
        return `${categoryName}/${name}`;
      } else if (categoryName) {
        return categoryName;
      } else if (name) {
        return name;
      }
      return "";
    };

    // 获取媒体分类的中文文本
    const getMediaCategoryText = (category: string): string => {
      const categoryMap: Record<string, string> = {
        picking: "采摘",
        packing: "打包",
        loading: "装车",
        departure: "发车",
      };
      return categoryMap[category] || category;
    };

    // 轮播图切换
    const handleSwiperChange = (e: any) => {
      const newIndex = e.detail.current;
      const previousMedia = productMedia.value[currentImageIndex.value];
      
      // 如果之前播放的是视频，暂停它
      if (previousMedia && previousMedia.type === "video" && currentVideoIndex.value === currentImageIndex.value) {
        pauseVideo(currentImageIndex.value);
      }
      
      currentImageIndex.value = newIndex;
      currentVideoIndex.value = -1;
      isVideoPlaying.value = false;
    };

    // 视频点击播放
    const handleVideoClick = (index: number) => {
      if (currentVideoIndex.value === index && isVideoPlaying.value) {
        pauseVideo(index);
      } else {
        playVideo(index);
      }
    };

    // 视频容器点击处理：视频播放时点击暂停，暂停时点击继续播放
    const handleVideoWrapperClick = (index: number) => {
      // 如果视频正在播放，点击暂停
      if (currentVideoIndex.value === index && isVideoPlaying.value) {
        pauseVideo(index);
      } 
      // 如果视频已暂停（当前视频但未播放），点击继续播放
      else if (currentVideoIndex.value === index && !isVideoPlaying.value) {
        playVideo(index);
      }
      // 如果视频未开始播放，点击播放（通过播放按钮覆盖层处理）
      // 这里不做处理，让播放按钮覆盖层的点击事件处理
    };

    // 播放视频
    const playVideo = (index: number) => {
      // 暂停其他视频
      if (currentVideoIndex.value >= 0 && currentVideoIndex.value !== index) {
        pauseVideo(currentVideoIndex.value);
      }
      
      currentVideoIndex.value = index;
      isVideoPlaying.value = true;
      
      // 获取视频上下文并播放
      nextTick(() => {
        const videoContext = uni.createVideoContext(`video-${index}`);
        if (videoContext) {
          videoContext.play();
        }
      });
    };

    // 暂停视频
    const pauseVideo = (index: number) => {
      const videoContext = uni.createVideoContext(`video-${index}`);
      videoContext.pause();
      if (currentVideoIndex.value === index) {
        isVideoPlaying.value = false;
      }
    };

    // 视频播放事件
    const handleVideoPlay = (index: number) => {
      currentVideoIndex.value = index;
      isVideoPlaying.value = true;
    };

    // 视频暂停事件
    const handleVideoPause = (index: number) => {
      if (currentVideoIndex.value === index) {
        isVideoPlaying.value = false;
      }
    };

    // 视频结束事件
    const handleVideoEnded = (index: number) => {
      if (currentVideoIndex.value === index) {
        isVideoPlaying.value = false;
        currentVideoIndex.value = -1;
      }
    };

    // 视频加载错误处理
    const handleVideoError = (index: number) => {
      console.error(`视频加载失败，索引: ${index}`);
      videoErrors.value.add(index);
      // 如果当前正在播放的视频出错，停止播放
      if (currentVideoIndex.value === index) {
        isVideoPlaying.value = false;
        currentVideoIndex.value = -1;
      }
      // 静默处理，不显示toast，避免打扰用户
    };

    // 零售单位（用于门店客户参考）
    const retailUnit = computed(() => {
      return (product.value as any)?.retail_unit || null;
    });

    // 计算净果价（包装单价 / 净重，单位：元/零售单位）
    const calculatedNetPrice = computed(() => {
      if (!product.value?.unit_price || !(product.value as any).net_weight) return null;
      const unitPrice = Number(product.value.unit_price);
      const netWeight = Number((product.value as any).net_weight);
      if (netWeight <= 0) return null;
      return (unitPrice / netWeight).toFixed(2);
    });

    // 判断是否有指标数据
    const hasMetrics = computed(() => {
      const p = product.value as any;
      return (calculatedNetPrice.value && retailUnit.value) || (p?.gross_weight && retailUnit.value) || (p?.net_weight && retailUnit.value);
    });

    // 趋势样式类
    const trendClass = computed(() => {
      if (!priceForecast.value) return '';
      return `trend-${priceForecast.value.trend}`;
    });

    // 转换价格历史数据为图表组件需要的格式
    const priceChartData = computed<PriceDataPoint[]>(() => {
      if (!priceForecast.value?.history || priceForecast.value.history.length === 0) {
        return [];
      }
      return priceForecast.value.history.map(item => ({
        date: item.recorded_at,
        price: Number(item.unit_price),
      }));
    });


    // 格式化完整日期时间（精确到秒，支持一天多次变动）
    const formatFullDate = (dateStr: string) => {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    // 获取变动类型文本
    const getChangeTypeText = (changeType?: string) => {
      switch (changeType) {
        case 'create':
          return '创建';
        case 'update':
          return '更新';
        case 'manual':
          return '手动';
        default:
          return '变动';
      }
    };

    // 获取变动类型样式类
    const getChangeTypeClass = (changeType?: string) => {
      switch (changeType) {
        case 'create':
          return 'type-create';
        case 'update':
          return 'type-update';
        case 'manual':
          return 'type-manual';
        default:
          return '';
      }
    };

    // 获取价格变动方向
    const getChangeDirection = (currentPrice: number, previousPrice: number) => {
      if (currentPrice > previousPrice) {
        return '↑';
      } else if (currentPrice < previousPrice) {
        return '↓';
      }
      return '→';
    };

    // 获取价格变动方向样式类
    const getChangeDirectionClass = (currentPrice: number, previousPrice: number) => {
      if (currentPrice > previousPrice) {
        return 'arrow-up';
      } else if (currentPrice < previousPrice) {
        return 'arrow-down';
      }
      return 'arrow-stable';
    };

    // 获取价格变动金额
    const getChangeAmount = (currentPrice: number, previousPrice: number) => {
      const diff = currentPrice - previousPrice;
      const percent = ((diff / previousPrice) * 100).toFixed(1);
      if (diff > 0) {
        return `+¥${diff.toFixed(2)} (+${percent}%)`;
      } else if (diff < 0) {
        return `¥${diff.toFixed(2)} (${percent}%)`;
      }
      return '无变动';
    };

    // 加载价格变动历史
    const loadPriceHistory = async (productId: string | number) => {
      historyLoading.value = true;
      try {
        const history = await getAllProductPriceHistory(productId, 200);
        priceHistory.value = history;
      } catch (error) {
        // 显示错误提示
        uni.showToast({
          title: "加载价格历史失败",
          icon: "none",
          duration: 2000,
        });
      } finally {
        historyLoading.value = false;
      }
    };

    // 加载行情预测数据
    const loadPriceForecast = async (productId: string | number) => {
      forecastLoading.value = true;
      try {
        const forecast = await getProductPriceForecast(productId);
        priceForecast.value = forecast;
      } catch (error) {
        // 不显示错误提示，静默失败
      } finally {
        forecastLoading.value = false;
      }
    };


    // 更新页面实例数据（用于分享功能）
    const updatePageInstance = () => {
      const pages = getCurrentPages();
      if (pages.length > 0) {
        const pageInstance = pages[pages.length - 1];
        if (pageInstance) {
          (pageInstance as any).product = product.value;
          (pageInstance as any).productId = productId.value;
        }
      }
    };

    // 加载产品详情
    const loadProductDetail = async (id: string | number) => {
      productId.value = id;
      loading.value = true;
      try {
        const result = await getProductById(id);
        product.value = result;
        // 更新页面实例数据
        updatePageInstance();
        // 同时加载行情预测数据、价格变动历史和购物车数量
        if (result) {
          loadPriceForecast(id);
          loadPriceHistory(id);
          loadCartCount();
        }
      } catch (error) {
        uni.showToast({
          title: "加载失败",
          icon: "none",
        });
      } finally {
        loading.value = false;
      }
    };

    // 加载购物车数量
    const loadCartCount = async () => {
      // 如果未登录，不加载购物车数量
      if (!isLoggedIn()) {
        cartItemCount.value = 0;
        return;
      }

      try {
        const userId = getUserId();
        if (!userId) {
          cartItemCount.value = 0;
          return;
        }
        const carts = await getCarts(userId);
        // 计算购物车中不同商品种类的数量
        cartItemCount.value = carts.length;
      } catch (error) {
        // 静默失败，不影响页面显示
        cartItemCount.value = 0;
      }
    };

    // 加入购物车
    const handleAddToCart = async () => {
      if (!product.value) return;

      // 检查登录状态
      if (!isLoggedIn()) {
        uni.showModal({
          title: "提示",
          content: "请先登录",
          success: (res) => {
            if (res.confirm) {
              uni.navigateTo({
                url: "/pages/login/index",
              });
            }
          },
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

      try {
        await addToCart(userId, product.value.id, 1);
        // 更新购物车数量
        await loadCartCount();
        uni.showToast({
          title: "已加入购物车",
          icon: "success",
        });
      } catch (error) {
        uni.showToast({
          title: "加入购物车失败",
          icon: "none",
        });
      }
    };

    // 去店铺
    const handleGoStore = () => {
      uni.switchTab({
        url: "/pages/index/index",
      });
    };

    // 去购物车
    const handleGoCart = () => {
      uni.switchTab({
        url: "/pages/cart/index",
      });
    };

    // 返回上一页
    const handleGoBack = () => {
      uni.navigateBack({
        delta: 1,
      });
    };

    onLoad((options: any) => {
      const id = options.id;
      if (id) {
        // 先更新页面实例（设置 productId）
        updatePageInstance();
        loadProductDetail(id);
      } else {
        uni.showToast({
          title: "产品ID缺失",
          icon: "none",
        });
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      }
    });

    return {
      product,
      loading,
      currentImageIndex,
      mediaTypeLabel,
      handleSwiperChange,
      productMedia,
      currentVideoIndex,
      isVideoPlaying,
      isCurrentMediaVideo,
      cartItemCount,
      hasMetrics,
      calculatedNetPrice,
      retailUnit,
      getCategoryPath,
      handleVideoClick,
      handleVideoPlay,
      handleVideoPause,
      handleVideoEnded,
      handleVideoError,
      videoErrors,
      handleAddToCart,
      handleGoBack,
      handleGoStore,
      handleGoCart,
      priceForecast,
      forecastLoading,
      trendClass,
      priceHistory,
      historyLoading,
      priceChartData,
      formatFullDate,
      getChangeTypeText,
      getChangeTypeClass,
      getChangeDirection,
      getChangeDirectionClass,
      getChangeAmount,
      getMediaCategoryText,
      handleVideoWrapperClick,
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
  position: relative;
}

.scroll-view {
  width: 100%;
  height: calc(100vh - 100rpx);
}

.bottom-spacer {
  height: 10rpx;
}

/* 悬浮返回按钮 */
.back-button-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  padding-top: calc(env(safe-area-inset-top) + 88rpx);
  padding-left: 20rpx;
}

.back-button {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10rpx);
}

.back-icon {
  font-size: 50rpx;
  color: #fff;
  font-weight: bold;
  line-height: 1;
  margin-left: -4rpx;
}

/* 产品图片轮播 */
.product-image-section {
  position: relative;
  width: 100%;
  height: 750rpx;
  background-color: #fff;
}

.product-swiper {
  width: 100%;
  height: 100%;
}

.product-swiper swiper-item {
  position: relative;
  width: 100%;
  height: 100%;
}

.product-image {
  width: 100%;
  height: 100%;
}

/* 视频相关样式 */
.video-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #000;
  overflow: hidden;
}

.product-video {
  width: 100%;
  height: 100%;
  z-index: 100;
  position: relative;
  display: block;
  background-color: #000;
}

.video-play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 101;
  pointer-events: none;
}

.video-play-overlay .play-button {
  pointer-events: auto;
}

/* 视频加载错误提示 */
.video-error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 102;
  pointer-events: none;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 30rpx;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 16rpx;
}

.error-icon {
  font-size: 60rpx;
  line-height: 1;
}

.error-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1;
}

.play-button {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid rgba(255, 255, 255, 0.8);
}

.play-icon {
  font-size: 50rpx;
  color: #333;
  margin-left: 8rpx;
}

.image-indicator {
  position: absolute;
  bottom: 20rpx;
  right: 20rpx;
  background-color: rgba(0, 0, 0, 0.5);
  color: #fff;
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
  z-index: 100;
}

/* 视频播放时，将分页指示器往上移，避免遮挡全屏按钮 */
.image-indicator.indicator-up {
  bottom: 100rpx;
}

/* 媒体分类标签 */
.media-category-badge {
  position: absolute;
  bottom: 20rpx;
  left: 20rpx;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10rpx);
  padding: 8rpx 16rpx;
  border-radius: 20rpx;
  z-index: 200;
  pointer-events: none;
}

/* 视频播放时，将媒体分类标签往上移，避免遮挡进度条 */
.media-category-badge.badge-up {
  bottom: 100rpx;
}

.category-text {
  font-size: 24rpx;
  color: #fff;
  font-weight: 500;
  line-height: 1;
}

/* 产品价格和基本信息 */
.product-price-section {
  background-color: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.price-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20rpx;
}

.price-left {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12rpx;
}

.product-price {
  font-size: 56rpx;
  font-weight: bold;
  color: #ff3b30;
}

.product-unit {
  font-size: 28rpx;
  color: #666;
}

.product-grade {
  padding: 4rpx 12rpx;
  background-color: transparent;
  color: #ff9500;
  border: 1rpx solid #ff9500;
  border-radius: 4rpx;
  font-size: 24rpx;
}

.price-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12rpx;
}

.product-stock {
  font-size: 28rpx;
  color: #666;
}

.share-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  background: linear-gradient(135deg, #ff9500 0%, #ff6b00 100%);
  border-radius: 40rpx;
  box-shadow: 0 4rpx 12rpx rgba(255, 149, 0, 0.3);
  transition: all 0.3s ease;
  border: none;
  line-height: 1;
  font-size: 0;
}

.share-button::after {
  border: none;
}

.share-button:active {
  transform: scale(0.95);
  box-shadow: 0 2rpx 8rpx rgba(255, 149, 0, 0.4);
}

.share-icon-symbol {
  font-size: 32rpx;
  font-weight: bold;
  line-height: 1;
}

.share-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 500;
}

.product-name-row {
  margin-top: 12rpx;
}

.product-name-full {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
  line-height: 1.5;
}

/* 产品详细指标 */
.product-metrics-section {
  background-color: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.metrics-grid {
  display: flex;
  justify-content: space-between;
}

.metric-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.metric-label {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 8rpx;
}

.metric-value {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

/* 净果价颜色凸显 */
.net-price-value {
  color: #ff3b30;
  font-weight: bold;
  font-size: 28rpx;
}

/* 店铺名 */
.store-section {
  background-color: #fff;
  padding: 20rpx 30rpx;
  margin-bottom: 20rpx;
}

.store-name {
  font-size: 26rpx;
  color: #666;
}

/* 批次媒体文件 */
.batch-media-section {
  background-color: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.section-header {
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.media-files {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.media-item {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background-color: #f5f5f5;
}

.media-thumbnail {
  width: 100%;
  height: 100%;
}

.media-video {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #333;
}

.video-icon {
  font-size: 60rpx;
  color: #fff;
}

.media-type {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 22rpx;
  text-align: center;
  padding: 8rpx;
}

/* 商品描述 */
.product-description-section {
  background-color: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.description-block {
  margin-bottom: 30rpx;
}

.description-block:last-child {
  margin-bottom: 0;
}

.block-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 16rpx;
  display: block;
}

.description-content {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.desc-item {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

.desc-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.8;
}

/* 规格参数 */
.specs-section {
  background-color: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.specs-content {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.spec-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.spec-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.spec-label {
  font-size: 26rpx;
  color: #999;
  min-width: 160rpx;
}

.spec-value {
  font-size: 26rpx;
  color: #333;
  flex: 1;
  text-align: right;
}

/* 售后须知 */
.after-sales-section {
  background-color: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.after-sales-content {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.after-sales-item {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.after-sales-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.after-sales-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

/* 行情预测 */
.market-forecast-section {
  background-color: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.forecast-content {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.forecast-item {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.forecast-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.forecast-label {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.trend-badge {
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
}

.trend-rising {
  background-color: #fff0e6;
  color: #ff6600;
}

.trend-falling {
  background-color: #e6f7ff;
  color: #1890ff;
}

.trend-stable {
  background-color: #f0f0f0;
  color: #666;
}

.trend-text {
  font-size: 24rpx;
  font-weight: 500;
}

.forecast-details {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 20rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
}

.forecast-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  font-size: 26rpx;
  color: #666;
}

.detail-value {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.forecast-empty {
  padding: 20rpx;
  text-align: center;
}

.empty-text {
  font-size: 26rpx;
  color: #999;
}

.forecast-loading {
  padding: 40rpx;
  text-align: center;
}

.loading-text {
  font-size: 26rpx;
  color: #999;
}

.price-chart {
  width: 100%;
  height: 300rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-top: 12rpx;
  position: relative;
}

.chart-canvas {
  width: 100%;
  height: 100%;
  display: block;
}



/* 加载中 */
.loading-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #999;
}

/* 底部操作栏 */
.bottom-bar-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 0 20rpx;
  padding-bottom: env(safe-area-inset-bottom);
  background-color: transparent;
}

.bottom-bar {
  background-color: #fff;
  padding: 20rpx 30rpx;
  border-radius: 30rpx 30rpx 0 0;
  display: flex;
  align-items: center;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.bottom-icons {
  display: flex;
  gap: 30rpx;
  margin-right: 30rpx;
}

.icon-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 60rpx;
}

.icon-button {
  width: 60rpx;
  height: 60rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6rpx;
  position: relative;
}

.icon-button-store {
  background-color: #f5f5f5;
}

.icon-button-cart {
  background-color: #f5f5f5;
}

.icon-image {
  width: 32rpx;
  height: 32rpx;
}

.icon-text {
  font-size: 20rpx;
  color: #666;
}

/* 购物车数量标识 */
.cart-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  min-width: 32rpx;
  height: 32rpx;
  background-color: #ff3b30;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
  border: 2rpx solid #fff;
  box-shadow: 0 2rpx 8rpx rgba(255, 59, 48, 0.3);
}

.cart-badge-text {
  font-size: 20rpx;
  color: #fff;
  font-weight: bold;
  line-height: 1;
}

.add-cart-btn {
  flex: 1;
  padding: 24rpx 0;
  background: linear-gradient(135deg, #ff9500 0%, #ff6b00 100%);
  border-radius: 40rpx;
  text-align: center;
  box-shadow: 0 4rpx 12rpx rgba(255, 149, 0, 0.3);
}

.add-cart-btn.disabled {
  background: #ccc;
  box-shadow: none;
  pointer-events: none;
}

.btn-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #fff;
}

.product-status-badge {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.product-status-badge.off-shelf {
  background-color: #fff3cd;
}

.product-status-badge.off-shelf .badge-text {
  color: #856404;
  font-weight: 500;
}

.product-status-tip {
  margin-top: 12rpx;
  padding: 12rpx;
  background-color: #fff3cd;
  border-radius: 8rpx;
}

.tip-text {
  font-size: 24rpx;
  color: #856404;
}

/* 价格变动历史 */
.price-history-section {
  background-color: #fff;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.history-content {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.history-item:last-child {
  border-bottom: none;
}

.history-left {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  flex: 1;
}

.history-price {
  font-size: 32rpx;
  font-weight: bold;
  color: #ff3b30;
}

.history-time {
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
}

.history-reason {
  margin-top: 8rpx;
}

.reason-text {
  font-size: 22rpx;
  color: #999;
  background-color: #f5f5f5;
  padding: 4rpx 8rpx;
  border-radius: 4rpx;
}

.history-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.history-change-type {
  padding: 4rpx 12rpx;
  border-radius: 4rpx;
  font-size: 22rpx;
}

.type-create {
  background-color: #e6f7ff;
  color: #1890ff;
}

.type-update {
  background-color: #fff0e6;
  color: #ff6600;
}

.type-manual {
  background-color: #f0f0f0;
  color: #666;
}

.history-change {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
}

.change-arrow {
  font-size: 24rpx;
  font-weight: bold;
}

.arrow-up {
  color: #ff3b30;
}

.arrow-down {
  color: #34c759;
}

.arrow-stable {
  color: #999;
}

.change-amount {
  font-size: 24rpx;
  color: #666;
}

.history-empty {
  padding: 60rpx 20rpx;
  text-align: center;
}

.history-loading {
  padding: 40rpx;
  text-align: center;
}
</style>
