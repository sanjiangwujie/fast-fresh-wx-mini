import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import type { Users, User_Roles } from "@/types/graphql";
import { API_BASE_URL } from "@/project-config";

/**
 * 通过用户ID获取用户信息
 * @param userId 用户ID
 * @returns 用户信息
 */
export const getUser = async (userId: string | number): Promise<Users | null> => {
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
};

/**
 * 获取用户的角色列表（内部实现，不缓存）
 */
const _getUserRolesInternal = async (userId: string | number): Promise<User_Roles[]> => {
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

  // 确保返回的是数组
  return Array.isArray(result.user_roles) ? result.user_roles : [];
};

/**
 * 获取用户的角色列表
 * @param userId 用户ID
 * @returns 用户角色列表
 */
export const getUserRoles = async (userId: string | number): Promise<User_Roles[]> => {
  return await _getUserRolesInternal(userId);
};

/**
 * 获取用户的角色列表（强制刷新，不使用缓存）
 * @param userId 用户ID
 * @returns 用户角色列表
 */
export const getUserRolesForceRefresh = async (userId: string | number): Promise<User_Roles[]> => {
  return await _getUserRolesInternal(userId);
};

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
  return Array.isArray(roles) && roles.some((role) => role.role_type === roleType);
};

/**
 * 获取所有果农列表（包含用户信息和farmer信息）
 */
export const getFarmers = async (): Promise<Array<Users & { farmer?: any }>> => {
  const query = `
    query GetFarmers {
      users(
        where: { user_roles: { role_type: { _eq: "farmer" } } }
        order_by: { created_at: desc }
      ) {
        id
        phone
        nickname
        avatar_url
        created_at
        updated_at
        farmers {
          id
          name
          user_users
        }
      }
    }
  `;

  const result = await client.execute<{ users: Array<Users & { farmers: Array<any> }> }>({
    query,
  });

  return (result.users || []).map((user) => ({
    ...user,
    farmer: user.farmers && user.farmers.length > 0 ? user.farmers[0] : null,
  }));
};

/**
 * 获取所有运营账号列表
 */
export const getOperators = async (): Promise<Users[]> => {
  const query = `
    query GetOperators {
      users(
        where: { user_roles: { role_type: { _eq: "operator" } } }
        order_by: { created_at: desc }
      ) {
        id
        phone
        nickname
        avatar_url
        created_at
        updated_at
      }
    }
  `;

  const result = await client.execute<{ users: Users[] }>({
    query,
  });

  return result.users || [];
};

/**
 * 创建果农账号（同步users、user_roles、farmers表）
 */
export const createFarmerAccount = async (params: {
  phone: string;
  nickname?: string;
  password?: string;
  farmer_name?: string;
}): Promise<Users | null> => {
  const response = await uni.request({
    url: `${API_BASE_URL}/api/admin/create-farmer`,
    method: "POST",
    header: { "Content-Type": "application/json" },
    data: params,
  });
  
  if (response.statusCode !== 200) {
    const error = response.data as any;
    throw new Error(error.error || "创建果农账号失败");
  }
  
  const result = response.data as { user: Users };
  return result.user;
};

/**
 * 创建运营账号（带密码）
 */
export const createOperatorAccount = async (params: {
  phone: string;
  nickname?: string;
  password: string;
}): Promise<Users | null> => {
  const response = await uni.request({
    url: `${API_BASE_URL}/api/admin/create-operator`,
    method: "POST",
    header: { "Content-Type": "application/json" },
    data: params,
  });
  
  if (response.statusCode !== 200) {
    const error = response.data as any;
    throw new Error(error.error || "创建运营账号失败");
  }
  
  const result = response.data as { user: Users };
  return result.user;
};
