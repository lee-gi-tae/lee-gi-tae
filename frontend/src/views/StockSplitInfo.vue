<template>
  <div class="stock-split-info bg-gray-800 shadow-lg rounded-lg p-4 md:p-6">
    <h2 class="text-2xl font-semibold text-white mb-6 text-center">주식 분할 일정</h2>

    <div v-if="loading" class="text-center text-gray-400 py-8">
      <p class="text-xl">데이터를 불러오는 중입니다...</p>
      <!-- Optional: Add a spinner SVG or component here -->
    </div>

    <div v-if="error" class="text-center text-red-400 bg-red-900 bg-opacity-30 p-4 rounded-lg shadow-md py-8">
      <p class="text-xl font-semibold">오류 발생</p>
      <p>{{ error }}</p>
    </div>

    <div v-if="!loading && !error && splits.length === 0" class="text-center text-gray-500 py-8">
      <p>예정된 주식 분할 정보가 없습니다.</p>
    </div>

    <div v-if="!loading && !error && splits.length > 0" class="overflow-x-auto rounded-lg shadow">
      <table class="min-w-full divide-y divide-gray-700">
        <thead class="bg-gray-700">
          <tr>
            <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider sm:px-6">
              회사명
            </th>
            <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider sm:px-6">
              심볼
            </th>
            <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider sm:px-6">
              분할 예정일
            </th>
            <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider sm:px-6">
              분할 비율
            </th>
          </tr>
        </thead>
        <tbody class="bg-gray-800 divide-y divide-gray-700">
          <tr v-for="split in splits" :key="split.ticker + split.start_datetime" class="hover:bg-gray-700 transition-colors duration-150">
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-200 sm:px-6">{{ split.company_name || 'N/A' }}</td>
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-200 font-medium sm:px-6">{{ split.ticker || 'N/A' }}</td>
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-300 sm:px-6">{{ formatDate(split.start_datetime) || 'N/A' }}</td>
            <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-300 sm:px-6">{{ split.options_text || 'N/A' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const splits = ref([]);
const loading = ref(true);
const error = ref(null);

// Vite 환경 변수에서 API 키를 가져옵니다.
// .env 파일에 VITE_YAHOO_API_KEY=your_actual_api_key 형태로 정의되어 있어야 합니다.
const apiKey = import.meta.env.VITE_YAHOO_API_KEY;

const fetchStockSplits = async () => {
  loading.value = true;
  error.value = null;
  splits.value = [];

  if (!apiKey) {
    error.value = 'API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.';
    loading.value = false;
    return;
  }

  try {
    const options = {
      method: 'GET',
      url: 'https://yahoo-finance15.p.rapidapi.com/api/v1/markets/calendar/stock-splits',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'yahoo-finance15.p.rapidapi.com'
      }
    };

    const response = await axios.request(options);
    console.log('StockSplitInfo API Raw Response:', JSON.stringify(response.data, null, 2));

    let foundSplitsArray = null;

    // Check common locations for the array of splits
    if (response.data && Array.isArray(response.data.body)) {
      foundSplitsArray = response.data.body;
      console.log('Found stock splits array in response.data.body');
    } else if (response.data && response.data.body && Array.isArray(response.data.body.stock_splits)) {
      foundSplitsArray = response.data.body.stock_splits;
      console.log('Found stock splits array in response.data.body.stock_splits');
    } else if (response.data && Array.isArray(response.data.stock_splits)) {
      foundSplitsArray = response.data.stock_splits;
      console.log('Found stock splits array in response.data.stock_splits');
    } else if (response.data && Array.isArray(response.data.results)) {
      foundSplitsArray = response.data.results;
      console.log('Found stock splits array in response.data.results');
    } else if (response.data && Array.isArray(response.data.items)) {
      foundSplitsArray = response.data.items;
      console.log('Found stock splits array in response.data.items');
    } else if (response.data && Array.isArray(response.data)) {
      foundSplitsArray = response.data;
      console.log('Found stock splits array directly in response.data (array)');
    }

    if (foundSplitsArray) {
      splits.value = foundSplitsArray.map(item => {
        // 분할 비율 계산 (예: 1주가 2주로 변경되면 "1 : 2")
        let splitRatioText = 'N/A';
        if (item.old_share_worth !== undefined && item.share_worth !== undefined) {
          splitRatioText = `${item.old_share_worth} : ${item.share_worth}`;
        }

        return {
          company_name: item.companyshortname || item.company_name || item.name || 'N/A',
          ticker: item.ticker || item.symbol || 'N/A',
          start_datetime: item.startdatetime || item.start_datetime || item.date || 'N/A',
          options_text: item.options_text || splitRatioText // API에 options_text가 있으면 사용, 없으면 계산된 비율 사용
        };
      });
      if (splits.value.length === 0) {
        console.log('API responded with an empty list of splits.');
        // error.value = '데이터는 수신되었으나, 예정된 주식 분할 정보가 없습니다.'; // 사용자에게 메시지를 보여줄 수도 있음
      }
    } else {
      console.warn('Unexpected API response structure for StockSplitInfo:', response.data);
      let specificMessage = 'API 응답에서 주식 분할 데이터를 찾을 수 없거나 형식이 올바르지 않습니다.';
      if (response.data && response.data.message) {
        specificMessage = `API 메시지: ${response.data.message}. 예상된 데이터 구조와 다릅니다.`;
      } else if (response.data && typeof response.data === 'object' && Object.keys(response.data).length === 0) {
        specificMessage = 'API로부터 빈 응답 객체를 받았습니다. 현재 예정된 주식 분할 정보가 없을 수 있습니다.';
        splits.value = [];
      } else if (response.data === null || response.data === undefined) {
        specificMessage = 'API로부터 null 또는 undefined 응답을 받았습니다.';
        splits.value = [];
      } else {
        specificMessage = '수신된 데이터의 형식이 예상과 다릅니다. 개발자 콘솔의 API 응답 로그를 확인해주세요.';
      }
      
      if (! (response.data && typeof response.data === 'object' && Object.keys(response.data).length === 0) ){
         error.value = specificMessage;
      } else if (splits.value.length === 0 && !error.value) {
        // 빈 객체 응답이고, 아직 에러가 설정되지 않았으며, splits가 비어있으면 '정보 없음'으로 처리 (에러는 아님)
        // 이 경우는 위에서 splits.value = [] 로 처리되므로, 별도 error.value 설정 불필요.
        // 상단의 v-if="!loading && !error && splits.length === 0" 에서 처리됨.
      }
    }

  } catch (err) {
    console.error('Error fetching stock splits:', err);
    if (err.response) {
      error.value = `오류: ${err.response.status} - ${err.response.data.message || err.response.statusText}`;
    } else if (err.request) {
      error.value = '서버로부터 응답을 받지 못했습니다. 네트워크를 확인해주세요.';
    } else {
      error.value = `요청 중 오류 발생: ${err.message}`;
    }
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    // 간단한 YYYY-MM-DD 형식으로 표시
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '-').replace(/\./, '');
  } catch (e) {
    console.error('Error formatting date:', e);
    return dateString; // 파싱 실패 시 원본 문자열 반환
  }
};

onMounted(() => {
  fetchStockSplits();
});

</script>

<style scoped>
/* Tailwind CSS 클래스로 대부분의 스타일이 처리됩니다. */
/* 필요한 경우 여기에 추가적인 스코프 스타일을 작성할 수 있습니다. */
.stock-split-info {
  /* 컴포넌트 전체에 대한 추가 스타일 */
}
</style> 