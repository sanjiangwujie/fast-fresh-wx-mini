<template>
  <view class="page">
    <view class="header">
      <text class="header-title">编辑批次</text>
    </view>

    <scroll-view class="scroll-view" scroll-y v-if="batch">
      <!-- 批次图片 -->
      <view class="section">
        <view class="section-title">批次图片 <text class="optional">(可选)</text></view>
        <view class="image-upload" @click="handleChooseImage" v-if="!form.image_url">
          <view class="upload-placeholder">
            <text class="upload-icon">📷</text>
            <text class="upload-text">点击上传图片</text>
          </view>
        </view>
        <view class="image-preview" v-else>
          <image class="preview-image" :src="form.image_url" mode="aspectFill" @click="handlePreviewImage" />
          <view class="image-actions">
            <view class="action-btn" @click="handleChooseImage" :class="{ disabled: imageUploading }">重新上传</view>
            <view class="action-btn delete" @click="handleDeleteImage" :class="{ disabled: imageUploading }">删除</view>
          </view>
        </view>
        <view class="image-tip" v-if="imageUploading">
          <text class="tip-text">{{ imageUploadStatus || "上传中..." }}</text>
          <view class="progress-bar" v-if="imageUploadProgress > 0">
            <view class="progress-fill" :style="{ width: imageUploadProgress + '%' }"></view>
          </view>
          <text class="progress-percent" v-if="imageUploadProgress > 0">{{ imageUploadProgress.toFixed(0) }}%</text>
        </view>
        <view class="image-tip" v-else-if="!form.image_url">
          <text class="tip-text">建议上传批次产品的图片</text>
        </view>
      </view>

      <!-- 批次媒体文件 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">批次媒体文件 <text class="optional">(可选)</text></text>
          <view class="add-media-btn" @click="handleAddMediaFile">
            <text class="add-media-btn-text">+ 添加</text>
          </view>
        </view>
        <!-- 总进度显示 -->
        <view class="total-progress" v-if="totalUploadProgress > 0 && totalUploadProgress < 100">
          <view class="total-progress-header">
            <text class="total-progress-text">总进度: {{ totalUploadProgress.toFixed(0) }}%</text>
            <text class="total-progress-count">{{ completedUploadCount }}/{{ totalUploadCount }}</text>
          </view>
          <view class="progress-bar">
            <view class="progress-fill" :style="{ width: totalUploadProgress + '%' }"></view>
          </view>
          <text class="progress-percent" v-if="totalUploadProgress > 0 && totalUploadProgress < 100">
            {{ totalUploadProgress.toFixed(1) }}%
          </text>
        </view>
        
        <view class="media-files-list" v-if="mediaFiles.length > 0">
          <view class="media-file-item" v-for="(file, index) in mediaFiles" :key="file.id || `new_${index}`">
            <!-- 预览区域 -->
            <view class="media-preview-wrapper">
              <!-- 图片预览 -->
              <image 
                v-if="file.file_type === 'image'" 
                class="media-file-preview" 
                :src="file.preview_url || file.file_url" 
                mode="aspectFill" 
                @click="handlePreviewMediaFile(file, index)" 
              />
              <!-- 视频预览 -->
              <view v-else class="video-preview-wrapper" @click="handlePreviewMediaFile(file, index)">
                <video
                  :id="`preview-video-${index}`"
                  class="media-file-preview video"
                  :src="file.preview_url || file.file_url"
                  :poster="file.poster_url"
                  :controls="false"
                  :show-center-play-btn="true"
                  :enable-play-gesture="false"
                  object-fit="cover"
                  :autoplay="false"
                ></video>
                <view class="video-play-icon">▶</view>
              </view>
              
              <!-- 上传状态遮罩 -->
              <view 
                class="upload-overlay" 
                v-if="file.uploadStatus !== 'completed' && !file.isExisting"
                @click.stop="handlePreviewMediaFile(file, index)"
              >
                <view class="upload-status-content" @click.stop>
                  <text class="upload-status-text" v-if="file.uploadStatus === 'uploading'">
                    {{ file.uploadProgress || 0 }}%
                  </text>
                  <text class="upload-status-text error" v-else-if="file.uploadStatus === 'error'">
                    上传失败
                  </text>
                  <text class="upload-status-text" v-else-if="file.uploadStatus === 'pending'">
                    等待上传
                  </text>
                </view>
              </view>
            </view>
            
            <view class="media-file-info">
              <view class="media-file-category">
                <text class="category-label">分类：</text>
                <view class="category-selector" @click="handleSelectMediaCategory(index)">
                  <text class="category-text">{{ getMediaCategoryName(file.media_category) }}</text>
                  <text class="category-arrow">›</text>
                </view>
              </view>
              <view class="media-file-type">
                <text class="type-label">类型：</text>
                <text class="type-text">{{ file.file_type === 'image' ? '图片' : '视频' }}</text>
              </view>
              
              <!-- 单个文件进度条 -->
              <view class="file-progress" v-if="file.uploadStatus === 'uploading'">
                <view class="progress-bar small">
                  <view class="progress-fill" :style="{ width: (file.uploadProgress || 0) + '%' }"></view>
                </view>
                <text class="progress-percent small">{{ (file.uploadProgress || 0).toFixed(0) }}%</text>
              </view>
              
              <!-- 错误信息 -->
              <view class="file-error" v-if="file.uploadStatus === 'error'">
                <text class="error-text">{{ file.errorMessage || '上传失败' }}</text>
              </view>
            </view>
            
            <view class="media-file-actions">
              <!-- 重试按钮 -->
              <view 
                class="action-btn-small retry" 
                v-if="file.uploadStatus === 'error' && !file.isExisting"
                @click="handleRetryUpload(index)"
              >
                重试
              </view>
              <view class="action-btn-small delete" @click="handleRemoveMediaFile(index)">删除</view>
            </view>
          </view>
        </view>
        <view class="empty-media" v-else>
          <text class="empty-media-text">暂无媒体文件，点击上方"添加"按钮上传</text>
        </view>
      </view>

      <!-- 提交按钮 -->
      <view class="submit-section">
        <view class="submit-btn" @click="handleSubmit" :class="{ disabled: submitting }">
          <text class="submit-btn-text">{{ submitting ? "保存中..." : "保存修改" }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="loading-state" v-else>
      <text class="loading-text">加载中...</text>
    </view>
  </view>
</template>

<script lang="ts">
import { ref, computed, onMounted } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getBatchById, updateBatch, deleteBatchMediaFile, addBatchMediaFile, updateBatchMediaFileCategory } from "@/api/batch";
import { uploadToQiniu, type UploadTask } from "@/api/upload";
import type { Batches, Batch_Media_Files } from "@/types/graphql";

