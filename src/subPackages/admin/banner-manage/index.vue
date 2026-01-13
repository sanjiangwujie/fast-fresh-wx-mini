<template>
  <view class="page">
    <view class="header">
      <text class="header-title">轮播图管理</text>
      <view class="header-action" @click="handleCreate">
        <text class="action-text">新增</text>
      </view>
    </view>

    <scroll-view class="scroll-view" scroll-y>
      <view class="list">
        <view class="list-item" v-for="item in banners" :key="item.id">
          <view class="item-content" @click="handleEdit(item)">
            <view class="item-media">
              <image
                v-if="item.media_file_type === 'image' && item.media_file_url"
                class="item-image"
                :src="item.media_file_url"
                mode="aspectFill"
              />
              <view v-else-if="item.media_file_type === 'video'" class="item-video-placeholder">
                <text class="video-icon">▶</text>
              </view>
              <view v-else class="item-placeholder">
                <text class="placeholder-text">暂无媒体</text>
              </view>
            </view>
            <view class="item-info">
              <text class="item-type">{{ item.media_file_type === 'image' ? '图片' : '视频' }}</text>
              <text class="item-time">{{ formatTime(item.created_at) }}</text>
            </view>
            <text class="item-arrow">›</text>
          </view>
          <view class="item-actions">
            <button class="action-btn" @click.stop="handleDelete(item.id)">删除</button>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 编辑弹窗 -->
    <view class="modal" v-if="showModal" @click="handleCloseModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingItem ? '编辑轮播图' : '新增轮播图' }}</text>
          <text class="modal-close" @click="handleCloseModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">媒体类型</text>
            <picker
              mode="selector"
              :range="mediaTypes"
              :value="mediaTypeIndex"
              @change="handleMediaTypeChange"
            >
              <view class="picker-view">
                <text>{{ mediaTypes[mediaTypeIndex] }}</text>
                <text class="picker-arrow">›</text>
              </view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">媒体文件</text>
            <view class="upload-section">
              <view v-if="formData.media_file_url" class="upload-preview">
                <image
                  v-if="formData.media_file_type === 'image'"
                  class="preview-image"
                  :src="formData.media_file_url"
                  mode="aspectFill"
                />
                <view v-else class="preview-video">
                  <text class="video-icon">▶</text>
                </view>
                <view class="preview-actions">
                  <text class="preview-action" @click="handleChangeMedia">更换</text>
                  <text class="preview-action" @click="handleRemoveMedia">删除</text>
                </view>
              </view>
              <button v-else class="upload-btn" @click="handleSelectMedia">选择媒体文件</button>
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn cancel" @click="handleCloseModal">取消</button>
          <button class="modal-btn confirm" @click="handleSubmit">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { ref, computed } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { getBanners, createBanner, updateBanner, deleteBanner } from "@/api/banner";
import { uploadToQiniu } from "@/api/upload";
import type { Banners } from "@/types/graphql";

