<template>
  <view class="page">
    <view class="header">
      <text class="header-title">从批次生成商品</text>
    </view>

    <scroll-view class="scroll-view" scroll-y>
      <!-- 选择批次 -->
      <view class="section">
        <view class="section-title">选择批次</view>
        <view class="batch-selector" @click="handleSelectBatch">
          <text class="selector-text" v-if="selectedBatch">{{ selectedBatch.id }} - {{ formatTime(selectedBatch.created_at) }}</text>
          <text class="selector-placeholder" v-else>请选择批次</text>
          <text class="selector-arrow">›</text>
        </view>
      </view>

      <!-- 批次信息预览 -->
      <view class="section" v-if="selectedBatch">
        <view class="section-header">
          <text class="section-title">批次信息预览</text>
          <view class="batch-info-badge">
            <text class="batch-info-badge-text">批次 #{{ selectedBatch.id }}</text>
          </view>
        </view>
        
        <!-- 批次基本信息 -->
        <view class="batch-info-card">
          <view class="info-item">
            <text class="info-item-label">果农</text>
            <text class="info-item-value">{{ selectedBatch.farmer?.name || '未知' }}</text>
          </view>
          <view class="info-item">
            <text class="info-item-label">创建时间</text>
            <text class="info-item-value">{{ formatTime(selectedBatch.created_at) }}</text>
          </view>
        </view>

        <!-- 批次主图 -->
        <view class="batch-preview-section" v-if="selectedBatch.image_url">
          <view class="preview-section-title">批次主图</view>
          <view class="batch-image-card" @click="handlePreviewBatchImage">
            <image 
              class="batch-preview-image" 
              :src="selectedBatch.image_url" 
              mode="aspectFill"
            />
            <view class="image-preview-hint">
              <text class="hint-text">点击预览</text>
            </view>
          </view>
        </view>

        <!-- 批次媒体文件 -->
        <view class="batch-preview-section" v-if="selectedBatch.batch_media_files && selectedBatch.batch_media_files.length > 0">
          <view class="preview-section-title">
            批次媒体文件
            <text class="media-count">({{ selectedBatch.batch_media_files.length }})</text>
          </view>
          <view class="media-files-list">
            <view 
              class="media-file-item" 
              v-for="(media, index) in selectedBatch.batch_media_files" 
              :key="media.id || index"
            >
              <!-- 预览区域 -->
              <view class="media-preview-wrapper" @click="handlePreviewBatchMedia(media, index)">
                <!-- 图片预览 -->
                <image 
                  v-if="media.file_type === 'image'"
                  class="media-file-preview" 
                  :src="media.file_url" 
                  mode="aspectFill"
                />
                <!-- 视频预览 -->
                <view v-else class="video-preview-wrapper">
                  <video
                    :id="`batch-video-${index}`"
                    class="media-file-preview video"
                    :src="media.file_url"
                    :poster="media.file_url"
                    :controls="false"
                    :show-center-play-btn="true"
                    object-fit="cover"
                  ></video>
                  <view class="video-play-icon">▶</view>
                </view>
              </view>
              
              <view class="media-file-info">
                <view class="media-file-category">
                  <text class="category-label">分类：</text>
                  <view class="category-badge">
                    <text class="category-text">{{ getMediaCategoryName(media.media_category) }}</text>
                  </view>
                </view>
                <view class="media-file-type">
                  <text class="type-label">类型：</text>
                  <text class="type-text">{{ media.file_type === 'image' ? '图片' : '视频' }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 商品信息 -->
      <view class="section" v-if="selectedBatch">
        <view class="section-header">
          <text class="section-title">商品信息</text>
          <view class="add-product-btn" @click="handleAddProduct" :class="{ disabled: submitting }">
            <text class="add-product-btn-text">新增商品</text>
          </view>
        </view>

        <view class="product-form-card" v-for="(p, idx) in products" :key="p._key">
          <view class="product-form-card-header">
            <text class="product-form-card-title">商品 {{ idx + 1 }}</text>
            <view
              class="product-form-card-remove"
              v-if="products.length > 1"
              @click="handleRemoveProduct(idx)"
              :class="{ disabled: submitting }"
            >
              删除
            </view>
          </view>

          <view class="form-item">
            <text class="form-label">商品名称 <text class="required">*</text></text>
            <input class="form-input" v-model="p.name" placeholder="请输入商品名称" maxlength="50" />
          </view>

          <view class="form-item">
            <text class="form-label">商品图片</text>
            <view class="image-upload" @click="handleChooseImage(idx)" v-if="!p.image_url">
              <view class="upload-placeholder">
                <text class="upload-icon">📷</text>
                <text class="upload-text">点击上传图片</text>
              </view>
            </view>
            <view class="image-preview" v-else>
              <image class="preview-image" :src="p.image_url" mode="aspectFill" @click="handlePreviewImage(idx)" />
              <view class="image-actions">
                <view class="action-btn" @click="handleChooseImage(idx)">重新上传</view>
                <view class="action-btn delete" @click="handleDeleteImage(idx)">删除</view>
              </view>
            </view>
            <view class="image-tip" v-if="uploadingIndex === idx">
              <text class="tip-text">上传中...</text>
            </view>
            <view class="image-tip" v-else-if="selectedBatch && selectedBatch.image_url && !p.image_url">
              <text class="tip-text">可直接使用批次图片</text>
            </view>
          </view>

          <view class="form-item">
            <text class="form-label">分类</text>
            <view class="selector" @click="handleSelectCategory(p._key)">
              <text class="selector-text" :class="{ placeholder: !p.category_categories }">
                {{ getSelectedCategoryName(idx) }}
              </text>
              <text class="selector-arrow">›</text>
            </view>
          </view>

          <view class="form-item">
            <text class="form-label">产地</text>
            <view class="selector" @click="handleSelectOrigin(p._key)">
              <text class="selector-text" :class="{ placeholder: !p.origin_origins }">
                {{ getSelectedOriginName(idx) }}
              </text>
              <text class="selector-arrow">›</text>
            </view>
          </view>

          <view class="form-item">
            <text class="form-label">包装单位 <text class="required">*</text></text>
            <input class="form-input" v-model="p.unit" placeholder="如：箱、盒、件" maxlength="10" />
          </view>

          <view class="form-item">
            <text class="form-label">单价(元/{{ p.unit || "包装单位" }}) <text class="required">*</text></text>
            <input class="form-input" v-model="p.unit_price" type="digit" placeholder="请输入单价" />
          </view>

          <view class="form-item">
            <text class="form-label">库存({{ p.unit || "包装单位" }}) <text class="required">*</text></text>
            <input class="form-input" v-model="p.unit_stock" type="number" placeholder="请输入库存" />
          </view>

          <view class="form-item">
            <text class="form-label">零售单位 <text class="required">*</text></text>
            <input class="form-input" v-model="p.retail_unit" placeholder="如：个、斤、kg" maxlength="10" />
          </view>

          <view class="form-item">
            <text class="form-label">每{{ p.unit || "包装单位" }}毛重({{ p.retail_unit || "零售单位" }}) <text class="required">*</text></text>
            <input class="form-input" v-model="p.gross_weight" type="digit" placeholder="请输入毛重" />
          </view>

          <view class="form-item">
            <text class="form-label">每{{ p.unit || "包装单位" }}净重({{ p.retail_unit || "零售单位" }}) <text class="required">*</text></text>
            <input class="form-input" v-model="p.net_weight" type="digit" placeholder="请输入净重" />
          </view>
        </view>
      </view>

      <!-- 商品详情 -->
      <view class="section" v-if="selectedBatch">
        <view class="section-title">商品详情</view>
        <view class="form-item">
          <text class="form-label">商品详情（HTML）</text>
          <textarea class="form-textarea" v-model="commonDetail.detail_html" placeholder="请输入商品详情，支持HTML格式" maxlength="5000" />
        </view>
        <view class="form-item">
          <text class="form-label">售后须知（HTML）</text>
          <textarea class="form-textarea" v-model="commonDetail.after_sales_html" placeholder="请输入售后须知，支持HTML格式" maxlength="5000" />
        </view>
        <view class="detail-tip">
          <text class="detail-tip-text">提示：此处填写的内容会应用到本次创建的所有商品</text>
        </view>
      </view>

      <!-- 提交按钮 -->
      <view class="submit-section" v-if="selectedBatch">
        <view class="submit-btn" @click="handleSubmit" :class="{ disabled: submitting }">
          <text class="submit-btn-text">{{ submitting ? submitText : "创建商品" }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script lang="ts">
import { ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { getBatches, getBatchById } from "@/api/batch";
import { createProduct } from "@/api/product";
import { getCategories } from "@/api/category";
import { getOrigins } from "@/api/origin";
import { uploadToQiniu } from "@/api/upload";
import type { Batches, Categories, Origins } from "@/types/graphql";

export default {
  setup() {
    const selectedBatch = ref<Batches | null>(null);
    const submitting = ref(false);
    const uploadingIndex = ref<number>(-1);
    const submitText = ref("提交中...");
    const actionSheetOpen = ref(false);
    const categories = ref<Categories[]>([]);
    const origins = ref<Origins[]>([]);

    type ProductForm = {
      _key: string;
      name: string;
      image_url: string;
      unit_price: string;
      unit_stock: string;
      unit: string;
      gross_weight: string;
      net_weight: string;
      retail_unit: string;
      category_categories: string | number | null;
      origin_origins: string | number | null;
    };

    const commonDetail = ref({
      detail_html: "",
      after_sales_html: "",
    });

    const createEmptyProductForm = (): ProductForm => ({
      _key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: "",
      image_url: selectedBatch.value?.image_url || "",
      unit_price: "",
      unit_stock: "",
      unit: "",
      gross_weight: "",
      net_weight: "",
      retail_unit: "",
      category_categories: null,
      origin_origins: null,
    });

    const products = ref<ProductForm[]>([createEmptyProductForm()]);

    // 格式化时间
    const formatTime = (time: string) => {
      const date = new Date(time);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };

    // 选择批次
    const handleSelectBatch = () => {
      uni.navigateTo({
        url: "/subPackages/farmer/batch-select/index",
      });
    };

    // 提交表单
    const handleSubmit = async () => {
      if (submitting.value) return;

      if (!selectedBatch.value) {
        uni.showToast({
          title: "请选择批次",
          icon: "none",
        });
        return;
      }

      if (!products.value || products.value.length === 0) {
        uni.showToast({ title: "请至少添加一个商品", icon: "none" });
        return;
      }

      for (let i = 0; i < products.value.length; i++) {
        const p = products.value[i];
        if (!p.name || !p.unit || !p.unit_price || !p.unit_stock || !p.retail_unit || !p.gross_weight || !p.net_weight) {
          uni.showToast({
            title: `请完善第${i + 1}个商品的必填项`,
            icon: "none",
          });
          return;
        }
      }

      submitting.value = true;
      try {
        let successCount = 0;
        for (let i = 0; i < products.value.length; i++) {
          submitText.value = `提交中...（${i + 1}/${products.value.length}）`;
          const p = products.value[i];
          await createProduct({
            name: p.name,
            batch_batches: selectedBatch.value.id,
            image_url: p.image_url || null,
            unit_price: Number(p.unit_price),
            unit_stock: Number(p.unit_stock),
            unit: p.unit,
            gross_weight: Number(p.gross_weight),
            net_weight: Number(p.net_weight),
            retail_unit: p.retail_unit,
            category_categories: p.category_categories || null,
            origin_origins: p.origin_origins || null,
            detail_html: commonDetail.value.detail_html || null,
            after_sales_html: commonDetail.value.after_sales_html || null,
          });
          successCount++;
        }

        uni.showToast({ title: `创建成功（${successCount}个）`, icon: "success" });
        setTimeout(() => {
          uni.navigateBack();
        }, 1200);
      } catch (error) {
        console.error("创建商品失败:", error);
        uni.showToast({
          title: error instanceof Error ? error.message : "创建失败",
          icon: "none",
        });
      } finally {
        submitting.value = false;
        submitText.value = "提交中...";
      }
    };

    // 加载分类和产地列表
    const loadOptions = async () => {
      try {
        const [categoriesData, originsData] = await Promise.all([
          getCategories(),
          getOrigins(),
        ]);
        categories.value = categoriesData || [];
        origins.value = originsData || [];
        console.log("[创建商品] 加载的分类数据:", categories.value);
        console.log("[创建商品] 加载的产地数据:", origins.value);
      } catch (error) {
        console.error("加载选项失败:", error);
        uni.showToast({
          title: "加载选项失败",
          icon: "none",
        });
      }
    };

    // 监听页面显示，处理从批次选择页面返回的情况
    const handlePageShow = async () => {
      // 从本地存储获取选中的批次（批次选择页面会保存）
      const selectedBatchData = uni.getStorageSync("selectedBatch");
      if (selectedBatchData) {
        uni.removeStorageSync("selectedBatch");
        
        // 无论是否有完整信息，都重新加载批次详情以确保包含媒体文件
        if (selectedBatchData.id) {
          try {
            const batchDetail = await getBatchById(selectedBatchData.id);
            if (batchDetail) {
              selectedBatch.value = batchDetail;
              // 如果批次有图片，自动同步到“尚未设置图片”的商品项
              if (batchDetail.image_url) {
                products.value = products.value.map((p) => ({
                  ...p,
                  image_url: p.image_url || batchDetail.image_url || "",
                }));
              }
            } else {
              // 如果加载失败，使用原始数据
              selectedBatch.value = selectedBatchData;
              if (selectedBatchData.image_url) {
                products.value = products.value.map((p) => ({
                  ...p,
                  image_url: p.image_url || selectedBatchData.image_url || "",
                }));
              }
            }
          } catch (error) {
            console.error("加载批次详情失败:", error);
            // 加载失败时使用原始数据
            selectedBatch.value = selectedBatchData;
            if (selectedBatchData.image_url) {
              products.value = products.value.map((p) => ({
                ...p,
                image_url: p.image_url || selectedBatchData.image_url || "",
              }));
            }
          }
        } else {
          selectedBatch.value = selectedBatchData;
          if (selectedBatchData.image_url) {
            products.value = products.value.map((p) => ({
              ...p,
              image_url: p.image_url || selectedBatchData.image_url || "",
            }));
          }
        }
      }
    };

    // 获取媒体分类名称
    const getMediaCategoryName = (category: string) => {
      const categoryMap: Record<string, string> = {
        picking: "采摘",
        packing: "打包",
        loading: "装车",
        departure: "发车",
      };
      return categoryMap[category] || category;
    };

    // 预览批次主图
    const handlePreviewBatchImage = () => {
      if (selectedBatch.value?.image_url) {
        uni.previewImage({
          urls: [selectedBatch.value.image_url],
          current: selectedBatch.value.image_url,
        });
      }
    };

    // 预览批次媒体文件
    const handlePreviewBatchMedia = (media: any, index: number) => {
      if (!selectedBatch.value?.batch_media_files) return;

      if (media.file_type === "image") {
        // 图片预览：获取所有图片URL
        const imageUrls = selectedBatch.value.batch_media_files
          .filter((m: any) => m.file_type === "image")
          .map((m: any) => m.file_url);
        
        const currentIndex = imageUrls.findIndex((url: string) => url === media.file_url);
        uni.previewImage({
          urls: imageUrls,
          current: currentIndex >= 0 ? currentIndex : 0,
        });
      } else {
        // 视频预览：使用全屏播放
        const videoContext = uni.createVideoContext(`batch-video-${index}`);
        if (videoContext) {
          videoContext.requestFullScreen({
            direction: 90, // 横屏
          });
          setTimeout(() => {
            videoContext.play();
          }, 300);
        }
      }
    };

    const handleAddProduct = () => {
      if (submitting.value) return;
      products.value.push(createEmptyProductForm());
    };

    const handleRemoveProduct = (idx: number) => {
      if (submitting.value) return;
      if (products.value.length <= 1) return;
      products.value.splice(idx, 1);
    };

    // 选择分类
    const handleSelectCategory = (productKey: string) => {
      if (actionSheetOpen.value) return;
      console.log("[选择分类] 当前分类数据:", categories.value);
      
      if (categories.value.length === 0) {
        uni.showToast({
          title: "分类数据加载中，请稍候",
          icon: "none",
        });
        // 尝试重新加载
        loadOptions();
        return;
      }
      
      // 使用 categories 表的 name 字段
      const categoryNames = categories.value.map((c) => {
        const name = c.name || `分类${c.id}`;
        console.log("[选择分类] 分类项:", { id: c.id, name });
        return name;
      });
      
      if (categoryNames.length === 0) {
        uni.showToast({
          title: "暂无分类数据",
          icon: "none",
        });
        return;
      }
      
      console.log("[选择分类] 显示的分类列表:", categoryNames);
      
      actionSheetOpen.value = true;
      uni.showActionSheet({
        itemList: categoryNames,
        success: (res) => {
          console.log("[选择分类] 用户选择了索引:", res.tapIndex);
          if (res.tapIndex >= 0 && res.tapIndex < categories.value.length) {
            const selectedCategory = categories.value[res.tapIndex];
            const idx = products.value.findIndex((p) => p._key === productKey);
            if (idx >= 0) products.value[idx].category_categories = selectedCategory.id;
            console.log("[选择分类] 已选择分类:", selectedCategory);
          }
        },
        fail: (err) => {
          console.error("选择分类失败:", err);
        },
        complete: () => {
          actionSheetOpen.value = false;
        },
      });
    };

    // 选择产地
    const handleSelectOrigin = (productKey: string) => {
      if (actionSheetOpen.value) return;
      if (origins.value.length === 0) {
        uni.showToast({
          title: "产地数据加载中，请稍候",
          icon: "none",
        });
        return;
      }
      
      const originNames = origins.value.map((o) => o.name || `产地${o.id}`);
      if (originNames.length === 0) {
        uni.showToast({
          title: "暂无产地数据",
          icon: "none",
        });
        return;
      }
      
      actionSheetOpen.value = true;
      uni.showActionSheet({
        itemList: originNames,
        success: (res) => {
          if (res.tapIndex >= 0 && res.tapIndex < origins.value.length) {
            const idx = products.value.findIndex((p) => p._key === productKey);
            if (idx >= 0) products.value[idx].origin_origins = origins.value[res.tapIndex].id;
          }
        },
        fail: (err) => {
          console.error("选择产地失败:", err);
        },
        complete: () => {
          actionSheetOpen.value = false;
        },
      });
    };

    // 获取选中的分类名称
    const getSelectedCategoryName = (idx: number) => {
      const p = products.value[idx];
      if (!p || !p.category_categories) return "请选择分类";
      const category = categories.value.find((c) => c.id === p.category_categories);
      return category?.name || "请选择分类";
    };

    // 获取选中的产地名称
    const getSelectedOriginName = (idx: number) => {
      const p = products.value[idx];
      if (!p || !p.origin_origins) return "请选择产地";
      const origin = origins.value.find((o) => o.id === p.origin_origins);
      return origin?.name || "请选择产地";
    };

    // 选择图片
    const handleChooseImage = (idx: number) => {
      uni.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: async (res) => {
          const tempFilePath = res.tempFilePaths[0];
          await uploadImage(idx, tempFilePath);
        },
        fail: (error) => {
          console.error("选择图片失败:", error);
          uni.showToast({
            title: "选择图片失败",
            icon: "none",
          });
        },
      });
    };

    // 上传图片（使用七牛云直传）
    const uploadImage = async (idx: number, filePath: string) => {
      uploadingIndex.value = idx;
      try {
        // 使用七牛云直传
        const { url } = await uploadToQiniu(filePath, (progress) => {
          // 可以在这里显示上传进度
          console.log("上传进度:", progress + "%");
        });

        if (idx >= 0 && idx < products.value.length) {
          products.value[idx].image_url = url;
        }
        uni.showToast({
          title: "上传成功",
          icon: "success",
        });
      } catch (error) {
        console.error("上传图片失败:", error);
        uni.showToast({
          title: error instanceof Error ? error.message : "上传失败",
          icon: "none",
        });
      } finally {
        uploadingIndex.value = -1;
      }
    };

    // 预览图片
    const handlePreviewImage = (idx: number) => {
      const p = products.value[idx];
      if (p?.image_url) {
        uni.previewImage({
          urls: [p.image_url],
          current: p.image_url,
        });
      }
    };

    // 删除图片
    const handleDeleteImage = (idx: number) => {
      uni.showModal({
        title: "确认删除",
        content: "确定要删除这张图片吗？",
        success: (res) => {
          if (res.confirm) {
            if (idx >= 0 && idx < products.value.length) {
              products.value[idx].image_url = "";
            }
          }
        },
      });
    };

    onLoad(() => {
      loadOptions();
      handlePageShow();
    });

    onShow(() => {
      handlePageShow();
    });

    return {
      selectedBatch,
      products,
      submitting,
      uploadingIndex,
      submitText,
      categories,
      origins,
      commonDetail,
      formatTime,
      handleSelectBatch,
      handleAddProduct,
      handleRemoveProduct,
      handleSelectCategory,
      handleSelectOrigin,
      getSelectedCategoryName,
      getSelectedOriginName,
      getMediaCategoryName,
      handleChooseImage,
      handlePreviewImage,
      handleDeleteImage,
      handlePreviewBatchImage,
      handlePreviewBatchMedia,
      handleSubmit,
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
}

.header-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.scroll-view {
  height: calc(100vh - 120rpx);
}

.section {
  background-color: #fff;
  margin-top: 20rpx;
  padding: 30rpx 40rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
}

.batch-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  border: 1rpx solid #e0e0e0;
}

.selector-text {
  font-size: 28rpx;
  color: #333;
}

.selector-placeholder {
  font-size: 28rpx;
  color: #999;
}

.selector-arrow {
  font-size: 28rpx;
  color: #999;
}

.form-item {
  margin-bottom: 30rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
  font-weight: 500;
}

.required {
  color: #ff3b30;
  font-size: 24rpx;
}

.form-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  border: 1rpx solid #e0e0e0;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
}

.form-textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 24rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  border: 1rpx solid #e0e0e0;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
  line-height: 1.6;
}

.selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  border: 1rpx solid #e0e0e0;
}

.selector-text {
  font-size: 28rpx;
  color: #333;
}

.selector-text.placeholder {
  color: #999;
}

.selector-arrow {
  font-size: 28rpx;
  color: #999;
}

.image-upload {
  width: 100%;
  height: 300rpx;
  border-radius: 12rpx;
  border: 2rpx dashed #d0d0d0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f9f9f9;
  overflow: hidden;
}

.image-preview {
  position: relative;
  width: 100%;
  height: 300rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background-color: #f9f9f9;
}

.preview-image {
  width: 100%;
  height: 100%;
}

.image-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
}

.action-btn {
  flex: 1;
  padding: 16rpx;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8rpx;
  text-align: center;
  font-size: 26rpx;
  color: #333;
}

.action-btn.delete {
  background-color: rgba(255, 59, 48, 0.9);
  color: #fff;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
}

.upload-icon {
  font-size: 60rpx;
}

.upload-text {
  font-size: 26rpx;
  color: #999;
}

.image-tip {
  margin-top: 12rpx;
}

.tip-text {
  font-size: 24rpx;
  color: #999;
}

.detail-tip {
  margin-top: 10rpx;
}

.detail-tip-text {
  font-size: 24rpx;
  color: #999;
}