export default {
  setup() {
    const batch = ref<Batches | null>(null);
    const batchId = ref<string | number>("");
    const form = ref({
      image_url: "",
    });
    const submitting = ref(false);
    const imageUploading = ref(false);
    const imageUploadProgress = ref(0);
    const imageUploadStatus = ref("");

    // 媒体文件类型定义
    interface MediaFileItem {
      id?: string | number; // 已存在的文件有ID，新增的没有
      file_type: string; // image/video
      file_url: string; // 文件URL
      preview_url?: string; // 预览URL（本地文件）
      poster_url?: string; // 视频封面
      media_category: string; // picking/packing/loading/departure
      uploadStatus?: "pending" | "uploading" | "completed" | "error"; // 上传状态（仅新增文件）
      uploadProgress?: number; // 上传进度（仅新增文件）
      errorMessage?: string; // 错误信息
      filePath?: string; // 本地文件路径（用于重试）
      uploadTask?: UploadTask; // 上传任务
      isExisting?: boolean; // 是否是已存在的文件
      originalCategory?: string; // 原始分类（用于判断是否需要更新）
    }
    
    const mediaFiles = ref<MediaFileItem[]>([]);
    const deletedMediaFileIds = ref<(string | number)[]>([]); // 已删除的媒体文件ID
    
    // 计算总进度（只计算新增文件）
    const totalUploadProgress = computed(() => {
      const newFiles = mediaFiles.value.filter(f => !f.isExisting);
      if (newFiles.length === 0) return 0;
      const total = newFiles.reduce((sum, file) => {
        if (file.uploadStatus === 'completed') return sum + 100;
        if (file.uploadStatus === 'uploading') return sum + (file.uploadProgress || 0);
        return sum;
      }, 0);
      return total / newFiles.length;
    });
    
    const completedUploadCount = computed(() => {
      return mediaFiles.value.filter(f => !f.isExisting && f.uploadStatus === 'completed').length;
    });
    
    const totalUploadCount = computed(() => {
      return mediaFiles.value.filter(f => !f.isExisting).length;
    });

    // 文件大小提示（仅用于提示，不限制上传）
    const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 视频建议大小（超过此大小会提示压缩，但不强制）

    // 媒体分类选项
    const mediaCategories = [
      { value: "picking", label: "采摘" },
      { value: "packing", label: "打包" },
      { value: "loading", label: "装车" },
      { value: "departure", label: "发车" },
    ];

    // 加载批次数据
    const loadBatch = async () => {
      if (!batchId.value) return;

      try {
        const batchData = await getBatchById(batchId.value);
        if (batchData) {
          batch.value = batchData;
          form.value.image_url = batchData.image_url || "";
          
          // 加载现有媒体文件
          if (batchData.batch_media_files && batchData.batch_media_files.length > 0) {
            mediaFiles.value = batchData.batch_media_files.map((file: Batch_Media_Files) => ({
              id: file.id,
              file_type: file.file_type,
              file_url: file.file_url,
              media_category: file.media_category,
              isExisting: true,
              originalCategory: file.media_category,
              uploadStatus: "completed" as const,
            }));
          }
        } else {
          uni.showToast({
            title: "批次不存在",
            icon: "none",
          });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        }
      } catch (error) {
        console.error("加载批次失败:", error);
        uni.showToast({
          title: "加载失败",
          icon: "none",
        });
      }
    };

    // 选择图片（批次主图）
    const handleChooseImage = () => {
      uni.chooseImage({
        count: 1,
        sizeType: ["compressed"],
        sourceType: ["album", "camera"],
        success: async (res) => {
          const tempFilePath = res.tempFilePaths[0];
          await uploadImage(tempFilePath);
        },
        fail: (error) => {
          console.error("选择图片失败:", error);
          uni.showToast({
            title: "选择图片失败",
            icon: "none",
          });
        },
      });
    };

    // 上传批次主图
    const uploadImage = async (filePath: string) => {
      imageUploading.value = true;
      imageUploadProgress.value = 0;
      imageUploadStatus.value = "上传中...";
      
      try {
        const { url } = await uploadToQiniu(filePath, (progress) => {
          imageUploadProgress.value = progress;
        });

        form.value.image_url = url;
        imageUploadProgress.value = 100;
        imageUploadStatus.value = "上传成功";
        
        uni.showToast({
          title: "上传成功",
          icon: "success",
        });
      } catch (error) {
        console.error("上传图片失败:", error);
        imageUploadProgress.value = 0;
        imageUploadStatus.value = "上传失败";
        uni.showToast({
          title: error instanceof Error ? error.message : "上传失败",
          icon: "none",
        });
      } finally {
        setTimeout(() => {
          imageUploading.value = false;
          imageUploadStatus.value = "";
        }, 1000);
      }
    };

    // 预览图片
    const handlePreviewImage = () => {
      if (form.value.image_url) {
        uni.previewImage({
          urls: [form.value.image_url],
          current: form.value.image_url,
        });
      }
    };

    // 删除图片
    const handleDeleteImage = () => {
      uni.showModal({
        title: "确认删除",
        content: "确定要删除这张图片吗？",
        success: (res) => {
          if (res.confirm) {
            form.value.image_url = "";
          }
        },
      });
    };

    // 添加媒体文件
    const handleAddMediaFile = () => {
      uni.showActionSheet({
        itemList: ["选择图片", "选择视频", "从微信聊天选择"],
        success: (res) => {
          if (res.tapIndex === 2) {
            handleChooseMessageFile();
            return;
          }
          if (res.tapIndex === 0) {
            uni.chooseImage({
              count: 9,
              sizeType: ["compressed"],
              sourceType: ["album", "camera"],
              success: async (imageRes) => {
                for (const tempFilePath of imageRes.tempFilePaths) {
                  const fileId = addMediaFile(tempFilePath, "image");
                  const fileItem = mediaFiles.value.find(f => f.id === fileId);
                  if (fileItem && fileItem.filePath) {
                    uploadMediaFileDirect(fileId, fileItem.filePath, fileItem.file_type).catch(err => {
                      console.error(`上传文件失败:`, err);
                    });
                  }
                }
              },
            });
          } else if (res.tapIndex === 1) {
            uni.chooseVideo({
              sourceType: ["album", "camera"],
              maxDuration: 60,
              camera: "back",
              compressed: true,
              success: async (videoRes) => {
                try {
                  const fileInfo = await uni.getFileInfo({
                    filePath: videoRes.tempFilePath,
                  });
                  
                  const fileSize = fileInfo.size;
                  // 如果文件超过建议大小，提示用户是否压缩（但不强制）
                  if (fileSize > MAX_VIDEO_SIZE) {
                    uni.showModal({
                      title: "视频文件较大",
                      content: `视频大小为 ${(fileSize / 1024 / 1024).toFixed(2)}MB，建议压缩后上传以节省流量和时间。是否压缩？`,
                      confirmText: "压缩",
                      cancelText: "直接上传",
                      success: async (modalRes) => {
                        if (modalRes.confirm) {
                          await compressAndUploadVideo(videoRes.tempFilePath, fileSize);
                        } else {
                          await uploadVideoFile(videoRes.tempFilePath, fileSize);
                        }
                      },
                    });
                  } else {
                    await uploadVideoFile(videoRes.tempFilePath, fileSize);
                  }
                } catch (error) {
                  await uploadVideoFile(videoRes.tempFilePath, 0);
                }
              },
            });
          }
        },
      });
    };

    // 从微信聊天选择文件
    const handleChooseMessageFile = () => {
      // #ifdef MP-WEIXIN
      uni.chooseMessageFile({
        count: 9,
        type: "all",
        success: async (res) => {
          for (const tempFile of res.tempFiles) {
            const fileType = tempFile.type?.includes("video") || tempFile.path?.includes("video") ? "video" : "image";
            
            // 不再限制文件大小，直接添加文件
            const fileId = addMediaFile(tempFile.path, fileType);
            const fileItem = mediaFiles.value.find(f => f.id === fileId);
            if (fileItem && fileItem.filePath) {
              uploadMediaFileDirect(fileId, fileItem.filePath, fileItem.file_type).catch(err => {
                console.error(`上传文件失败:`, err);
              });
            }
          }
        },
      });
      // #endif
      
      // #ifndef MP-WEIXIN
      uni.showToast({
        title: "当前平台不支持此功能",
        icon: "none",
      });
      // #endif
    };

    // 压缩视频
    const compressAndUploadVideo = async (filePath: string, originalSize: number) => {
      try {
        // #ifdef MP-WEIXIN
        const compressResult = await new Promise<string>((resolve, reject) => {
          uni.compressVideo({
            src: filePath,
            quality: "medium",
            bitrate: 1000,
            fps: 30,
            resolution: 0.8,
            success: (res) => {
              resolve(res.tempFilePath);
            },
            fail: (err) => {
              resolve(filePath);
            },
          });
        });
        await uploadVideoFile(compressResult, 0);
        // #endif
        
        // #ifndef MP-WEIXIN
        await uploadVideoFile(filePath, originalSize);
        // #endif
      } catch (error) {
        await uploadVideoFile(filePath, originalSize);
      }
    };

    // 上传视频文件
    const uploadVideoFile = async (filePath: string, fileSize: number) => {
      const fileId = addMediaFile(filePath, "video");
      try {
        await uploadMediaFileDirect(fileId, filePath, "video");
      } catch (error) {
        console.error("上传视频失败:", error);
      }
    };

    // 添加媒体文件到列表
    const addMediaFile = (filePath: string, fileType: string): string => {
      const fileId = `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newFile: MediaFileItem = {
        id: fileId,
        file_type: fileType,
        file_url: "",
        preview_url: filePath,
        media_category: "picking", // 默认分类
        uploadStatus: "pending",
        uploadProgress: 0,
        filePath: filePath,
        isExisting: false,
      };
      mediaFiles.value.push(newFile);
      return fileId;
    };

    // 直接上传媒体文件
    const uploadMediaFileDirect = async (
      fileId: string,
      filePath: string,
      fileType: string
    ): Promise<string | null> => {
      const fileIndex = mediaFiles.value.findIndex(f => f.id === fileId);
      if (fileIndex === -1) {
        throw new Error("文件不存在");
      }
      
      const fileItem = mediaFiles.value[fileIndex];
      fileItem.uploadStatus = "uploading";
      fileItem.uploadProgress = 0;
      fileItem.errorMessage = undefined;

      try {
        // 不再限制文件大小，直接上传
        const { url } = await uploadToQiniu(filePath, (progress) => {
          fileItem.uploadProgress = progress;
        });

        fileItem.file_url = url;
        fileItem.uploadStatus = "completed";
        fileItem.uploadProgress = 100;

        return url;
      } catch (error) {
        fileItem.uploadStatus = "error";
        fileItem.uploadProgress = 0;
        fileItem.errorMessage = error instanceof Error ? error.message : "上传失败";
        throw error;
      }
    };

    // 重试上传
    const handleRetryUpload = async (index: number) => {
      const fileItem = mediaFiles.value[index];
      if (!fileItem.filePath) {
        uni.showToast({
          title: "无法重试：文件路径不存在",
          icon: "none",
        });
        return;
      }
      
      try {
        await uploadMediaFileDirect(fileItem.id as string, fileItem.filePath, fileItem.file_type);
        uni.showToast({
          title: "重试成功",
          icon: "success",
        });
      } catch (error) {
        uni.showToast({
          title: "重试失败",
          icon: "none",
        });
      }
    };

    // 选择媒体分类
    const handleSelectMediaCategory = (index: number) => {
      const categoryLabels = mediaCategories.map((c) => c.label);
      uni.showActionSheet({
        itemList: categoryLabels,
        success: (res) => {
          if (res.tapIndex >= 0 && res.tapIndex < mediaCategories.length) {
            mediaFiles.value[index].media_category = mediaCategories[res.tapIndex].value;
          }
        },
      });
    };

    // 获取媒体分类名称
    const getMediaCategoryName = (value: string) => {
      const category = mediaCategories.find((c) => c.value === value);
      return category?.label || "未分类";
    };

    // 预览媒体文件
    const handlePreviewMediaFile = (file: MediaFileItem, index: number) => {
      if (file.file_type === "video") {
        const videoUrl = file.file_url || file.preview_url || "";
        if (!videoUrl) {
          uni.showToast({
            title: "视频地址不存在",
            icon: "none",
          });
          return;
        }
        const videoContext = uni.createVideoContext(`preview-video-${index}`);
        if (videoContext) {
          videoContext.requestFullScreen({ direction: 0 });
          videoContext.play();
        }
      } else {
        const imageUrls = mediaFiles.value
          .filter(f => f.file_type === "image")
          .map(f => f.file_url || f.preview_url || "")
          .filter(Boolean);
        const currentUrl = file.file_url || file.preview_url || "";
        uni.previewImage({
          urls: imageUrls,
          current: currentUrl,
        });
      }
    };

    // 删除媒体文件
    const handleRemoveMediaFile = (index: number) => {
      const fileItem = mediaFiles.value[index];
      uni.showModal({
        title: "确认删除",
        content: "确定要删除这个媒体文件吗？",
        success: (res) => {
          if (res.confirm) {
            // 如果是已存在的文件，记录ID以便删除
            if (fileItem.isExisting && fileItem.id) {
              deletedMediaFileIds.value.push(fileItem.id);
            }
            mediaFiles.value.splice(index, 1);
          }
        },
      });
    };

    // 提交表单
    const handleSubmit = async () => {
      if (submitting.value) return;

      // 检查是否有正在上传的新文件
      const uploadingFiles = mediaFiles.value.filter(f => !f.isExisting && (f.uploadStatus === 'uploading' || f.uploadStatus === 'pending'));
      if (uploadingFiles.length > 0) {
        uni.showModal({
          title: "提示",
          content: `还有 ${uploadingFiles.length} 个文件正在上传，是否等待上传完成？`,
          confirmText: "等待",
          cancelText: "只保存已完成的",
          success: async (res) => {
            if (res.confirm) {
              await waitForAllUploads();
              handleSubmit();
            } else {
              submitChanges();
            }
          },
        });
        return;
      }

      submitChanges();
    };

    // 等待所有上传完成
    const waitForAllUploads = async (): Promise<void> => {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const uploadingFiles = mediaFiles.value.filter(f => !f.isExisting && (f.uploadStatus === 'uploading' || f.uploadStatus === 'pending'));
          if (uploadingFiles.length === 0) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 500);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 5 * 60 * 1000);
      });
    };

    // 提交更改
    const submitChanges = async () => {
      submitting.value = true;
      try {
        // 1. 更新批次主图
        if (form.value.image_url !== (batch.value?.image_url || "")) {
          await updateBatch(batchId.value, {
            image_url: form.value.image_url || null,
          });
        }

        // 2. 删除已标记删除的媒体文件
        for (const mediaFileId of deletedMediaFileIds.value) {
          await deleteBatchMediaFile(mediaFileId);
        }

        // 3. 添加新的媒体文件
        const newFiles = mediaFiles.value.filter(f => !f.isExisting && f.uploadStatus === 'completed');
        for (const file of newFiles) {
          await addBatchMediaFile(batchId.value, {
            file_type: file.file_type,
            file_url: file.file_url,
            media_category: file.media_category,
          });
        }

        // 4. 更新已存在文件的分类（如果有变化）
        const existingFiles = mediaFiles.value.filter(f => f.isExisting && f.id);
        for (const file of existingFiles) {
          if (file.originalCategory !== file.media_category && file.id) {
            await updateBatchMediaFileCategory(file.id, file.media_category);
          }
        }

        uni.showToast({
          title: "保存成功",
          icon: "success",
        });
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      } catch (error) {
        console.error("保存批次失败:", error);
        uni.showToast({
          title: error instanceof Error ? error.message : "保存失败",
          icon: "none",
        });
      } finally {
        submitting.value = false;
      }
    };

    onLoad((options: any) => {
      if (options.id) {
        batchId.value = options.id;
        loadBatch();
      } else {
        uni.showToast({
          title: "批次ID缺失",
          icon: "none",
        });
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      }
    });

    return {
      batch,
      form,
      submitting,
      imageUploading,
      imageUploadProgress,
      imageUploadStatus,
      mediaFiles,
      mediaCategories,
      totalUploadProgress,
      completedUploadCount,
      totalUploadCount,
      handleChooseImage,
      handlePreviewImage,
      handleDeleteImage,
      handleAddMediaFile,
      handleSelectMediaCategory,
      getMediaCategoryName,
      handlePreviewMediaFile,
      handleRemoveMediaFile,
      handleRetryUpload,
      handleSubmit,
    };
  },
};
</script>

<style scoped>
/* 样式参考 batch-create/index.vue，这里使用相同的样式 */
.page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.header {
  background-color: #fff;
  padding: 30rpx 40rpx;
  border-bottom: 1rpx solid #eee;
}

.header-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.scroll-view {
  height: calc(100vh - 120rpx);
}

.section {
  background-color: #fff;
  margin-top: 20rpx;
  padding: 30rpx 40rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 24rpx;
}

.optional {
  font-size: 24rpx;
  color: #999;
  font-weight: normal;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.add-media-btn {
  padding: 12rpx 24rpx;
  background: linear-gradient(135deg, #3cc51f 0%, #2ea517 100%);
  border-radius: 8rpx;
}

.add-media-btn-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 500;
}

.image-upload {
  width: 100%;
  height: 300rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  border: 1rpx dashed #d0d0d0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.upload-icon {
  font-size: 60rpx;
}

.upload-text {
  font-size: 28rpx;
  color: #999;
}

.image-preview {
  position: relative;
}

.preview-image {
  width: 100%;
  max-height: 600rpx;
  border-radius: 12rpx;
}

.image-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
}

.action-btn {
  flex: 1;
  padding: 20rpx 0;
  text-align: center;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #333;
}

.action-btn.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.action-btn.delete {
  background-color: #fff4e6;
  color: #ff9500;
}

.image-tip {
  margin-top: 12rpx;
}

.tip-text {
  font-size: 24rpx;
  color: #999;
}

.progress-bar {
  width: 100%;
  height: 8rpx;
  background-color: #e0e0e0;
  border-radius: 4rpx;
  overflow: hidden;
  margin-top: 12rpx;
}

.progress-bar.small {
  height: 6rpx;
  margin-top: 8rpx;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3cc51f 0%, #2ea517 100%);
  border-radius: 4rpx;
  transition: width 0.3s ease;
}

.progress-percent {
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #666;
  margin-top: 8rpx;
}

.progress-percent.small {
  font-size: 20rpx;
  margin-top: 4rpx;
}

.total-progress {
  margin-bottom: 24rpx;
  padding: 20rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
}

.total-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.total-progress-text {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.total-progress-count {
  font-size: 24rpx;
  color: #666;
}

.media-files-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.media-file-item {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 20rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
}

.media-preview-wrapper {
  position: relative;
  width: 100%;
  height: 400rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background-color: #000;
}

.media-file-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-preview-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.video-play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 60rpx;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.5);
}

.upload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-status-content {
  pointer-events: none;
}

.upload-status-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 500;
}

.upload-status-text.error {
  color: #ff3b30;
}

.media-file-info {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.media-file-category {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.category-label {
  font-size: 26rpx;
  color: #666;
}

.category-selector {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 20rpx;
  background-color: #fff;
  border-radius: 8rpx;
  border: 1rpx solid #e0e0e0;
}

.category-text {
  font-size: 26rpx;
  color: #333;
}

.category-arrow {
  font-size: 24rpx;
  color: #999;
}

.media-file-type {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.type-label {
  font-size: 26rpx;
  color: #666;
}

.type-text {
  font-size: 26rpx;
  color: #333;
}

.file-progress {
  margin-top: 8rpx;
}

.file-error {
  margin-top: 8rpx;
}

.error-text {
  font-size: 24rpx;
  color: #ff3b30;
}

.media-file-actions {
  display: flex;
  gap: 12rpx;
  justify-content: flex-end;
}

.action-btn-small {
  padding: 12rpx 24rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #333;
}

.action-btn-small.retry {
  background-color: #e8f5e9;
  color: #2ea517;
}

.action-btn-small.delete {
  background-color: #fff4e6;
  color: #ff9500;
}

.empty-media {
  padding: 60rpx 40rpx;
  text-align: center;
}

.empty-media-text {
  font-size: 26rpx;
  color: #999;
}

.submit-section {
  padding: 40rpx;
  background-color: #fff;
  margin-top: 20rpx;
}

.submit-btn {
  width: 100%;
  padding: 28rpx 0;
  background: linear-gradient(135deg, #3cc51f 0%, #2ea517 100%);
  border-radius: 12rpx;
  text-align: center;
  box-shadow: 0 4rpx 12rpx rgba(60, 197, 31, 0.3);
}

.submit-btn.disabled {
  background-color: #ccc;
  box-shadow: none;
  opacity: 0.6;
}

.submit-btn-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #fff;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 200rpx 40rpx;
}

.loading-text {
  font-size: 28rpx;
  color: #999;
}
</style>
