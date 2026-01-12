import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import type { Categories } from "@/types/graphql";
import cacheStore from "@/config-lib/cache-store/cache-store";

/**
 * 获取分类列表
 * @returns 分类列表
 */
export const getCategories = cacheStore.cache(
  async (): Promise<Categories[]> => {
    const query = `
      query GetCategories {
        categories(order_by: { id: asc }) {
          id
          name
          category_name
          created_at
          updated_at
        }
      }
    `;

    const result = await client.execute<{ categories: Categories[] }>({
      query,
    });

    return result.categories || [];
  },
  {
    duration: 1000 * 60 * 60 * 24, // 缓存24小时
    useCache: true,
    forceRefresh: false,
  }
);

/**
 * 获取分类类别列表（去重 category_name）
 * @returns 分类类别名称列表
 */
export const getCategoryNames = cacheStore.cache(
  async (): Promise<string[]> => {
    const query = `
      query GetCategories {
        categories {
          category_name
        }
      }
    `;

    const result = await client.execute<{ categories: Categories[] }>({
      query,
    });

    // 提取去重后的 category_name 列表
    const categoryNames: string[] = [];
    const categorySet = new Set<string>();

    (result.categories || []).forEach((category) => {
      if (category.category_name && !categorySet.has(category.category_name)) {
        categorySet.add(category.category_name);
        categoryNames.push(category.category_name);
      }
    });

    return categoryNames;
  },
  {
    duration: 1000 * 60 * 60 * 24, // 缓存24小时
    useCache: true,
    forceRefresh: false,
  }
);
