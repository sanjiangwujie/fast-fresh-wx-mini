import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import type { Orders, Orders_Order_By, Carts } from "@/types/graphql";

interface DeliveryAddress {
  receiver_name: string;
  receiver_phone: string;
  detail_address: string;
  receiver_province?: string;
  receiver_city?: string;
  receiver_district?: string;
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
    payment_status?: string | null;
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

  if (args.payment_status) {
    whereConditions.payment_status = { _eq: args.payment_status };
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
 * 获取所有订单列表（运营人员使用，不限制用户ID）
 * @param args 查询参数
 * @returns 订单列表（包含 order_products 和用户信息）
 */
export const getAllOrders = async (
  args: {
    order_status?: string | null;
    payment_status?: string | null;
    order_by?: Orders_Order_By[];
    limit?: number;
    offset?: number;
  } = {}
): Promise<Orders[]> => {
  // 构建 where 条件
  const whereConditions: any = {
    is_deleted: { _eq: false },
  };

  if (args.order_status) {
    whereConditions.order_status = { _eq: args.order_status };
  }

  if (args.payment_status) {
    whereConditions.payment_status = { _eq: args.payment_status };
  }

  const query = `
    query GetAllOrders($where: orders_bool_exp!, $order_by: [orders_order_by!], $limit: Int, $offset: Int) {
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
        receiver_name
        receiver_phone
        receiver_address
        receiver_province
        receiver_city
        receiver_district
        created_at
        updated_at
        user {
          id
          phone
          nickname
        }
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
        receiver_name
        receiver_phone
        receiver_address
        receiver_province
        receiver_city
        receiver_district
        admin_remark
        abnormal_remark
        is_abnormal
        created_at
        updated_at
        order_products {
          id
          product_products
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
  
  // 检查商品状态：不能包含已删除或已下架的商品
  for (const cartItem of cartItems) {
    const product = cartItem.product;
    if (!product) {
      throw new Error(`商品不存在（购物车项ID: ${cartItem.id}）`);
    }
    
    if (product.is_deleted) {
      throw new Error(`商品"${product.name}"已删除，无法下单`);
    }
    
    if (product.is_off_shelf) {
      throw new Error(`商品"${product.name}"已下架，无法下单`);
    }
  }
  
  // 调试日志：确认传入的用户ID
  console.log("[创建订单] 传入的用户ID:", userId);
  console.log("[创建订单] 用户ID类型:", typeof userId);

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
      $receiver_name: String!
      $receiver_phone: String!
      $receiver_address: String!
      $receiver_province: String
      $receiver_city: String
      $receiver_district: String
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
          receiver_name: $receiver_name
          receiver_phone: $receiver_phone
          receiver_address: $receiver_address
          receiver_province: $receiver_province
          receiver_city: $receiver_city
          receiver_district: $receiver_district
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
        receiver_name
        receiver_phone
        receiver_address
        receiver_province
        receiver_city
        receiver_district
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

  // 调试日志：确认发送到服务器的变量
  const userUsersValue = Number(userId);
  console.log("[创建订单] 发送到服务器的 user_users 值:", userUsersValue);
  console.log("[创建订单] 订单变量:", {
    user_users: userUsersValue,
    total_amount: totalAmount,
    actual_amount: actualAmount,
  });

  const result = await client.execute<{ insert_orders_one: Orders | null }>({
    query: mutation,
    variables: {
      user_users: userUsersValue,
      total_amount: totalAmount,
      freight_amount: freightAmount,
      discount_amount: discountAmount,
      actual_amount: actualAmount,
      remark: remark || null,
      receiver_name: deliveryAddress.receiver_name,
      receiver_phone: deliveryAddress.receiver_phone,
      receiver_address: deliveryAddress.detail_address,
      receiver_province: deliveryAddress.receiver_province || null,
      receiver_city: deliveryAddress.receiver_city || null,
      receiver_district: deliveryAddress.receiver_district || null,
      order_products: orderProducts,
    },
  });

  // 调试日志：确认创建的订单
  console.log("[创建订单] 订单创建结果:", result.insert_orders_one);
  if (result.insert_orders_one) {
    console.log("[创建订单] 订单ID:", result.insert_orders_one.id);
  }

  return result.insert_orders_one || null;
};

/**
 * 更新订单付款截图
 * @param orderId 订单ID
 * @param paymentVoucherUrl 付款截图URL（可选）
 * @returns 更新后的订单
 */
export const updateOrderPaymentVoucher = async (
  orderId: string | number,
  paymentVoucherUrl?: string | null
): Promise<Orders | null> => {
  const mutation = `
    mutation UpdateOrderPaymentVoucher($id: bigint!, $payment_voucher_url: String) {
      update_orders_by_pk(
        pk_columns: { id: $id }
        _set: { payment_voucher_url: $payment_voucher_url, payment_status: "paid" }
      ) {
        id
        order_status
        payment_status
        payment_voucher_url
        total_amount
        discount_amount
        freight_amount
        actual_amount
        remark
        receiver_name
        receiver_phone
        receiver_address
        receiver_province
        receiver_city
        receiver_district
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

  const result = await client.execute<{ update_orders_by_pk: Orders | null }>({
    query: mutation,
    variables: {
      id: Number(orderId),
      payment_voucher_url: paymentVoucherUrl || null,
    },
  });

  return result.update_orders_by_pk || null;
};

/**
 * 确认订单（运营人员使用）
 * 功能：
 * 1. 校验库存（检查每个商品的库存是否足够）
 * 2. 锁库存（减少库存）
 * 3. 更新订单状态为 confirmed
 * @param orderId 订单ID
 * @returns 更新后的订单
 */
export const confirmOrder = async (orderId: string | number): Promise<Orders | null> => {
  // 先获取订单详情，包括订单商品
  const orderDetail = await getOrderById(orderId);
  if (!orderDetail) {
    throw new Error("订单不存在");
  }

  // 检查订单状态
  if (orderDetail.order_status !== "pending") {
    throw new Error("订单状态不正确，只能确认待确认状态的订单");
  }

  // 检查支付状态
  if (orderDetail.payment_status !== "paid" && orderDetail.payment_status !== "approved") {
    throw new Error("订单尚未支付，无法确认");
  }

  // 校验库存并锁库存
  const stockUpdates: Array<{ productId: number; quantity: number; productName: string }> = [];
  
  for (const orderProduct of orderDetail.order_products) {
    const productId = Number(orderProduct.product_products);
    const quantity = Number(orderProduct.quantity);
    
    // 查询商品当前库存
    const productQuery = `
      query GetProductStock($id: bigint!) {
        products_by_pk(id: $id) {
          id
          unit_stock
          name
        }
      }
    `;
    
    const productResult = await client.execute<{ products_by_pk: { id: number; unit_stock: number | null; name: string | null } | null }>({
      query: productQuery,
      variables: { id: productId },
    });

    if (!productResult.products_by_pk) {
      throw new Error(`商品不存在: ${orderProduct.product_name || productId}`);
    }

    const currentStock = Number(productResult.products_by_pk.unit_stock || 0);
    
    // 校验库存
    if (currentStock < quantity) {
      throw new Error(`商品"${orderProduct.product_name || productResult.products_by_pk.name || '未知'}"库存不足，当前库存: ${currentStock}，需要: ${quantity}`);
    }

    stockUpdates.push({ 
      productId, 
      quantity,
      productName: orderProduct.product_name || productResult.products_by_pk.name || '未知'
    });
  }

  // 先更新每个商品的库存（减少库存）
  for (const { productId, quantity } of stockUpdates) {
    const stockMutation = `
      mutation UpdateProductStockAndSales($id: bigint!, $stock_delta: bigint!, $sales_delta: bigint!) {
        update_products_by_pk(
          pk_columns: { id: $id }
          _inc: { unit_stock: $stock_delta, sales: $sales_delta }
        ) {
          id
          unit_stock
          sales
        }
      }
    `;

    // 注意：这里使用负数来减少库存
    await client.execute({
      query: stockMutation,
      variables: {
        id: productId,
        stock_delta: -quantity, // 负数表示减少库存
        sales_delta: quantity, // 正数表示增加销量
      },
    });
  }

  // 然后更新订单状态
  const orderMutation = `
    mutation ConfirmOrder($orderId: bigint!) {
      update_orders_by_pk(
        pk_columns: { id: $orderId }
        _set: { order_status: "confirmed" }
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
        receiver_name
        receiver_phone
        receiver_address
        receiver_province
        receiver_city
        receiver_district
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

  const orderResult = await client.execute<{ update_orders_by_pk: Orders | null }>({
    query: orderMutation,
    variables: {
      orderId: Number(orderId),
    },
  });

  return orderResult.update_orders_by_pk || null;
};
