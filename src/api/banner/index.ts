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

// 默认导出（用于兼容某些模块系统）
export default {
  getBanners,
};
