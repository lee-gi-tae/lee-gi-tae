<template>
  <div class="stock-detail-container">
    <div v-if="loading" class="loading-message">
      {{ $t('common.loading', 'Loading...') }}
    </div>
    <div v-if="error" class="error-message">
      {{ $t('common.error.loadFailed', 'Failed to load data.') }}: {{ error }}
    </div>
    <div v-if="!loading && !error && stockData.length > 0" class="stock-content">
      <h1>{{ symbol }} - {{ $t('stocks.historyTitle', 'Stock History') }}</h1>
      <p>{{ $t('stocks.showingDataFor', 'Showing data for:') }} {{ symbol }}</p>
      
      <div class="data-summary">
        <p>{{ $t('stocks.dataPoints', 'Data points:') }} {{ stockData.length }}</p>
      </div>

      <div class="history-table-container">
        <table>
          <thead>
            <tr>
              <th>{{ $t('stocks.tableDate', 'Date') }}</th>
              <th>{{ $t('stocks.tablePrice', 'Price') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="dataPoint in stockData" :key="dataPoint.time">
              <td>{{ formatTimestamp(dataPoint.time) }}</td>
              <td>{{ dataPoint.value }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
    </div>
    <div v-if="!loading && !error && stockData.length === 0 && !initialLoad" class="no-data-message">
      {{ $t('stocks.noHistoryData', 'No history data available for') }} {{ symbol }}.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
// import { useRoute } from 'vue-router' // useRoute is not strictly needed if props are used for symbol
import { useI18n } from 'vue-i18n'

const props = defineProps({
  symbol: {
    type: String,
    required: true,
  },
})

const { t } = useI18n()

const stockData = ref([])
const loading = ref(true)
const error = ref(null)
const initialLoad = ref(true);


const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  // Ensure timestamp is a number before multiplication
  const numericTimestamp = Number(timestamp);
  if (isNaN(numericTimestamp)) return 'Invalid Date';
  return new Date(numericTimestamp * 1000).toLocaleDateString(navigator.language || 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const fetchStockHistory = async (stockSymbol) => {
  if (!stockSymbol) return
  loading.value = true
  error.value = null
  stockData.value = [] 

  try {
    const response = await fetch(`/products/stocks/history/${stockSymbol}/`)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage = errorData.error || t('stocks.fetchErrorGeneric', `API request failed: ${response.status}`);
      if (response.status === 404) {
        errorMessage = t('stocks.error404', { symbol: stockSymbol }, `Stock symbol '${stockSymbol}' not found or no data available.`);
      }
      throw new Error(errorMessage);
    }
    const data = await response.json();
    
    // Finnhub specific handling for "no_data" or empty results
    if (data.s === 'no_data' || (data.s === 'ok' && (!data.t || data.t.length === 0))) {
        stockData.value = [];
    } else if (data.s === 'ok' && Array.isArray(data.t) && Array.isArray(data.c) && data.t.length === data.c.length) {
        // Assuming your backend API for history returns {time: t, value: c} structure
        // If it returns the raw Finnhub response, you need to zip t and c here.
        // The backend currently returns [{time:..., value:...}, ...]
        stockData.value = data.results || data; // Adapt if backend response structure is different
         // Check if the backend is wrapping result in 'results'
        if (Array.isArray(data.results)) {
            stockData.value = data.results;
        } else if (Array.isArray(data)) {
             stockData.value = data; // If backend returns the array directly
        } else {
            // Fallback if structure is unexpected again, or if the pre-zipped format from backend is [{time: t, value: c}, ...]
             console.warn('Unexpected data structure for stock history:', data);
             stockData.value = [];
        }
    } else if (Array.isArray(data)) { // Direct array response from our backend
        stockData.value = data;
    } else {
        if (data && data.error) {
             throw new Error(data.error);
        }
        console.warn('Unexpected data structure for stock history from API:', data);
        stockData.value = [];
    }
  } catch (err) {
    console.error('Failed to fetch stock history:', err);
    error.value = err.message || t('stocks.fetchError', 'Failed to fetch stock history.');
  } finally {
    loading.value = false;
    initialLoad.value = false;
  }
}

onMounted(() => {
  fetchStockHistory(props.symbol);
})

watch(
  () => props.symbol,
  (newSymbol) => {
    initialLoad.value = true; 
    fetchStockHistory(newSymbol);
  }
)

</script>

<style scoped>
.stock-detail-container {
  padding: 2rem;
  max-width: 900px;
  margin: 0 auto;
  background-color: var(--card-bg);
  border-radius: var(--border-radius);
  box-shadow: var(--card-shadow);
}

.loading-message, .error-message, .no-data-message {
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
  color: var(--text-secondary);
}

.error-message {
  color: var(--error-color);
}

.stock-content h1 {
  color: var(--text-primary);
  margin-bottom: 0.5rem;
  border-bottom: 2px solid var(--primary-color);
  padding-bottom: 0.5rem;
}

.stock-content p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.data-summary {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: var(--background-secondary);
  border-radius: var(--border-radius-sm);
}

.history-table-container {
  max-height: 500px; 
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color-light);
}

thead th {
  background-color: var(--background-tertiary);
  color: var(--text-primary);
  position: sticky; 
  top: 0;
  z-index: 1;
}

tbody tr:nth-child(even) {
  background-color: var(--background-alt);
}

tbody tr:hover {
  background-color: var(--background-tertiary-hover);
}
</style> 