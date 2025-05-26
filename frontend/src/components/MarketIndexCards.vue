<template>
  <div class="container mx-auto p-4">
    <div v-if="loading" class="text-center text-gray-400">
      Loading data...
    </div>
    <div v-if="error" class="text-center text-red-500">
      Error loading data: {{ error.message || error }}
    </div>
    <div v-if="!loading && !error" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div v-for="index in indices" :key="index.symbol" class="bg-gray-800 shadow-lg rounded-lg p-6">
        <h2 class="text-2xl font-bold text-white mb-2">{{ index.name }}</h2>
        <div class="flex items-baseline mb-1">
          <p class="text-3xl text-white mr-2">{{ index.value.toFixed(2) }}</p>
          <p :class="['text-lg', index.change >= 0 ? 'text-green-400' : 'text-red-400']">
            {{ index.change >= 0 ? '+' : '' }}{{ index.change.toFixed(2) }}%
          </p>
        </div>
        <div class="h-48">
          <canvas :id="index.symbol + '-chart'"></canvas>
        </div>
      </div>
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
  { symbol: '^KS11', name: 'KOSPI (Mock Data)', value: 2700.50, change: 0.75, trend: [2600, 2620, 2610, 2650, 2630, 2670, 2700.50] },
  { symbol: '^IXIC', name: 'NASDAQ (Mock Data)', value: 15500.30, change: -0.25, trend: [15000, 15100, 15050, 15200, 15150, 15300, 15500.30] },
];

const mockTrendData = {
  '^KS11': [2600, 2620, 2610, 2650, 2630, 2670, 2683.21],
  '^IXIC': [15000, 15100, 15050, 15200, 15150, 15300, 15255.05],
};

let chartInstances = {};

const fetchData = async () => {
  loading.value = true;
  error.value = null;
  indices.value = []; // 이전 데이터 초기화

  if (!apiKey) {
    error.value = 'API 키가 설정되지 않았습니다. VITE_YAHOO_API_KEY를 .env 파일에 설정해주세요. 목업 데이터를 표시합니다.';
    indices.value = mockIndicesData;
    loading.value = false;
    await nextTick();
    renderAllCharts();
    return;
  }

  try {
    const options = {
      method: 'GET',
      url: 'https://yahoo-finance15.p.rapidapi.com/api/v1/markets/stock/quotes', // 정확한 URL로 변경
      params: {
        ticker: '^KS11,^IXIC' // 파라미터 이름 'ticker'로 변경
      },
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com' // 호스트명 변경
      },
    };

    const response = await axios.request(options);
    console.log('MarketIndexCards API Response (Corrected Endpoint):', JSON.stringify(response.data, null, 2));

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

    } else {
      let errorMsg = 'API 응답 형식이 예상과 다릅니다.';
      if (response.data && response.data.meta && response.data.meta.status && response.data.meta.status !== 200){
        errorMsg = `API 오류 (status ${response.data.meta.status}): ${response.data.meta.message || '메시지 없음'}`;
      } else if (!response.data || !response.data.body) {
        errorMsg = 'API 응답에 body 데이터가 없습니다.';
      }
      console.warn('Error or unexpected format from yahoo-finance15 API for MarketIndexCards:', response.data);
      throw new Error(errorMsg);
    }
  } catch (err) {
    console.error('Error fetching market data for MarketIndexCards:', err);
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
  } finally {
    loading.value = false;
    await nextTick();
    renderAllCharts();
  }
};

const renderAllCharts = () => {
  if (!indices.value || indices.value.length === 0) {
    return;
  }
  indices.value.forEach(index => {
    const chartId = index.symbol + '-chart';
    const ctx = document.getElementById(chartId);

    if (chartInstances[chartId]) {
      chartInstances[chartId].destroy();
    }

    if (ctx) {
      chartInstances[chartId] = new Chart(ctx, {
        type: 'line',
        data: {
          labels: Array(7).fill('').map((_, i) => `Day ${i + 1}`),
          datasets: [{
            label: '7-Day Trend',
            data: index.trend,
            borderColor: index.change >= 0 ? 'rgba(52, 211, 153, 0.8)' : 'rgba(248, 113, 113, 0.8)',
            backgroundColor: index.change >= 0 ? 'rgba(52, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)',
            borderWidth: 2,
            tension: 0.1,
            pointRadius: 0,
            fill: true,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { display: false },
            y: { display: false }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    } else {
    }
  });
};

onMounted(() => {
  fetchData(); // 주석 해제하여 API 호출 다시 활성화
});
</script>

<style scoped>
.container {
  max-width: 1200px;
}
</style> 