<template>
  <view class="page">
    <view class="top-bar">
      <view class="top-left">
        <text class="title">实时行情</text>
        <text class="subtitle">平台在售商品一览</text>
      </view>
      <view class="top-actions">
        <button class="btn ghost" :disabled="loading" @click="handleRefresh">刷新</button>
        <button class="btn ghost" open-type="share">分享</button>
        <button class="btn ghost" @click="handleExportExcel">导出</button>
        <button class="btn primary" @click="handleSavePoster">保存图片</button>
      </view>
    </view>

    <view class="meta">
      <text class="meta-text">更新时间：{{ lastUpdatedText || "-" }}</text>
      <text class="meta-text">在售：{{ totalCount }} 个</text>
    </view>

    <view class="table">
      <scroll-view scroll-x class="table-scroll">
      <view class="thead">
        <text class="th origin">产地</text>
        <text class="th category">分类</text>
        <text class="th name">品名</text>
        <text class="th spec">毛/净</text>
        <text class="th price">价格</text>
      </view>

      <view v-if="loading" class="loading">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else>
        <view v-if="grouped.length === 0" class="empty">
          <text class="empty-text">暂无在售商品</text>
        </view>

        <view v-for="group in grouped" :key="group.key" class="group">
          <view class="group-header">
            <text class="group-title">{{ group.title }}</text>
            <text class="group-count">{{ group.items.length }}</text>
          </view>
          <view v-for="item in group.items" :key="String(item.id)" class="tr">
            <text class="td origin">{{ formatOrigin(item) }}</text>
            <text class="td category">{{ formatCategory(item) }}</text>
            <text class="td name">{{ item.name }}</text>
            <text class="td spec">{{ formatSpec(item) }}</text>
            <text class="td price">{{ formatPriceWithUnit(item) }}</text>
          </view>
        </view>
      </view>
      </scroll-view>
    </view>

    <!-- 用于生成海报的离屏 canvas（只保存前 maxPosterRows 条） -->
    <canvas canvas-id="marketCanvas" class="offscreen-canvas"></canvas>
  </view>
</template>

<script lang="ts">
import { computed, ref } from "vue";
import { onLoad, onPullDownRefresh, onShareAppMessage, onShareTimeline } from "@dcloudio/uni-app";
import { getProducts } from "@/api/product";
import type { Products } from "@/types/graphql";
import { Order_By } from "@/types/graphql";

type Group = {
  key: string;
  title: string;
  items: Products[];
};

