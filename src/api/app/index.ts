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
        contact_code
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

/**
 * 更新 app 配置信息
 * @param params 更新参数
 * @returns 更新后的 app 配置
 */
export const updateAppConfig = async (params: {
  contact_code?: string | null;
  payment_code?: string | null;
  wechat_code?: string | null;
}): Promise<App | null> => {
  // 先获取当前配置，确保有 id
  const currentConfig = await getAppConfig();
  if (!currentConfig) {
    throw new Error("未找到 app 配置");
  }

  const mutation = `
    mutation UpdateAppConfig($id: bigint!, $contact_code: String, $payment_code: String, $wechat_code: String) {
      update_app_by_pk(
        pk_columns: { id: $id }
        _set: { contact_code: $contact_code, payment_code: $payment_code, wechat_code: $wechat_code }
      ) {
        id
        contact_code
        wechat_code
        payment_code
        created_at
        updated_at
      }
    }
  `;

  const setData: any = {};
  if (params.contact_code !== undefined) setData.contact_code = params.contact_code;
  if (params.payment_code !== undefined) setData.payment_code = params.payment_code;
  if (params.wechat_code !== undefined) setData.wechat_code = params.wechat_code;

  const result = await client.execute<{ update_app_by_pk: App | null }>({
    query: mutation,
    variables: {
      id: currentConfig.id,
      ...setData,
    },
  });

  return result.update_app_by_pk;
};
