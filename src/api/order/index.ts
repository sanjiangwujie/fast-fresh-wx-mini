import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import type { Orders, Orders_Order_By, Carts } from "@/types/graphql";

interface DeliveryAddress {
  receiver_name: string;
  receiver_phone: string;
  province: string;
  city: string;
  district: string;
  detail_address: string;
  postal_code?: string;
}

interface CreateOrderParams {
  userId: string | number;
  cartItems: Carts[];
  deliveryAddress: DeliveryAddress;
  remark?: string;
  totalAmount: number;
  freightAmount?: number;
  discountAmount?: number;
  actualAmount: number;
}

/**
 * 获取订单列表
 * @param userId 用户ID
 * @param args 查询参数
 * @returns 订单列表（包含 order_products 信息）
 */
export const getOrders = async (
  userId: string | number,
  args: {
    order_status?: string | null;
    order_by?: Orders_Order_By[];
    limit?: number;
    offset?: number;
  } = {}
): Promise<Orders[]> => {
  // 构建 where 条件
  const whereConditions: any = {
    user_users: { _eq: Number(userId) },
    is_deleted: { _eq: false },
  };

  if (args.order_status) {
    whereConditions.order_status = { _eq: args.order_status };
  }

  const query = `
    query GetOrders($where: orders_bool_exp!, $order_by: [orders_order_by!], $limit: Int, $offset: Int) {
      orders(
        where: $where
        order_by: $order_by
        limit: $limit
        offset: $offset
      ) {
        id
        order_status
        payment_status
        total_amount
        discount_amount
        freight_amount
        actual_amount
        remark
        payment_voucher_url
        created_at
        updated_at
        order_products {
          id
          product_name
          product_image_url
          product_unit
          quantity
          unit_price
          total_price
        }
      }
    }
  `;

  const orderBy: Orders_Order_By[] = args.order_by || [
    {
      created_at: "desc" as any,
    },
  ];

  const result = await client.execute<{ orders: Orders[] }>({
    query,
    variables: {
      where: whereConditions,
      order_by: orderBy,
      limit: args.limit || 20,
      offset: args.offset || 0,
    },
  });

  return result.orders || [];
};

/**
 * 通过订单ID获取订单详情
 * @param orderId 订单ID
 * @returns 订单详情
 */
export const getOrderById = async (orderId: string | number): Promise<Orders | null> => {
  const query = `
    query GetOrderById($id: bigint!) {
      orders_by_pk(id: $id) {
        id
        order_status
        payment_status
        total_amount
        discount_amount
        freight_amount
        actual_amount
        remark
        payment_voucher_url
        delivery_address
        admin_remark
        abnormal_remark
        is_abnormal
        created_at
        updated_at
        order_products {
          id
          product_name
          product_image_url
          product_unit
          quantity
          unit_price
          total_price
        }
        order_delivery_media_files {
          id
          file_type
          file_url
        }
      }
    }
  `;

  const result = await client.execute<{ orders_by_pk: Orders | null }>({
    query,
    variables: {
      id: Number(orderId),
    },
  });

  return result.orders_by_pk || null;
};

/**
 * 创建订单
 * @param params 订单参数
 * @returns 创建的订单
 */
export const createOrder = async (params: CreateOrderParams): Promise<Orders | null> => {
  const { userId, cartItems, deliveryAddress, remark, totalAmount, freightAmount = 0, discountAmount = 0, actualAmount } = params;

  // 构建订单商品数据
  const orderProducts = cartItems.map((item) => {
    const unitPrice = Number(item.product?.unit_price || 0);
    const quantity = Number(item.quantity || 0);
    return {
      product_products: Number(item.product_products),
      product_name: item.product?.name || "",
      product_image_url: item.product?.image_url || null,
      product_unit: item.product?.unit || null,
      quantity: quantity,
      unit_price: unitPrice,
      total_price: unitPrice * quantity,
    };
  });

  const mutation = `
    mutation CreateOrder(
      $user_users: bigint!
      $total_amount: numeric!
      $freight_amount: numeric!
      $discount_amount: numeric!
      $actual_amount: numeric!
      $remark: String
      $delivery_address: jsonb!
      $order_products: [order_products_insert_input!]!
    ) {
      insert_orders_one(
        object: {
          user_users: $user_users
          order_status: "pending"
          payment_status: "pending"
          total_amount: $total_amount
          freight_amount: $freight_amount
          discount_amount: $discount_amount
          actual_amount: $actual_amount
          remark: $remark
          delivery_address: $delivery_address
          is_deleted: false
          is_abnormal: false
          order_products: { data: $order_products }
        }
      ) {
        id
        order_status
        payment_status
        total_amount
        discount_amount
        freight_amount
        actual_amount
        remark
        delivery_address
        created_at
        updated_at
        order_products {
          id
          product_name
          product_image_url
          product_unit
          quantity
          unit_price
          total_price
        }
      }
    }
  `;

  const result = await client.execute<{ insert_orders_one: Orders | null }>({
    query: mutation,
    variables: {
      user_users: Number(userId),
      total_amount: totalAmount,
      freight_amount: freightAmount,
      discount_amount: discountAmount,
      actual_amount: actualAmount,
      remark: remark || null,
      delivery_address: deliveryAddress as any,
      order_products: orderProducts,
    },
  });

  return result.insert_orders_one || null;
};
