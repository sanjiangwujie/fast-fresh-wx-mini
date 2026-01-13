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

/**
 * 创建分类
 */
export const createCategory = async (params: {
  name: string;
  category_name?: string | null;
}): Promise<Categories | null> => {
  const mutation = `
    mutation CreateCategory($name: String!, $category_name: String) {
      insert_categories_one(object: { name: $name, category_name: $category_name }) {
        id
        name
        category_name
        created_at
        updated_at
      }
    }
  `;

  const result = await client.execute<{ insert_categories_one: Categories | null }>({
    query: mutation,
    variables: {
      name: params.name,
      category_name: params.category_name || null,
    },
  });

  return result.insert_categories_one;
};

/**
 * 更新分类
 */
export const updateCategory = async (
  id: string | number,
  params: {
    name?: string;
    category_name?: string | null;
  }
): Promise<Categories | null> => {
  const mutation = `
    mutation UpdateCategory($id: bigint!, $name: String, $category_name: String) {
      update_categories_by_pk(
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

  const result = await client.execute<{ update_categories_by_pk: Categories | null }>({
    query: mutation,
    variables: {
      id: Number(id),
      ...setData,
    },
  });

  return result.update_categories_by_pk;
};

/**
 * 删除分类
 */
export const deleteCategory = async (id: string | number): Promise<boolean> => {
  const mutation = `
    mutation DeleteCategory($id: bigint!) {
      delete_categories_by_pk(id: $id) {
        id
      }
    }
  `;

  const result = await client.execute<{ delete_categories_by_pk: { id: bigint } | null }>({
    query: mutation,
    variables: {
      id: Number(id),
    },
  });

  return result.delete_categories_by_pk !== null;
};