.submit-section {
  padding: 40rpx;
  margin-top: 40rpx;
}

.submit-btn {
  padding: 28rpx;
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

/* 批次预览样式 - 参考批次创建页面样式 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.add-product-btn {
  padding: 10rpx 18rpx;
  background: linear-gradient(135deg, #3cc51f 0%, #2ea517 100%);
  border-radius: 20rpx;
}

.add-product-btn.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.add-product-btn-text {
  font-size: 24rpx;
  color: #fff;
  font-weight: 500;
}

.product-form-card {
  background-color: #f9f9f9;
  border: 1rpx solid #e0e0e0;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.product-form-card:last-child {
  margin-bottom: 0;
}

.product-form-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.product-form-card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.product-form-card-remove {
  padding: 6rpx 14rpx;
  border-radius: 16rpx;
  background-color: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
  font-size: 24rpx;
}

.product-form-card-remove.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.batch-info-badge {
  padding: 8rpx 16rpx;
  background: linear-gradient(135deg, #3cc51f 0%, #2ea517 100%);
  border-radius: 20rpx;
}

.batch-info-badge-text {
  font-size: 22rpx;
  color: #fff;
  font-weight: 500;
}

.batch-info-card {
  display: flex;
  gap: 20rpx;
  padding: 24rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  margin-bottom: 30rpx;
}

.info-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.info-item-label {
  font-size: 24rpx;
  color: #999;
}

.info-item-value {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.batch-preview-section {
  margin-bottom: 30rpx;
}

.batch-preview-section:last-child {
  margin-bottom: 0;
}

.preview-section-title {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  margin-bottom: 16rpx;
}

.media-count {
  font-size: 24rpx;
  color: #999;
  font-weight: normal;
}

.batch-image-card {
  position: relative;
  width: 100%;
  height: 400rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background-color: #f9f9f9;
}

.batch-preview-image {
  width: 100%;
  height: 100%;
}

.image-preview-hint {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hint-text {
  font-size: 24rpx;
  color: #fff;
}

.media-files-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.media-file-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  border: 1rpx solid #e0e0e0;
}

.media-preview-wrapper {
  position: relative;
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  overflow: hidden;
  background-color: #f5f5f5;
  flex-shrink: 0;
}

.media-file-preview {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
}

.media-file-preview.video {
  object-fit: cover;
}

.video-preview-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-play-icon {
  position: absolute;
  font-size: 40rpx;
  color: rgba(255, 255, 255, 0.9);
  background-color: rgba(0, 0, 0, 0.5);
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.media-file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.media-file-category {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.category-label,
.type-label {
  font-size: 24rpx;
  color: #666;
}

.category-badge {
  padding: 6rpx 16rpx;
  background-color: #fff;
  border-radius: 8rpx;
  border: 1rpx solid #e0e0e0;
}

.category-text {
  font-size: 24rpx;
  color: #333;
}

.media-file-type {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.type-text {
  font-size: 24rpx;
  color: #333;
}
</style>
