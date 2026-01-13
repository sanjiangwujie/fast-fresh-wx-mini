/**
 * 登录相关API
 */

import { API_BASE_URL } from "@/project-config";

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
export function saveLoginInfo(response: LoginResponse): void {
  uni.setStorageSync("token", response.token);
  uni.setStorageSync("userId", response.userId);
  uni.setStorageSync("userInfo", response.user);
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
 * 清除登录信息
 */
export function clearLoginInfo(): void {
  uni.removeStorageSync("token");
  uni.removeStorageSync("userId");
  uni.removeStorageSync("userInfo");
}

/**
 * 检查是否已登录
 */
export function isLoggedIn(): boolean {
  return !!getToken();
}
