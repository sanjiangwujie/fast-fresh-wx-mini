import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import type { App } from "@/types/graphql";

/**
 * 获取 app 配置信息
 * @returns app 配置
 */
export const getAppConfig = async (): Promise<App | null> => {
  const query = `
    query GetAppConfig {
      app(limit: 1) {
        id
        wechat_code
        payment_code
        created_at
        updated_at
      }
    }
  `;

  const result = await client.execute<{ app: App[] }>({
    query,
  });

  return result.app && result.app.length > 0 ? result.app[0] : null;
};
