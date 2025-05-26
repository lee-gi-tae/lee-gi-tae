<template>
  <div class="min-h-screen bg-gray-900 text-white p-4 md:p-8">
    <div class="max-w-5xl mx-auto space-y-8">
      <!-- Market Index Cards Section -->
      <section>
        <MarketIndexCards />
      </section>

      <!-- Stock Search Section -->
      <section>
        <StockSearch @stock-selected="handleStockSelected" />
      </section>

      <!-- Related YouTube Videos Section -->
      <section v-if="selectedStockName">
        <RelatedYoutubeVideos :stockName="selectedStockName" />
      </section>
      <div v-else class="text-center text-gray-500 py-8">
        <p>주식을 검색하면 관련 유튜브 영상이 여기에 표시됩니다.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import MarketIndexCards from '@/components/MarketIndexCards.vue';
import StockSearch from '@/components/StockSearch.vue';
import RelatedYoutubeVideos from '@/components/RelatedYoutubeVideos.vue';

const selectedStockName = ref('');

const handleStockSelected = (stockName) => {
  selectedStockName.value = stockName;
};
</script>

<style scoped>
/* 전체 페이지에 적용될 수 있는 추가적인 스타일 */
.min-h-screen {
  min-height: 100vh;
}
</style> 