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
              <view class="action-btn" @click="handleChooseImage">重新上传</view>
              <view class="action-btn delete" @click="handleDeleteImage">删除</view>
            </view>
          </view>
          <view class="image-tip" v-if="uploading">
            <text class="tip-text">上传中...</text>
          </view>
          <view class="image-tip" v-else-if="selectedBatch && selectedBatch.image_url && !form.image_url">
            <text class="tip-text">批次图片：{{ selectedBatch.image_url }}</text>
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
          <text class="form-label">单位</text>
          <input class="form-input" v-model="form.unit" placeholder="如：箱、斤、kg" maxlength="10" />
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
      <view class="section" v-if="selectedBatch">
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
      <view class="submit-section" v-if="selectedBatch">
        <view class="submit-btn" @click="handleSubmit" :class="{ disabled: submitting }">
          <text class="submit-btn-text">{{ submitting ? "提交中..." : "创建商品" }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script lang="ts">
import { ref, onMounted } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { getBatches, getBatchById } from "@/api/batch";
import { createProduct } from "@/api/product";
import { getCategories } from "@/api/category";
import { getOrigins } from "@/api/origin";
import { isLoggedIn, getToken } from "@/api/auth";
import { API_BASE_URL } from "@/project-config";
import type { Batches, Categories, Origins } from "@/types/graphql";

export default {
  setup() {
    const selectedBatch = ref<Batches | null>(null);
    const submitting = ref(false);
    const uploading = ref(false);
    const categories = ref<Categories[]>([]);
    const origins = ref<Origins[]>([]);
    const form = ref({
      name: "",
      image_url: "",
      unit_price: "",
      unit_stock: "",
      unit: "",
      gross_weight: "",
      net_weight: "",
      retail_unit: "",
      category_categories: null as string | number | null,
      origin_origins: null as string | number | null,
      detail_html: "",
      after_sales_html: "",
    });

    // 格式化时间
    const formatTime = (time: string) => {
      const date = new Date(time);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };

    // 选择批次
    const handleSelectBatch = () => {
      uni.navigateTo({
        url: "/pages/batch-select/index",
      });
    };

    // 提交表单
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

      if (!selectedBatch.value) {
        uni.showToast({
          title: "请选择批次",
          icon: "none",
        });
        return;
      }

      submitting.value = true;
      try {
        const result = await createProduct({
          name: form.value.name,
          batch_batches: selectedBatch.value.id,
          image_url: form.value.image_url || null,
          unit_price: Number(form.value.unit_price),
          unit_stock: Number(form.value.unit_stock),
          unit: form.value.unit || null,
          gross_weight: Number(form.value.gross_weight),
          net_weight: Number(form.value.net_weight),
          retail_unit: form.value.retail_unit || null,
          category_categories: form.value.category_categories || null,
          origin_origins: form.value.origin_origins || null,
          detail_html: form.value.detail_html || null,
          after_sales_html: form.value.after_sales_html || null,
        });

        if (result) {
          uni.showToast({
            title: "创建成功",
            icon: "success",
          });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        }
      } catch (error) {
        console.error("创建商品失败:", error);
        uni.showToast({
          title: "创建失败",
          icon: "none",
        });
      } finally {
        submitting.value = false;
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
              // 如果批次有图片，自动同步到商品图片
              if (batchDetail.image_url && !form.value.image_url) {
                form.value.image_url = batchDetail.image_url;
              }
            } else {
              // 如果加载失败，使用原始数据
              selectedBatch.value = selectedBatchData;
              if (selectedBatchData.image_url && !form.value.image_url) {
                form.value.image_url = selectedBatchData.image_url;
              }
            }
          } catch (error) {
            console.error("加载批次详情失败:", error);
            // 加载失败时使用原始数据
            selectedBatch.value = selectedBatchData;
            if (selectedBatchData.image_url && !form.value.image_url) {
              form.value.image_url = selectedBatchData.image_url;
            }
          }
        } else {
          selectedBatch.value = selectedBatchData;
          if (selectedBatchData.image_url && !form.value.image_url) {
            form.value.image_url = selectedBatchData.image_url;
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

    // 选择分类
    const handleSelectCategory = () => {
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
      
      // 使用 name 字段，如果没有则使用 category_name
      const categoryNames = categories.value.map((c) => {
        const name = c.name || c.category_name || `分类${c.id}`;
        console.log("[选择分类] 分类项:", { id: c.id, name, category_name: c.category_name });
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
      
      uni.showActionSheet({
        itemList: categoryNames,
        success: (res) => {
          console.log("[选择分类] 用户选择了索引:", res.tapIndex);
          if (res.tapIndex >= 0 && res.tapIndex < categories.value.length) {
            const selectedCategory = categories.value[res.tapIndex];
            form.value.category_categories = selectedCategory.id;
            console.log("[选择分类] 已选择分类:", selectedCategory);
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
                if (data.success && data.data) {
                  const fileData = Array.isArray(data.data) ? data.data[0] : data.data;
                  resolve(fileData);
                } else {
                  reject(new Error(data.message || "上传失败"));
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

        if (uploadResult.url) {
          form.value.image_url = uploadResult.url;
          uni.showToast({
            title: "上传成功",
            icon: "success",
          });
        } else {
          throw new Error("上传响应中缺少URL");
        }
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

    onLoad(() => {
      loadOptions();
      handlePageShow();
    });

    onShow(() => {
      handlePageShow();
    });

    return {
      selectedBatch,
      form,
      submitting,
      uploading,
      categories,
      origins,
      formatTime,
      handleSelectBatch,
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
