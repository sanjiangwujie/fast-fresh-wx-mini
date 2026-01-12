import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import type { 
  Products, 
  Products_Bool_Exp, 
  Products_Order_By,
  Product_Price_History,
  Product_Price_History_Order_By
} from "@/types/graphql";
import cacheStore from "@/config-lib/cache-store/cache-store";

/**
 * 获取产品列表
 * @param args 查询参数
 * @returns 产品列表
 */
export const getProducts = cacheStore.cache(
  async (args: {
    where?: Products_Bool_Exp;
    order_by?: Products_Order_By[];
    limit?: number;
    offset?: number;
  } = {}): Promise<Products[]> => {
    const query = `
      query GetProducts($where: products_bool_exp, $order_by: [products_order_by!], $limit: Int, $offset: Int) {
        products(where: $where, order_by: $order_by, limit: $limit, offset: $offset) {
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
          created_at
          updated_at
        }
      }
    `;

    const result = await client.execute<{ products: Products[] }>({
      query,
      variables: {
        where: args.where || undefined,
        order_by: args.order_by || undefined,
        limit: args.limit || 20,
        offset: args.offset || 0,
      },
    });

    return result.products || [];
  },
  {
    duration: 1000 * 3, // 缓存3秒
    useCache: true,
    forceRefresh: false,
  }
);

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
        where: { name: { _ilike: $keyword } }
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
        sales
        batch_batches
        category_categories
        origin_origins
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
export const getProductById = cacheStore.cache(
  async (id: string | number): Promise<Products | null> => {
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
  },
  {
    duration: 1000 * 3, // 缓存3秒
    useCache: true,
    forceRefresh: false,
  }
);

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
export const getProductPriceHistory = cacheStore.cache(
  async (
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
  },
  {
    duration: 1000 * 60 * 5, // 缓存5分钟
    useCache: true,
    forceRefresh: false,
  }
);

/**
 * 获取产品所有价格变动历史
 * @param productId 产品ID
 * @param limit 限制返回数量，默认200条（支持一天多次变动）
 * @returns 价格历史记录列表（按时间倒序）
 */
export const getAllProductPriceHistory = cacheStore.cache(
  async (
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
  },
  {
    duration: 1000 * 60 * 5, // 缓存5分钟
    useCache: true,
    forceRefresh: false,
  }
);

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
export const getProductPriceForecast = cacheStore.cache(
  async (productId: string | number): Promise<PriceForecast> => {
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
  },
  {
    duration: 1000 * 60 * 5, // 缓存5分钟
    useCache: true,
    forceRefresh: false,
  }
);
