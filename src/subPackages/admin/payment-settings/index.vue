<template>
  <view class="page">
    <view class="header">
      <text class="header-title">应用设置</text>
    </view>

    <scroll-view class="scroll-view" scroll-y>
      <view class="content">
        <!-- 联系我们二维码设置 -->
        <view class="setting-section">
          <view class="section-header">
            <text class="section-title">联系我们二维码</text>
            <text class="section-desc">用户在“我的-联系我们”里查看并扫码</text>
          </view>
          <view class="upload-section">
            <view v-if="formData.contact_code" class="upload-preview">
              <image class="preview-image" :src="formData.contact_code" mode="aspectFill" />
              <view class="preview-actions">
                <text class="preview-action" @click="handleChangeContactCode">更换</text>
                <text class="preview-action" @click="handleRemoveContactCode">删除</text>
              </view>
            </view>
            <button v-else class="upload-btn" @click="handleSelectContactCode">选择联系我们二维码</button>
          </view>
        </view>

        <!-- 收款码设置 -->
        <view class="setting-section">
          <view class="section-header">
            <text class="section-title">收款码</text>
            <text class="section-desc">用于订单支付的收款二维码</text>
          </view>
          <view class="upload-section">
            <view v-if="formData.payment_code" class="upload-preview">
              <image class="preview-image" :src="formData.payment_code" mode="aspectFill" />
              <view class="preview-actions">
                <text class="preview-action" @click="handleChangePaymentCode">更换</text>
                <text class="preview-action" @click="handleRemovePaymentCode">删除</text>
              </view>
            </view>
            <button v-else class="upload-btn" @click="handleSelectPaymentCode">选择收款码</button>
          </view>
        </view>

        <!-- 微信加好友二维码设置 -->
        <view class="setting-section">
          <view class="section-header">
            <text class="section-title">微信加好友二维码</text>
            <text class="section-desc">用于添加微信好友的二维码</text>
          </view>
          <view class="upload-section">
            <view v-if="formData.wechat_code" class="upload-preview">
              <image class="preview-image" :src="formData.wechat_code" mode="aspectFill" />
              <view class="preview-actions">
                <text class="preview-action" @click="handleChangeWechatCode">更换</text>
                <text class="preview-action" @click="handleRemoveWechatCode">删除</text>
              </view>
            </view>
            <button v-else class="upload-btn" @click="handleSelectWechatCode">选择微信二维码</button>
          </view>
        </view>

        <!-- 保存按钮 -->
        <view class="save-section">
          <button class="save-btn" @click="handleSave" :disabled="saving">
            {{ saving ? "保存中..." : "保存设置" }}
          </button>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getAppConfig, updateAppConfig } from "@/api/app";
import { uploadToQiniu } from "@/api/upload";
import type { App } from "@/types/graphql";

