import graphqlOrmfyClientConfig from "../goc.config";

export const graphqlOrmifyClientConfig = {
  endpoint: graphqlOrmfyClientConfig.endpoint,
  headers: graphqlOrmfyClientConfig.headers,
};

// API基础URL配置
// 判断是否在微信开发者工具中
function isWeChatDevTools(): boolean {
  // #ifdef MP-WEIXIN
  try {
    // 在微信小程序中，通过 getSystemInfoSync 判断
    // 开发者工具中 platform 通常是 'devtools'
    const systemInfo = uni.getSystemInfoSync();
    // 检查是否在开发者工具中
    // @ts-ignore - 微信小程序环境中存在wx对象
    if (typeof (globalThis as any).wx !== 'undefined') {
      // @ts-ignore
      const wxSystemInfo = (globalThis as any).wx.getSystemInfoSync();
      return wxSystemInfo.platform === 'devtools';
    }
    // 如果无法获取wx对象，尝试通过uni.getSystemInfoSync判断
    // 开发者工具中某些环境变量可能不同
    return false; // 如果无法判断，默认返回false使用生产环境
  } catch (e) {
    // 如果获取失败，默认不在开发者工具中
    return false;
  }
  // #endif
  
  // 非微信小程序环境，默认不在开发者工具中
  return false;
}

// 根据环境设置API地址
// 在微信开发者工具中使用本地地址，其他环境使用生产地址
export const API_BASE_URL = "https://sanjiangwujie-1-api.weweknow.com";
