import client from "@/config-lib/hasura-graphql-client/hasura-graphql-client";
import type { Batches, Batches_Bool_Exp, Batches_Order_By } from "@/types/graphql";

/**
 * 获取批次列表（farmer 只能看到自己的批次）
 * @param farmerId 果农ID（可选，如果不传则通过 userId 查询）
 * @param userId 用户ID（可选，用于查询 farmer）
 * @param args 查询参数
 * @returns 批次列表
 */
export const getBatches = async (
  args: {
    farmerId?: string | number;
    userId?: string | number;
    where?: Batches_Bool_Exp;
    order_by?: Batches_Order_By[];
    limit?: number;
    offset?: number;
  } = {}
): Promise<Batches[]> => {
  let whereCondition: Batches_Bool_Exp = args.where || {};

  // 如果提供了 farmerId，直接使用
  if (args.farmerId) {
    whereCondition = {
      ...whereCondition,
      farmer_farmers: { _eq: Number(args.farmerId) },
    };
  } else if (args.userId) {
    // 如果提供了 userId，需要通过 farmer 表查询
    whereCondition = {
      ...whereCondition,
      farmer: {
        user_users: { _eq: Number(args.userId) },
      },
    };
  }

  const query = `
    query GetBatches($where: batches_bool_exp, $order_by: [batches_order_by!], $limit: Int, $offset: Int) {
      batches(where: $where, order_by: $order_by, limit: $limit, offset: $offset) {
        id
        image_url
        farmer_farmers
        created_at
        updated_at
        batch_media_files {
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
        product {
          id
          name
          image_url
          unit_price
        }
      }
    }
  `;

  const result = await client.execute<{ batches: Batches[] }>({
    query,
    variables: {
      where: whereCondition,
      order_by: args.order_by || [{ created_at: "desc" as any }],
      limit: args.limit || 20,
      offset: args.offset || 0,
    },
  });

  let batches = result.batches || [];
  
  // 如果 where 条件中包含过滤没有 product 的批次，在结果中过滤
  // 因为 GraphQL 查询对象关系的 null 比较复杂，我们在结果层面过滤更安全
  return batches;
};

/**
 * 获取未生成商品的批次列表（用于 operator 从批次生成商品）
 * @param args 查询参数
 * @returns 批次列表
 */