export default {
  onShareAppMessage() {
    return {
      title: "平台实时行情（在售商品一览）",
      path: "/pages/market/index",
    };
  },
  onShareTimeline() {
    return {
      title: "平台实时行情（在售商品一览）",
      query: "",
    } as any;
  },
  setup() {
    const loading = ref(false);
    const products = ref<Products[]>([]);
    const lastUpdatedAt = ref<number | null>(null);
    const maxPosterRows = 60; // 海报最多画多少行，避免画布过高

    const lastUpdatedText = computed(() => {
      if (!lastUpdatedAt.value) return "";
      const d = new Date(lastUpdatedAt.value);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    });

    const totalCount = computed(() => products.value.length);

    const grouped = computed<Group[]>(() => {
      const map = new Map<string, { title: string; items: Products[] }>();
      for (const p of products.value) {
        const title = p.category?.category_name || "未分类";
        const key = title;
        if (!map.has(key)) map.set(key, { title, items: [] });
        map.get(key)!.items.push(p);
      }
      // 组内按名称排序
      const groups: Group[] = Array.from(map.entries()).map(([key, v]) => ({
        key,
        title: v.title,
        items: v.items.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "zh")),
      }));
      // 组排序：未分类放最后，其余按中文排序
      groups.sort((a, b) => {
        if (a.title === "未分类" && b.title !== "未分类") return 1;
        if (b.title === "未分类" && a.title !== "未分类") return -1;
        return a.title.localeCompare(b.title, "zh");
      });
      return groups;
    });

    const formatPrice = (v: any) => {
      const n = Number(v || 0);
      if (!Number.isFinite(n)) return "0";
      // 尽量保持简洁：整数不显示小数
      return Math.abs(n - Math.round(n)) < 1e-6 ? String(Math.round(n)) : n.toFixed(2);
    };

    const formatPriceWithUnit = (p: Products) => {
      // unit（包装单位）有时为空；兜底用 retail_unit（零售单位）
      const unit = p.unit ? String(p.unit) : p.retail_unit ? String(p.retail_unit) : "";
      return `¥${formatPrice(p.unit_price)}${unit ? `/${unit}` : "/-"}`;
    };

    const formatCategory = (p: Products) => {
      const c = p.category;
      if (!c) return "-";
      // 优先展示：大类/小类
      if (c.category_name && c.name) return `${c.category_name}/${c.name}`;
      return c.name || c.category_name || "-";
    };

    const formatOrigin = (p: Products) => {
      const o = p.origin;
      if (!o) return "-";
      if (o.category_name && o.name) return `${o.category_name}/${o.name}`;
      return o.name || o.category_name || "-";
    };

    const formatSpec = (p: Products) => {
      const retailUnit = p.retail_unit ? String(p.retail_unit) : "";
      const gw = p.gross_weight != null ? Number(p.gross_weight) : NaN;
      const nw = p.net_weight != null ? Number(p.net_weight) : NaN;
      const fmt = (n: number) => (Number.isFinite(n) ? (Math.abs(n - Math.round(n)) < 1e-6 ? String(Math.round(n)) : n.toFixed(2)) : "-");
      const suffix = retailUnit ? `（${retailUnit}）` : "";
      return `${fmt(gw)}/${fmt(nw)}${suffix}`;
    };

    const load = async () => {
      if (loading.value) return;
      loading.value = true;
      try {
        const result = await getProducts({
          where: {
            unit_stock: { _gt: 0 },
            is_off_shelf: { _eq: false },
          },
          order_by: [{ updated_at: Order_By.Desc }] as any,
          limit: 500,
          offset: 0,
        });
        products.value = result;
        lastUpdatedAt.value = Date.now();
      } catch (e) {
        console.error("[行情] 加载失败:", e);
        uni.showToast({ title: "加载失败", icon: "none" });
      } finally {
        loading.value = false;
      }
    };

    const handleRefresh = async () => {
      await load();
    };

    const handleExportExcel = async () => {
      if (products.value.length === 0) {
        uni.showToast({ title: "暂无数据", icon: "none" });
        return;
      }

      // 仅在微信小程序侧实现（用本地文件系统写入并打开）
      // #ifdef MP-WEIXIN
      try {
        uni.showLoading({ title: "导出中..." });

        const escapeHtml = (s: string) =>
          String(s || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, "0");
        const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const title = "平台实时行情";
        const updated = lastUpdatedText.value || "";

        // 组装表格行（不做合并单元格，Excel 也能一览）
        const rows: Array<{ origin: string; category: string; name: string; spec: string; price: string }> = [];
        for (const g of grouped.value) {
          for (const p of g.items) {
            rows.push({
              origin: formatOrigin(p),
              category: formatCategory(p),
              name: String(p.name || ""),
              spec: formatSpec(p),
              price: formatPriceWithUnit(p),
            });
          }
        }

        // 使用更“瘦”的 HTML 表格生成 .xls（减少文件体积）
        const tableHeader =
          "<tr><th>产地</th><th>分类</th><th>品名</th><th>毛/净</th><th>价格</th></tr>";
        const tableBody = rows
          .map(
            (r) =>
              `<tr><td>${escapeHtml(r.origin)}</td><td>${escapeHtml(r.category)}</td><td>${escapeHtml(
                r.name
              )}</td><td>${escapeHtml(r.spec)}</td><td>${escapeHtml(r.price)}</td></tr>`
          )
          .join("");
        const html =
          `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
            title
          )}</title></head><body>` +
          `<h3>${escapeHtml(title)}</h3>` +
          `<div>更新时间：${escapeHtml(updated)}　　在售：${totalCount.value} 个</div>` +
          `<table border="1" cellspacing="0" cellpadding="4"><thead>${tableHeader}</thead><tbody>${tableBody}</tbody></table>` +
          `</body></html>`;

        // 写入到用户文件目录
        const fs = (uni as any).getFileSystemManager?.();
        const wxAny = (globalThis as any).wx;
        const userPath = wxAny?.env?.USER_DATA_PATH || "";
        const prefix = "market-export-";
        const filePath = `${userPath}/${prefix}${ts}.xls`;

        // 先清理旧导出文件，避免 USER_DATA_PATH 累积占满导致写入失败
        try {
          const files: string[] = fs.readdirSync(userPath) || [];
          for (const f of files) {
            if (typeof f === "string" && f.startsWith(prefix) && f.endsWith(".xls")) {
              try {
                fs.unlinkSync(`${userPath}/${f}`);
              } catch {
                // ignore
              }
            }
          }
        } catch {
          // ignore
        }

        await new Promise<void>((resolve, reject) => {
          fs.writeFile({
            filePath,
            data: html,
            encoding: "utf8",
            success: () => resolve(),
            fail: (err: any) => reject(err),
          });
        });

        uni.hideLoading();
        uni.openDocument({
          filePath,
          showMenu: true, // 允许用户转发/保存
          success: () => {
            // 打开成功
          },
          fail: (err) => {
            console.error("[行情] 打开Excel失败:", err);
            uni.showToast({ title: "打开文件失败", icon: "none" });
          },
        });
      } catch (e) {
        console.error("[行情] 导出Excel失败:", e);
        uni.hideLoading();
        uni.showToast({ title: "导出失败", icon: "none" });
      }
      return;
      // #endif

      // #ifndef MP-WEIXIN
      uni.showToast({ title: "当前平台暂不支持导出", icon: "none" });
      // #endif
    };

    const handleSavePoster = async () => {
      if (products.value.length === 0) {
        uni.showToast({ title: "暂无数据", icon: "none" });
        return;
      }

      try {
        uni.showLoading({ title: "生成中..." });

        const sys = uni.getSystemInfoSync();
        const rpx = sys.windowWidth / 750;
        // 增加画布宽度以容纳更多列（横向表格）
        const canvasW = Math.floor(1200 * rpx);
        const padding = Math.floor(30 * rpx);
        const titleH = Math.floor(64 * rpx);
        const metaH = Math.floor(42 * rpx);
        const rowH = Math.floor(44 * rpx);
        const headerH = Math.floor(48 * rpx);

        // 展平成行（带分类标题行）
        const rows: Array<
          | { kind: "group"; text: string }
          | { kind: "item"; name: string; category: string; origin: string; spec: string; price: string }
        > = [];
        for (const g of grouped.value) {
          rows.push({ kind: "group", text: g.title });
          for (const p of g.items) {
            rows.push({
              kind: "item",
              name: String(p.name || ""),
              category: formatCategory(p),
              origin: formatOrigin(p),
              spec: formatSpec(p),
              price: formatPriceWithUnit(p),
            });
          }
        }

        const limited = rows.slice(0, maxPosterRows);
        const canvasH = padding + titleH + metaH + headerH + limited.length * rowH + padding + Math.floor(26 * rpx);

        const ctx = uni.createCanvasContext("marketCanvas");

        // 背景
        ctx.setFillStyle("#ffffff");
        ctx.fillRect(0, 0, canvasW, canvasH);

        // 标题
        ctx.setFillStyle("#111111");
        ctx.setFontSize(Math.floor(34 * rpx));
        ctx.fillText("实时行情", padding, padding + Math.floor(36 * rpx));

        // meta
        ctx.setFillStyle("#666666");
        ctx.setFontSize(Math.floor(22 * rpx));
        const metaText = `更新时间：${lastUpdatedText.value || ""}    在售：${totalCount.value}个`;
        ctx.fillText(metaText, padding, padding + titleH);

        // 表头背景
        const tableTop = padding + titleH + metaH;
        ctx.setFillStyle("#f6f7f9");
        ctx.fillRect(padding, tableTop, canvasW - padding * 2, headerH);

        // 表头文字
        ctx.setFillStyle("#333333");
        ctx.setFontSize(Math.floor(24 * rpx));
        const colOriginX = padding + Math.floor(10 * rpx);
        const colCategoryX = padding + Math.floor(260 * rpx);
        const colNameX = padding + Math.floor(520 * rpx);
        const colSpecX = padding + Math.floor(780 * rpx);
        const colPriceX = padding + Math.floor(1040 * rpx);
        ctx.fillText("产地", colOriginX, tableTop + Math.floor(32 * rpx));
        ctx.fillText("分类", colCategoryX, tableTop + Math.floor(32 * rpx));
        ctx.fillText("品名", colNameX, tableTop + Math.floor(32 * rpx));
        ctx.fillText("毛/净", colSpecX, tableTop + Math.floor(32 * rpx));
        ctx.fillText("价格", colPriceX, tableTop + Math.floor(32 * rpx));

        // 行
        let y = tableTop + headerH;
        for (let i = 0; i < limited.length; i++) {
          const row = limited[i];
          // 分隔线
          ctx.setStrokeStyle("#eeeeee");
          ctx.beginPath();
          ctx.moveTo(padding, y);
          ctx.lineTo(canvasW - padding, y);
          ctx.stroke();

          if (row.kind === "group") {
            ctx.setFillStyle("#2ea517");
            ctx.setFontSize(Math.floor(22 * rpx));
            ctx.fillText(row.text, colOriginX, y + Math.floor(30 * rpx));
          } else {
            ctx.setFillStyle("#111111");
            ctx.setFontSize(Math.floor(22 * rpx));
            ctx.setFillStyle("#555555");
            ctx.fillText(truncate(row.origin, 7), colOriginX, y + Math.floor(30 * rpx));
            ctx.setFillStyle("#555555");
            ctx.fillText(truncate(row.category, 8), colCategoryX, y + Math.floor(30 * rpx));
            ctx.setFillStyle("#111111");
            ctx.fillText(truncate(row.name, 10), colNameX, y + Math.floor(30 * rpx));
            ctx.setFillStyle("#555555");
            ctx.fillText(truncate(row.spec, 10), colSpecX, y + Math.floor(30 * rpx));
            ctx.setFillStyle("#d4237a");
            ctx.fillText(truncate(row.price, 10), colPriceX, y + Math.floor(30 * rpx));
          }
          y += rowH;
        }

        // 备注
        ctx.setFillStyle("#999999");
        ctx.setFontSize(Math.floor(20 * rpx));
        const note =
          rows.length > maxPosterRows ? `仅保存前 ${maxPosterRows} 行（可下拉刷新后再保存更多）` : " ";
        ctx.fillText(note, padding, canvasH - padding);

        ctx.draw(false, () => {
          uni.canvasToTempFilePath({
            canvasId: "marketCanvas",
            fileType: "png",
            success: (res) => {
              uni.hideLoading();
              const tempFilePath = res.tempFilePath;
              // 先预览，再引导保存（更稳）
              uni.previewImage({
                urls: [tempFilePath],
                current: tempFilePath,
                success: async () => {
                  try {
                    await saveToAlbum(tempFilePath);
                  } catch {
                    // 用户可能拒绝授权，忽略
                  }
                },
              });
            },
            fail: (err) => {
              console.error("[行情] canvasToTempFilePath 失败:", err);
              uni.hideLoading();
              uni.showToast({ title: "生成失败", icon: "none" });
            },
          });
        });
      } catch (e) {
        console.error("[行情] 生成失败:", e);
        uni.hideLoading();
        uni.showToast({ title: "生成失败", icon: "none" });
      }
    };

    const saveToAlbum = (path: string) => {
      return new Promise<void>((resolve, reject) => {
        uni.saveImageToPhotosAlbum({
          filePath: path,
          success: () => {
            uni.showToast({ title: "已保存到相册", icon: "success" });
            resolve();
          },
          fail: (err) => {
            console.error("[行情] 保存相册失败:", err);
            // 引导授权
            uni.showModal({
              title: "提示",
              content: "保存到相册需要授权。是否前往设置开启？",
              success: (res) => {
                if (res.confirm) {
                  uni.openSetting({});
                }
              },
            });
            reject(err);
          },
        });
      });
    };

    const truncate = (s: string, max: number) => {
      const str = s || "";
      return str.length > max ? str.slice(0, max - 1) + "…" : str;
    };

    onLoad(() => {
      load();
    });

    onPullDownRefresh(async () => {
      await load();
      uni.stopPullDownRefresh();
    });

    return {
      loading,
      grouped,
      totalCount,
      lastUpdatedText,
      formatPrice,
      formatPriceWithUnit,
      formatCategory,
      formatOrigin,
      formatSpec,
      handleRefresh,
      handleExportExcel,
      handleSavePoster,
    };
  },
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
  box-sizing: border-box;
}

