import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import type { 
  Products, 
  Products_Bool_Exp, 
  Products_Order_By,
  Product_Price_History,
  Product_Price_History_Order_By
} from "@/types/graphql";

/**
 * 获取产品列表
 * @param args 查询参数
 * @returns 产品列表
 */
export const getProducts = async (args: {
  where?: Products_Bool_Exp;
  order_by?: Products_Order_By[];
  limit?: number;
  offset?: number;
  includeDeleted?: boolean; // 是否包含已删除的商品（管理员查看时使用）
} = {}): Promise<Products[]> => {
  // 构建where条件：默认过滤已删除的商品
  const whereCondition: Products_Bool_Exp = {
    ...args.where,
    ...(args.includeDeleted ? {} : { is_deleted: { _eq: false } }),
  };

  const query = `
    query GetProducts($where: products_bool_exp, $order_by: [products_order_by!], $limit: Int, $offset: Int) {
      products(where: $where, order_by: $order_by, limit: $limit, offset: $offset) {
        id
        name
        image_url
        unit_price
        unit_stock
        unit
        retail_unit
        gross_weight
        net_weight
        sales
        batch_batches
        category_categories
        origin_origins
        category {
          id
          name
          category_name
        }
        origin {
          id
          name
          category_name
        }
        is_off_shelf
        is_deleted
        created_at
        updated_at
      }
    }
  `;

  const result = await client.execute<{ products: Products[] }>({
    query,
    variables: {
      where: whereCondition,
      order_by: args.order_by || undefined,
      limit: args.limit || 20,
      offset: args.offset || 0,
    },
  });

  return result.products || [];
};

/**
 * 搜索商品（根据名称模糊搜索）
 * @param keyword 搜索关键词
 * @param limit 每页数量
 * @param offset 偏移量
 * @returns 商品列表
 */
export const searchProducts = async (
  keyword: string,
  limit: number = 20,
  offset: number = 0
): Promise<Products[]> => {
  const query = `
    query SearchProducts($keyword: String!, $limit: Int, $offset: Int) {
      products(
        where: { 
          name: { _ilike: $keyword },
          is_deleted: { _eq: false }
        }
        limit: $limit
        offset: $offset
        order_by: { created_at: desc }
      ) {
        id
        name
        image_url
        unit_price
        unit_stock
        unit
        retail_unit
        gross_weight
        net_weight
        sales
        batch_batches
        category_categories
        origin_origins
        category {
          id
          name
          category_name
        }
        origin {
          id
          name
          category_name
        }
        is_off_shelf
        is_deleted
        created_at
        updated_at
      }
    }
  `;

  const result = await client.execute<{ products: Products[] }>({
    query,
    variables: {
      keyword: `%${keyword}%`,
      limit,
      offset,
    },
  });

  return result.products || [];
};

/**
 * 通过主键获取产品
 * @param id 产品ID
 * @returns 产品
 */
export const getProductById = async (id: string | number): Promise<Products | null> => {
    const query = `
      query GetProductById($id: bigint!) {
        products_by_pk(id: $id) {
          id
          name
          image_url
          unit_price
          unit_stock
          unit
          sales
          batch_batches
          category_categories
          origin_origins
          is_off_shelf
          is_deleted
          created_at
          updated_at
          detail_html
          after_sales_html
          retail_unit
          gross_weight
          net_weight
          batch {
            id
            image_url
            created_at
            batch_media_files(order_by: { media_category: asc, created_at: asc }) {
              id
              file_type
              file_url
              media_category
            }
            farmer {
              id
              name
              user {
                id
                nickname
                phone
              }
            }
          }
          category {
            id
            name
            category_name
          }
          origin {
            id
            name
            category_name
          }
        }
      }
    `;

    const result = await client.execute<{ products_by_pk: Products | null }>({
      query,
      variables: {
        id: Number(id),
      },
    });

    return result.products_by_pk || null;
};

/**
 * 价格历史记录接口
 */
export interface PriceHistoryItem {
  id: string | number;
  unit_price: number;
  recorded_at: string;
  change_type?: string;
  change_reason?: string;
}

/**
 * 行情预测结果接口
 */
