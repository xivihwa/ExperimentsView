<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, computed, shallowRef } from 'vue'
import { debounce } from 'lodash-es'
import * as echarts from 'echarts'
import '@/assets/styles/components/ChartCard.css'

const props = defineProps({
  metricName: String,
  experimentColors: Object,
  experiments: Array,
  selectedExperiments: Array
})

const chartEl = ref(null)
const chartInstance = shallowRef(null)
const isFullscreen = ref(false)
const zoomLevel = ref(1)
const isAltPressed = ref(false)

const getMetricData = () => {
  if (!props.metricName || !props.selectedExperiments) return [];

  return props.selectedExperiments
    .filter(exp => exp.selected && exp.metrics?.some(m => m.name === props.metricName))
    .map(exp => {
      const metric = exp.metrics.find(m => m.name === props.metricName);
      if (!metric || !metric.data || !Array.isArray(metric.data)) return null;
      
      return {
        id: exp.id,
        name: exp.name || exp.id,
        data: metric.data.filter(point => 
          Array.isArray(point) && 
          point.length >= 2 && 
          typeof point[0] === 'number' && 
          typeof point[1] === 'number'
        )
      };
    })
    .filter(item => item && item.data && item.data.length > 0);
};

const calculateAxisRanges = (seriesData, currentRange = null) => {
  if (!seriesData || seriesData.length === 0) {
    return { xMin: 0, xMax: 100, yMin: 0, yMax: 1 }
  }

  if (currentRange) {
    return currentRange
  }

  let xMin = Infinity, xMax = -Infinity;
  let yMin = Infinity, yMax = -Infinity;

  seriesData.forEach(series => {
    series.data.forEach(point => {
      if (point[0] < xMin) xMin = point[0];
      if (point[0] > xMax) xMax = point[0];
      if (point[1] < yMin) yMin = point[1];
      if (point[1] > yMax) yMax = point[1];
    });
  });

  if (xMin === xMax) {
    xMin -= 1;
    xMax += 1;
  }
  if (yMin === yMax) {
    yMin -= 0.5;
    yMax += 0.5;
  }

  return { xMin, xMax, yMin, yMax }
}

const formatAxisLabel = (value, axisType) => {
  if (axisType === 'x') {
    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
    return value.toFixed(0);
  } else {
    return value.toFixed(2);
  }
}

const chartOptions = computed(() => {
  const seriesData = getMetricData();
  const currentRange = chartInstance.value?.getOption()?.xAxis?.[0]?.min !== undefined 
    ? {
        xMin: chartInstance.value.getOption().xAxis[0].min,
        xMax: chartInstance.value.getOption().xAxis[0].max,
        yMin: chartInstance.value.getOption().yAxis[0].min,
        yMax: chartInstance.value.getOption().yAxis[0].max
      }
    : null;

  const { xMin, xMax, yMin, yMax } = calculateAxisRanges(seriesData, currentRange);

  if (seriesData.length === 0) {
    return {
      title: {
        text: 'No data available',
        left: 'center',
        top: 'center',
        textStyle: { color: '#999', fontSize: 14 }
      },
      xAxis: { show: false },
      yAxis: { show: false },
      series: []
    }
  }

  return {
    animation: false,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985',
          formatter: params => formatAxisLabel(params.value, params.axisDimension)
        }
      },
      formatter: function(params) {
        if (!params || params.length === 0) return '';
        
        let result = `<div style="font-weight:bold">Step: ${params[0].axisValueLabel}</div>`;
        params.forEach(item => {
          const color = props.experimentColors?.[item.seriesName] || item.color || '#5470C6';
          const value = Array.isArray(item.value) ? item.value[1] : item.value;
          result += `
            <div style="display:flex;align-items:center;margin:5px 0">
              <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:5px"></span>
              ${item.seriesName}: ${Number(value).toFixed(4)}
            </div>
          `;
        });
        return result;
      }
    },
    legend: { show: false },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '8%',
      top: '5%',
      containLabel: true
    },
    toolbox: {
      feature: {
        saveAsImage: { 
          title: 'Save as image',
          pixelRatio: 2
        },
        dataZoom: {
          title: {
            zoom: 'Select zoom area',
            back: 'Reset zoom'
          }
        }
      }
    },
    xAxis: {
      type: 'value',
      min: xMin,
      max: xMax,
      axisLabel: {
        formatter: value => formatAxisLabel(value, 'x')
      },
      name: 'Step',
      nameLocation: 'middle',
      nameGap: 25,
      axisLine: { onZero: false },
      splitLine: { show: true }
    },
    yAxis: {
      type: 'value',
      min: yMin,
      max: yMax,
      axisLabel: {
        formatter: value => formatAxisLabel(value, 'y')
      },
      name: 'Value',
      nameLocation: 'middle',
      nameGap: 30,
      splitLine: { show: true },
      scale: true
    },
    series: seriesData.map(item => ({
      name: item.name,
      type: 'line',
      data: item.data,
      smooth: false,
      symbol: 'none',
      lineStyle: {
        width: 1.5,
        color: props.experimentColors?.[item.id] || '#5470C6'
      },
      emphasis: {
        lineStyle: { width: 2.5 }
      },
      silent: item.data.length > 10000
    })),
    dataZoom: [
      {
        type: 'inside',
        throttle: 50,
        zoomOnMouseWheel: isAltPressed.value ? false : true,
        moveOnMouseMove: true,
        filterMode: 'none',
        minSpan: 1,
        maxSpan: 100
      },
      {
        type: 'inside',
        throttle: 50,
        zoomOnMouseWheel: isAltPressed.value ? true : false,
        moveOnMouseMove: false,
        filterMode: 'none',
        yAxisIndex: 0,
        minSpan: 1,
        maxSpan: 100
      }
    ]
  }
});

