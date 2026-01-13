import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import type { Banners, Banners_Order_By } from "@/types/graphql";

/**
 * 获取轮播图列表
 * @param args 查询参数
 * @returns 轮播图列表
 */
export const getBanners = async (args: {
  where?: any;
  order_by?: Banners_Order_By[];
  limit?: number;
} = {}): Promise<Banners[]> => {
  const query = `
    query GetBanners($where: banners_bool_exp, $order_by: [banners_order_by!], $limit: Int) {
      banners(
        where: $where
        order_by: $order_by
        limit: $limit
      ) {
        id
        media_file_type
        media_file_url
        created_at
        updated_at
      }
    }
  `;

  const orderBy: Banners_Order_By[] = args.order_by || [
    {
      created_at: "desc" as any,
    },
  ];

  const where = args.where || {};

  const result = await client.execute<{ banners: Banners[] }>({
    query,
    variables: {
      where,
      order_by: orderBy,
      limit: args.limit || 10,
    },
  });

  return result.banners || [];
};

/**
 * 创建轮播图
 */
export const createBanner = async (params: {
  media_file_type: string;
  media_file_url?: string | null;
}): Promise<Banners | null> => {
  const mutation = `
    mutation CreateBanner($media_file_type: String!, $media_file_url: String) {
      insert_banners_one(object: { media_file_type: $media_file_type, media_file_url: $media_file_url }) {
        id
        media_file_type
        media_file_url
        created_at
        updated_at
      }
    }
  `;

  const result = await client.execute<{ insert_banners_one: Banners | null }>({
    query: mutation,
    variables: {
      media_file_type: params.media_file_type,
      media_file_url: params.media_file_url || null,
    },
  });

  return result.insert_banners_one;
};

/**
 * 更新轮播图
 */
export const updateBanner = async (
  id: string | number,
  params: {
    media_file_type?: string;
    media_file_url?: string | null;
  }
): Promise<Banners | null> => {
  const mutation = `
    mutation UpdateBanner($id: bigint!, $media_file_type: String, $media_file_url: String) {
      update_banners_by_pk(
        pk_columns: { id: $id }
        _set: { media_file_type: $media_file_type, media_file_url: $media_file_url }
      ) {
        id
        media_file_type
        media_file_url
        created_at
        updated_at
      }
    }
  `;

  const setData: any = {};
  if (params.media_file_type !== undefined) setData.media_file_type = params.media_file_type;
  if (params.media_file_url !== undefined) setData.media_file_url = params.media_file_url;

  const result = await client.execute<{ update_banners_by_pk: Banners | null }>({
    query: mutation,
    variables: {
      id: Number(id),
      ...setData,
    },
  });

  return result.update_banners_by_pk;
};

/**
 * 删除轮播图
 */
export const deleteBanner = async (id: string | number): Promise<boolean> => {
  const mutation = `
    mutation DeleteBanner($id: bigint!) {
      delete_banners_by_pk(id: $id) {
        id
      }
    }
  `;

  const result = await client.execute<{ delete_banners_by_pk: { id: bigint } | null }>({
    query: mutation,
    variables: {
      id: Number(id),
    },
  });

  return result.delete_banners_by_pk !== null;
};

// 默认导出（用于兼容某些模块系统）
export default {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
};