export const getBatchesWithoutProduct = async (
  args: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<Batches[]> => {
  // 先查询所有批次
  const allBatches = await getBatches({
    limit: args.limit || 20,
    offset: args.offset || 0,
  });
  
  // 过滤掉已有 product 的批次
  return allBatches.filter((batch) => !batch.product || !batch.product.id);
};

/**
 * 通过ID获取批次详情
 * @param batchId 批次ID
 * @returns 批次详情
 */
export const getBatchById = async (batchId: string | number): Promise<Batches | null> => {
  const query = `
    query GetBatchById($id: bigint!) {
      batches_by_pk(id: $id) {
        id
        image_url
        farmer_farmers
        created_at
        updated_at
        batch_media_files {
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
        product {
          id
          name
          image_url
          unit_price
        }
      }
    }
  `;

  const result = await client.execute<{ batches_by_pk: Batches | null }>({
    query,
    variables: {
      id: Number(batchId),
    },
  });

  return result.batches_by_pk || null;
};

/**
 * 创建批次
 * @param farmerId 果农ID
 * @param params 批次参数
 * @returns 创建的批次
 */
export const createBatch = async (
  farmerId: string | number,
  params: {
    image_url?: string | null;
    batch_media_files?: Array<{
      file_type: string; // image/video
      file_url: string;
      media_category: string; // picking/packing/loading/departure
    }>;
  }
): Promise<Batches | null> => {
  // 根据是否有媒体文件，动态构建 mutation
  const hasMediaFiles = params.batch_media_files && params.batch_media_files.length > 0;
  
  const mutation = hasMediaFiles
    ? `
      mutation CreateBatch(
        $farmer_farmers: bigint!
        $image_url: String
        $batch_media_files: [batch_media_files_insert_input!]!
      ) {
        insert_batches_one(
          object: {
            farmer_farmers: $farmer_farmers
            image_url: $image_url
            batch_media_files: {
              data: $batch_media_files
            }
          }
        ) {
          id
          image_url
          farmer_farmers
          created_at
          updated_at
          batch_media_files {
            id
            file_type
            file_url
            media_category
          }
        }
      }
    `
    : `
      mutation CreateBatch(
        $farmer_farmers: bigint!
        $image_url: String
      ) {
        insert_batches_one(
          object: {
            farmer_farmers: $farmer_farmers
            image_url: $image_url
          }
        ) {
          id
          image_url
          farmer_farmers
          created_at
          updated_at
          batch_media_files {
            id
            file_type
            file_url
            media_category
          }
        }
      }
    `;

  const variables: any = {
    farmer_farmers: Number(farmerId),
    image_url: params.image_url || null,
  };

  // 只在有媒体文件时才添加该变量
  if (hasMediaFiles) {
    variables.batch_media_files = params.batch_media_files!.map((file) => ({
      file_type: file.file_type,
      file_url: file.file_url,
      media_category: file.media_category,
    }));
  }

  const result = await client.execute<{ insert_batches_one: Batches | null }>({
    query: mutation,
    variables,
  });

  return result.insert_batches_one || null;
};

/**
 * 删除批次媒体文件
 * @param mediaFileId 媒体文件ID
 */
export const deleteBatchMediaFile = async (mediaFileId: string | number): Promise<boolean> => {
  const mutation = `
    mutation DeleteBatchMediaFile($id: bigint!) {
      delete_batch_media_files_by_pk(id: $id) {
        id
      }
    }
  `;

  try {
    await client.execute({
      query: mutation,
      variables: {
        id: Number(mediaFileId),
      },
    });
    return true;
  } catch (error) {
    console.error("删除批次媒体文件失败:", error);
    throw error;
  }
};

/**
 * 添加批次媒体文件
 * @param batchId 批次ID
 * @param mediaFile 媒体文件信息
 */
export const addBatchMediaFile = async (
  batchId: string | number,
  mediaFile: {
    file_type: string;
    file_url: string;
    media_category: string;
  }
): Promise<boolean> => {
  const mutation = `
    mutation AddBatchMediaFile(
      $batch_batches: bigint!
      $file_type: String!
      $file_url: String!
      $media_category: String!
    ) {
      insert_batch_media_files_one(
        object: {
          batch_batches: $batch_batches
          file_type: $file_type
          file_url: $file_url
          media_category: $media_category
        }
      ) {
        id
        file_type
        file_url
        media_category
      }
    }
  `;

  try {
    await client.execute({
      query: mutation,
      variables: {
        batch_batches: Number(batchId),
        file_type: mediaFile.file_type,
        file_url: mediaFile.file_url,
        media_category: mediaFile.media_category,
      },
    });
    return true;
  } catch (error) {
    console.error("添加批次媒体文件失败:", error);
    throw error;
  }
};

/**
 * 更新批次媒体文件分类
 * @param mediaFileId 媒体文件ID
 * @param media_category 新的媒体分类
 */
export const updateBatchMediaFileCategory = async (
  mediaFileId: string | number,
  media_category: string
): Promise<boolean> => {
  const mutation = `
    mutation UpdateBatchMediaFileCategory($id: bigint!, $media_category: String!) {
      update_batch_media_files_by_pk(
        pk_columns: { id: $id }
        _set: { media_category: $media_category }
      ) {
        id
        media_category
      }
    }
  `;

  try {
    await client.execute({
      query: mutation,
      variables: {
        id: Number(mediaFileId),
        media_category,
      },
    });
    return true;
  } catch (error) {
    console.error("更新批次媒体文件分类失败:", error);
    throw error;
  }
};

/**
 * 更新批次
 * @param batchId 批次ID
 * @param params 更新参数
 * @returns 更新后的批次
 */
export const updateBatch = async (
  batchId: string | number,
  params: {
    image_url?: string | null;
  }
): Promise<Batches | null> => {
  const mutation = `
    mutation UpdateBatch($id: bigint!, $image_url: String) {
      update_batches_by_pk(
        pk_columns: { id: $id }
        _set: { image_url: $image_url }
      ) {
        id
        image_url
        farmer_farmers
        created_at
        updated_at
        batch_media_files {
          id
          file_type
          file_url
          media_category
        }
      }
    }
  `;

  const result = await client.execute<{ update_batches_by_pk: Batches | null }>({
    query: mutation,
    variables: {
      id: Number(batchId),
      image_url: params.image_url !== undefined ? params.image_url : undefined,
    },
  });

  return result.update_batches_by_pk || null;
};

/**
 * 创建 farmer 记录
 * @param userId 用户ID
 * @param name 果农名称（可选）
 * @returns farmer 信息
 */
export const createFarmer = async (
  userId: string | number,
  name?: string | null
): Promise<{ id: string | number; name?: string | null; user_users: string | number } | null> => {
  // 先检查是否已存在
  const existing = await getFarmerByUserId(userId, false);
  if (existing) {
    return existing;
  }

  const mutation = `
    mutation CreateFarmer($user_users: bigint!, $name: String) {
      insert_farmers_one(
        object: {
          user_users: $user_users
          name: $name
        }
      ) {
        id
        name
        user_users
        created_at
        updated_at
      }
    }
  `;

  try {
    const result = await client.execute<{ insert_farmers_one: { id: string | number; name?: string | null; user_users: string | number } | null }>({
      query: mutation,
      variables: {
        user_users: Number(userId),
        name: name || null,
      },
    });

    return result.insert_farmers_one;
  } catch (error: any) {
    // 如果创建失败（可能是唯一约束冲突），再次查询
    console.warn("[创建 farmer] 创建失败，可能是已存在:", error);
    const existingAfter = await getFarmerByUserId(userId, false);
    return existingAfter;
  }
};

/**
 * 获取用户的 farmer 信息，如果不存在且有 farmer 角色则自动创建
 * @param userId 用户ID
 * @param checkRole 是否检查用户角色（如果为 true，会检查用户是否有 farmer 角色，如果有但没有 farmers 记录则自动创建）
 * @returns farmer 信息
 */
export const getFarmerByUserId = async (
  userId: string | number,
  checkRole: boolean = false
): Promise<{ id: string | number; name?: string | null; user_users: string | number } | null> => {
  const query = `
    query GetFarmerByUserId($userId: bigint!) {
      farmers(where: { user_users: { _eq: $userId } }, limit: 1) {
        id
        name
        user_users
        created_at
        updated_at
      }
    }
  `;

  const result = await client.execute<{ farmers: Array<{ id: string | number; name?: string | null; user_users: string | number }> }>({
    query,
    variables: {
      userId: Number(userId),
    },
  });

  if (result.farmers && result.farmers.length > 0) {
    return result.farmers[0];
  }

  // 如果没有 farmers 记录且需要检查角色，则检查用户是否有 farmer 角色
  if (checkRole) {
    try {
      // 检查用户角色
      const roleQuery = `
        query GetUserRoles($userId: bigint!) {
          user_roles(where: { user_users: { _eq: $userId }, role_type: { _eq: "farmer" } }, limit: 1) {
            id
            role_type
          }
        }
      `;

      const roleResult = await client.execute<{ user_roles: Array<{ id: string | number; role_type?: string | null }> }>({
        query: roleQuery,
        variables: {
          userId: Number(userId),
        },
      });

      // 如果用户有 farmer 角色但没有 farmers 记录，自动创建
      if (roleResult.user_roles && roleResult.user_roles.length > 0) {
        console.log("[批次管理] 用户有 farmer 角色但没有 farmers 记录，自动创建...");
        const newFarmer: { id: string | number; name?: string | null; user_users: string | number } | null = await createFarmer(userId, null);
        return newFarmer;
      }
    } catch (error) {
      console.error("[批次管理] 检查用户角色失败:", error);
    }
  }

  return null;
};