const handleKeyDown = (e) => {
  if (e.key === 'Alt') {
    isAltPressed.value = true;
  }
};

const handleKeyUp = (e) => {
  if (e.key === 'Alt') {
    isAltPressed.value = false;
  }
};

const updateChart = debounce(() => {
  if (!chartInstance.value) return;
  try {
    chartInstance.value.setOption(chartOptions.value, {
      notMerge: true,
      lazyUpdate: false
    });
  } catch (error) {
    console.error('Error updating chart:', error);
  }
}, 50);

const initChart = () => {
  try {
    if (!chartEl.value) return;
    
    chartInstance.value = echarts.init(chartEl.value, null, {
      renderer: 'canvas',
      useDirtyRect: false
    });
    
    updateChart();
    
    chartInstance.value.on('dataZoom', debounce((params) => {
      const zoom = params.batch?.[0] || params;
      if (zoom) {
        const delta = zoom.end - zoom.start;
        zoomLevel.value = Math.round(100 / delta);
      }
    }, 100));
    
    window.addEventListener('resize', resizeChart);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  } catch (error) {
    console.error('Chart initialization failed:', error);
  }
};

const resizeChart = debounce(() => {
  chartInstance.value?.resize();
}, 200);

const resetZoom = () => {
  chartInstance.value?.dispatchAction({ type: 'restore' });
  zoomLevel.value = 1;
};

const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
  nextTick(() => {
    resizeChart();
  });
};

watch(
  () => [props.selectedExperiments, props.experiments, props.metricName],
  () => { updateChart(); },
  { deep: true }
);

onMounted(() => { 
  initChart(); 
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeChart);
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  if (chartInstance.value) {
    chartInstance.value.off('dataZoom');
    chartInstance.value.dispose();
  }
});
</script>

<template>
  <div class="chart-card" :class="{ fullscreen: isFullscreen }">
    <div class="chart-header">
      <h3>{{ metricName }}</h3>
      <div class="chart-actions">
        <button 
          @click="resetZoom" 
          class="action-button reset-zoom" 
          :disabled="zoomLevel <= 1" 
          :aria-label="zoomLevel <= 1 ? 'Zoom reset unavailable' : 'Reset zoom'"
          title="Reset zoom">
          <span aria-hidden="true"><i class="pi pi-refresh"></i></span>
        </button>
        <button 
          @click="toggleFullscreen" 
          class="action-button fullscreen" 
          :title="isFullscreen ? 'Close' : 'Fullscreen'"
          :aria-label="isFullscreen ? 'Exit fullscreen mode' : 'Enter fullscreen mode'">
          <span aria-hidden="true"><i :class="isFullscreen ? 'pi pi-window-minimize' : 'pi pi-window-maximize'"></i></span>
        </button>
      </div>
    </div>
    <div ref="chartEl" class="chart" @dblclick="resetZoom"></div>
    <div v-if="zoomLevel > 1" class="zoom-level-indicator">
      Zoom: {{ zoomLevel }}x (double click to reset | Alt + wheel for Y-axis zoom)
    </div>
  </div>
</template>