export interface PriceForecast {
  trend: 'rising' | 'falling' | 'stable';
  forecast: string;
  confidence: number;
  currentPrice: number;
  predictedPrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  history: PriceHistoryItem[];
}

/**
 * 获取产品价格历史
 * @param productId 产品ID
 * @param days 查询天数，默认7天。如果为0或负数，则查询所有历史
 * @param limit 限制返回数量，默认不限制
 * @returns 价格历史记录列表
 */
export const getProductPriceHistory = async (
  productId: string | number,
  days: number = 7,
  limit?: number
): Promise<PriceHistoryItem[]> => {
    // 如果指定了天数，计算日期范围
    let daysAgoISO: string | undefined;
    if (days > 0) {
      const now = new Date();
      const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      daysAgoISO = daysAgo.toISOString();
    }

    const query = daysAgoISO
      ? `
        query GetProductPriceHistory($productId: bigint!, $daysAgo: timestamptz!, $limit: Int) {
          product_price_history(
            where: {
              product_products: { _eq: $productId }
              recorded_at: { _gte: $daysAgo }
            }
            order_by: { recorded_at: desc }
            limit: $limit
          ) {
            id
            unit_price
            recorded_at
            change_type
            change_reason
          }
        }
      `
      : `
        query GetProductPriceHistory($productId: bigint!, $limit: Int) {
          product_price_history(
            where: {
              product_products: { _eq: $productId }
            }
            order_by: { recorded_at: desc }
            limit: $limit
          ) {
            id
            unit_price
            recorded_at
            change_type
            change_reason
          }
        }
      `;

    const variables: any = {
      productId: Number(productId),
    };

    if (daysAgoISO) {
      variables.daysAgo = daysAgoISO;
    }

    if (limit) {
      variables.limit = limit;
    }

    const result = await client.execute<{ 
      product_price_history: Product_Price_History[] 
    }>({
      query,
      variables,
    });

    // 数据从数据库返回时是按 recorded_at desc 排序的（新到旧）
    // 需要反转为正序（旧到新），以便后续算法正确计算
    const history = (result.product_price_history || []).map(item => ({
      id: item.id,
      unit_price: Number(item.unit_price),
      recorded_at: item.recorded_at,
      change_type: item.change_type,
      change_reason: item.change_reason || undefined,
    }));
    
    // 反转数组，使其按时间正序排列（旧到新）
    return history.reverse();
};

/**
 * 获取产品所有价格变动历史
 * @param productId 产品ID
 * @param limit 限制返回数量，默认200条（支持一天多次变动）
 * @returns 价格历史记录列表（按时间倒序）
 */
export const getAllProductPriceHistory = async (
  productId: string | number,
  limit: number = 200
): Promise<PriceHistoryItem[]> => {
    try {
      const query = `
        query GetAllProductPriceHistory($productId: bigint!, $limit: Int) {
          product_price_history(
            where: {
              product_products: { _eq: $productId }
            }
            order_by: { recorded_at: desc }
            limit: $limit
          ) {
            id
            unit_price
            recorded_at
            change_type
            change_reason
          }
        }
      `;

      const result = await client.execute<{ 
        product_price_history: Product_Price_History[] 
      }>({
        query,
        variables: {
          productId: Number(productId),
          limit,
        },
      });

      // 数据从数据库返回时是按 recorded_at desc 排序的（新到旧）
      // 需要反转为正序（旧到新），以便前端正确显示
      const history = (result.product_price_history || []).map(item => ({
        id: item.id,
        unit_price: Number(item.unit_price),
        recorded_at: item.recorded_at,
        change_type: item.change_type,
        change_reason: item.change_reason || undefined,
      }));

      console.log(`[价格历史] 产品ID: ${productId}, 查询到 ${history.length} 条记录`);
      
      // 保持倒序（新到旧），因为前端显示逻辑基于倒序数据
      // 第一条是最新的，最后一条是最旧的
      return history;
    } catch (error) {
      console.error("[价格历史] 查询失败:", error);
      throw error;
    }
};

/**
 * 计算价格趋势
 * @param priceHistory 价格历史数据（按时间正序排列：旧到新）
 * @returns 趋势类型和预测值
 */
