<template>
  <view class="page">
    <view class="header">
      <text class="header-title">{{ addressId ? "编辑收货地址" : "新增收货地址" }}</text>
    </view>

    <scroll-view class="scroll-view" scroll-y>
      <view class="form-section">
        <view class="form-item">
          <text class="form-label">收货人 <text class="required">*</text></text>
          <input 
            class="form-input" 
            v-model="form.receiver_name" 
            placeholder="请输入收货人姓名" 
            maxlength="20" 
          />
        </view>

        
        <view class="form-item">
          <text class="form-label">联系电话 <text class="required">*</text></text>
          <input 
            class="form-input" 
            v-model="form.receiver_phone" 
            type="number" 
            placeholder="请输入联系电话" 
            maxlength="11" 
          />
        </view>

        <view class="form-item">
          <text class="form-label">详细地址 <text class="required">*</text></text>
          <textarea 
            class="form-textarea" 
            v-model="form.receiver_address" 
            placeholder="请输入详细地址（包含省市区街道门牌号等）" 
            maxlength="200" 
          />
        </view>

        <view class="form-item">
          <view class="switch-item">
            <text class="switch-label">设为默认地址</text>
            <switch 
              :checked="form.is_default" 
              @change="handleDefaultChange"
              color="#ff9500"
            />
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部按钮 -->
    <view class="bottom-bar">
      <view class="save-btn" @click="handleSave" :class="{ disabled: saving }">
        <text class="save-btn-text">{{ saving ? "保存中..." : "保存" }}</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { ref, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getAddressById, createAddress, updateAddress } from "@/api/address";
import { getUserId, isLoggedIn } from "@/api/auth";
import type { Addresses } from "@/types/graphql";

export default {
  setup() {
    const addressId = ref<string | null>(null);
    const saving = ref(false);
    const form = ref({
      receiver_name: "",
      receiver_phone: "",
      receiver_address: "",
      is_default: false,
    });

    // 加载地址数据
    const loadAddress = async () => {
      if (!addressId.value) return;

      try {
        const address = await getAddressById(addressId.value);
        if (address) {
          form.value = {
            receiver_name: address.receiver_name,
            receiver_phone: address.receiver_phone,
            receiver_address: address.receiver_address,
            is_default: address.is_default,
          };
        }
      } catch (error) {
        console.error("加载收货地址失败:", error);
        uni.showToast({
          title: "加载失败",
          icon: "none",
        });
      }
    };

    // 处理默认地址切换
    const handleDefaultChange = (e: any) => {
      form.value.is_default = e.detail.value;
    };

    // 验证表单
    const validateForm = (): boolean => {
      if (!form.value.receiver_name || form.value.receiver_name.trim() === "") {
        uni.showToast({
          title: "请输入收货人姓名",
          icon: "none",
        });
        return false;
      }

      if (!form.value.receiver_phone || form.value.receiver_phone.trim() === "") {
        uni.showToast({
          title: "请输入联系电话",
          icon: "none",
        });
        return false;
      }

      // 验证手机号格式
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(form.value.receiver_phone)) {
        uni.showToast({
          title: "请输入正确的手机号码",
          icon: "none",
        });
        return false;
      }

      if (!form.value.receiver_address || form.value.receiver_address.trim() === "") {
        uni.showToast({
          title: "请输入详细地址",
          icon: "none",
        });
        return false;
      }

      return true;
    };

    // 保存地址
    const handleSave = async () => {
      if (saving.value) return;

      if (!validateForm()) {
        return;
      }

      if (!isLoggedIn()) {
        uni.navigateTo({
          url: "/pages/login/index",
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

      saving.value = true;
      try {
        if (addressId.value) {
          // 更新地址
          await updateAddress(addressId.value, {
            receiver_name: form.value.receiver_name.trim(),
            receiver_phone: form.value.receiver_phone.trim(),
            receiver_address: form.value.receiver_address.trim(),
            is_default: form.value.is_default,
          });
          uni.showToast({
            title: "保存成功",
            icon: "success",
          });
        } else {
          // 创建地址
          await createAddress(userId, {
            receiver_name: form.value.receiver_name.trim(),
            receiver_phone: form.value.receiver_phone.trim(),
            receiver_address: form.value.receiver_address.trim(),
            is_default: form.value.is_default,
          });
          uni.showToast({
            title: "添加成功",
            icon: "success",
          });
        }

        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      } catch (error) {
        console.error("保存收货地址失败:", error);
        uni.showToast({
          title: "保存失败",
          icon: "none",
        });
      } finally {
        saving.value = false;
      }
    };

    onLoad((options) => {
      if (options?.id) {
        addressId.value = options.id;
        loadAddress();
      }
    });

    return {
      addressId,
      form,
      saving,
      handleDefaultChange,
      handleSave,
    };
  },
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 120rpx;
}

.header {
  padding: 40rpx 30rpx 30rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #e0e0e0;
}

.header-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.scroll-view {
  height: calc(100vh - 200rpx);
}

.form-section {
  padding: 20rpx;
}

.form-item {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
  font-weight: 500;
}

.required {
  color: #ff4444;
}

.form-input {
  width: 100%;
  font-size: 28rpx;
  color: #333;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #e0e0e0;
}

.form-textarea {
  width: 100%;
  min-height: 120rpx;
  font-size: 28rpx;
  color: #333;
  padding: 16rpx 0;
  line-height: 1.6;
}

.switch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.switch-label {
  font-size: 28rpx;
  color: #333;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background-color: #fff;
  border-top: 1rpx solid #e0e0e0;
  box-shadow: 0 -2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.save-btn {
  padding: 28rpx;
  background: linear-gradient(135deg, #ff9500 0%, #ff6b00 100%);
  border-radius: 40rpx;
  text-align: center;
  box-shadow: 0 4rpx 12rpx rgba(255, 149, 0, 0.3);
}

.save-btn.disabled {
  background-color: #ccc;
  box-shadow: none;
}

.save-btn-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #fff;
}
</style>
