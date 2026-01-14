<template>
  <view class="login-page">
    <view class="login-container">
      <!-- Logo/标题区域 -->
      <view class="header">
        <text class="title">欢迎登录</text>
        <text class="subtitle">请选择登录方式</text>
      </view>

      <!-- 微信手机号授权登录 -->
      <view class="login-section" v-if="loginType !== 'password'">
        <button 
          class="wx-login-btn" 
          open-type="getPhoneNumber" 
          @getphonenumber="handleGetPhoneNumber"
          :loading="wxLoginLoading"
        >
          <text class="btn-text">微信手机号快捷登录</text>
        </button>
      </view>

      <!-- 分割线 -->
      <view class="divider" v-if="loginType !== 'password'">
        <text class="divider-text">或</text>
      </view>

      <!-- 密码登录表单 -->
      <view class="login-form" v-if="loginType === 'password'">
        <view class="form-item">
          <input 
            class="input" 
            type="number" 
            placeholder="请输入手机号" 
            v-model="phone"
            maxlength="11"
          />
        </view>
        <view class="form-item">
          <input 
            class="input" 
            type="password" 
            placeholder="请输入密码" 
            v-model="password"
          />
        </view>
        <button 
          class="login-btn" 
          @click="handlePasswordLogin"
          :loading="passwordLoginLoading"
        >
          <text class="btn-text">登录</text>
        </button>
        <view class="switch-login-type" @click="switchToWxLogin">
          <text class="switch-text">使用微信手机号快捷登录</text>
        </view>
      </view>

      <!-- 切换到密码登录按钮 -->
      <view class="switch-section" v-if="loginType !== 'password'">
        <view class="switch-item" @click="switchToPasswordLogin">
          <text class="switch-text">密码登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { ref } from "vue";
import { 
  wxLogin, 
  passwordLogin,
  saveLoginInfo 
} from "@/api/auth";

type LoginType = "password" | null;

export default {
  setup() {
    const loginType = ref<LoginType>(null);
    const phone = ref("");
    const password = ref("");
    const wxLoginLoading = ref(false);
    const passwordLoginLoading = ref(false);

    // 切换到密码登录
    const switchToPasswordLogin = () => {
      loginType.value = "password";
      phone.value = "";
      password.value = "";
    };

    // 切换到微信登录
    const switchToWxLogin = () => {
      loginType.value = null;
      phone.value = "";
      password.value = "";
    };

    // 处理微信手机号授权
    const handleGetPhoneNumber = async (e: any) => {
      console.log("微信授权回调:", e.detail);
      
      if (e.detail.errMsg !== "getPhoneNumber:ok") {
        let errorMsg = "授权失败";
        if (e.detail.errMsg) {
          if (e.detail.errMsg.includes("no permission")) {
            errorMsg = "未开通手机号授权，请在微信公众平台开通：开发→接口设置→手机号授权";
          } else if (e.detail.errMsg.includes("fail")) {
            errorMsg = "授权失败，请检查小程序是否已开通手机号授权功能";
          } else if (e.detail.errMsg.includes("cancel")) {
            errorMsg = "用户取消授权";
            return; // 用户取消不需要提示
          } else {
            errorMsg = `授权失败：${e.detail.errMsg}`;
          }
        }
        uni.showToast({
          title: errorMsg,
          icon: "none",
          duration: 3000,
        });
        return;
      }

      if (!e.detail.code) {
        uni.showToast({
          title: "获取授权码失败，请重试",
          icon: "none",
        });
        return;
      }

      wxLoginLoading.value = true;
      try {
        const response = await wxLogin({
          code: e.detail.code,
          codeSource: "phone",
        });
        
        await saveLoginInfo(response);
        
        uni.showToast({
          title: "登录成功",
          icon: "success",
        });

        // 返回上一页或跳转到首页
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      } catch (error: any) {
        uni.showToast({
          title: error.message || "登录失败",
          icon: "none",
        });
      } finally {
        wxLoginLoading.value = false;
      }
    };

    // 密码登录
    const handlePasswordLogin = async () => {
      if (!phone.value || !password.value) {
        uni.showToast({
          title: "请填写完整信息",
          icon: "none",
        });
        return;
      }

      if (!/^1[3-9]\d{9}$/.test(phone.value)) {
        uni.showToast({
          title: "请输入正确的手机号",
          icon: "none",
        });
        return;
      }

      passwordLoginLoading.value = true;
      try {
        const response = await passwordLogin({
          phone: phone.value,
          password: password.value,
        });
        
        await saveLoginInfo(response);
        
        uni.showToast({
          title: "登录成功",
          icon: "success",
        });

        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      } catch (error: any) {
        uni.showToast({
          title: error.message || "登录失败",
          icon: "none",
        });
      } finally {
        passwordLoginLoading.value = false;
      }
    };

    return {
      loginType,
      phone,
      password,
      wxLoginLoading,
      passwordLoginLoading,
      switchToPasswordLogin,
      switchToWxLogin,
      handleGetPhoneNumber,
      handlePasswordLogin,
    };
  },
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.login-container {
  width: 100%;
  max-width: 600rpx;
  background-color: #fff;
  border-radius: 32rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.1);
}

.header {
  text-align: center;
  margin-bottom: 60rpx;
}

.title {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  color: #999;
}

.login-section {
  margin-bottom: 40rpx;
}

.wx-login-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.wx-login-btn::after {
  border: none;
}

.btn-text {
  color: #fff;
  font-size: 32rpx;
  font-weight: 500;
}

.divider {
  position: relative;
  text-align: center;
  margin: 40rpx 0;
}

.divider::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 1rpx;
  background-color: #e5e5e5;
}

.divider-text {
  position: relative;
  background-color: #fff;
  padding: 0 20rpx;
  color: #999;
  font-size: 24rpx;
}

.login-form {
  margin-top: 20rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333;
  box-sizing: border-box;
}

.login-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  margin-top: 20rpx;
}

.login-btn::after {
  border: none;
}

.switch-login-type {
  text-align: center;
  margin-top: 30rpx;
}

.switch-text {
  color: #667eea;
  font-size: 26rpx;
}

.switch-section {
  display: flex;
  justify-content: center;
  margin-top: 40rpx;
}

.switch-item {
  padding: 20rpx 40rpx;
}
</style>
