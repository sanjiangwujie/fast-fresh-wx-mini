<template>
  <view class="page">
    <view class="header">
      <text class="header-title">运营账号管理</text>
      <view class="header-action" @click="handleCreate">
        <text class="action-text">新增</text>
      </view>
    </view>

    <scroll-view class="scroll-view" scroll-y>
      <view class="list">
        <view class="list-item" v-for="item in operators" :key="item.id">
          <view class="item-content">
            <view class="item-info">
              <text class="item-name">{{ item.nickname || item.phone }}</text>
              <text class="item-phone">{{ item.phone }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 编辑弹窗 -->
    <view class="modal" v-if="showModal" @click="handleCloseModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">新增运营账号</text>
          <text class="modal-close" @click="handleCloseModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">手机号 *</text>
            <input class="form-input" v-model="formData.phone" placeholder="请输入手机号" type="number" />
          </view>
          <view class="form-item">
            <text class="form-label">昵称</text>
            <input class="form-input" v-model="formData.nickname" placeholder="请输入昵称" />
          </view>
          <view class="form-item">
            <text class="form-label">初始密码 *</text>
            <input class="form-input" v-model="formData.password" placeholder="请输入初始密码" type="password" />
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
import { getOperators, createOperatorAccount } from "@/api/user";
import type { Users } from "@/types/graphql";

export default {
  setup() {
    const operators = ref<Users[]>([]);
    const showModal = ref(false);
    const formData = ref({
      phone: "",
      nickname: "",
      password: "",
    });

    const loadOperators = async () => {
      try {
        const result = await getOperators();
        operators.value = result;
      } catch (error) {
        console.error("加载运营账号列表失败:", error);
        uni.showToast({ title: "加载失败", icon: "none" });
      }
    };

    const handleCreate = () => {
      formData.value = { phone: "", nickname: "", password: "" };
      showModal.value = true;
    };

    const handleSubmit = async () => {
      if (!formData.value.phone.trim()) {
        uni.showToast({ title: "请输入手机号", icon: "none" });
        return;
      }

      if (!formData.value.password.trim()) {
        uni.showToast({ title: "请输入初始密码", icon: "none" });
        return;
      }

      // 验证手机号格式
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(formData.value.phone)) {
        uni.showToast({ title: "请输入正确的手机号", icon: "none" });
        return;
      }

      try {
        await createOperatorAccount({
          phone: formData.value.phone,
          nickname: formData.value.nickname || undefined,
          password: formData.value.password,
        });
        uni.showToast({ title: "创建成功", icon: "success" });
        showModal.value = false;
        loadOperators();
      } catch (error: any) {
        console.error("创建失败:", error);
        uni.showToast({ title: error.message || "创建失败", icon: "none" });
      }
    };

    const handleCloseModal = () => {
      showModal.value = false;
      formData.value = { phone: "", nickname: "", password: "" };
    };

    onLoad(() => {
      loadOperators();
    });

    onShow(() => {
      loadOperators();
    });

    return {
      operators,
      showModal,
      formData,
      handleCreate,
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
  padding: 30rpx 40rpx;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.item-name {
  font-size: 32rpx;
  color: #333;
  font-weight: 500;
}

.item-phone {
  font-size: 28rpx;
  color: #666;
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