.top-bar {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 18rpx;
}

.title {
  font-size: 36rpx;
  font-weight: 700;
  color: #222;
}

.subtitle {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #888;
}

.top-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12rpx;
  flex-wrap: wrap;
}

.btn {
  height: 64rpx;
  padding: 0 22rpx;
  border-radius: 999rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  box-sizing: border-box;
  margin: 0;
  line-height: 64rpx;
  white-space: nowrap;
}

.btn::after {
  border: none;
}

.btn.primary {
  background-color: #3cc51f;
  color: #fff;
}

.btn.ghost {
  background-color: #f6f7f9;
  color: #333;
}

.btn.disabled {
  opacity: 0.5;
}

.btn[disabled] {
  opacity: 0.5;
}

.meta {
  margin-top: 16rpx;
  display: flex;
  gap: 20rpx;
  padding: 0 6rpx;
}

.meta-text {
  font-size: 24rpx;
  color: #777;
}

.table {
  margin-top: 16rpx;
  background-color: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.table-scroll {
  width: 100%;
}

.thead {
  background-color: #f6f7f9;
  display: flex;
  padding: 22rpx 20rpx;
  flex-wrap: nowrap;
  min-width: 1100rpx;
  align-items: flex-start;
}

.th {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
  padding-right: 18rpx; /* 列间距 */
  box-sizing: border-box;
  line-height: 36rpx;
}

.thead .th:last-child {
  padding-right: 0;
}

.tr {
  display: flex;
  padding: 20rpx 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
  flex-wrap: nowrap;
  min-width: 1100rpx;
  align-items: flex-start;
}

.tr:last-child {
  border-bottom: none;
}

.td {
  font-size: 26rpx;
  color: #222;
  line-height: 36rpx;
  white-space: normal; /* 超出换行 */
  padding-right: 18rpx; /* 列间距 */
  box-sizing: border-box;
  word-break: break-all;
}

.tr .td:last-child {
  padding-right: 0;
}

.name {
  width: 220rpx; /* 约 8 个字宽 */
}

.category {
  width: 220rpx; /* 约 8 个字宽 */
  color: #555;
}

.origin {
  width: 220rpx; /* 约 8 个字宽 */
  text-align: left;
  color: #555;
}

.spec {
  width: 220rpx; /* 约 8 个字宽 */
  text-align: left;
  color: #555;
}

.price {
  width: 220rpx; /* 约 8 个字宽 */
  text-align: right;
  color: #d4237a;
  font-weight: 600;
  white-space: normal;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 20rpx;
  background-color: rgba(60, 197, 31, 0.08);
  border-bottom: 1rpx solid rgba(60, 197, 31, 0.12);
  min-width: 1100rpx;
  box-sizing: border-box;
}

.group-title {
  font-size: 26rpx;
  font-weight: 700;
  color: #2ea517;
}

.group-count {
  font-size: 24rpx;
  color: #2ea517;
  background-color: rgba(60, 197, 31, 0.12);
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
}

.loading,
.empty {
  padding: 50rpx 20rpx;
  text-align: center;
}

.loading-text,
.empty-text {
  font-size: 26rpx;
  color: #999;
}

.offscreen-canvas {
  position: fixed;
  left: -9999px;
  top: -9999px;
  width: 1200rpx;
  height: 2000rpx;
}
</style>

