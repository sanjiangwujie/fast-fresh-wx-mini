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

/**
 * 创建产地
 */
export const createOrigin = async (params: {
  name: string;
  category_name?: string | null;
}): Promise<Origins | null> => {
  const mutation = `
    mutation CreateOrigin($name: String!, $category_name: String) {
      insert_origins_one(object: { name: $name, category_name: $category_name }) {
        id
        name
        category_name
        created_at
        updated_at
      }
    }
  `;

  const result = await client.execute<{ insert_origins_one: Origins | null }>({
    query: mutation,
    variables: {
      name: params.name,
      category_name: params.category_name || null,
    },
  });

  return result.insert_origins_one;
};

/**
 * 更新产地
 */
export const updateOrigin = async (
  id: string | number,
  params: {
    name?: string;
    category_name?: string | null;
  }
): Promise<Origins | null> => {
  const mutation = `
    mutation UpdateOrigin($id: Int!, $name: String, $category_name: String) {
      update_origins_by_pk(
        pk_columns: { id: $id }
        _set: { name: $name, category_name: $category_name }
      ) {
        id
        name
        category_name
        created_at
        updated_at
      }
    }
  `;

  const setData: any = {};
  if (params.name !== undefined) setData.name = params.name;
  if (params.category_name !== undefined) setData.category_name = params.category_name;

  const result = await client.execute<{ update_origins_by_pk: Origins | null }>({
    query: mutation,
    variables: {
      id: Number(id),
      ...setData,
    },
  });

  return result.update_origins_by_pk;
};

/**
 * 删除产地
 */
export const deleteOrigin = async (id: string | number): Promise<boolean> => {
  const mutation = `
    mutation DeleteOrigin($id: Int!) {
      delete_origins_by_pk(id: $id) {
        id
      }
    }
  `;

  const result = await client.execute<{ delete_origins_by_pk: { id: number } | null }>({
    query: mutation,
    variables: {
      id: Number(id),
    },
  });

  return result.delete_origins_by_pk !== null;
};
