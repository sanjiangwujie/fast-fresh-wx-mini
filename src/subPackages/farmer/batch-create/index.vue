<template>
  <view class="page">
    <view class="header">
      <text class="header-title">新建批次</text>
    </view>

    <scroll-view class="scroll-view" scroll-y>
      <!-- 批次图片 -->
      <view class="section">
        <view class="section-title">批次图片 <text class="optional">(可选)</text></view>
        <view class="image-upload" @click="handleChooseImage" v-if="!form || !form.image_url">
          <view class="upload-placeholder">
            <text class="upload-icon">📷</text>
            <text class="upload-text">点击上传图片</text>
          </view>
        </view>
        <view class="image-preview" v-else>
          <image class="preview-image" :src="form.image_url" mode="aspectFill" @click="handlePreviewImage" />
          <view class="image-actions">
            <view class="action-btn" @click="handleChooseImage">重新上传</view>
            <view class="action-btn delete" @click="handleDeleteImage">删除</view>
          </view>
        </view>
        <view class="image-tip" v-if="imageUploading">
          <text class="tip-text">{{ imageUploadStatus || "上传中..." }}</text>
          <view class="progress-bar" v-if="imageUploadProgress > 0">
            <view class="progress-fill" :style="{ width: imageUploadProgress + '%' }"></view>
          </view>
          <text class="progress-percent" v-if="imageUploadProgress > 0">{{ imageUploadProgress.toFixed(0) }}%</text>
        </view>
        <view class="image-tip" v-else-if="!form || !form.image_url">
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
          <view class="media-file-item" v-for="(file, index) in mediaFiles" :key="file.id || index">
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
                v-if="file.uploadStatus !== 'completed'"
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
                v-if="file.uploadStatus === 'error'"
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
          <text class="submit-btn-text">{{ submitting ? "提交中..." : "创建批次" }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script lang="ts">
import { ref, computed, onMounted } from "vue";
import { onLoad, onHide, onShow } from "@dcloudio/uni-app";
import { createBatch, getFarmerByUserId } from "@/api/batch";
import { getUserId, isLoggedIn, getToken } from "@/api/auth";
import { uploadToQiniu, type UploadTask } from "@/api/upload";

export default {
  setup() {
    const form = ref({
      image_url: "",
    });
    const submitting = ref(false);
    
    // 批次图片上传状态（独立）
    const imageUploading = ref(false);
    const imageUploadProgress = ref(0);
    const imageUploadStatus = ref("");
    
    // 媒体文件上传状态（独立）
    const mediaUploading = ref(false);
    const mediaUploadProgress = ref(0);
    const mediaUploadStatus = ref("");
    const mediaUploadCurrent = ref(0); // 当前上传第几个文件
    const mediaUploadTotal = ref(0); // 总共几个文件
    const mediaUploadTaskCount = ref(0); // 正在进行的上传任务数量（用于管理并发上传）
    
    const farmerId = ref<string | number | null>(null);
    
    // 媒体文件数据结构（包含上传状态）
    interface MediaFileItem {
      id: string; // 唯一ID
      file_url: string; // 上传后的URL
      file_type: string; // image/video
      media_category: string; // picking/packing/loading/departure
      preview_url?: string; // 预览URL（本地临时路径）
      poster_url?: string; // 视频封面
      uploadStatus: 'pending' | 'uploading' | 'completed' | 'error'; // 上传状态
      uploadProgress: number; // 上传进度 0-100
      errorMessage?: string; // 错误信息
      filePath?: string; // 本地文件路径（用于重试）
      uploadTask?: UploadTask; // 上传任务（用于取消）
    }
    
    const mediaFiles = ref<MediaFileItem[]>([]);
    const uploadTasks = ref<Map<string, UploadTask>>(new Map()); // 保存上传任务，支持后台上传
    
    // 计算总进度
    const totalUploadProgress = computed(() => {
      if (mediaFiles.value.length === 0) return 0;
      const total = mediaFiles.value.reduce((sum, file) => {
        if (file.uploadStatus === 'completed') return sum + 100;
        if (file.uploadStatus === 'uploading') return sum + (file.uploadProgress || 0);
        return sum;
      }, 0);
      return total / mediaFiles.value.length;
    });
    
    // 已完成和总数
    const completedUploadCount = computed(() => {
      return mediaFiles.value.filter(file => file.uploadStatus === 'completed').length;
    });
    
    const totalUploadCount = computed(() => {
      return mediaFiles.value.length;
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

    // 加载果农信息
    const loadFarmerInfo = async () => {
      if (!isLoggedIn()) {
        uni.navigateTo({
          url: "/pages/login/index",
        });
        return;
      }

      const userId = getUserId();
      if (!userId) {
        uni.navigateTo({
          url: "/pages/login/index",
        });
        return;
      }

      try {
        const farmer = await getFarmerByUserId(userId, true);
        if (!farmer) {
          uni.showToast({
            title: "您还不是果农",
            icon: "none",
          });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
          return;
        }
        farmerId.value = farmer.id;
      } catch (error) {
        console.error("获取果农信息失败:", error);
        uni.showToast({
          title: "获取信息失败",
          icon: "none",
        });
      }
    };

    // 选择图片（用于批次主图）
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

    // 添加媒体文件
    const handleAddMediaFile = () => {
      uni.showActionSheet({
        itemList: ["选择图片", "选择视频", "从微信聊天选择"],
        success: (res) => {
          if (res.tapIndex === 2) {
            // 从微信聊天选择
            handleChooseMessageFile();
            return;
          }
          if (res.tapIndex === 0) {
            // 选择图片
            uni.chooseImage({
              count: 9,
              sizeType: ["compressed"],
              sourceType: ["album", "camera"],
              success: async (imageRes) => {
                // 先添加所有文件到列表
                const fileIds: string[] = [];
                for (const tempFilePath of imageRes.tempFilePaths) {
                  const fileId = addMediaFile(tempFilePath, "image");
                  fileIds.push(fileId);
                }
                
                // 然后开始上传（并发上传）
                for (const fileId of fileIds) {
                  const fileItem = mediaFiles.value.find(f => f.id === fileId);
                  if (fileItem && fileItem.filePath) {
                    // 异步上传，不等待完成
                    uploadMediaFileDirect(fileId, fileItem.filePath, fileItem.file_type).catch(err => {
                      console.error(`上传文件失败:`, err);
                    });
                  }
                }
              },
              fail: (error) => {
                console.error("选择图片失败:", error);
                uni.showToast({
                  title: "选择图片失败",
                  icon: "none",
                });
              },
            });
          } else if (res.tapIndex === 1) {
            // 选择视频
            uni.chooseVideo({
              sourceType: ["album", "camera"],
              maxDuration: 60,
              camera: "back",
              compressed: true, // 启用压缩
              success: async (videoRes) => {
                // 检查文件大小
                try {
                  const fileInfo = await uni.getFileInfo({
                    filePath: videoRes.tempFilePath,
                  });
                  
                  const fileSize = fileInfo.size;
                  console.log("[视频上传] 文件大小:", (fileSize / 1024 / 1024).toFixed(2), "MB");

                  // 如果文件超过建议大小，提示用户是否压缩（但不强制）
                  if (fileSize > MAX_VIDEO_SIZE) {
                    uni.showModal({
                      title: "视频文件较大",
                      content: `视频大小为 ${(fileSize / 1024 / 1024).toFixed(2)}MB，建议压缩后上传以节省流量和时间。是否压缩？`,
                      confirmText: "压缩",
                      cancelText: "直接上传",
                      success: async (modalRes) => {
                        if (modalRes.confirm) {
                          // 压缩视频
                          await compressAndUploadVideo(videoRes.tempFilePath, fileSize);
                        } else {
                          // 直接上传
                          await uploadVideoFile(videoRes.tempFilePath, fileSize);
                        }
                      },
                    });
                  } else {
                    // 文件大小合适，直接上传
                    await uploadVideoFile(videoRes.tempFilePath, fileSize);
                  }
                } catch (error) {
                  console.error("获取文件信息失败:", error);
                  // 如果获取文件信息失败，直接尝试上传
                  await uploadVideoFile(videoRes.tempFilePath, 0);
                }
              },
              fail: (error) => {
                console.error("选择视频失败:", error);
                uni.showToast({
                  title: "选择视频失败",
                  icon: "none",
                });
              },
            });
          }
        },
      });
    };

    // 压缩视频
    const compressAndUploadVideo = async (filePath: string, originalSize: number) => {
      mediaUploading.value = true;
      mediaUploadProgress.value = 0;
      mediaUploadStatus.value = "压缩视频中...";
      
      try {
        // 检查是否支持视频压缩（微信小程序支持）
        // 使用 uni.compressVideo 压缩视频
        const compressResult = await new Promise<string>((resolve, reject) => {
          // #ifdef MP-WEIXIN
          uni.compressVideo({
            src: filePath,
            quality: "medium", // 压缩质量：low/medium/high
            bitrate: 1000, // 码率，单位 kbps
            fps: 30, // 帧率
            resolution: 0.8, // 分辨率比例
            success: (res) => {
              console.log("[视频压缩] 压缩成功:", res.tempFilePath);
              const compressedSize: number = Number(res.size) || 0;
              console.log("[视频压缩] 原始大小:", (originalSize / 1024 / 1024).toFixed(2), "MB");
              console.log("[视频压缩] 压缩后大小:", (compressedSize / 1024 / 1024).toFixed(2), "MB");
              resolve(res.tempFilePath);
            },
            fail: (err) => {
              console.error("[视频压缩] 压缩失败:", err);
              // 压缩失败，使用原文件
              uni.showToast({
                title: "压缩失败，使用原文件上传",
                icon: "none",
              });
              resolve(filePath);
            },
          });
          // #endif
          
          // #ifndef MP-WEIXIN
          // 其他平台可能不支持压缩，直接使用原文件
          console.log("[视频压缩] 当前平台不支持压缩，使用原文件");
          resolve(filePath);
          // #endif
        });

        // 上传压缩后的视频
        await uploadVideoFile(compressResult, 0);
      } catch (error) {
        console.error("压缩视频失败:", error);
        uni.showToast({
          title: "压缩失败，尝试直接上传",
          icon: "none",
        });
        // 压缩失败，尝试直接上传原文件
        await uploadVideoFile(filePath, originalSize);
      }
    };

    // 上传视频文件
    const uploadVideoFile = async (filePath: string, fileSize: number) => {
      // 先添加文件到列表
      const fileId = addMediaFile(filePath, "video");
      
      // 然后开始上传
      try {
        await uploadMediaFileDirect(fileId, filePath, "video");
        uni.showToast({
          title: "成功添加视频",
          icon: "success",
        });
      } catch (error) {
        console.error("上传视频失败:", error);
        uni.showToast({
          title: error instanceof Error ? error.message : "上传失败",
          icon: "none",
        });
      }
    };

    // 从微信聊天选择文件
    const handleChooseMessageFile = () => {
      // #ifdef MP-WEIXIN
      uni.chooseMessageFile({
        count: 9,
        type: "all", // 支持图片和视频
        success: async (res) => {
          // 先添加所有文件到列表
          const fileIds: string[] = [];
          for (const tempFile of res.tempFiles) {
            // 判断文件类型
            const fileType = tempFile.type?.includes("video") || tempFile.path?.includes("video") ? "video" : "image";
            
            // 不再限制文件大小，直接添加文件
            const fileId = addMediaFile(tempFile.path, fileType);
            fileIds.push(fileId);
          }
          
          // 然后开始上传（并发上传）
          for (const fileId of fileIds) {
            const fileItem = mediaFiles.value.find(f => f.id === fileId);
            if (fileItem && fileItem.filePath) {
              // 异步上传，不等待完成
              uploadMediaFileDirect(fileId, fileItem.filePath, fileItem.file_type).catch(err => {
                console.error(`上传文件失败:`, err);
              });
            }
          }
        },
        fail: (error) => {
          console.error("选择文件失败:", error);
          uni.showToast({
            title: "选择文件失败",
            icon: "none",
          });
        },
      });
      // #endif
      
      // #ifndef MP-WEIXIN
      uni.showToast({
        title: "当前平台不支持从聊天选择",
        icon: "none",
      });
      // #endif
    };

    // 添加文件到列表（先添加，后上传）
    const addMediaFile = (filePath: string, fileType: string): string => {
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const fileItem: MediaFileItem = {
        id: fileId,
        file_url: "",
        file_type: fileType,
        media_category: "picking",
        preview_url: filePath, // 使用本地路径作为预览
        uploadStatus: "pending",
        uploadProgress: 0,
        filePath: filePath,
      };
      
      // 如果是视频，尝试生成封面
      if (fileType === "video") {
        // 视频封面会在上传时生成，这里先使用默认
        fileItem.poster_url = filePath;
      }
      
      mediaFiles.value.push(fileItem);
      return fileId;
    };

    // 直接上传媒体文件到七牛云（支持后台上传）
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
      
      // 更新状态为上传中
      fileItem.uploadStatus = "uploading";
      fileItem.uploadProgress = 0;
      fileItem.errorMessage = undefined;

      try {
        // 不再限制文件大小，直接上传

        // 使用七牛云直传（每个文件独立上传，互不影响）
        const { task, url } = await uploadToQiniu(filePath, (progress) => {
          // 更新单个文件的上传进度
          fileItem.uploadProgress = progress;
        });

        // 保存上传任务，支持后台上传
        const taskId = `upload_${fileId}`;
        uploadTasks.value.set(taskId, task);
        fileItem.uploadTask = task;

        // 上传成功，更新文件URL和状态
        fileItem.file_url = url;
        fileItem.uploadStatus = "completed";
        fileItem.uploadProgress = 100;
        fileItem.uploadTask = undefined; // 清除任务引用

        return url;
      } catch (error) {
        console.error("上传媒体文件失败:", error);
        // 更新状态为失败
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
        await uploadMediaFileDirect(fileItem.id, fileItem.filePath, fileItem.file_type);
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

    // 上传媒体文件（兼容旧方案，通过后端中转）
    const uploadMediaFile = async (
      filePath: string,
      onProgress?: (progress: number) => void
    ): Promise<string | null> => {
      // 优先使用七牛云直传
      try {
        const fileId = addMediaFile(filePath, "image");
        const fileItem = mediaFiles.value.find(f => f.id === fileId);
        if (fileItem && fileItem.filePath) {
          return await uploadMediaFileDirect(fileId, fileItem.filePath, fileItem.file_type);
        }
        return null;
      } catch (error) {
        console.warn("七牛云直传失败，尝试后端中转:", error);
        // 如果直传失败，回退到后端中转方案
        // 这里保留原有的后端中转逻辑作为备用
        throw error;
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
        // 视频预览：使用 video 组件的全屏功能
        const videoUrl = file.file_url || file.preview_url || "";
        if (!videoUrl) {
          uni.showToast({
            title: "视频地址不存在",
            icon: "none",
          });
          return;
        }
        
        // 使用 video 组件的全屏播放
        const videoContext = uni.createVideoContext(`preview-video-${index}`);
        if (videoContext) {
          videoContext.requestFullScreen({
            direction: 90, // 横屏
          });
          setTimeout(() => {
            videoContext.play();
          }, 300);
        }
      } else {
        // 图片预览：获取所有图片URL
        const imageUrls = mediaFiles.value
          .filter(f => f.file_type === "image" && (f.file_url || f.preview_url))
          .map(f => f.file_url || f.preview_url || "");
        
        const currentUrl = file.file_url || file.preview_url || "";
        const currentIndex = imageUrls.findIndex(url => url === currentUrl);
        
        uni.previewImage({
          urls: imageUrls,
          current: currentIndex >= 0 ? currentIndex : 0,
        });
      }
    };

    // 删除媒体文件
    const handleRemoveMediaFile = (index: number) => {
      uni.showModal({
        title: "确认删除",
        content: "确定要删除这个媒体文件吗？",
        success: (res) => {
          if (res.confirm) {
            mediaFiles.value.splice(index, 1);
          }
        },
      });
    };

    // 上传图片（批次主图）
    const uploadImage = async (filePath: string) => {
      imageUploading.value = true;
      imageUploadProgress.value = 0;
      imageUploadStatus.value = "上传图片中...";
      
      try {
        // 使用七牛云直传
        const { url } = await uploadToQiniu(filePath, (progress) => {
          imageUploadProgress.value = progress;
          imageUploadStatus.value = `上传图片中... ${progress}%`;
        });

        form.value.image_url = url;
        imageUploadStatus.value = "上传成功";
        uni.showToast({
          title: "上传成功",
          icon: "success",
        });
        
        // 1秒后清除状态
        setTimeout(() => {
          imageUploading.value = false;
          imageUploadProgress.value = 0;
          imageUploadStatus.value = "";
        }, 1000);
      } catch (error) {
        console.error("上传图片失败:", error);
        imageUploadStatus.value = "上传失败";
        uni.showToast({
          title: error instanceof Error ? error.message : "上传失败",
          icon: "none",
        });
        setTimeout(() => {
          imageUploading.value = false;
          imageUploadProgress.value = 0;
          imageUploadStatus.value = "";
        }, 2000);
      }
    };

    // 页面隐藏时，保持上传任务继续
    const handlePageHide = () => {
      // 上传任务会在后台继续执行
      console.log("[批次创建] 页面隐藏，上传任务继续在后台执行");
    };

    // 页面显示时，检查上传任务状态
    const handlePageShow = () => {
      // 可以在这里检查上传任务状态
      console.log("[批次创建] 页面显示，检查上传任务状态");
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

    // 提交表单
    const handleSubmit = async () => {
      if (submitting.value) return;

      if (!farmerId.value) {
        uni.showToast({
          title: "请先获取果农信息",
          icon: "none",
        });
        return;
      }

      // 检查是否有正在上传的文件
      const uploadingFiles = mediaFiles.value.filter(f => f.uploadStatus === 'uploading' || f.uploadStatus === 'pending');
      if (uploadingFiles.length > 0) {
        uni.showModal({
          title: "提示",
          content: `还有 ${uploadingFiles.length} 个文件正在上传，是否等待上传完成？`,
          confirmText: "等待",
          cancelText: "只提交已完成的",
          success: async (res) => {
            if (res.confirm) {
              // 等待所有文件上传完成
              await waitForAllUploads();
              handleSubmit(); // 重新提交
            } else {
              // 只提交已完成的文件
              submitCompletedFiles();
            }
          },
        });
        return;
      }

      // 检查是否有上传失败的文件
      const failedFiles = mediaFiles.value.filter(f => f.uploadStatus === 'error');
      if (failedFiles.length > 0) {
        uni.showModal({
          title: "提示",
          content: `有 ${failedFiles.length} 个文件上传失败，是否只提交已成功的文件？`,
          confirmText: "只提交成功的",
          cancelText: "取消",
          success: (res) => {
            if (res.confirm) {
              submitCompletedFiles();
            }
          },
        });
        return;
      }

      submitCompletedFiles();
    };

    // 等待所有上传完成
    const waitForAllUploads = async (): Promise<void> => {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const uploadingFiles = mediaFiles.value.filter(f => f.uploadStatus === 'uploading' || f.uploadStatus === 'pending');
          if (uploadingFiles.length === 0) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 500);
        
        // 最多等待5分钟
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 5 * 60 * 1000);
      });
    };

    // 提交已完成的文件
    const submitCompletedFiles = async () => {
      if (submitting.value) return;

      submitting.value = true;
      try {
        // 只提交已完成的文件
        const completedFiles = mediaFiles.value.filter(f => f.uploadStatus === 'completed');
        const batchMediaFiles = completedFiles.map((file) => ({
          file_type: file.file_type,
          file_url: file.file_url,
          media_category: file.media_category,
        }));

        if (!farmerId.value) {
          uni.showToast({
            title: "果农信息不存在",
            icon: "none",
          });
          return;
        }

        const result = await createBatch(farmerId.value, {
          image_url: form.value.image_url || null,
          batch_media_files: batchMediaFiles.length > 0 ? batchMediaFiles : undefined,
        });

        if (result) {
          uni.showToast({
            title: "创建成功",
            icon: "success",
          });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        }
      } catch (error) {
        console.error("创建批次失败:", error);
        uni.showToast({
          title: "创建失败",
          icon: "none",
        });
      } finally {
        submitting.value = false;
      }
    };

    onLoad(() => {
      loadFarmerInfo();
    });

    onShow(() => {
      handlePageShow();
    });

    onHide(() => {
      handlePageHide();
    });

    return {
      form,
      submitting,
      // 批次图片上传状态
      imageUploading,
      imageUploadProgress,
      imageUploadStatus,
      // 媒体文件上传状态
      mediaFiles,
      mediaCategories,
      // 总进度
      totalUploadProgress,
      completedUploadCount,
      totalUploadCount,
      // 方法
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
  font-weight: normal;
  color: #999;
  margin-left: 8rpx;
}

.image-upload {
  width: 100%;
  height: 400rpx;
  border-radius: 12rpx;
  border: 2rpx dashed #d0d0d0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f9f9f9;
  overflow: hidden;
}

.image-preview {
  position: relative;
  width: 100%;
  height: 400rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background-color: #f9f9f9;
}

.preview-image {
  width: 100%;
  height: 100%;
}

.image-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
}

.action-btn {
  flex: 1;
  padding: 16rpx;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8rpx;
  text-align: center;
  font-size: 26rpx;
  color: #333;
}

.action-btn.delete {
  background-color: rgba(255, 59, 48, 0.9);
  color: #fff;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
}

.upload-icon {
  font-size: 80rpx;
}

.upload-text {
  font-size: 28rpx;
  color: #999;
}

.image-tip {
  margin-top: 16rpx;
}

.tip-text {
  font-size: 24rpx;
  color: #999;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.add-media-btn {
  padding: 8rpx 20rpx;
  background: linear-gradient(135deg, #3cc51f 0%, #2ea517 100%);
  border-radius: 20rpx;
}

.add-media-btn-text {
  font-size: 24rpx;
  color: #fff;
  font-weight: 500;
}

.media-files-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.media-file-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  border: 1rpx solid #e0e0e0;
}

.media-preview-wrapper {
  position: relative;
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  overflow: hidden;
  background-color: #f5f5f5;
}

.media-file-preview {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
}

.media-file-preview.video {
  object-fit: cover;
}

.video-preview-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.video-play-icon {
  position: absolute;
  font-size: 40rpx;
  color: rgba(255, 255, 255, 0.9);
  background-color: rgba(0, 0, 0, 0.5);
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.upload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  z-index: 1;
}

.upload-status-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  pointer-events: none; /* 状态文本区域不阻止点击穿透 */
}

.upload-status-text {
  font-size: 22rpx;
  color: #fff;
  font-weight: 500;
}

.upload-status-text.error {
  color: #ff3b30;
}

.media-file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.file-progress {
  margin-top: 8rpx;
}

.progress-bar {
  width: 100%;
  height: 6rpx;
  background-color: #e0e0e0;
  border-radius: 3rpx;
  overflow: hidden;
  margin-bottom: 4rpx;
}

.progress-bar.small {
  height: 4rpx;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3cc51f 0%, #2ea517 100%);
  transition: width 0.3s ease;
}

.progress-percent {
  font-size: 22rpx;
  color: #666;
  display: block;
  text-align: right;
  margin-top: 4rpx;
}

.progress-percent.small {
  font-size: 20rpx;
  color: #999;
}

.file-error {
  margin-top: 8rpx;
}

.error-text {
  font-size: 22rpx;
  color: #ff3b30;
}

.total-progress {
  margin-bottom: 20rpx;
  padding: 20rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  border: 1rpx solid #e0e0e0;
}

.total-progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.total-progress .progress-percent {
  text-align: center;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #333;
}

.media-file-category {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.category-label,
.type-label {
  font-size: 24rpx;
  color: #666;
}

.category-selector {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 16rpx;
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

.type-text {
  font-size: 26rpx;
  color: #333;
}

.media-file-actions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.action-btn-small {
  padding: 12rpx 24rpx;
  background-color: #fff;
  border-radius: 8rpx;
  border: 1rpx solid #e0e0e0;
  text-align: center;
  font-size: 24rpx;
  color: #333;
}

.action-btn-small.delete {
  background-color: #ff3b30;
  color: #fff;
  border-color: #ff3b30;
}

.action-btn-small.retry {
  background-color: #007aff;
  color: #fff;
  border-color: #007aff;
  margin-right: 12rpx;
}

.empty-media {
  padding: 60rpx 0;
  text-align: center;
}

.empty-media-text {
  font-size: 26rpx;
  color: #999;
}

.upload-tip {
  margin-top: 20rpx;
  padding: 20rpx;
  background-color: #f0f9ff;
  border-radius: 8rpx;
}

.progress-bar {
  width: 100%;
  height: 8rpx;
  background-color: #e0e0e0;
  border-radius: 4rpx;
  margin-top: 12rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3cc51f 0%, #2ea517 100%);
  border-radius: 4rpx;
  transition: width 0.3s ease;
}

.submit-section {
  padding: 40rpx;
  margin-top: 40rpx;
}

.submit-btn {
  padding: 28rpx;
  background: linear-gradient(135deg, #3cc51f 0%, #2ea517 100%);
  border-radius: 40rpx;
  text-align: center;
  box-shadow: 0 4rpx 12rpx rgba(60, 197, 31, 0.3);
}

.submit-btn.disabled {
  background-color: #ccc;
  box-shadow: none;
}

.submit-btn-text {
  font-size: 30rpx;
  font-weight: bold;
  color: #fff;
}
</style>
