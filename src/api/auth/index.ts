/**
 * 登录相关API
 */

import { API_BASE_URL } from "@/project-config";
import { getUserRoles as fetchUserRoles } from "@/api/user";

export interface LoginResponse {
  userId: string;
  token: string;
  user: {
    id: string;
    phone: string;
    nickname?: string | null;
    avatar_url?: string | null;
  };
}

export interface WxLoginParams {
  code: string;
  codeSource: "phone" | "login";
}

export interface PhoneLoginParams {
  phone: string;
  code: string;
}

export interface PasswordLoginParams {
  phone: string;
  password: string;
}

/**
 * 微信小程序手机号授权登录
 */
export async function wxLogin(params: WxLoginParams): Promise<LoginResponse> {
  const response = await uni.request({
    url: `${API_BASE_URL}/api/auth/wx-login`,
    method: "POST",
    header: {
      "Content-Type": "application/json",
    },
    data: params,
  });

  if (response.statusCode !== 200) {
    const error = (response.data as any)?.error || "登录失败";
    throw new Error(error);
  }

  return response.data as LoginResponse;
}

/**
 * 手机号验证码登录
 */
export async function phoneLogin(params: PhoneLoginParams): Promise<LoginResponse> {
  const response = await uni.request({
    url: `${API_BASE_URL}/api/auth/phone-login`,
    method: "POST",
    header: {
      "Content-Type": "application/json",
    },
    data: params,
  });

  if (response.statusCode !== 200) {
    const error = (response.data as any)?.error || "登录失败";
    throw new Error(error);
  }

  return response.data as LoginResponse;
}

/**
 * 密码登录
 */
export async function passwordLogin(params: PasswordLoginParams): Promise<LoginResponse> {
  const response = await uni.request({
    url: `${API_BASE_URL}/api/auth/password-login`,
    method: "POST",
    header: {
      "Content-Type": "application/json",
    },
    data: params,
  });

  if (response.statusCode !== 200) {
    const error = (response.data as any)?.error || "登录失败";
    throw new Error(error);
  }

  return response.data as LoginResponse;
}

/**
 * 保存登录信息到本地存储
 */
export async function saveLoginInfo(response: LoginResponse): Promise<void> {
  uni.setStorageSync("token", response.token);
  uni.setStorageSync("userId", response.userId);
  uni.setStorageSync("userInfo", response.user);
  
  // 登录时立即获取并保存用户角色，减少后续请求
  try {
    const roles = await fetchUserRoles(response.userId);
    uni.setStorageSync("userRoles", roles);
    console.log("[登录] 已保存用户角色:", roles);
  } catch (error) {
    console.error("[登录] 获取用户角色失败:", error);
    // 即使获取角色失败也不影响登录流程
    uni.setStorageSync("userRoles", []);
  }
}

/**
 * 获取本地存储的token
 */
export function getToken(): string | null {
  return uni.getStorageSync("token") || null;
}

/**
 * 获取本地存储的用户ID
 */
export function getUserId(): string | null {
  return uni.getStorageSync("userId") || null;
}

/**
 * 获取本地存储的用户信息
 */
export function getUserInfo(): LoginResponse["user"] | null {
  return uni.getStorageSync("userInfo") || null;
}

/**
 * 获取本地存储的用户角色
 */
export function getUserRoles(): Array<{ role_type?: string | null }> {
  return uni.getStorageSync("userRoles") || [];
}

/**
 * 清除登录信息
 */
export function clearLoginInfo(): void {
  uni.removeStorageSync("token");
  uni.removeStorageSync("userId");
  uni.removeStorageSync("userInfo");
  uni.removeStorageSync("userRoles");
}

/**
 * 检查是否已登录
 */
export function isLoggedIn(): boolean {
  return !!getToken();
}
