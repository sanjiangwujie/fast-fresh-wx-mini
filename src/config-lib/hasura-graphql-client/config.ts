import type { GraphQLClientConfig,RequestListener ,RequestLifecycle} from "graphql-ormify-client";
import { graphqlOrmifyClientConfig as config } from "@/project-config";

// 动态获取token的函数
function getToken(): string | null {
  try {
    return uni.getStorageSync("token") || null;
  } catch (e) {
    return null;
  }
}

// 动态构建headers，包含token
function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    ...config.headers,
  };
  
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
}

export const graphqlOrmifyClientConfig: GraphQLClientConfig = {
  endpoint: config.endpoint,
  headers: getHeaders(),
  debug:false
};

// 每次请求时动态更新headers
export const graphqlOrmifyClientRequestListener: RequestListener = {
  onRequest: (info: RequestLifecycle) => {
    // 动态更新headers，确保每次请求都包含最新的token
    if (info.config && info.config.headers) {
      const token = getToken();
      if (token) {
        info.config.headers = {
          ...info.config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }
    console.log("request-start", {id:info?.id,query: info?.config?.data?.query, variables: info?.config?.data?.variables});
  },
  onResponse: (info: RequestLifecycle) => {
    console.log("response-end", {id:info?.id,data: info?.response});
  },
};