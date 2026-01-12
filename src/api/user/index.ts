import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import type { Users } from "@/types/graphql";
import cacheStore from "@/config-lib/cache-store/cache-store";

/**
 * 通过用户ID获取用户信息
 * @param userId 用户ID
 * @returns 用户信息
 */
export const getUser = cacheStore.cache(
  async (userId: string | number): Promise<Users | null> => {
    const query = `
      query GetUser($id: bigint!) {
        users_by_pk(id: $id) {
          id
          phone
          nickname
          avatar_url
          created_at
          updated_at
        }
      }
    `;

    const result = await client.execute<{ users_by_pk: Users | null }>({
      query,
      variables: {
        id: Number(userId),
      },
    });

    return result.users_by_pk || null;
  },
  {
    duration: 1000 * 60 * 5, // 缓存5分钟
    useCache: true,
    forceRefresh: false,
  }
);
