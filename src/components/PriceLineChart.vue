<template>
  <view class="price-chart">
    <canvas 
      :canvas-id="canvasId || 'priceChart'" 
      :id="canvasId || 'priceChart'"
      class="chart-canvas"
      :style="{ width: '100%', height: '100%' }"
    ></canvas>
  </view>
</template>

<script lang="ts">
import { watch, onMounted, nextTick, getCurrentInstance } from "vue";
import { onReady } from "@dcloudio/uni-app";

export interface PriceDataPoint {
  date: string | Date; // 日期字符串或Date对象
  price: number; // 价格
}

interface Props {
  data: PriceDataPoint[]; // 数据点数组
  unit?: string; // 单位，如"件"、"盒"，默认为"件"
  canvasId?: string; // Canvas ID，用于多个图表实例
  useMockData?: boolean; // 是否使用假数据，默认为true
}

export default {
  name: "PriceLineChart",
  props: {
    data: {
      type: Array as () => PriceDataPoint[],
      required: true,
      default: () => [],
    },
    unit: {
      type: String,
      default: "件",
    },
    canvasId: {
      type: String,
      default: "priceChart",
    },
    useMockData: {
      type: Boolean,
      default: true, // 默认使用假数据
    },
  },
  setup(props: Props) {
    const instance = getCurrentInstance();
    // 格式化日期（用于图表显示和匹配）
    const formatChartDate = (date: Date) => {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}/${day}`;
    };

    // 格式化日期为 YYYY-MM-DD（用于匹配）
    const formatDateKey = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // 生成过去7天的日期数组（从6天前到今天）
    const generateDateRange = () => {
      const now = new Date();
      const dates: Date[] = [];
      const dateKeys: string[] = [];
      const displayLabels: string[] = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        dates.push(date);
        dateKeys.push(formatDateKey(date));
        displayLabels.push(formatChartDate(date));
      }
      
      return { dates, dateKeys, displayLabels };
    };

    // 处理数据点，按日期分组，同一天取最大价格
    const processDataPoints = (dataPoints: PriceDataPoint[], dateKeys: string[]) => {
      const datePriceMap = new Map<string, number>();
      
      dataPoints.forEach((point) => {
        const pointDate = typeof point.date === 'string' ? new Date(point.date) : point.date;
        const dateKey = formatDateKey(pointDate);
        
        if (dateKeys.includes(dateKey)) {
          const price = Number(point.price);
          const existing = datePriceMap.get(dateKey);
          if (!existing || price > existing) {
            datePriceMap.set(dateKey, price);
          }
        }
      });
      
      return datePriceMap;
    };

    // 计算Y轴标签（自动格式化价格）
    const formatYAxisLabel = (price: number): string => {
      // 如果价格是整数，显示整数；否则显示一位小数
      if (price % 1 === 0) {
        return price.toString();
      }
      return price.toFixed(1);
    };

    // 生成假数据（用于测试样式）
    const generateMockData = (): PriceDataPoint[] => {
      const now = new Date();
      const mockData: PriceDataPoint[] = [];
      const basePrice = 25.5; // 基础价格
      
      // 生成过去7天的数据，但不是每天都有的数据（模拟真实情况）
      // 确保至少有3-5个数据点，这样图表才能正常显示
      const dataPoints = [0, 1, 2, 3, 4, 5, 6]; // 7天的索引
      const selectedDays = []; // 选中的天数
      
      // 随机选择4-6天有数据（确保有足够的数据点）
      const daysCount = 4 + Math.floor(Math.random() * 3); // 4-6天
      const shuffled = [...dataPoints].sort(() => Math.random() - 0.5);
      selectedDays.push(...shuffled.slice(0, daysCount));
      selectedDays.sort((a, b) => a - b); // 按时间顺序排序
      
      let currentPrice = basePrice;
      
      selectedDays.forEach((dayIndex) => {
        const date = new Date(now.getTime() - (6 - dayIndex) * 24 * 60 * 60 * 1000);
        
        // 价格在基础价格上下浮动，模拟价格波动
        // 每次变化幅度较小，更真实
        const variation = (Math.random() - 0.5) * 6; // -3 到 +3 的浮动
        currentPrice = Math.max(20, Math.min(35, currentPrice + variation)); // 限制在20-35之间
        
        mockData.push({
          date: date,
          price: Math.round(currentPrice * 10) / 10, // 保留一位小数
        });
      });
      
      return mockData;
    };

    // 绘制折线图
    const drawChart = () => {
      // 根据 useMockData 属性决定使用假数据还是真实数据
      let dataToUse: PriceDataPoint[];
      if (props.useMockData) {
        // 使用假数据
        dataToUse = generateMockData();
      } else {
        // 使用真实数据
        dataToUse = props.data || [];
      }

      if (!dataToUse || dataToUse.length === 0) {
        console.log('[价格折线图] 没有数据可显示');
        return;
      }
      
      console.log('[价格折线图] 使用数据:', props.useMockData ? '假数据' : '真实数据', '数据点数量:', dataToUse.length);

      // 延迟执行，确保DOM已渲染
      setTimeout(() => {
        const query = uni.createSelectorQuery().in(instance);
        query.select('.price-chart').boundingClientRect((rect: any) => {
          if (!rect || !rect.width || !rect.height) {
            console.log('[价格折线图] 容器尺寸未就绪，重试...', rect);
            setTimeout(() => drawChart(), 300);
            return;
          }

          console.log('[价格折线图] 容器尺寸:', rect.width, rect.height);
          console.log('[价格折线图] 使用数据:', dataToUse.length, '个数据点');

          try {
            const canvasId = props.canvasId || 'priceChart';
            const ctx = uni.createCanvasContext(canvasId, instance);
            if (!ctx) {
              console.error('[价格折线图] 无法创建Canvas上下文');
              return;
            }
            
            console.log('[价格折线图] Canvas上下文创建成功');

            // 生成日期范围
            const { dateKeys, displayLabels } = generateDateRange();

            // 处理数据点
            const datePriceMap = processDataPoints(dataToUse, dateKeys);

            // 生成价格数组（有数据的显示价格，没有数据的为null）
            const prices: (number | null)[] = dateKeys.map(key => datePriceMap.get(key) || null);

            // 计算价格范围（只计算有数据的点）
            const validPrices = prices.filter(p => p !== null) as number[];
            console.log('[价格折线图] 有效价格数据:', validPrices);
            if (validPrices.length === 0) {
              console.log('[价格折线图] 没有有效数据');
              return;
            }

            const minPrice = Math.min(...validPrices);
            const maxPrice = Math.max(...validPrices);
            const priceRange = maxPrice - minPrice || 1;
            const yMin = Math.max(0, minPrice - priceRange * 0.1);
            const yMax = maxPrice + priceRange * 0.1;

            // 图表尺寸（使用 rpx 转 px，假设设计稿宽度为 750rpx）
            const systemInfo = uni.getSystemInfoSync();
            const pixelRatio = systemInfo.pixelRatio || 2;
            const rpxToPx = systemInfo.windowWidth / 750;
            
            // 容器实际像素尺寸
            const containerWidth = rect.width;
            // 确保容器高度足够，为X轴标签留出空间
            const containerHeight = Math.max(rect.height || 300 * rpxToPx, 300 * rpxToPx);
            
            // 增加right padding确保X轴标签完整显示，增加top padding为Y轴单位标签留空间
            // 增加left padding为Y轴标签留更多空间
            // 增加bottom padding确保图例有足够空间显示
            const padding = { top: 45, right: 40, bottom: 85, left: 60 };
            const chartWidth = containerWidth - padding.left - padding.right;
            const chartHeight = containerHeight - padding.top - padding.bottom;

            console.log('[价格折线图] 画布尺寸:', containerWidth, containerHeight);
            console.log('[价格折线图] 图表尺寸:', chartWidth, chartHeight);
            console.log('[价格折线图] X轴标签数量:', displayLabels.length);

            // 清空画布
            ctx.clearRect(0, 0, containerWidth, containerHeight);

            // 绘制背景
            ctx.setFillStyle('#ffffff');
            ctx.fillRect(0, 0, containerWidth, containerHeight);

            // 绘制网格线（Y轴）
            ctx.setStrokeStyle('#e5e5e5');
            ctx.setLineWidth(1);
            const gridLineCount = 5;
            for (let i = 0; i <= gridLineCount; i++) {
              const y = padding.top + (chartHeight / gridLineCount) * i;
              ctx.beginPath();
              ctx.setLineDash([4, 4], 0);
              ctx.moveTo(padding.left, y);
              ctx.lineTo(padding.left + chartWidth, y);
              ctx.stroke();
            }

            // 绘制Y轴标签和单位
            ctx.setFillStyle('#666');
            ctx.setFontSize(11);
            ctx.setTextAlign('right');
            for (let i = 0; i <= gridLineCount; i++) {
              const value = yMax - (yMax - yMin) * (i / gridLineCount);
              const y = padding.top + (chartHeight / gridLineCount) * i;
              const label = formatYAxisLabel(value);
              // 增加左边距，避免与Y轴重叠
              ctx.fillText(label, padding.left - 15, y + 4);
            }
            // Y轴单位（放在顶部，再往上移避免挡住最高Y轴标签）
            ctx.setFontSize(11);
            ctx.setTextAlign('left');
            ctx.setTextBaseline('top');
            // 增加左边距，避免与Y轴标签重叠，再往上移更多避免挡住最高值（如27.9）
            ctx.fillText(`(元/${props.unit})`, padding.left - 50, padding.top - 25);

            // 绘制坐标轴
            ctx.setStrokeStyle('#333');
            ctx.setLineWidth(1);
            ctx.setLineDash([], 0);
            // Y轴
            ctx.beginPath();
            ctx.moveTo(padding.left, padding.top);
            ctx.lineTo(padding.left, padding.top + chartHeight);
            ctx.stroke();
            // X轴
            ctx.beginPath();
            ctx.moveTo(padding.left, padding.top + chartHeight);
            ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
            ctx.stroke();

            // 绘制折线（只连接有数据的点）
            ctx.setStrokeStyle('#ff0000');
            ctx.setLineWidth(3);
            ctx.beginPath();
            let hasStartPoint = false;

            prices.forEach((price, index) => {
              if (price !== null) {
                // 使用 dateKeys.length - 1 来正确分布点，确保最后一个点在右边界
                const x = padding.left + (chartWidth / Math.max(1, dateKeys.length - 1)) * index;
                const y = padding.top + chartHeight - ((price - yMin) / (yMax - yMin)) * chartHeight;

                if (!hasStartPoint) {
                  ctx.moveTo(x, y);
                  hasStartPoint = true;
                } else {
                  ctx.lineTo(x, y);
                }
              }
            });
            ctx.stroke();

            // 绘制数据点
            ctx.setFillStyle('#ff0000');
            prices.forEach((price, index) => {
              if (price !== null) {
                // 使用 dateKeys.length - 1 来正确分布点，确保最后一个点在右边界
                const x = padding.left + (chartWidth / Math.max(1, dateKeys.length - 1)) * index;
                const y = padding.top + chartHeight - ((price - yMin) / (yMax - yMin)) * chartHeight;

                // 绘制圆形数据点
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();

                // 绘制数据标签（价格值）- 智能调整位置避免与折线重叠
                ctx.setFillStyle('#333');
                ctx.setFontSize(10);
                ctx.setTextAlign('center');
                
                // 判断标签应该放在上方还是下方
                // 找到前一个和后一个有效数据点来判断趋势
                let labelY = y - 18; // 默认放在上方，增加距离
                let shouldPlaceAbove = true;
                
                // 检查前一个点
                let prevIndex = index - 1;
                while (prevIndex >= 0 && prices[prevIndex] === null) {
                  prevIndex--;
                }
                
                // 检查后一个点
                let nextIndex = index + 1;
                while (nextIndex < prices.length && prices[nextIndex] === null) {
                  nextIndex++;
                }
                
                // 如果当前点是局部最高点，标签放在上方；如果是局部最低点，放在下方
                if (prevIndex >= 0 && nextIndex < prices.length) {
                  const prevPrice = prices[prevIndex]!;
                  const nextPrice = prices[nextIndex]!;
                  const currentPrice = price;
                  
                  // 如果当前价格高于前后两点，放在上方；低于前后两点，放在下方
                  if (currentPrice > prevPrice && currentPrice > nextPrice) {
                    shouldPlaceAbove = true;
                    labelY = y - 18;
                  } else if (currentPrice < prevPrice && currentPrice < nextPrice) {
                    shouldPlaceAbove = false;
                    labelY = y + 18;
                  } else {
                    // 默认放在上方
                    labelY = y - 18;
                  }
                } else if (prevIndex >= 0) {
                  // 只有前一个点，根据趋势判断
                  const prevPrice = prices[prevIndex]!;
                  if (price > prevPrice) {
                    labelY = y - 18; // 上升趋势，放在上方
                  } else {
                    labelY = y + 18; // 下降趋势，放在下方
                  }
                } else if (nextIndex < prices.length) {
                  // 只有后一个点，根据趋势判断
                  const nextPrice = prices[nextIndex]!;
                  if (price > nextPrice) {
                    labelY = y - 18; // 当前更高，放在上方
                  } else {
                    labelY = y + 18; // 当前更低，放在下方
                  }
                }
                
                // 确保标签在画布范围内
                if (labelY < padding.top) {
                  labelY = y + 18; // 如果上方空间不够，放在下方
                } else if (labelY > padding.top + chartHeight) {
                  labelY = y - 18; // 如果下方空间不够，放在上方
                }
                
                ctx.fillText(formatYAxisLabel(price), x, labelY);
              }
            });

            // 绘制X轴标签（在折线和数据点之后绘制，确保不被覆盖）
            ctx.setFillStyle('#666'); // 使用稍浅的颜色，但确保可见
            ctx.setFontSize(11); // 稍微调小字体
            ctx.setTextAlign('center');
            ctx.setTextBaseline('top');
            displayLabels.forEach((dateKey, index) => {
              // 计算X坐标，使用 dateKeys.length - 1 来正确分布标签，确保最后一个标签也在画布范围内
              const x = padding.left + (chartWidth / Math.max(1, dateKeys.length - 1)) * index;
              // 减小Y坐标距离，让X轴标签更靠近X轴
              const y = padding.top + chartHeight + 15;
              // 检查坐标是否在画布范围内（给右侧留出一些边距）
              if (y < containerHeight - 10 && x <= containerWidth - 15) {
                ctx.fillText(dateKey, x, y);
                console.log(`[价格折线图] X轴标签 ${index}: ${dateKey} at (${x.toFixed(1)}, ${y.toFixed(1)})`);
              } else {
                console.warn(`[价格折线图] X轴标签 ${index} 坐标超出范围: x=${x.toFixed(1)}, y=${y.toFixed(1)}, 容器宽度=${containerWidth}, 高度=${containerHeight}`);
              }
            });

            // 绘制图例（放在X轴标签下方，确保有足够空间）
            ctx.setFillStyle('#ff0000');
            ctx.beginPath();
            ctx.arc(padding.left + chartWidth / 2 - 30, padding.top + chartHeight + 40, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.setFillStyle('#666');
            ctx.setFontSize(12);
            ctx.setTextAlign('left');
            ctx.setTextBaseline('top');
            ctx.fillText('单价', padding.left + chartWidth / 2 - 20, padding.top + chartHeight + 35);

            ctx.draw(false, () => {
              console.log('[价格折线图] 绘制完成');
            });
          } catch (error) {
            console.error('[价格折线图] 绘制失败:', error);
          }
        }).exec();
      }, 500);
    };

    // 监听数据变化
    watch(
      () => props.data,
      () => {
        nextTick(() => {
          drawChart();
        });
      },
      { deep: true }
    );

    // 组件挂载后绘制
    onMounted(() => {
      console.log('[价格折线图] 组件已挂载');
      nextTick(() => {
        drawChart();
      });
    });

    // uni-app 的 onReady 生命周期
    onReady(() => {
      console.log('[价格折线图] 页面已就绪');
      setTimeout(() => {
        drawChart();
      }, 500);
    });

    return {};
  },
};
</script>

<style scoped>
.price-chart {
  width: 100%;
  height: 360rpx;
  min-height: 360rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-top: 12rpx;
  position: relative;
  box-sizing: border-box;
}

.chart-canvas {
  width: 100%;
  height: 100%;
  min-height: 320rpx;
  display: block;
}
</style>
