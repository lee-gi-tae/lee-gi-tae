<template>
  <div class="main-market-chart bg-gray-800 shadow-xl rounded-xl p-4 md:p-6">
    <h2 class="text-3xl font-bold text-white mb-6 text-center">Today's Market Overview</h2>

    <div v-if="loading" class="text-center text-gray-400 py-10">
      <p class="text-lg">Loading market data...</p>
      <!-- You can add a spinner icon here -->
    </div>

    <div v-if="error" class="text-center text-red-400 bg-red-900 bg-opacity-40 p-5 rounded-lg shadow-md py-10">
      <p class="text-lg font-semibold">Failed to load market data</p>
      <p class="text-sm mt-1">{{ error }}</p>
    </div>

    <div v-if="!loading && !error && indices.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
      <div v-for="index in indices" :key="index.symbol" 
           class="bg-gray-700 shadow-lg rounded-lg p-5 transform hover:scale-105 transition-transform duration-300 ease-in-out">
        <h3 class="text-2xl font-semibold text-blue-300 mb-3">{{ index.name }}</h3>
        <div class="flex items-baseline mb-2">
          <p class="text-4xl text-white font-light mr-3">{{ index.value.toFixed(2) }}</p>
          <p :class="['text-xl font-medium', index.change >= 0 ? 'text-green-400' : 'text-red-400']">
            {{ index.change >= 0 ? '+' : '' }}{{ index.change.toFixed(2) }}%
          </p>
        </div>
        <div class="h-48 md:h-56 mt-4">
          <canvas :id="'chart-' + index.symbol"></canvas>
        </div>
      </div>
    </div>
    
    <div v-if="!loading && !error && indices.length === 0" class="text-center text-gray-500 py-10">
      <p>Market data is currently unavailable.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import axios from 'axios';
import Chart from 'chart.js/auto';

const indices = ref([]);
const loading = ref(true);
const error = ref(null);

const apiKey = import.meta.env.VITE_YAHOO_API_KEY;

const mockIndicesData = [
  { symbol: '^KS11', name: 'KOSPI (Mock Data)', value: 2700.50, change: 0.75, trend: [2650, 2660, 2640, 2680, 2670, 2700, 2690] },
  { symbol: '^IXIC', name: 'NASDAQ (Mock Data)', value: 15500.30, change: -0.25, trend: [15100, 15000, 15200, 15150, 15300, 15250, 15400] },
];

const mockTrendData = {
  '^KS11': [2650, 2660, 2640, 2680, 2670, 2700, 2690],
  '^IXIC': [15100, 15000, 15200, 15150, 15300, 15250, 15400],
};

let chartInstances = {}; // To keep track of chart instances for potential updates/destruction

