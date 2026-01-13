import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import type { Users, User_Roles } from "@/types/graphql";
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

/**
 * 获取用户的角色列表
 * @param userId 用户ID
 * @returns 用户角色列表
 */
export const getUserRoles = cacheStore.cache(
  async (userId: string | number): Promise<User_Roles[]> => {
    const query = `
      query GetUserRoles($userId: bigint!) {
        user_roles(where: { user_users: { _eq: $userId } }) {
          id
          role_type
          user_users
          created_at
          updated_at
        }
      }
    `;

    const result = await client.execute<{ user_roles: User_Roles[] }>({
      query,
      variables: {
        userId: Number(userId),
      },
    });

    return result.user_roles || [];
  },
  {
    duration: 1000 * 60 * 5, // 缓存5分钟
    useCache: true,
    forceRefresh: false,
  }
);

/**
 * 检查用户是否有指定角色
 * @param userId 用户ID
 * @param roleType 角色类型 (operator/farmer/store)
 * @returns 是否有该角色
 */
export const hasUserRole = async (
  userId: string | number,
  roleType: string
): Promise<boolean> => {
  const roles = await getUserRoles(userId);
  return roles.some((role) => role.role_type === roleType);
};