export default {
  setup() {
    const formData = ref({
      contact_code: "",
      payment_code: "",
      wechat_code: "",
    });
    const saving = ref(false);

    const loadAppConfig = async () => {
      try {
        const config = await getAppConfig();
        if (config) {
          formData.value = {
            contact_code: config.contact_code || "",
            payment_code: config.payment_code || "",
            wechat_code: config.wechat_code || "",
          };
        }
      } catch (error) {
        console.error("加载配置失败:", error);
        uni.showToast({ title: "加载失败", icon: "none" });
      }
    };

    const handleSelectContactCode = async () => {
      try {
        const res = await uni.chooseImage({
          count: 1,
          sourceType: ["album", "camera"],
        });
        if (res.tempFilePaths && res.tempFilePaths.length > 0) {
          await handleUploadContactCode(res.tempFilePaths[0]);
        }
      } catch (error) {
        console.error("选择图片失败:", error);
      }
    };

    const handleUploadContactCode = async (filePath: string) => {
      uni.showLoading({ title: "上传中..." });
      try {
        const { url } = await uploadToQiniu(filePath, (progress) => {
          console.log("上传进度:", progress + "%");
        });
        formData.value.contact_code = url;
        uni.hideLoading();
        uni.showToast({ title: "上传成功", icon: "success" });
      } catch (error) {
        console.error("上传失败:", error);
        uni.hideLoading();
        uni.showToast({ title: error instanceof Error ? error.message : "上传失败", icon: "none" });
      }
    };

    const handleChangeContactCode = () => {
      handleSelectContactCode();
    };

    const handleRemoveContactCode = () => {
      formData.value.contact_code = "";
    };

    const handleSelectPaymentCode = async () => {
      try {
        const res = await uni.chooseImage({
          count: 1,
          sourceType: ["album", "camera"],
        });
        if (res.tempFilePaths && res.tempFilePaths.length > 0) {
          await handleUploadPaymentCode(res.tempFilePaths[0]);
        }
      } catch (error) {
        console.error("选择图片失败:", error);
      }
    };

    const handleUploadPaymentCode = async (filePath: string) => {
      uni.showLoading({ title: "上传中..." });
      try {
        const { url } = await uploadToQiniu(filePath, (progress) => {
          console.log("上传进度:", progress + "%");
        });
        formData.value.payment_code = url;
        uni.hideLoading();
        uni.showToast({ title: "上传成功", icon: "success" });
      } catch (error) {
        console.error("上传失败:", error);
        uni.hideLoading();
        uni.showToast({ title: error instanceof Error ? error.message : "上传失败", icon: "none" });
      }
    };

    const handleChangePaymentCode = () => {
      handleSelectPaymentCode();
    };

    const handleRemovePaymentCode = () => {
      formData.value.payment_code = "";
    };

    const handleSelectWechatCode = async () => {
      try {
        const res = await uni.chooseImage({
          count: 1,
          sourceType: ["album", "camera"],
        });
        if (res.tempFilePaths && res.tempFilePaths.length > 0) {
          await handleUploadWechatCode(res.tempFilePaths[0]);
        }
      } catch (error) {
        console.error("选择图片失败:", error);
      }
    };

    const handleUploadWechatCode = async (filePath: string) => {
      uni.showLoading({ title: "上传中..." });
      try {
        const { url } = await uploadToQiniu(filePath, (progress) => {
          console.log("上传进度:", progress + "%");
        });
        formData.value.wechat_code = url;
        uni.hideLoading();
        uni.showToast({ title: "上传成功", icon: "success" });
      } catch (error) {
        console.error("上传失败:", error);
        uni.hideLoading();
        uni.showToast({ title: error instanceof Error ? error.message : "上传失败", icon: "none" });
      }
    };

    const handleChangeWechatCode = () => {
      handleSelectWechatCode();
    };

    const handleRemoveWechatCode = () => {
      formData.value.wechat_code = "";
    };

    const handleSave = async () => {
      if (saving.value) return;

      saving.value = true;
      try {
        await updateAppConfig({
          contact_code: formData.value.contact_code || null,
          payment_code: formData.value.payment_code || null,
          wechat_code: formData.value.wechat_code || null,
        });
        uni.showToast({ title: "保存成功", icon: "success" });
        // 重新加载配置
        await loadAppConfig();
      } catch (error) {
        console.error("保存失败:", error);
        uni.showToast({ title: "保存失败", icon: "none" });
      } finally {
        saving.value = false;
      }
    };

    onLoad(() => {
      loadAppConfig();
    });

    return {
      formData,
      saving,
      handleSelectContactCode,
      handleChangeContactCode,
      handleRemoveContactCode,
      handleSelectPaymentCode,
      handleChangePaymentCode,
      handleRemovePaymentCode,
      handleSelectWechatCode,
      handleChangeWechatCode,
      handleRemoveWechatCode,
      handleSave,
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

.scroll-view {
  height: calc(100vh - 100rpx);
}

.content {
  padding: 20rpx;
}

.setting-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 40rpx;
  margin-bottom: 20rpx;
}

.section-header {
  margin-bottom: 30rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.section-desc {
  display: block;
  font-size: 24rpx;
  color: #999;
}

.upload-section {
  margin-top: 20rpx;
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

.save-section {
  padding: 40rpx 0;
}

.save-btn {
  width: 100%;
  padding: 24rpx;
  background-color: #3cc51f;
  color: #fff;
  border-radius: 8rpx;
  font-size: 28rpx;
  border: none;
}

.save-btn[disabled] {
  background-color: #ccc;
  color: #999;
}
</style>
