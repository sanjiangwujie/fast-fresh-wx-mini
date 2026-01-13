import { API_BASE_URL } from "@/project-config";
import { getToken } from "@/api/auth";

/**
 * 上传任务接口
 */
export interface UploadTask {
  abort: () => void;
  onProgressUpdate: (callback: (res: { progress: number; totalBytesSent: number; totalBytesExpectedToSend: number }) => void) => void;
}

/**
 * 七牛云上传配置
 */
export interface QiniuUploadConfig {
  token: string;
  bucket: string;
  baseUrl?: string;
  dirPath?: string;
  uploadUrl: string; // 上传地址
}

/**
 * 获取七牛云上传Token和配置
 */
export const getQiniuUploadToken = async (): Promise<QiniuUploadConfig> => {
  const response = await uni.request({
    url: `${API_BASE_URL}/api/upload/qiniu-token`,
    method: "GET",
    header: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (response.statusCode !== 200) {
    throw new Error("获取上传token失败");
  }

  const data = response.data as { 
    success: boolean; 
    data?: { 
      token: string; 
      bucket: string; 
      baseUrl?: string; 
      dirPath?: string;
      uploadUrl: string;
    } 
  };
  
  if (!data.success || !data.data) {
    throw new Error("获取上传token失败");
  }

  return data.data;
};

/**
 * 生成文件key
 */
const generateFileKey = (filename: string, dirPath: string = ""): string => {
  const ext = filename.split(".").pop() || "file";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${dirPath || ""}${timestamp}-${random}.${ext}`;
};

/**
 * 直接上传到七牛云（支持后台上传、断点续传）
 * @param filePath 文件路径
 * @param onProgress 进度回调
 * @returns 上传任务和文件URL
 */
export const uploadToQiniu = async (
  filePath: string,
  onProgress?: (progress: number) => void
): Promise<{ task: UploadTask; url: string }> => {
  try {
    // 获取上传token和配置
    const qiniuConfig = await getQiniuUploadToken();

    // 生成文件key
    const fileName = filePath.split("/").pop() || "file";
    const key = generateFileKey(fileName, qiniuConfig.dirPath);

    // 使用后端返回的上传地址
    const uploadUrl = qiniuConfig.uploadUrl;

    return new Promise((resolve, reject) => {
      const uploadTask = uni.uploadFile({
        url: uploadUrl,
        filePath: filePath,
        name: "file",
        formData: {
          token: qiniuConfig.token,
          key: key,
        },
        timeout: 300000, // 5分钟超时（大文件需要更长时间）
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.key) {
              // 构建完整URL
              const fileUrl = qiniuConfig.baseUrl
                ? `${qiniuConfig.baseUrl}/${key}`
                : `https://${qiniuConfig.bucket}.qiniucdn.com/${key}`;
              
              resolve({
                task: uploadTask as any,
                url: fileUrl,
              });
            } else {
              reject(new Error(data.error || "上传失败"));
            }
          } catch (e) {
            reject(new Error("解析响应失败"));
          }
        },
        fail: (err) => {
          console.error("上传失败:", err);
          if (err.errMsg && err.errMsg.includes("timeout")) {
            reject(new Error("上传超时，请检查网络连接"));
          } else {
            reject(new Error(err.errMsg || "上传失败"));
          }
        },
      });

      // 监听上传进度
      if (onProgress && uploadTask.onProgressUpdate) {
        uploadTask.onProgressUpdate((res) => {
          const progress = Math.round((res.totalBytesSent / res.totalBytesExpectedToSend) * 100);
          onProgress(progress);
        });
      }

      // 保存任务，以便后续管理
      (uploadTask as any).key = key;
    });
  } catch (error) {
    console.error("上传到七牛云失败:", error);
    throw error;
  }
};