function calculatePriceTrend(priceHistory: PriceHistoryItem[]): {
  trend: 'rising' | 'falling' | 'stable';
  forecast: string;
  confidence: number;
} {
  if (priceHistory.length < 2) {
    return {
      trend: 'stable',
      forecast: '数据不足',
      confidence: 0,
    };
  }

  // 确保数据按时间正序排列（旧到新）
  const sortedHistory = [...priceHistory].sort((a, b) => 
    new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  // 计算最近7条记录的平均价格变化率（从旧到新）
  const recentDays = sortedHistory.slice(-7);
  const priceChanges: number[] = [];
  
  for (let i = 1; i < recentDays.length; i++) {
    const prevPrice = recentDays[i-1].unit_price;
    const currPrice = recentDays[i].unit_price;
    if (prevPrice > 0) {
      const changeRate = (currPrice - prevPrice) / prevPrice;
      priceChanges.push(changeRate);
    }
  }

  if (priceChanges.length === 0) {
    return {
      trend: 'stable',
      forecast: '行情平稳',
      confidence: 0.5,
    };
  }

  const avgChangeRate = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
  const variance = priceChanges.reduce((sum, rate) => {
    return sum + Math.pow(rate - avgChangeRate, 2);
  }, 0) / priceChanges.length;
  const stdDev = Math.sqrt(variance);

  // 判断趋势（基于平均变化率）
  let trend: 'rising' | 'falling' | 'stable';
  let forecast: string;
  
  if (avgChangeRate > 0.02) { // 平均上涨超过2%
    trend = 'rising';
    forecast = '价格上涨';
  } else if (avgChangeRate < -0.02) { // 平均下跌超过2%
    trend = 'falling';
    forecast = '价格下跌';
  } else {
    trend = 'stable';
    forecast = '行情平稳';
  }

  // 计算置信度（波动越小，置信度越高；数据点越多，置信度越高）
  const baseConfidence = Math.max(0, Math.min(1, 1 - stdDev * 10));
  const dataQualityFactor = Math.min(1, priceChanges.length / 6); // 数据点越多越好
  const confidence = baseConfidence * dataQualityFactor;

  return { trend, forecast, confidence };
}

/**
 * 预测未来价格
 * @param priceHistory 价格历史数据（按时间正序排列：旧到新）
 * @returns 预测价格范围
 */
function predictFuturePrice(priceHistory: PriceHistoryItem[]): {
  minPrice: number;
  maxPrice: number;
  expectedPrice: number;
} {
  if (priceHistory.length < 2) {
    // 如果没有足够数据，使用当前价格 ±5%
    const currentPrice = priceHistory[priceHistory.length - 1]?.unit_price || 0;
    return {
      minPrice: Math.max(0, currentPrice * 0.95),
      maxPrice: currentPrice * 1.05,
      expectedPrice: currentPrice,
    };
  }

  // 确保数据按时间正序排列（旧到新）
  const sortedHistory = [...priceHistory].sort((a, b) => 
    new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  // 使用最近7条记录进行线性回归预测
  const recentPrices = sortedHistory.slice(-7);
  const n = recentPrices.length;
  
  if (n < 2) {
    const currentPrice = recentPrices[recentPrices.length - 1]?.unit_price || 0;
    return {
      minPrice: Math.max(0, currentPrice * 0.95),
      maxPrice: currentPrice * 1.05,
      expectedPrice: currentPrice,
    };
  }
  
  // 线性回归：y = slope * x + intercept
  // x: 时间索引（0, 1, 2, ...），y: 价格
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  recentPrices.forEach((record, index) => {
    const x = index; // 时间索引：0, 1, 2, ..., n-1
    const y = record.unit_price;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });

  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 1e-10) {
    // 如果分母接近0，说明数据点几乎在同一条线上，使用平均值
    const avgPrice = sumY / n;
    return {
      minPrice: Math.max(0, avgPrice * 0.95),
      maxPrice: avgPrice * 1.05,
      expectedPrice: avgPrice,
    };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // 预测未来3-5天的价格（索引 n 到 n+4，即未来1-5天）
  // 使用未来3天作为预测点（索引 n+2）
  const futureDayIndex = n + 2; // 未来第3天
  const expectedPrice = slope * futureDayIndex + intercept;
  
  // 计算残差的标准差，用于估算预测区间
  const residuals = recentPrices.map((record, index) => {
    const predicted = slope * index + intercept;
    return Math.pow(record.unit_price - predicted, 2);
  });
  const mse = residuals.reduce((a, b) => a + b, 0) / n; // 均方误差
  const stdDev = Math.sqrt(mse);
  
  // 使用2倍标准差作为预测区间（约95%置信区间）
  // 但限制区间范围，避免过于极端
  const currentPrice = recentPrices[recentPrices.length - 1].unit_price;
  const priceRange = Math.max(stdDev * 2, currentPrice * 0.1); // 至少10%的波动范围

  return {
    minPrice: Math.max(0, expectedPrice - priceRange),
    maxPrice: expectedPrice + priceRange,
    expectedPrice: Math.max(0, expectedPrice),
  };
}

/**
 * 获取产品行情预测
 * @param productId 产品ID
 * @returns 行情预测结果
 */
export const getProductPriceForecast = async (productId: string | number): Promise<PriceForecast> => {
    const priceHistory = await getProductPriceHistory(productId, 30); // 获取30天数据用于预测
    
    if (priceHistory.length === 0) {
      // 如果没有历史数据，返回默认值
      return {
        trend: 'stable',
        forecast: '暂无数据',
        confidence: 0,
        currentPrice: 0,
        predictedPrice: 0,
        priceRange: {
          min: 0,
          max: 0,
        },
        history: [],
      };
    }
    
    // 确保数据按时间正序排列（旧到新），以便算法正确计算
    const sortedHistory = [...priceHistory].sort((a, b) => 
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
    
    const trend = calculatePriceTrend(sortedHistory);
    const prediction = predictFuturePrice(sortedHistory);
    // 当前价格应该是最新的一条记录（数组最后一条）
    const currentPrice = sortedHistory[sortedHistory.length - 1]?.unit_price || 0;
    
    return {
      trend: trend.trend,
      forecast: trend.forecast,
      confidence: trend.confidence,
      currentPrice,
      predictedPrice: prediction.expectedPrice,
      priceRange: {
        min: prediction.minPrice,
        max: prediction.maxPrice,
      },
      history: sortedHistory.slice(-7), // 返回最近7天的数据用于图表展示（按时间正序）
    };
};

/**
 * 创建商品（operator 使用）
 * @param params 商品参数
 * @returns 创建的商品
 */
export const createProduct = async (params: {
  name: string;
  batch_batches: string | number;
  image_url?: string | null;
  unit_price?: number | null;
  unit_stock?: number | null;
  unit?: string | null;
  category_categories?: string | number | null;
  origin_origins?: string | number | null;
  gross_weight: number;
  net_weight: number;
  retail_unit?: string | null;
  detail_html?: string | null;
  after_sales_html?: string | null;
}): Promise<Products | null> => {
  const mutation = `
    mutation CreateProduct(
      $name: String!
      $batch_batches: bigint!
      $image_url: String
      $unit_price: numeric
      $unit_stock: bigint
      $unit: String
      $category_categories: bigint
      $origin_origins: bigint
      $gross_weight: numeric!
      $net_weight: numeric!
      $retail_unit: String
      $detail_html: String
      $after_sales_html: String
    ) {
      insert_products_one(
        object: {
          name: $name
          batch_batches: $batch_batches
          image_url: $image_url
          unit_price: $unit_price
          unit_stock: $unit_stock
          unit: $unit
          category_categories: $category_categories
          origin_origins: $origin_origins
          gross_weight: $gross_weight
          net_weight: $net_weight
          retail_unit: $retail_unit
          detail_html: $detail_html
          after_sales_html: $after_sales_html
          sales: 0
        }
      ) {
        id
        name
        image_url
        unit_price
        unit_stock
        unit
        sales
        batch_batches
        category_categories
        origin_origins
        gross_weight
        net_weight
        retail_unit
        detail_html
        after_sales_html
        created_at
        updated_at
      }
    }
  `;

  const result = await client.execute<{ insert_products_one: Products | null }>({
    query: mutation,
    variables: {
      name: params.name,
      batch_batches: Number(params.batch_batches),
      image_url: params.image_url || null,
      unit_price: params.unit_price || null,
      unit_stock: params.unit_stock || null,
      unit: params.unit || null,
      category_categories: params.category_categories ? Number(params.category_categories) : null,
      origin_origins: params.origin_origins ? Number(params.origin_origins) : null,
      gross_weight: params.gross_weight,
      net_weight: params.net_weight,
      retail_unit: params.retail_unit || null,
      detail_html: params.detail_html || null,
      after_sales_html: params.after_sales_html || null,
    },
  });

  const createdProduct = result.insert_products_one;
  
  // 如果创建成功且有价格，创建价格历史记录
  if (createdProduct && params.unit_price) {
    try {
      const priceHistoryMutation = `
        mutation CreatePriceHistory(
          $product_products: bigint!
          $unit_price: numeric!
          $change_type: String!
          $recorded_at: timestamptz!
        ) {
          insert_product_price_history_one(
            object: {
              product_products: $product_products
              unit_price: $unit_price
              change_type: $change_type
              recorded_at: $recorded_at
            }
          ) {
            id
            unit_price
            recorded_at
            change_type
          }
        }
      `;

      await client.execute({
        query: priceHistoryMutation,
        variables: {
          product_products: Number(createdProduct.id),
          unit_price: params.unit_price,
          change_type: "create",
          recorded_at: new Date().toISOString(),
        },
      });
      
      console.log("[创建商品] 价格历史记录已创建");
    } catch (error) {
      console.error("[创建商品] 创建价格历史记录失败:", error);
      // 不抛出错误，因为商品已经创建成功
    }
  }

  return createdProduct;
};

/**
 * 更新商品（operator 使用）
 * @param productId 商品ID
 * @param params 更新参数
 * @returns 更新后的商品
 */
export const updateProduct = async (
  productId: string | number,
  params: {
    name?: string;
    image_url?: string | null;
    unit_price?: number | null;
    unit_stock?: number | null;
    category_categories?: string | number | null;
    origin_origins?: string | number | null;
    gross_weight?: number;
    net_weight?: number;
    retail_unit?: string | null;
    detail_html?: string | null;
    after_sales_html?: string | null;
  }
): Promise<Products | null> => {
  // 如果价格有变动，需要先获取当前价格
  let oldPrice: number | null = null;
  if (params.unit_price !== undefined) {
    try {
      const currentProduct = await getProductById(productId);
      if (currentProduct && currentProduct.unit_price) {
        oldPrice = Number(currentProduct.unit_price);
      }
    } catch (error) {
      console.error("[更新商品] 获取当前价格失败:", error);
    }
  }

  const mutation = `
    mutation UpdateProduct(
      $id: bigint!
      $name: String
      $image_url: String
      $unit_price: numeric
      $unit_stock: bigint
      $category_categories: bigint
      $origin_origins: bigint
      $gross_weight: numeric
      $net_weight: numeric
      $retail_unit: String
      $detail_html: String
      $after_sales_html: String
    ) {
      update_products_by_pk(
        pk_columns: { id: $id }
        _set: {
          name: $name
          image_url: $image_url
          unit_price: $unit_price
          unit_stock: $unit_stock
          category_categories: $category_categories
          origin_origins: $origin_origins
          gross_weight: $gross_weight
          net_weight: $net_weight
          retail_unit: $retail_unit
          detail_html: $detail_html
          after_sales_html: $after_sales_html
        }
      ) {
        id
        name
        image_url
        unit_price
        unit_stock
        unit
        sales
        batch_batches
        category_categories
        origin_origins
        gross_weight
        net_weight
        retail_unit
        detail_html
        after_sales_html
        created_at
        updated_at
      }
    }
  `;

  const setData: any = {};
  if (params.name !== undefined) setData.name = params.name;
  if (params.image_url !== undefined) setData.image_url = params.image_url;
  if (params.unit_price !== undefined) setData.unit_price = params.unit_price;
  if (params.unit_stock !== undefined) setData.unit_stock = params.unit_stock;
  if (params.category_categories !== undefined) {
    setData.category_categories = params.category_categories ? Number(params.category_categories) : null;
  }
  if (params.origin_origins !== undefined) {
    setData.origin_origins = params.origin_origins ? Number(params.origin_origins) : null;
  }
  if (params.gross_weight !== undefined) setData.gross_weight = params.gross_weight;
  if (params.net_weight !== undefined) setData.net_weight = params.net_weight;
  if (params.retail_unit !== undefined) setData.retail_unit = params.retail_unit;
  if (params.detail_html !== undefined) setData.detail_html = params.detail_html;
  if (params.after_sales_html !== undefined) setData.after_sales_html = params.after_sales_html;

  const result = await client.execute<{ update_products_by_pk: Products | null }>({
    query: mutation,
    variables: {
      id: Number(productId),
      ...setData,
    },
  });

  const updatedProduct = result.update_products_by_pk;

  // 如果价格有变动，创建价格历史记录
  if (updatedProduct && params.unit_price !== undefined && oldPrice !== null) {
    const newPrice = Number(params.unit_price);
    // 只有当价格真正发生变化时才创建历史记录
    if (Math.abs(newPrice - oldPrice) > 0.01) {
      try {
        const priceHistoryMutation = `
          mutation CreatePriceHistory(
            $product_products: bigint!
            $unit_price: numeric!
            $change_type: String!
            $recorded_at: timestamptz!
          ) {
            insert_product_price_history_one(
              object: {
                product_products: $product_products
                unit_price: $unit_price
                change_type: $change_type
                recorded_at: $recorded_at
              }
            ) {
              id
              unit_price
              recorded_at
              change_type
            }
          }
        `;

        await client.execute({
          query: priceHistoryMutation,
          variables: {
            product_products: Number(productId),
            unit_price: newPrice,
            change_type: "update",
            recorded_at: new Date().toISOString(),
          },
        });
        
        console.log("[更新商品] 价格历史记录已创建，价格从", oldPrice, "变更为", newPrice);
      } catch (error) {
        console.error("[更新商品] 创建价格历史记录失败:", error);
        // 不抛出错误，因为商品已经更新成功
      }
    }
  }

  return updatedProduct;
};

/**
 * 下架商品
 * @param productId 商品ID
 * @returns 更新后的商品
 */
export const offShelfProduct = async (productId: string | number): Promise<Products | null> => {
  const mutation = `
    mutation OffShelfProduct($id: bigint!) {
      update_products_by_pk(
        pk_columns: { id: $id }
        _set: { is_off_shelf: true }
      ) {
        id
        name
        is_off_shelf
        is_deleted
        updated_at
      }
    }
  `;

  const result = await client.execute<{ update_products_by_pk: Products | null }>({
    query: mutation,
    variables: {
      id: Number(productId),
    },
  });

  return result.update_products_by_pk || null;
};

/**
 * 上架商品
 * @param productId 商品ID
 * @returns 更新后的商品
 */
export const onShelfProduct = async (productId: string | number): Promise<Products | null> => {
  const mutation = `
    mutation OnShelfProduct($id: bigint!) {
      update_products_by_pk(
        pk_columns: { id: $id }
        _set: { is_off_shelf: false }
      ) {
        id
        name
        is_off_shelf
        is_deleted
        updated_at
      }
    }
  `;

  const result = await client.execute<{ update_products_by_pk: Products | null }>({
    query: mutation,
    variables: {
      id: Number(productId),
    },
  });

  return result.update_products_by_pk || null;
};

/**
 * 删除商品（软删除）
 * @param productId 商品ID
 * @returns 更新后的商品
 */
export const deleteProduct = async (productId: string | number): Promise<Products | null> => {
  const mutation = `
    mutation DeleteProduct($id: bigint!) {
      update_products_by_pk(
        pk_columns: { id: $id }
        _set: { is_deleted: true }
      ) {
        id
        name
        is_off_shelf
        is_deleted
        updated_at
      }
    }
  `;

  const result = await client.execute<{ update_products_by_pk: Products | null }>({
    query: mutation,
    variables: {
      id: Number(productId),
    },
  });

  return result.update_products_by_pk || null;
};
