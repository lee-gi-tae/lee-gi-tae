<template>
  <div class="related-youtube-videos container mx-auto p-4">
    <h3 class="text-xl font-semibold mb-4 text-white">{{ stockName }} 관련 유튜브 영상</h3>
    <div v-if="loading" class="text-center text-gray-400">
      <p>영상을 불러오는 중입니다...</p>
    </div>
    <div v-if="error" class="text-center text-red-500 bg-gray-800 p-3 rounded">
      <p>영상을 불러오는데 실패했습니다: {{ error }}</p>
    </div>
    <div v-if="!loading && !error && videos.length === 0" class="text-center text-gray-400">
      <p>관련된 영상이 없습니다.</p>
    </div>
    <div v-if="!loading && !error && videos.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="video in videos" :key="video.youtube_id" class="bg-gray-800 shadow-lg rounded-lg overflow-hidden flex flex-col">
        <a :href="'https://www.youtube.com/watch?v=' + video.youtube_id" target="_blank" rel="noopener noreferrer">
          <img :src="video.thumbnail_url" :alt="video.title" class="w-full h-48 object-cover">
        </a>
        <div class="p-4 flex flex-col flex-grow">
          <a :href="'https://www.youtube.com/watch?v=' + video.youtube_id" target="_blank" rel="noopener noreferrer" class="hover:text-blue-400 transition-colors">
            <h4 class="text-lg font-semibold text-white mb-1 leading-tight truncate-2-lines">{{ video.title }}</h4>
          </a>
          <p class="text-sm text-gray-400 mb-2">{{ video.channel_title }}</p>
          <div class="mt-auto flex justify-between items-center">
            <p class="text-sm text-gray-300">길이: {{ formatDuration(video.duration) }}</p>
            <!-- <p class="text-sm text-gray-300">조회수: {{ video.view_count ? video.view_count.toLocaleString() : 'N/A' }}</p> -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import axios from 'axios';

const props = defineProps({
  stockName: {
    type: String,
    required: true
  }
});

const videos = ref([]);
const loading = ref(false);
const error = ref(null);

const searchQuery = computed(() => `${props.stockName} 주식 분석`);

const fetchRelatedVideos = async () => {
  if (!props.stockName) {
    videos.value = [];
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const response = await axios.get(`/api/youtube/search/`, {
      params: {
        q: searchQuery.value,
      }
    });

    if (response.data && Array.isArray(response.data)) {
      videos.value = response.data.slice(0, 3);
      if (videos.value.length === 0) {
        console.log('No videos found from backend for query:', searchQuery.value);
      }
    } else if (response.status === 204) {
        videos.value = [];
        console.log('No videos found (204 No Content) for query:', searchQuery.value);
    }
    else {
      throw new Error('API did not return an array of videos or data is missing.');
    }
  } catch (err) {
    console.error('Error fetching related YouTube videos:', err);
    let errorMessage = '알 수 없는 오류가 발생했습니다.';
    if (err.response) {
      errorMessage = `서버 오류: ${err.response.status} - ${err.response.data.error || err.response.statusText}`;
    } else if (err.request) {
      errorMessage = '서버로부터 응답을 받지 못했습니다.';
    } else {
      errorMessage = err.message;
    }
    error.value = errorMessage;
    videos.value = [];
  } finally {
    loading.value = false;
  }
};

const formatDuration = (isoDuration) => {
  if (!isoDuration || typeof isoDuration !== 'string') {
    return 'N/A';
  }
  const parts = isoDuration.split(':');
  if (parts.length === 3) { 
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseInt(parts[2], 10);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    }
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  }
  if (parts.length === 2) { 
     const m = parseInt(parts[0], 10);
     const s = parseInt(parts[1], 10);
     return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  }
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = isoDuration.match(regex);
  if (matches) {
    const hours = matches[1] ? parseInt(matches[1]) : 0;
    const minutes = matches[2] ? parseInt(matches[2]) : 0;
    const seconds = matches[3] ? parseInt(matches[3]) : 0;
    if (hours > 0) {
      return `${hours}:${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    }
    return `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
  }
  return isoDuration; 
};

onMounted(() => {
  if(props.stockName) {
    fetchRelatedVideos();
  }
});

watch(() => props.stockName, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    fetchRelatedVideos();
  } else if (!newVal) {
    videos.value = []; 
  }
});

</script>

<style scoped>
.truncate-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
.container {
  max-width: 1280px; 
}
</style> 