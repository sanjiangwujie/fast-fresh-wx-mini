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

/**
 * 创建快捷菜单
 */
export const createKingkongItem = async (params: {
  title: string;
  img_url?: string | null;
  link_url?: string | null;
  sort?: number;
}): Promise<Home_Kingkong_Items | null> => {
  const mutation = `
    mutation CreateKingkongItem($title: String!, $img_url: String, $link_url: String, $sort: bigint) {
      insert_home_kingkong_items_one(
        object: { title: $title, img_url: $img_url, link_url: $link_url, sort: $sort }
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

  const result = await client.execute<{ insert_home_kingkong_items_one: Home_Kingkong_Items | null }>({
    query: mutation,
    variables: {
      title: params.title,
      img_url: params.img_url || null,
      link_url: params.link_url || null,
      sort: params.sort || 0,
    },
  });

  return result.insert_home_kingkong_items_one;
};

/**
 * 更新快捷菜单
 */
export const updateKingkongItem = async (
  id: string | number,
  params: {
    title?: string;
    img_url?: string | null;
    link_url?: string | null;
    sort?: number;
  }
): Promise<Home_Kingkong_Items | null> => {
  const mutation = `
    mutation UpdateKingkongItem($id: bigint!, $title: String, $img_url: String, $link_url: String, $sort: bigint) {
      update_home_kingkong_items_by_pk(
        pk_columns: { id: $id }
        _set: { title: $title, img_url: $img_url, link_url: $link_url, sort: $sort }
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

  const setData: any = {};
  if (params.title !== undefined) setData.title = params.title;
  if (params.img_url !== undefined) setData.img_url = params.img_url;
  if (params.link_url !== undefined) setData.link_url = params.link_url;
  if (params.sort !== undefined) setData.sort = params.sort;

  const result = await client.execute<{ update_home_kingkong_items_by_pk: Home_Kingkong_Items | null }>({
    query: mutation,
    variables: {
      id: Number(id),
      ...setData,
    },
  });

  return result.update_home_kingkong_items_by_pk;
};

/**
 * 删除快捷菜单
 */
export const deleteKingkongItem = async (id: string | number): Promise<boolean> => {
  const mutation = `
    mutation DeleteKingkongItem($id: bigint!) {
      delete_home_kingkong_items_by_pk(id: $id) {
        id
      }
    }
  `;

  const result = await client.execute<{ delete_home_kingkong_items_by_pk: { id: bigint } | null }>({
    query: mutation,
    variables: {
      id: Number(id),
    },
  });

  return result.delete_home_kingkong_items_by_pk !== null;
};

// 默认导出（用于兼容某些模块系统）
export default {
  getHomeKingkongItems,
  createKingkongItem,
  updateKingkongItem,
  deleteKingkongItem,
};
