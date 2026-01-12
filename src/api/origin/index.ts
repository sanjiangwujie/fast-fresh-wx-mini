import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import type { Origins } from "@/types/graphql";
import cacheStore from "@/config-lib/cache-store/cache-store";

/**
 * 获取产地分类列表（去重 category_name）
 * @returns 产地分类名称列表
 */
export const getOriginCategories = cacheStore.cache(
  async (): Promise<string[]> => {
    const query = `
      query GetOrigins {
        origins {
          category_name
        }
      }
    `;

    const result = await client.execute<{ origins: Origins[] }>({
      query,
    });

    // 提取去重后的 category_name 列表
    const categories: string[] = [];
    const categorySet = new Set<string>();

    (result.origins || []).forEach((origin) => {
      if (origin.category_name && !categorySet.has(origin.category_name)) {
        categorySet.add(origin.category_name);
        categories.push(origin.category_name);
      }
    });

    return categories;
  },
  {
    duration: 1000 * 60 * 60 * 24, // 缓存24小时
    useCache: true,
    forceRefresh: false,
  }
);

/**
 * 获取所有产地列表
 * @returns 产地列表
 */
export const getOrigins = cacheStore.cache(
  async (): Promise<Origins[]> => {
    const query = `
      query GetOrigins {
        origins {
          id
          name
          category_name
          created_at
          updated_at
        }
      }
    `;

    const result = await client.execute<{ origins: Origins[] }>({
      query,
    });

    return result.origins || [];
  },
  {
    duration: 1000 * 60 * 60 * 24, // 缓存24小时
    useCache: true,
    forceRefresh: false,
  }
);
