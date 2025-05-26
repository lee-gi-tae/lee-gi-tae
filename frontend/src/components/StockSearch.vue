<template>
  <div class="container mx-auto p-4 py-8">
    <div class="max-w-md mx-auto">
      <div class="mb-6">
        <input
          type="text"
          v-model="searchSymbol"
          @keyup.enter="handleSearch"
          placeholder="Enter stock symbol (e.g., 005930.KS)"
          class="w-full px-4 py-3 rounded-lg shadow-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-gray-700 text-white placeholder-gray-400"
        />
        <button
          @click="handleSearch"
          class="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-150 ease-in-out"
        >
          Search
        </button>
      </div>

      <div v-if="loading" class="text-center text-gray-400 mt-8">
        <p class="text-xl">Loading stock data...</p>
      </div>

      <div v-if="error" class="text-center text-red-400 bg-gray-800 p-4 rounded-lg shadow-md mt-8">
        <p class="text-xl font-semibold">Error</p>
        <p>{{ error }}</p>
      </div>

      <div v-if="stockData && !loading && !error" class="bg-gray-800 shadow-xl rounded-lg p-6">
        <h2 class="text-3xl font-bold text-white mb-2">{{ stockData.name }} ({{ stockData.symbol }})</h2>
        <div class="flex items-baseline mb-4">
          <p class="text-4xl text-white mr-3">{{ stockData.price.toFixed(2) }}</p>
          <p :class="['text-2xl', stockData.changePercent >= 0 ? 'text-green-400' : 'text-red-400']">
            {{ stockData.changePercent >= 0 ? '+' : '' }}{{ stockData.changePercent.toFixed(2) }}%
          </p>
        </div>

        <div class="grid grid-cols-3 gap-4 mb-6 text-center">
          <div>
            <p class="text-sm text-gray-400">PER</p>
            <p class="text-xl text-white">{{ stockData.per ? stockData.per.toFixed(2) : 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-400">PBR</p>
            <p class="text-xl text-white">{{ stockData.pbr ? stockData.pbr.toFixed(2) : 'N/A' }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-400">ROE</p>
            <p class="text-xl text-white">{{ stockData.roe ? stockData.roe.toFixed(2) + '%' : 'N/A' }}</p>
          </div>
        </div>

        <div class="h-64 w-full mt-4">
          <canvas id="stock-chart"></canvas>
        </div>
      </div>
      <div v-if="!stockData && !loading && !error && searched" class="text-center text-gray-400 mt-8">
          <p>No data found for the symbol. Please try another one.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, defineEmits } from 'vue';
import axios from 'axios';
import Chart from 'chart.js/auto';

const searchSymbol = ref('');
const stockData = ref(null);
const loading = ref(false);
const error = ref(null);
const chartInstance = ref(null);
const searched = ref(false); // To track if a search has been attempted

const emit = defineEmits(['stock-selected']); // 이벤트 정의

const apiKey = import.meta.env.VITE_YAHOO_API_KEY; // 환경 변수에서 API 키 가져오기

// Mock data for 7-day trend, as API might not provide this directly in summary
const mockTrend = () => Array.from({ length: 7 }, () => Math.random() * 50 + 200);

const handleSearch = async () => {
  if (!searchSymbol.value.trim()) {
    error.value = 'Please enter a stock symbol.';
    stockData.value = null;
    searched.value = false;
    return;
  }
  loading.value = true;
  error.value = null;
  stockData.value = null;
  searched.value = true;

  if (!apiKey) { // API 키 유효성 검사 추가
    error.value = 'API Key is not configured. Please set VITE_YAHOO_API_KEY in your .env file.';
    loading.value = false;
    return;
  }

  try {
    const options = {
      method: 'GET',
      url: 'https://yh-finance.p.rapidapi.com/stock/v2/get-summary',
      params: { symbol: searchSymbol.value.toUpperCase(), region: 'US' }, // Default region US, can be KR etc.
      headers: {
        'X-RapidAPI-Key': apiKey, // 수정된 부분: 환경 변수 사용
        'X-RapidAPI-Host': 'yh-finance.p.rapidapi.com'
      }
    };

    const response = await axios.request(options);

    if (response.data && response.data.price) {
      const data = response.data;
      stockData.value = {
        symbol: data.symbol || searchSymbol.value.toUpperCase(),
        name: data.price?.longName || data.price?.shortName || searchSymbol.value.toUpperCase(),
        price: data.price?.regularMarketPrice?.raw || 0,
        changePercent: data.price?.regularMarketChangePercent?.raw * 100 || 0, // API gives decimal, convert to %
        per: data.summaryDetail?.trailingPE?.raw,
        pbr: data.summaryDetail?.priceToBook?.raw,
        roe: data.financialData?.returnOnEquity?.raw * 100, // API might give decimal
        trend: mockTrend() // Use mock data for chart
      };
      emit('stock-selected', stockData.value.name); // 이벤트 발생
      await nextTick();
      renderChart(stockData.value.trend);
    } else {
      throw new Error('Stock symbol not found or API did not return expected data.');
    }
  } catch (err) {
    console.error('Error fetching stock data:', err);
    error.value = err.response?.data?.message || err.message || 'Failed to fetch stock data.';
    stockData.value = null;
  } finally {
    loading.value = false;
  }
};

const renderChart = (trendData) => {
  const ctx = document.getElementById('stock-chart');
  if (!ctx) return;

  if (chartInstance.value) {
    chartInstance.value.destroy();
  }

  chartInstance.value = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array(7).fill('').map((_, i) => `Day ${i + 1}`),
      datasets: [{
        label: '7-Day Price Trend',
        data: trendData,
        borderColor: stockData.value?.changePercent >= 0 ? 'rgb(74, 222, 128)' : 'rgb(248, 113, 113)',
        backgroundColor: stockData.value?.changePercent >= 0 ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
        tension: 0.1,
        borderWidth: 2,
        pointRadius: 2,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          display: true,
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          ticks: { color: 'rgb(156, 163, 175)' } // gray-400
        },
        y: {
          display: true,
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          ticks: { color: 'rgb(156, 163, 175)' } // gray-400
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
};

</script>

<style scoped>
/* Tailwind CSS 클래스가 이미 인라인으로 적용되어 있어 추가 스타일은 필요하지 않을 수 있습니다. */
/* 필요한 경우 여기에 추가 스타일을 작성하세요. */
.container {
  max-width: 900px; /* Adjusted for better centered view */
}
</style> 