const fetchData = async () => {
  loading.value = true;
  error.value = null;
  indices.value = [];

  if (!apiKey) {
    error.value = 'API 키가 설정되지 않았습니다. VITE_YAHOO_API_KEY를 .env 파일에 설정해주세요. 목업 데이터를 표시합니다.';
    indices.value = mockIndicesData;
    loading.value = false;
    await nextTick();
    renderCharts();
    return;
  }

  try {
    const options = {
      method: 'GET',
      url: 'https://yahoo-finance15.p.rapidapi.com/api/v1/markets/stock/quotes',
      params: {
        ticker: '^KS11,^IXIC'
      },
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com'
      },
    };

    const response = await axios.request(options);
    console.log('MainMarketChart API Response (Corrected Endpoint):', JSON.stringify(response.data, null, 2));

    if (response.data && Array.isArray(response.data.body) && response.data.body.length > 0) {
      const results = response.data.body;
      const newIndices = [];

      results.forEach(item => {
        if (item.symbol === '^KS11' || item.symbol === '^IXIC') {
          let name = item.shortName || item.longName || item.symbol || 'Unknown Index';
          if (item.symbol === '^KS11') name = 'KOSPI';
          if (item.symbol === '^IXIC') name = 'NASDAQ';

          newIndices.push({
            symbol: item.symbol,
            name: name,
            value: item.regularMarketPrice || 0,
            change: item.regularMarketChangePercent || 0,
            trend: mockTrendData[item.symbol] || Array(7).fill(item.regularMarketPrice || 0),
          });
        }
      });
      indices.value = newIndices;

      if (indices.value.length === 0) {
        throw new Error('^KS11 또는 ^IXIC 심볼에 대한 데이터를 응답에서 찾을 수 없습니다.');
      }
      await nextTick();
      renderCharts();
    } else {
      let errorMsg = 'API 응답 형식이 예상과 다릅니다.';
      if (response.data && response.data.meta && response.data.meta.status && response.data.meta.status !== 200){
        errorMsg = `API 오류 (status ${response.data.meta.status}): ${response.data.meta.message || '메시지 없음'}`;
      } else if (!response.data || !response.data.body) {
        errorMsg = 'API 응답에 body 데이터가 없습니다.';
      }
      console.warn('Error or unexpected format from yahoo-finance15 API for MainMarketChart:', response.data);
      throw new Error(errorMsg);
    }
  } catch (err) {
    console.error('Error fetching market data for MainMarketChart:', err);
    let errorMessage = '데이터를 불러오는 중 오류가 발생했습니다.';
    if (err.response) {
        errorMessage = `API 오류: ${err.response.status} - ${err.response.data?.message || err.response.data?.meta?.message || err.response.statusText}`;
        if (err.response.status === 403) {
            errorMessage += ' RapidAPI에서 해당 API 또는 엔드포인트에 대한 구독을 확인해주세요.';
        } else if (err.response.status === 429) {
            errorMessage += ' API 호출 제한을 초과했습니다. 잠시 후 다시 시도해주세요.';
        }
    } else if (err.request) {
        errorMessage = '네트워크 오류 또는 API 응답이 없습니다.';
    } else {
        errorMessage = err.message || '알 수 없는 오류가 발생했습니다.';
    }
    error.value = `${errorMessage} 목업 데이터를 대신 표시합니다.`;
    indices.value = mockIndicesData;
    await nextTick();
    renderCharts();
  } finally {
    loading.value = false;
  }
};

const renderCharts = () => {
  if (!indices.value || indices.value.length === 0) {
    // console.warn("renderCharts: indices data is empty, skipping chart rendering for MainMarketChart.");
    return;
  }
  indices.value.forEach(index => {
    const chartId = 'chart-' + index.symbol;
    const ctx = document.getElementById(chartId);
    
    if (chartInstances[chartId]) {
      chartInstances[chartId].destroy(); // Destroy previous instance if exists
    }

    if (ctx) {
      chartInstances[chartId] = new Chart(ctx, {
        type: 'line',
        data: {
          labels: Array(7).fill('').map((_, i) => `Day ${i + 1}`),
          datasets: [{
            label: '7-Day Trend',
            data: index.trend,
            borderColor: index.change >= 0 ? 'rgba(52, 211, 153, 0.8)' : 'rgba(248, 113, 113, 0.8)', // Tailwind green-400 / red-400
            backgroundColor: index.change >= 0 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)',
            borderWidth: 2.5,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointBackgroundColor: index.change >= 0 ? 'rgba(52, 211, 153, 1)' : 'rgba(248, 113, 113, 1)',
            fill: true,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              display: false,
              grid: { display: false },
            },
            y: {
              display: false,
              grid: { display: false }, 
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: true,
              mode: 'index',
              intersect: false,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 12 },
              padding: 10,
              cornerRadius: 4,
            }
          },
          hover: {
            mode: 'nearest',
            intersect: true
          }
        }
      });
    } else {
      console.warn(`Canvas element with id ${chartId} not found.`);
    }
  });
};

onMounted(() => {
  fetchData();
});

</script>

<style scoped>
/* Additional styles if Tailwind classes are not sufficient */
.main-market-chart {
  /* Example: Add a subtle gradient background or specific height */
}
</style> 