import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import type { Addresses } from "@/types/graphql";

/**
 * 获取用户的收货地址列表
 * @param userId 用户ID
 * @returns 收货地址列表
 */
export const getAddresses = async (userId: string | number): Promise<Addresses[]> => {
  const query = `
    query GetAddresses($userId: bigint!) {
      addresses(
        where: { user_users: { _eq: $userId } }
        order_by: [{ is_default: desc }, { created_at: desc }]
      ) {
        id
        receiver_name
        receiver_phone
        receiver_address
        receiver_province
        receiver_city
        receiver_district
        is_default
        created_at
        updated_at
      }
    }
  `;

  const result = await client.execute<{ addresses: Addresses[] }>({
    query,
    variables: {
      userId: Number(userId),
    },
  });

  return result.addresses || [];
};

/**
 * 通过ID获取收货地址
 * @param addressId 地址ID
 * @returns 收货地址
 */
export const getAddressById = async (addressId: string | number): Promise<Addresses | null> => {
  const query = `
    query GetAddressById($id: bigint!) {
      addresses_by_pk(id: $id) {
        id
        receiver_name
        receiver_phone
        receiver_address
        receiver_province
        receiver_city
        receiver_district
        is_default
        created_at
        updated_at
      }
    }
  `;

  const result = await client.execute<{ addresses_by_pk: Addresses | null }>({
    query,
    variables: {
      id: Number(addressId),
    },
  });

  return result.addresses_by_pk || null;
};

/**
 * 创建收货地址
 * @param userId 用户ID
 * @param params 地址参数
 * @returns 创建的地址
 */
export const createAddress = async (
  userId: string | number,
  params: {
    receiver_name: string;
    receiver_phone: string;
    receiver_address: string;
    receiver_province?: string | null;
    receiver_city?: string | null;
    receiver_district?: string | null;
    is_default?: boolean;
  }
): Promise<Addresses | null> => {
  // 如果设置为默认地址，需要先取消其他默认地址
  if (params.is_default) {
    await unsetDefaultAddresses(userId);
  }

  const mutation = `
    mutation CreateAddress(
      $user_users: bigint!
      $receiver_name: String!
      $receiver_phone: String!
      $receiver_address: String!
      $receiver_province: String
      $receiver_city: String
      $receiver_district: String
      $is_default: Boolean!
    ) {
      insert_addresses_one(
        object: {
          user_users: $user_users
          receiver_name: $receiver_name
          receiver_phone: $receiver_phone
          receiver_address: $receiver_address
          receiver_province: $receiver_province
          receiver_city: $receiver_city
          receiver_district: $receiver_district
          is_default: $is_default
        }
      ) {
        id
        receiver_name
        receiver_phone
        receiver_address
        receiver_province
        receiver_city
        receiver_district
        is_default
        created_at
        updated_at
      }
    }
  `;

  const result = await client.execute<{ insert_addresses_one: Addresses | null }>({
    query: mutation,
    variables: {
      user_users: Number(userId),
      receiver_name: params.receiver_name,
      receiver_phone: params.receiver_phone,
      receiver_address: params.receiver_address,
      receiver_province: params.receiver_province || null,
      receiver_city: params.receiver_city || null,
      receiver_district: params.receiver_district || null,
      is_default: params.is_default || false,
    },
  });

  return result.insert_addresses_one || null;
};

/**
 * 更新收货地址
 * @param addressId 地址ID
 * @param params 更新参数
 * @returns 更新后的地址
 */
export const updateAddress = async (
  addressId: string | number,
  params: {
    receiver_name?: string;
    receiver_phone?: string;
    receiver_address?: string;
    receiver_province?: string | null;
    receiver_city?: string | null;
    receiver_district?: string | null;
    is_default?: boolean;
  }
): Promise<Addresses | null> => {
  // 如果设置为默认地址，需要先取消其他默认地址
  if (params.is_default !== undefined && params.is_default) {
    // 先获取地址信息以获取userId
    const address = await getAddressById(addressId);
    if (address) {
      await unsetDefaultAddresses(address.user_users);
    }
  }

  const setData: any = {};
  if (params.receiver_name !== undefined) setData.receiver_name = params.receiver_name;
  if (params.receiver_phone !== undefined) setData.receiver_phone = params.receiver_phone;
  if (params.receiver_address !== undefined) setData.receiver_address = params.receiver_address;
  if (params.receiver_province !== undefined) setData.receiver_province = params.receiver_province;
  if (params.receiver_city !== undefined) setData.receiver_city = params.receiver_city;
  if (params.receiver_district !== undefined) setData.receiver_district = params.receiver_district;
  if (params.is_default !== undefined) setData.is_default = params.is_default;

  const mutation = `
    mutation UpdateAddress(
      $id: bigint!
      $receiver_name: String
      $receiver_phone: String
      $receiver_address: String
      $receiver_province: String
      $receiver_city: String
      $receiver_district: String
      $is_default: Boolean
    ) {
      update_addresses_by_pk(
        pk_columns: { id: $id }
        _set: {
          receiver_name: $receiver_name
          receiver_phone: $receiver_phone
          receiver_address: $receiver_address
          receiver_province: $receiver_province
          receiver_city: $receiver_city
          receiver_district: $receiver_district
          is_default: $is_default
        }
      ) {
        id
        receiver_name
        receiver_phone
        receiver_address
        receiver_province
        receiver_city
        receiver_district
        is_default
        created_at
        updated_at
      }
    }
  `;

  const result = await client.execute<{ update_addresses_by_pk: Addresses | null }>({
    query: mutation,
    variables: {
      id: Number(addressId),
      ...setData,
    },
  });

  return result.update_addresses_by_pk || null;
};

/**
 * 删除收货地址
 * @param addressId 地址ID
 */
export const deleteAddress = async (addressId: string | number): Promise<boolean> => {
  const mutation = `
    mutation DeleteAddress($id: bigint!) {
      delete_addresses_by_pk(id: $id) {
        id
      }
    }
  `;

  try {
    await client.execute({
      query: mutation,
      variables: {
        id: Number(addressId),
      },
    });
    return true;
  } catch (error) {
    console.error("删除收货地址失败:", error);
    throw error;
  }
};

/**
 * 设置默认地址（取消其他默认地址）
 * @param userId 用户ID
 */
const unsetDefaultAddresses = async (userId: string | number): Promise<void> => {
  const mutation = `
    mutation UnsetDefaultAddresses($userId: bigint!) {
      update_addresses(
        where: { user_users: { _eq: $userId }, is_default: { _eq: true } }
        _set: { is_default: false }
      ) {
        affected_rows
      }
    }
  `;

  await client.execute({
    query: mutation,
    variables: {
      userId: Number(userId),
    },
  });
};

/**
 * 设置默认地址
 * @param addressId 地址ID
 */
export const setDefaultAddress = async (addressId: string | number): Promise<Addresses | null> => {
  // 先获取地址信息以获取userId
  const address = await getAddressById(addressId);
  if (!address) {
    throw new Error("地址不存在");
  }

  // 取消其他默认地址
  await unsetDefaultAddresses(address.user_users);

  // 设置当前地址为默认
  return await updateAddress(addressId, { is_default: true });
};
