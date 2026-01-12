import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import type { Carts } from "@/types/graphql";

/**
 * 获取购物车列表
 * @param userId 用户ID
 * @returns 购物车列表（包含 product 信息）
 */
export const getCarts = async (userId: string | number): Promise<Carts[]> => {
  const query = `
    query GetCarts($userId: bigint!) {
      carts(
        where: { user_users: { _eq: $userId } }
        order_by: { created_at: desc }
      ) {
        id
        product_products
        quantity
        is_selected
        created_at
        updated_at
        product {
          id
          name
          image_url
          unit_price
          unit_stock
          unit
          sales
        }
      }
    }
  `;

  const result = await client.execute<{ carts: Carts[] }>({
    query,
    variables: {
      userId: Number(userId),
    },
  });

  return result.carts || [];
};

/**
 * 添加商品到购物车
 * 如果购物车中已有该商品，则增加数量；否则插入新记录
 * 使用 on_conflict 约束实现 upsert，通过先查询当前数量再累加
 * @param userId 用户ID
 * @param productId 商品ID
 * @param quantity 数量
 * @returns 购物车项
 */
export const addToCart = async (
  userId: string | number,
  productId: string | number,
  quantity: number
): Promise<Carts | null> => {
  // 查询购物车中是否已有该商品，获取当前数量
  const checkQuery = `
    query CheckCartItem($userId: bigint!, $productId: bigint!) {
      carts(
        where: {
          user_users: { _eq: $userId }
          product_products: { _eq: $productId }
        }
        limit: 1
      ) {
        id
        quantity
      }
    }
  `;

  const checkResult = await client.execute<{ carts: Array<{ id: bigint; quantity: number }> }>({
    query: checkQuery,
    variables: {
      userId: Number(userId),
      productId: Number(productId),
    },
  });

  // 计算新数量：如果已存在则累加，否则使用传入的数量
  const newQuantity =
    checkResult.carts && checkResult.carts.length > 0
      ? Number(checkResult.carts[0].quantity) + Number(quantity)
      : Number(quantity);

  // 使用 insert_carts_one 配合 on_conflict 实现 upsert
  // 注意：Hasura 的 on_conflict 更新操作使用 _set，所以需要先计算好新数量
  const mutation = `
    mutation AddToCart($userId: bigint!, $productId: bigint!, $quantity: bigint!) {
      insert_carts_one(
        object: {
          user_users: $userId
          product_products: $productId
          quantity: $quantity
          is_selected: true
        }
        on_conflict: {
          constraint: carts_user_users_product_products_key
          update_columns: [quantity, is_selected]
        }
      ) {
        id
        product_products
        quantity
        is_selected
        created_at
        updated_at
      }
    }
  `;

  const result = await client.execute<{ insert_carts_one: Carts | null }>({
    query: mutation,
    variables: {
      userId: Number(userId),
      productId: Number(productId),
      quantity: newQuantity,
    },
  });

  return result.insert_carts_one || null;
};

/**
 * 删除购物车项
 * @param cartId 购物车项ID
 * @returns 是否删除成功
 */
export const deleteCart = async (cartId: string | number): Promise<boolean> => {
  const mutation = `
    mutation DeleteCart($id: bigint!) {
      delete_carts_by_pk(id: $id) {
        id
      }
    }
  `;

  try {
    await client.execute<{ delete_carts_by_pk: { id: bigint } | null }>({
      query: mutation,
      variables: {
        id: Number(cartId),
      },
    });
    return true;
  } catch (error) {
    console.error("删除购物车项失败:", error);
    return false;
  }
};

/**
 * 批量删除购物车项
 * @param cartIds 购物车项ID数组
 * @returns 删除的数量
 */
export const deleteCarts = async (cartIds: (string | number)[]): Promise<number> => {
  const mutation = `
    mutation DeleteCarts($ids: [bigint!]!) {
      delete_carts(where: { id: { _in: $ids } }) {
        affected_rows
      }
    }
  `;

  try {
    const result = await client.execute<{ delete_carts: { affected_rows: number } }>({
      query: mutation,
      variables: {
        ids: cartIds.map((id) => Number(id)),
      },
    });
    return result.delete_carts.affected_rows;
  } catch (error) {
    console.error("批量删除购物车项失败:", error);
    return 0;
  }
};

/**
 * 更新购物车项数量
 * @param cartId 购物车项ID
 * @param quantity 新数量
 * @returns 更新后的购物车项
 */
export const updateCartQuantity = async (
  cartId: string | number,
  quantity: number
): Promise<Carts | null> => {
  const mutation = `
    mutation UpdateCartQuantity($id: bigint!, $quantity: bigint!) {
      update_carts_by_pk(
        pk_columns: { id: $id }
        _set: { quantity: $quantity }
      ) {
        id
        product_products
        quantity
        is_selected
        created_at
        updated_at
        product {
          id
          name
          image_url
          unit_price
          unit_stock
          unit
          sales
        }
      }
    }
  `;

  try {
    const result = await client.execute<{ update_carts_by_pk: Carts | null }>({
      query: mutation,
      variables: {
        id: Number(cartId),
        quantity: Number(quantity),
      },
    });
    return result.update_carts_by_pk || null;
  } catch (error) {
    console.error("更新购物车数量失败:", error);
    throw error;
  }
};
