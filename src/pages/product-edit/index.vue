<template>
  <view class="page">
    <view class="header">
      <text class="header-title">编辑商品</text>
    </view>

    <scroll-view class="scroll-view" scroll-y v-if="product">
      <!-- 批次信息预览 -->
      <view class="section" v-if="product.batch">
        <view class="section-header">
          <text class="section-title">批次信息预览</text>
          <view class="batch-info-badge">
            <text class="batch-info-badge-text">批次 #{{ product.batch.id }}</text>
          </view>
        </view>
        
        <!-- 批次基本信息 -->
        <view class="batch-info-card">
          <view class="info-item">
            <text class="info-item-label">果农</text>
            <text class="info-item-value">{{ product.batch.farmer?.name || product.batch.farmer?.user?.nickname || product.batch.farmer?.user?.phone || '未知' }}</text>
          </view>
          <view class="info-item">
            <text class="info-item-label">创建时间</text>
            <text class="info-item-value">{{ formatTime(product.batch.created_at) }}</text>
          </view>
        </view>

        <!-- 批次主图 -->
        <view class="batch-preview-section" v-if="product.batch.image_url">
          <view class="preview-section-title">批次主图</view>
          <view class="batch-image-card" @click="handlePreviewBatchImage">
            <image 
              class="batch-preview-image" 
              :src="product.batch.image_url" 
              mode="aspectFill"
            />
            <view class="image-preview-hint">
              <text class="hint-text">点击预览</text>
            </view>
          </view>
        </view>

        <!-- 批次媒体文件 -->
        <view class="batch-preview-section" v-if="product.batch.batch_media_files && product.batch.batch_media_files.length > 0">
          <view class="preview-section-title">
            批次媒体文件
            <text class="media-count">({{ product.batch.batch_media_files.length }})</text>
          </view>
          <!-- 横向滚动展示 -->
          <scroll-view class="media-scroll" scroll-x>
            <view class="media-list">
              <view 
                class="media-item" 
                v-for="(media, index) in product.batch.batch_media_files" 
                :key="media.id || index"
                @click="handlePreviewBatchMedia(media, index)"
              >
                <!-- 图片预览 -->
                <image 
                  v-if="media.file_type === 'image'"
                  class="media-thumbnail" 
                  :src="media.file_url" 
                  mode="aspectFill"
                />
                <!-- 视频预览 -->
                <view v-else class="media-thumbnail video-thumbnail">
                  <video
                    :id="`batch-video-${index}`"
                    class="media-video"
                    :src="media.file_url"
                    :poster="media.file_url"
                    :controls="false"
                    :show-center-play-btn="true"
                    object-fit="cover"
                  ></video>
                  <view class="video-play-badge">▶</view>
                </view>
                <!-- 媒体分类标签 -->
                <view class="media-category-badge">
                  <text class="category-badge-text">{{ getMediaCategoryName(media.media_category) }}</text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- 商品信息 -->
      <view class="section">
        <view class="section-title">商品信息</view>
        <view class="form-item">
          <text class="form-label">商品名称 <text class="required">*</text></text>
          <input class="form-input" v-model="form.name" placeholder="请输入商品名称" maxlength="50" />
        </view>
        <view class="form-item">
          <text class="form-label">商品图片</text>
          <view class="image-upload" @click="handleChooseImage" v-if="!form.image_url">
            <view class="upload-placeholder">
              <text class="upload-icon">📷</text>
              <text class="upload-text">点击上传图片</text>
            </view>
          </view>
          <view class="image-preview" v-else>
            <image class="preview-image" :src="form.image_url" mode="aspectFill" @click="handlePreviewImage" />
            <view class="image-actions">
              <view class="action-btn" @click="handleChooseImage" :class="{ disabled: uploading }">重新上传</view>
              <view class="action-btn delete" @click="handleDeleteImage" :class="{ disabled: uploading }">删除</view>
            </view>
          </view>
          <view class="image-tip" v-if="uploading">
            <text class="tip-text">上传中...</text>
          </view>
        </view>
        <view class="form-item">
          <text class="form-label">分类</text>
          <view class="selector" @click="handleSelectCategory">
            <text class="selector-text" :class="{ placeholder: !form.category_categories }">
              {{ getSelectedCategoryName() }}
            </text>
            <text class="selector-arrow">›</text>
          </view>
        </view>
        <view class="form-item">
          <text class="form-label">产地</text>
          <view class="selector" @click="handleSelectOrigin">
            <text class="selector-text" :class="{ placeholder: !form.origin_origins }">
              {{ getSelectedOriginName() }}
            </text>
            <text class="selector-arrow">›</text>
          </view>
        </view>
        <view class="form-item">
          <text class="form-label">单价 <text class="required">*</text></text>
          <input class="form-input" v-model="form.unit_price" type="digit" placeholder="请输入单价" />
        </view>
        <view class="form-item">
          <text class="form-label">库存 <text class="required">*</text></text>
          <input class="form-input" v-model="form.unit_stock" type="number" placeholder="请输入库存" />
        </view>
        <view class="form-item">
          <text class="form-label">单位 <text class="readonly-hint">（不可修改）</text></text>
          <input class="form-input readonly" v-model="form.unit" placeholder="单位" disabled />
        </view>
        <view class="form-item">
          <text class="form-label">毛重(kg) <text class="required">*</text></text>
          <input class="form-input" v-model="form.gross_weight" type="digit" placeholder="请输入毛重" />
        </view>
        <view class="form-item">
          <text class="form-label">净重(kg) <text class="required">*</text></text>
          <input class="form-input" v-model="form.net_weight" type="digit" placeholder="请输入净重" />
        </view>
        <view class="form-item">
          <text class="form-label">零售单位</text>
          <input class="form-input" v-model="form.retail_unit" placeholder="如：个、斤、kg" maxlength="10" />
        </view>
      </view>

      <!-- 商品详情 -->
      <view class="section">
        <view class="section-title">商品详情</view>
        <view class="form-item">
          <text class="form-label">商品详情（HTML）</text>
          <textarea class="form-textarea" v-model="form.detail_html" placeholder="请输入商品详情，支持HTML格式" maxlength="5000" />
        </view>
        <view class="form-item">
          <text class="form-label">售后须知（HTML）</text>
          <textarea class="form-textarea" v-model="form.after_sales_html" placeholder="请输入售后须知，支持HTML格式" maxlength="5000" />
        </view>
      </view>

      <!-- 提交按钮 -->
      <view class="submit-section">
        <view class="submit-btn" @click="handleSubmit" :class="{ disabled: submitting }">
          <text class="submit-btn-text">{{ submitting ? "提交中..." : "保存修改" }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="loading-state" v-else>
      <text class="loading-text">加载中...</text>
    </view>
  </view>
</template>

<script lang="ts">
import { ref, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getProductById, updateProduct } from "@/api/product";
import { getCategories } from "@/api/category";
import { getOrigins } from "@/api/origin";
import { isLoggedIn, getToken } from "@/api/auth";
import { API_BASE_URL } from "@/project-config";
import type { Products, Categories, Origins } from "@/types/graphql";

export default {
  setup() {
    const product = ref<Products | null>(null);
    const productId = ref<string | number>("");
    const form = ref({
      name: "",
      image_url: "",
      unit_price: "",
      unit_stock: "",
      unit: "",
      category_categories: null as string | number | null,
      origin_origins: null as string | number | null,
      gross_weight: "",
      net_weight: "",
      retail_unit: "",
      detail_html: "",
      after_sales_html: "",
    });
    const submitting = ref(false);
    const uploading = ref(false);
    const categories = ref<Categories[]>([]);
    const origins = ref<Origins[]>([]);

    // 加载商品详情
    const loadProduct = async () => {
      if (!productId.value) return;

      try {
        const productData = await getProductById(productId.value);
        if (productData) {
          product.value = productData;
          form.value = {
            name: productData.name || "",
            image_url: productData.image_url || "",
            unit_price: productData.unit_price ? String(productData.unit_price) : "",
            unit_stock: productData.unit_stock ? String(productData.unit_stock) : "",
            unit: productData.unit || "",
            category_categories: productData.category_categories || null,
            origin_origins: productData.origin_origins || null,
            gross_weight: productData.gross_weight ? String(productData.gross_weight) : "",
            net_weight: productData.net_weight ? String(productData.net_weight) : "",
            retail_unit: productData.retail_unit || "",
            detail_html: productData.detail_html || "",
            after_sales_html: productData.after_sales_html || "",
          };
        } else {
          uni.showToast({
            title: "商品不存在",
            icon: "none",
          });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        }
      } catch (error) {
        console.error("加载商品失败:", error);
        uni.showToast({
          title: "加载失败",
          icon: "none",
        });
      }
    };

    // 加载选项数据
    const loadOptions = async () => {
      try {
        const [categoriesData, originsData] = await Promise.all([
          getCategories(),
          getOrigins(),
        ]);
        categories.value = categoriesData;
        origins.value = originsData;
      } catch (error) {
        console.error("加载选项数据失败:", error);
      }
    };

    // 选择分类
    const handleSelectCategory = () => {
      if (categories.value.length === 0) {
        uni.showToast({
          title: "分类数据加载中，请稍候",
          icon: "none",
        });
        loadOptions();
        return;
      }

      const categoryNames = categories.value.map((c) => {
        return c.name || c.category_name || `分类${c.id}`;
      });

      if (categoryNames.length === 0) {
        uni.showToast({
          title: "暂无分类数据",
          icon: "none",
        });
        return;
      }

      uni.showActionSheet({
        itemList: categoryNames,
        success: (res) => {
          if (res.tapIndex >= 0 && res.tapIndex < categories.value.length) {
            const selectedCategory = categories.value[res.tapIndex];
            form.value.category_categories = selectedCategory.id;
          }
        },
        fail: (err) => {
          console.error("选择分类失败:", err);
        },
      });
    };

    // 选择产地
    const handleSelectOrigin = () => {
      if (origins.value.length === 0) {
        uni.showToast({
          title: "产地数据加载中，请稍候",
          icon: "none",
        });
        return;
      }

      const originNames = origins.value.map((o) => o.name || "");
      if (originNames.length === 0) {
        uni.showToast({
          title: "暂无产地数据",
          icon: "none",
        });
        return;
      }

      uni.showActionSheet({
        itemList: originNames,
        success: (res) => {
          if (res.tapIndex >= 0 && res.tapIndex < origins.value.length) {
            form.value.origin_origins = origins.value[res.tapIndex].id;
          }
        },
        fail: (err) => {
          console.error("选择产地失败:", err);
        },
      });
    };

    // 获取选中的分类名称
    const getSelectedCategoryName = () => {
      if (!form.value.category_categories) return "请选择分类";
      const category = categories.value.find((c) => c.id === form.value.category_categories);
      return category?.name || category?.category_name || "请选择分类";
    };

    // 获取选中的产地名称
    const getSelectedOriginName = () => {
      if (!form.value.origin_origins) return "请选择产地";
      const origin = origins.value.find((o) => o.id === form.value.origin_origins);
      return origin?.name || "请选择产地";
    };

    // 格式化时间
    const formatTime = (time: string) => {
      if (!time) return "";
      const date = new Date(time);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}`;
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
      if (product.value?.batch?.image_url) {
        uni.previewImage({
          urls: [product.value.batch.image_url],
          current: product.value.batch.image_url,
        });
      }
    };

    // 预览批次媒体文件
    const handlePreviewBatchMedia = (media: any, index: number) => {
      if (!product.value?.batch?.batch_media_files) return;

      if (media.file_type === "image") {
        // 图片预览：获取所有图片URL
        const imageUrls = product.value.batch.batch_media_files
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
        fail: (error) => {
          console.error("选择图片失败:", error);
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
        const uploadUrl = `${API_BASE_URL}/api/upload/form`;

        const uploadResult = await new Promise<any>((resolve, reject) => {
          const token = getToken();
          uni.uploadFile({
            url: uploadUrl,
            filePath: filePath,
            name: "file",
            formData: {},
            header: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            success: (res) => {
              try {
                const data = JSON.parse(res.data);
                if (data.url) {
                  resolve(data);
                } else {
                  reject(new Error(data.error || "上传失败"));
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

        form.value.image_url = uploadResult.url;
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
        uploading.value = false;
      }
    };

    // 预览图片
    const handlePreviewImage = () => {
      if (form.value.image_url) {
        uni.previewImage({
          urls: [form.value.image_url],
          current: form.value.image_url,
        });
      }
    };

    // 删除图片
    const handleDeleteImage = () => {
      uni.showModal({
        title: "确认删除",
        content: "确定要删除这张图片吗？",
        success: (res) => {
          if (res.confirm) {
            form.value.image_url = "";
          }
        },
      });
    };

    // 提交
    const handleSubmit = async () => {
      if (submitting.value) return;

      // 验证
      if (!form.value.name || !form.value.unit_price || !form.value.unit_stock || !form.value.gross_weight || !form.value.net_weight) {
        uni.showToast({
          title: "请填写必填项",
          icon: "none",
        });
        return;
      }

      submitting.value = true;
      try {
        const result = await updateProduct(productId.value, {
          name: form.value.name,
          image_url: form.value.image_url || null,
          unit_price: Number(form.value.unit_price),
          unit_stock: Number(form.value.unit_stock),
          // unit 不更新，因为价格单位不能修改
          category_categories: form.value.category_categories || null,
          origin_origins: form.value.origin_origins || null,
          gross_weight: Number(form.value.gross_weight),
          net_weight: Number(form.value.net_weight),
          retail_unit: form.value.retail_unit || null,
          detail_html: form.value.detail_html || null,
          after_sales_html: form.value.after_sales_html || null,
        });

        if (result) {
          uni.showToast({
            title: "保存成功",
            icon: "success",
          });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        }
      } catch (error) {
        console.error("保存商品失败:", error);
        uni.showToast({
          title: error instanceof Error ? error.message : "保存失败",
          icon: "none",
        });
      } finally {
        submitting.value = false;
      }
    };

    onLoad((options: any) => {
      if (options.id) {
        productId.value = options.id;
        loadProduct();
        loadOptions();
      } else {
        uni.showToast({
          title: "商品ID缺失",
          icon: "none",
        });
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      }
    });

    return {
      product,
      form,
      submitting,
      uploading,
      categories,
      origins,
      handleSelectCategory,
      handleSelectOrigin,
      getSelectedCategoryName,
      getSelectedOriginName,
      formatTime,
      getMediaCategoryName,
      handlePreviewBatchImage,
      handlePreviewBatchMedia,
      handleChooseImage,
      handlePreviewImage,
      handleDeleteImage,
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

.readonly-hint {
  color: #999;
  font-size: 24rpx;
  font-weight: normal;
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

.form-input.readonly {
  background-color: #f0f0f0;
  color: #999;
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
  background-color: #f9f9f9;
  border-radius: 12rpx;
  border: 1rpx dashed #d0d0d0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.upload-icon {
  font-size: 60rpx;
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

.action-btn.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.action-btn.delete {
  background-color: #fff4e6;
  color: #ff9500;
}

.image-tip {
  margin-top: 12rpx;
}

.tip-text {
  font-size: 24rpx;
  color: #999;
}

.submit-section {
  padding: 40rpx;
  background-color: #fff;
  margin-top: 20rpx;
}

.submit-btn {
  width: 100%;
  padding: 28rpx 0;
  background: linear-gradient(135deg, #3cc51f 0%, #2ea517 100%);
  border-radius: 12rpx;
  text-align: center;
  box-shadow: 0 4rpx 12rpx rgba(60, 197, 31, 0.3);
}

.submit-btn.disabled {
  background-color: #ccc;
  box-shadow: none;
  opacity: 0.6;
}

.submit-btn-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #fff;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 200rpx 40rpx;
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}

/* 批次预览样式 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
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

/* 横向滚动媒体文件列表 */
.media-scroll {
  width: 100%;
  white-space: nowrap;
}

.media-list {
  display: inline-flex;
  gap: 20rpx;
  padding: 10rpx 0;
}

.media-item {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background-color: #f5f5f5;
  flex-shrink: 0;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.media-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-thumbnail {
  position: relative;
  width: 100%;
  height: 100%;
}

.media-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-play-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60rpx;
  height: 60rpx;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.9);
  z-index: 2;
}

.media-category-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8rpx 12rpx;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.category-badge-text {
  font-size: 22rpx;
  color: #fff;
  font-weight: 500;
}
</style>
