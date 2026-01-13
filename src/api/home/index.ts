import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import type { Home_Kingkong_Items, Home_Kingkong_Items_Order_By } from "@/types/graphql";

/**
 * 获取首页金刚区列表
 * @param args 查询参数
 * @returns 金刚区列表
 */
export const getHomeKingkongItems = async (args: {
  where?: any;
  order_by?: Home_Kingkong_Items_Order_By[];
  limit?: number;
} = {}): Promise<Home_Kingkong_Items[]> => {
  const query = `
    query GetHomeKingkongItems($where: home_kingkong_items_bool_exp, $order_by: [home_kingkong_items_order_by!], $limit: Int) {
      home_kingkong_items(
        where: $where
        order_by: $order_by
        limit: $limit
      ) {
        id
        title
        img_url
        link_url
        sort
        created_at
        updated_at
      }
    }
  `;

  // 默认按sort升序排序（越小越靠前）
  const orderBy: Home_Kingkong_Items_Order_By[] = args.order_by || [
    {
      sort: "asc" as any,
    },
  ];

  const where = args.where || {};

  const result = await client.execute<{ home_kingkong_items: Home_Kingkong_Items[] }>({
    query,
    variables: {
      where,
      order_by: orderBy,
      limit: args.limit || 20,
    },
  });

  return result.home_kingkong_items || [];
};

// 默认导出（用于兼容某些模块系统）
export default {
  getHomeKingkongItems,
};