export default {
  setup() {
    const banners = ref<Banners[]>([]);
    const showModal = ref(false);
    const editingItem = ref<Banners | null>(null);
    const formData = ref({
      media_file_type: "image",
      media_file_url: "",
    });
    const mediaTypes = ["图片", "视频"];
    const mediaTypeIndex = computed(() => {
      return formData.value.media_file_type === "image" ? 0 : 1;
    });

    const loadBanners = async () => {
      try {
        const result = await getBanners({ limit: 100 });
        banners.value = result;
      } catch (error) {
        console.error("加载轮播图失败:", error);
        uni.showToast({ title: "加载失败", icon: "none" });
      }
    };

    const formatTime = (time: string) => {
      if (!time) return "";
      const date = new Date(time);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };

    const handleCreate = () => {
      editingItem.value = null;
      formData.value = { media_file_type: "image", media_file_url: "" };
      showModal.value = true;
    };

    const handleEdit = (item: Banners) => {
      editingItem.value = item;
      formData.value = {
        media_file_type: item.media_file_type || "image",
        media_file_url: item.media_file_url || "",
      };
      showModal.value = true;
    };

    const handleMediaTypeChange = (e: any) => {
      const index = e.detail.value;
      formData.value.media_file_type = index === 0 ? "image" : "video";
      if (formData.value.media_file_url) {
        formData.value.media_file_url = ""; // 切换类型时清空URL
      }
    };

    const handleSelectMedia = async () => {
      const type = formData.value.media_file_type;
      try {
        if (type === "image") {
          const res = await uni.chooseImage({
            count: 1,
            sourceType: ["album", "camera"],
          });
          if (res.tempFilePaths && res.tempFilePaths.length > 0) {
            await handleUploadMedia(res.tempFilePaths[0], "image");
          }
        } else {
          const res = await uni.chooseVideo({
            sourceType: ["album", "camera"],
          });
          if (res.tempFilePath) {
            await handleUploadMedia(res.tempFilePath, "video");
          }
        }
      } catch (error) {
        console.error("选择媒体失败:", error);
      }
    };

    const handleUploadMedia = async (filePath: string, fileType: string) => {
      uni.showLoading({ title: "上传中..." });
      try {
        const { url } = await uploadToQiniu(filePath, (progress) => {
          console.log("上传进度:", progress + "%");
        });
        formData.value.media_file_url = url;
        uni.hideLoading();
        uni.showToast({ title: "上传成功", icon: "success" });
      } catch (error) {
        console.error("上传失败:", error);
        uni.hideLoading();
        uni.showToast({ title: error instanceof Error ? error.message : "上传失败", icon: "none" });
      }
    };

    const handleChangeMedia = () => {
      handleSelectMedia();
    };

    const handleRemoveMedia = () => {
      formData.value.media_file_url = "";
    };

    const handleDelete = async (id: string | number) => {
      uni.showModal({
        title: "确认删除",
        content: "确定要删除该轮播图吗？",
        success: async (res) => {
          if (res.confirm) {
            try {
              await deleteBanner(id);
              uni.showToast({ title: "删除成功", icon: "success" });
              loadBanners();
            } catch (error) {
              console.error("删除失败:", error);
              uni.showToast({ title: "删除失败", icon: "none" });
            }
          }
        },
      });
    };

    const handleSubmit = async () => {
      if (!formData.value.media_file_url) {
        uni.showToast({ title: "请选择媒体文件", icon: "none" });
        return;
      }

      try {
        if (editingItem.value) {
          await updateBanner(editingItem.value.id, formData.value);
          uni.showToast({ title: "更新成功", icon: "success" });
        } else {
          await createBanner(formData.value);
          uni.showToast({ title: "创建成功", icon: "success" });
        }
        showModal.value = false;
        loadBanners();
      } catch (error) {
        console.error("操作失败:", error);
        uni.showToast({ title: "操作失败", icon: "none" });
      }
    };

    const handleCloseModal = () => {
      showModal.value = false;
      editingItem.value = null;
      formData.value = { media_file_type: "image", media_file_url: "" };
    };

    onLoad(() => {
      loadBanners();
    });

    onShow(() => {
      loadBanners();
    });

    return {
      banners,
      showModal,
      editingItem,
      formData,
      mediaTypes,
      mediaTypeIndex,
      handleCreate,
      handleEdit,
      handleDelete,
      handleSubmit,
      handleCloseModal,
      handleMediaTypeChange,
      handleSelectMedia,
      handleChangeMedia,
      handleRemoveMedia,
      formatTime,
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 40rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #e0e0e0;
}

.header-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.header-action {
  padding: 10rpx 20rpx;
  background-color: #3cc51f;
  border-radius: 8rpx;
}

.action-text {
  font-size: 28rpx;
  color: #fff;
}

.scroll-view {
  height: calc(100vh - 100rpx);
}

.list {
  padding: 20rpx 0;
}

.list-item {
  background-color: #fff;
  margin-bottom: 20rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.item-content {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 30rpx 40rpx;
}

.item-media {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  overflow: hidden;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-image {
  width: 100%;
  height: 100%;
}

.item-video-placeholder,
.item-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e0e0e0;
}

.video-icon {
  font-size: 48rpx;
  color: #999;
}

.placeholder-text {
  font-size: 24rpx;
  color: #999;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.item-type {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.item-time {
  font-size: 24rpx;
  color: #999;
}

.item-arrow {
  font-size: 32rpx;
  color: #999;
}

.item-actions {
  padding: 0 40rpx 20rpx;
}

.action-btn {
  width: 100%;
  padding: 20rpx;
  background-color: #ff6b35;
  color: #fff;
  border-radius: 8rpx;
  font-size: 28rpx;
  border: none;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 80%;
  max-width: 600rpx;
  background-color: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  max-height: 80vh;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx 40rpx;
  border-bottom: 1rpx solid #e0e0e0;
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.modal-close {
  font-size: 48rpx;
  color: #999;
  line-height: 1;
}

.modal-body {
  padding: 40rpx;
  max-height: 60vh;
  overflow-y: auto;
}

.form-item {
  margin-bottom: 30rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 20rpx;
}

.picker-view {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.picker-arrow {
  font-size: 24rpx;
  color: #999;
}

.upload-section {
  margin-top: 10rpx;
}

.upload-btn {
  width: 100%;
  padding: 30rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #666;
  border: 1rpx dashed #ccc;
}

.upload-preview {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 */
  background-color: #f5f5f5;
  border-radius: 8rpx;
  overflow: hidden;
}

.preview-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.preview-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e0e0e0;
}

.preview-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
}

.preview-action {
  flex: 1;
  padding: 10rpx;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8rpx;
  text-align: center;
  font-size: 24rpx;
  color: #333;
}

.modal-footer {
  display: flex;
  gap: 20rpx;
  padding: 30rpx 40rpx;
  border-top: 1rpx solid #e0e0e0;
}

.modal-btn {
  flex: 1;
  padding: 24rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  border: none;
}

.modal-btn.cancel {
  background-color: #f5f5f5;
  color: #666;
}

.modal-btn.confirm {
  background-color: #3cc51f;
  color: #fff;
}
</style>
