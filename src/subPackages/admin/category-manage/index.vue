<template>
  <view class="page">
    <view class="header">
      <text class="header-title">分类管理</text>
      <view class="header-action" @click="handleCreate">
        <text class="action-text">新增</text>
      </view>
    </view>

    <scroll-view class="scroll-view" scroll-y>
      <view class="list">
        <view class="list-item" v-for="item in categories" :key="item.id">
          <view class="item-content" @click="handleEdit(item)">
            <view class="item-main">
              <text class="item-name">{{ item.name }}</text>
              <text class="item-category" v-if="item.category_name">{{ item.category_name }}</text>
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
          <text class="modal-title">{{ editingItem ? '编辑分类' : '新增分类' }}</text>
          <text class="modal-close" @click="handleCloseModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">分类名称</text>
            <input class="form-input" v-model="formData.name" placeholder="请输入分类名称" />
          </view>
          <view class="form-item">
            <text class="form-label">分类类别</text>
            <input class="form-input" v-model="formData.category_name" placeholder="如：水果、蔬菜" />
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
import { ref, onMounted } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { getCategories, createCategory, updateCategory, deleteCategory } from "@/api/category";
import type { Categories } from "@/types/graphql";

export default {
  setup() {
    const categories = ref<Categories[]>([]);
    const showModal = ref(false);
    const editingItem = ref<Categories | null>(null);
    const formData = ref({
      name: "",
      category_name: "",
    });

    const loadCategories = async () => {
      try {
        const result = await getCategories();
        categories.value = result;
      } catch (error) {
        console.error("加载分类失败:", error);
        uni.showToast({ title: "加载失败", icon: "none" });
      }
    };

    const handleCreate = () => {
      editingItem.value = null;
      formData.value = { name: "", category_name: "" };
      showModal.value = true;
    };

    const handleEdit = (item: Categories) => {
      editingItem.value = item;
      formData.value = {
        name: item.name || "",
        category_name: item.category_name || "",
      };
      showModal.value = true;
    };

    const handleDelete = async (id: string | number) => {
      uni.showModal({
        title: "确认删除",
        content: "确定要删除该分类吗？",
        success: async (res) => {
          if (res.confirm) {
            try {
              await deleteCategory(id);
              uni.showToast({ title: "删除成功", icon: "success" });
              loadCategories();
            } catch (error) {
              console.error("删除失败:", error);
              uni.showToast({ title: "删除失败", icon: "none" });
            }
          }
        },
      });
    };

    const handleSubmit = async () => {
      if (!formData.value.name.trim()) {
        uni.showToast({ title: "请输入分类名称", icon: "none" });
        return;
      }

      try {
        if (editingItem.value) {
          await updateCategory(editingItem.value.id, formData.value);
          uni.showToast({ title: "更新成功", icon: "success" });
        } else {
          await createCategory(formData.value);
          uni.showToast({ title: "创建成功", icon: "success" });
        }
        showModal.value = false;
        loadCategories();
      } catch (error) {
        console.error("操作失败:", error);
        uni.showToast({ title: "操作失败", icon: "none" });
      }
    };

    const handleCloseModal = () => {
      showModal.value = false;
      editingItem.value = null;
      formData.value = { name: "", category_name: "" };
    };

    onLoad(() => {
      loadCategories();
    });

    onShow(() => {
      loadCategories();
    });

    return {
      categories,
      showModal,
      editingItem,
      formData,
      handleCreate,
      handleEdit,
      handleDelete,
      handleSubmit,
      handleCloseModal,
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
  justify-content: space-between;
  padding: 30rpx 40rpx;
}

.item-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.item-name {
  font-size: 32rpx;
  color: #333;
  font-weight: 500;
}

.item-category {
  font-size: 24rpx;
  color: #999;
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
