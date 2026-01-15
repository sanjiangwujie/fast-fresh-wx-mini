<template>
  <view class="page">
    <view class="header">
      <text class="header-title">快捷菜单管理</text>
      <view class="header-action" @click="handleCreate">
        <text class="action-text">新增</text>
      </view>
    </view>

    <scroll-view class="scroll-view" scroll-y>
      <view class="list">
        <view class="list-item" v-for="item in kingkongItems" :key="item.id">
          <view class="item-content" @click="handleEdit(item)">
            <view class="item-media">
              <image
                v-if="item.img_url"
                class="item-image"
                :src="item.img_url"
                mode="aspectFill"
              />
              <view v-else class="item-placeholder">
                <text class="placeholder-text">无图标</text>
              </view>
            </view>
            <view class="item-info">
              <text class="item-title">{{ item.title }}</text>
              <text class="item-sort">排序: {{ item.sort }}</text>
              <text class="item-link" v-if="item.link_url">{{ item.link_url }}</text>
            </view>
            <view class="item-right">
              <view class="delete-btn" @click.stop="handleDelete(item.id)">删除</view>
              <text class="item-arrow">›</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 编辑弹窗 -->
    <view class="modal" v-if="showModal" @click="handleCloseModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingItem ? '编辑快捷菜单' : '新增快捷菜单' }}</text>
          <text class="modal-close" @click="handleCloseModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">标题</text>
            <input class="form-input" v-model="formData.title" placeholder="请输入标题" />
          </view>
          <view class="form-item">
            <text class="form-label">图标</text>
            <view class="upload-section">
              <view v-if="formData.img_url" class="upload-preview">
                <image class="preview-image" :src="formData.img_url" mode="aspectFill" />
                <view class="preview-actions">
                  <text class="preview-action" @click="handleChangeImage">更换</text>
                  <text class="preview-action" @click="handleRemoveImage">删除</text>
                </view>
              </view>
              <button v-else class="upload-btn" @click="handleSelectImage">选择图标</button>
            </view>
          </view>
          <view class="form-item">
            <text class="form-label">跳转链接</text>
            <input class="form-input" v-model="formData.link_url" placeholder="如：/pages/categories/index?category_name=水果" />
          </view>
          <view class="form-item">
            <text class="form-label">排序（越小越靠前）</text>
            <input class="form-input" type="number" v-model.number="formData.sort" placeholder="请输入排序数字" />
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
import { ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { getHomeKingkongItems, createKingkongItem, updateKingkongItem, deleteKingkongItem } from "@/api/home";
import { uploadToQiniu } from "@/api/upload";
import type { Home_Kingkong_Items } from "@/types/graphql";

export default {
  setup() {
    const kingkongItems = ref<Home_Kingkong_Items[]>([]);
    const showModal = ref(false);
    const editingItem = ref<Home_Kingkong_Items | null>(null);
    const formData = ref({
      title: "",
      img_url: "",
      link_url: "",
      sort: 0,
    });

    const loadKingkongItems = async () => {
      try {
        const result = await getHomeKingkongItems({ limit: 100 });
        kingkongItems.value = result;
      } catch (error) {
        console.error("加载快捷菜单失败:", error);
        uni.showToast({ title: "加载失败", icon: "none" });
      }
    };

    const handleCreate = () => {
      editingItem.value = null;
      formData.value = { title: "", img_url: "", link_url: "", sort: 0 };
      showModal.value = true;
    };

    const handleEdit = (item: Home_Kingkong_Items) => {
      editingItem.value = item;
      formData.value = {
        title: item.title || "",
        img_url: item.img_url || "",
        link_url: item.link_url || "",
        sort: item.sort || 0,
      };
      showModal.value = true;
    };

    const handleSelectImage = async () => {
      try {
        const res = await uni.chooseImage({
          count: 1,
          sourceType: ["album", "camera"],
        });
        if (res.tempFilePaths && res.tempFilePaths.length > 0) {
          await handleUploadImage(res.tempFilePaths[0]);
        }
      } catch (error) {
        console.error("选择图片失败:", error);
      }
    };

    const handleUploadImage = async (filePath: string) => {
      uni.showLoading({ title: "上传中..." });
      try {
        const { url } = await uploadToQiniu(filePath, (progress) => {
          console.log("上传进度:", progress + "%");
        });
        formData.value.img_url = url;
        uni.hideLoading();
        uni.showToast({ title: "上传成功", icon: "success" });
      } catch (error) {
        console.error("上传失败:", error);
        uni.hideLoading();
        uni.showToast({ title: error instanceof Error ? error.message : "上传失败", icon: "none" });
      }
    };

    const handleChangeImage = () => {
      handleSelectImage();
    };

    const handleRemoveImage = () => {
      formData.value.img_url = "";
    };

    const handleDelete = async (id: string | number) => {
      uni.showModal({
        title: "确认删除",
        content: "确定要删除该快捷菜单吗？",
        success: async (res) => {
          if (res.confirm) {
            try {
              await deleteKingkongItem(id);
              uni.showToast({ title: "删除成功", icon: "success" });
              loadKingkongItems();
            } catch (error) {
              console.error("删除失败:", error);
              uni.showToast({ title: "删除失败", icon: "none" });
            }
          }
        },
      });
    };

    const handleSubmit = async () => {
      if (!formData.value.title.trim()) {
        uni.showToast({ title: "请输入标题", icon: "none" });
        return;
      }

      try {
        if (editingItem.value) {
          await updateKingkongItem(editingItem.value.id, formData.value);
          uni.showToast({ title: "更新成功", icon: "success" });
        } else {
          await createKingkongItem(formData.value);
          uni.showToast({ title: "创建成功", icon: "success" });
        }
        showModal.value = false;
        loadKingkongItems();
      } catch (error) {
        console.error("操作失败:", error);
        uni.showToast({ title: "操作失败", icon: "none" });
      }
    };

    const handleCloseModal = () => {
      showModal.value = false;
      editingItem.value = null;
      formData.value = { title: "", img_url: "", link_url: "", sort: 0 };
    };

    onLoad(() => {
      loadKingkongItems();
    });

    onShow(() => {
      loadKingkongItems();
    });

    return {
      kingkongItems,
      showModal,
      editingItem,
      formData,
      handleCreate,
      handleEdit,
      handleDelete,
      handleSubmit,
      handleCloseModal,
      handleSelectImage,
      handleChangeImage,
      handleRemoveImage,
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
  width: 100rpx;
  height: 100rpx;
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

.item-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e0e0e0;
}

.placeholder-text {
  font-size: 24rpx;
  color: #999;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.item-title {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.item-sort {
  font-size: 24rpx;
  color: #999;
}

.item-link {
  font-size: 22rpx;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-arrow {
  font-size: 32rpx;
  color: #999;
}

.item-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.delete-btn {
  height: 56rpx;
  padding: 0 18rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  background-color: #fff1f0;
  color: #cf1322;
  border-radius: 999rpx;
  font-size: 24rpx;
  border: 1rpx solid #ffccc7;
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

.form-input {
  width: 100%;
  padding: 20rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
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
  padding-top: 100%; /* 1:1 */
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
