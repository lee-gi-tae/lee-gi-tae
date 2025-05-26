<template>
  <div id="app" :class="{ dark: isDarkMode }">
    <header class="app-header" v-if="showHeader">
      <div class="header-container">
        <router-link to="/" class="logo"> FinanceApp </router-link>

        <nav class="main-nav">
          <router-link to="/products" class="nav-link">{{ $t('header.financial') }}</router-link>
          <router-link to="/products/ai-recommendations" class="nav-link">
            <i class="bi bi-robot"></i> {{ $t('header.aiRecommendations') }}
          </router-link>
          <router-link to="/articles" class="nav-link">{{ $t('header.community') }}</router-link>
          <router-link to="/map" class="nav-link">{{ $t('header.map') }}</router-link>
          <router-link to="/youtube/search" class="nav-link">{{ $t('header.videos') }}</router-link>
        </nav>

        <!-- Stock Search START-->
        <div class="stock-search-container" ref="stockSearchDropdownContainer">
          <input 
            type="text" 
            v-model="stockSearchQuery" 
            @input="debouncedSearchStock" 
            @focus="stockSearchFocused = true"
            :placeholder="$t('header.stockSearchPlaceholder', 'Stock Search (e.g. AAPL)')" 
            class="stock-search-input"
          />
          <button @click="searchStock" class="stock-search-button" :disabled="stockSearchLoading">
            <i v-if="!stockSearchLoading" class="bi bi-search"></i>
            <div v-if="stockSearchLoading" class="mini-loader"></div>
          </button>
          <div v-if="stockSearchFocused && (stockSearchResults.length > 0 || stockSearchLoading || stockSearchError || (stockSearchQuery && !stockSearchLoading && stockSearchResults.length === 0))" class="stock-search-results-dropdown">
            <div v-if="stockSearchLoading" class="search-loading-message">{{ $t('header.stockSearching', 'Searching...') }}</div>
            <div v-else-if="stockSearchError" class="search-error-message">
              {{ $t('header.stockSearchError', 'Error: ') }} {{ stockSearchError }}
            </div>
            <ul v-else-if="stockSearchResults.length > 0">
              <li v-for="stock in stockSearchResults" :key="stock.symbol" @click="goToStockDetail(stock.symbol)" class="search-result-item">
                <strong>{{ stock.symbol }}</strong> - <span>{{ stock.description }}</span>
              </li>
            </ul>
            <div v-else-if="stockSearchQuery && !stockSearchLoading && stockSearchResults.length === 0 && !stockSearchError" class="no-results-message">
              {{ $t('header.noStockResultsFound', 'No results found for') }} "{{ stockSearchQuery }}"
            </div>
          </div>
        </div>
        <!-- Stock Search END -->

        <div class="user-menu">
          <template v-if="isLoggedIn">
            <div class="user-dropdown" @click="toggleDropdown" ref="dropdown">
              <div v-if="profileImage" class="user-avatar">
                <img :src="profileImage" alt="프로필" />
              </div>
              <div v-else class="user-initials">
                {{ userInitials }}
              </div>

              <div class="dropdown-menu" v-show="dropdownOpen">
                <div class="dropdown-username">{{ user?.nickname || user?.username }}</div>
                <router-link v-if="isAdmin" to="/admin" class="dropdown-item"
                  ><i class="icon">💻</i>{{ $t('header.admin') }}</router-link
                >
                <router-link to="/profile" class="dropdown-item">
                  <i class="icon">👤</i> {{ $t('common.profile') }}
                </router-link>
                <router-link to="/favorites" class="dropdown-item">
                  <i class="icon">⭐</i> {{ $t('common.favorites') }}
                </router-link>
                <router-link to="/youtube/saved" class="dropdown-item">
                  <i class="icon">🎬</i> {{ $t('common.savedVideos') }}
                </router-link>
                <!-- <router-link to="/settings" class="dropdown-item">
                  <i class="icon">⚙️</i> {{ $t('common.settings') }}
                </router-link> -->
                <div class="dropdown-divider"></div>
                <button @click="logout" class="dropdown-item logout">
                  <i class="icon">🚪</i> {{ $t('common.logout') }}
                </button>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="auth-buttons">
              <router-link to="/login" class="auth-btn login">{{ $t('common.login') }}</router-link>
              <router-link to="/register" class="auth-btn register">{{
                $t('common.register')
              }}</router-link>
            </div>
            <!-- <router-link to="/settings" class="settings-link">
              <i class="icon">⚙️</i>
            </router-link> -->
          </template>
        </div>
      </div>
    </header>

    <main>
      <div class="floating-controls">
        <button
          @click="toggleDarkMode"
          class="floating-btn"
          :title="isDarkMode ? $t('common.lightMode') : $t('common.darkMode')"
        >
          <font-awesome-icon :icon="isDarkMode ? 'sun' : 'moon'" />
        </button>
        <button
          @click="toggleLanguage"
          class="floating-btn"
          :title="currentLocale === 'ko' ? 'English' : '한국어'"
        >
          <font-awesome-icon icon="globe" />
          <span>{{ currentLocale === 'ko' ? 'EN' : 'KR' }}</span>
        </button>
      </div>

      <PhishingModal />

      <router-view />
    </main>

    <footer class="app-footer" v-if="showFooter">
      <div class="footer-container">
        <p>{{ $t('common.copyright') }}</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
// Components
import PhishingModal from '@/components/modals/PhishingModal.vue'
// import ParticleNetwork from '@/components/effects/ParticleNetwork.vue' // 주석 처리

const userStore = useUserStore()
const settingsStore = useSettingsStore()
const { locale, t } = useI18n()
const router = useRouter()

const isLoggedIn = computed(() => userStore.isLoggedIn)
const isAdmin = computed(() => userStore.isAdmin)
const user = computed(() => userStore.user)
const userInitials = computed(() => userStore.userInitials)
const profileImage = computed(() => userStore.profileImage)
const isDarkMode = computed(() => settingsStore.isDarkMode)
const currentLocale = computed(() => locale.value)

const dropdownOpen = ref(false)
const dropdown = ref(null)

// Stock Search Data
const stockSearchQuery = ref('')
const stockSearchResults = ref([])
const stockSearchLoading = ref(false)
const stockSearchError = ref(null)
const stockSearchFocused = ref(false)
const stockSearchDropdownContainer = ref(null)

let stockSearchDebounceTimer = null

// Determine if header/footer should be shown based on route
const showHeader = computed(() => {
  // Hide for certain routes if needed
  return true
})

const showFooter = computed(() => {
  // Hide for certain routes if needed
  return true
})

// 히어로 섹션과 금융 시장 동향 섹션은 항상 메인 페이지에 표시

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
}

const closeDropdown = (event) => {
  if (dropdown.value && !dropdown.value.contains(event.target)) {
    dropdownOpen.value = false
  }
}

const logout = () => {
  userStore.logout()
  dropdownOpen.value = false
}

const toggleDarkMode = () => {
  settingsStore.toggleDarkMode()
}

const toggleLanguage = () => {
  settingsStore.toggleLanguage()
}

onMounted(() => {
  // 초기 테마 설정
  settingsStore.initTheme()

  // 초기 언어 설정
  settingsStore.initLanguage()

  // Check authentication status
  userStore.checkAuth()

  // Add event listener for closing dropdown
  document.addEventListener('click', closeDropdown)
  document.addEventListener('click', handleClickOutsideStockSearch)
})

onBeforeUnmount(() => {
  // Remove event listener
  document.removeEventListener('click', closeDropdown)
  document.removeEventListener('click', handleClickOutsideStockSearch)
})

// Stock Search Methods
const searchStock = async () => {
  if (!stockSearchQuery.value.trim()) {
    stockSearchResults.value = []
    stockSearchError.value = null
    return
  }
  stockSearchLoading.value = true
  stockSearchError.value = null
  stockSearchResults.value = []

  try {
    const response = await fetch(`/products/stocks/search/?q=${encodeURIComponent(stockSearchQuery.value.trim())}`)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `API request failed with status ${response.status}`)
    }
    const data = await response.json()
    stockSearchResults.value = data
  } catch (error) {
    console.error('Stock search error:', error)
    stockSearchError.value = error.message || t('header.stockSearchFailed', 'Search failed. Please try again.')
  } finally {
    stockSearchLoading.value = false
  }
}

const debouncedSearchStock = () => {
  clearTimeout(stockSearchDebounceTimer)
  if (stockSearchQuery.value.trim()) {
    stockSearchDebounceTimer = setTimeout(() => {
      searchStock()
    }, 500)
  } else {
    stockSearchResults.value = []
    stockSearchError.value = null
  }
}

const goToStockDetail = (symbol) => {
  // Navigate to the StockDetail route
  router.push({ name: 'StockDetail', params: { symbol: symbol } });
  
  // Clear search input and results, and hide dropdown
  stockSearchQuery.value = ''
  stockSearchResults.value = []
  stockSearchFocused.value = false // Hide dropdown after selection
}

const handleClickOutsideStockSearch = (event) => {
  if (stockSearchDropdownContainer.value && !stockSearchDropdownContainer.value.contains(event.target)) {
    stockSearchFocused.value = false
  }
}
</script>

<style>
/* Import variables */
@import './assets/variables.css';

/* Global styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  transition:
    background-color var(--transition-speed),
    color var(--transition-speed);
}

body {
  font-family:
    'Pretendard Variable',
    Pretendard,
    'Inter',
    'Noto Sans KR',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
  line-height: 1.6;
  color: var(--text-primary);
  background-color: var(--background-primary);
}

h1,
h2,
h3,
h4,
h5,
h6 {
  font-family: 'Playfair Display', serif;
}

a {
  text-decoration: none;
  color: inherit;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--background-gradient);
}

main {
  flex: 1;
  position: relative;
}

/* Header styles */
.app-header {
  background-color: var(--header-bg);
  padding: 0.8rem 2rem;
  box-shadow: 0 2px 8px var(--shadow-color);
  position: sticky;
  top: 0;
  z-index: 1000;
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border-color);
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: var(--max-width);
  margin: 0 auto;
  gap: 1rem;
}

.logo {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--accent-color);
  text-decoration: none;
  transition: color var(--transition-speed);
}

.logo:hover {
  color: var(--accent-hover);
}

.main-nav {
  display: flex;
  gap: 1rem;
}

.main-nav .nav-link {
  color: var(--text-secondary);
  text-decoration: none;
  padding: 0.8rem 1.2rem;
  border-radius: 6px;
  font-weight: 500;
  transition: all var(--transition-speed);
  display: flex;
  align-items: center;
  line-height: 1;
}

.main-nav .nav-link i {
  margin-right: 0.5rem;
}

.main-nav .nav-link:hover,
.main-nav .nav-link.router-link-active {
  color: var(--accent-color);
  background-color: rgba(var(--accent-color-rgb, 80, 200, 120), 0.1);
  box-shadow: 0 2px 4px rgba(var(--accent-color-rgb, 80, 200, 120), 0.2);
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.theme-toggle,
.language-toggle {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 5px;
  font-size: 1.1rem;
  border-radius: 50%;
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.theme-toggle:hover,
.language-toggle:hover {
  background-color: rgba(79, 70, 229, 0.1);
  color: var(--accent-color);
}

.language-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9rem;
}

.auth-btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 500;
  transition: all 0.2s;
}

.auth-btn.login {
  color: var(--accent-color);
}

.auth-btn.register {
  background-color: var(--accent-color);
  color: white;
}

.auth-btn:hover {
  opacity: 0.9;
}

.user-dropdown {
  position: relative;
  cursor: pointer;
}

.user-avatar,
.user-initials {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-initials {
  background-color: var(--accent-color);
  color: white;
  font-weight: 600;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  width: 220px;
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--shadow-color);
  overflow: hidden;
  z-index: 10;
}

.dropdown-username {
  padding: 12px 16px;
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  color: var(--text-primary);
  transition: background-color 0.2s;
  width: 100%;
  text-align: left;
  border: none;
  background: none;
  font-size: 14px;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: rgba(79, 70, 229, 0.1);
}

.dropdown-item.logout {
  color: #e53e3e;
}

.dropdown-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 4px 0;
}

.icon {
  margin-right: 10px;
  font-style: normal;
}

/* Footer styles */
.app-footer {
  background-color: var(--footer-bg);
  padding: 20px 0;
  border-top: 1px solid var(--border-color);
  margin-top: 60px;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

/* Media queries */
@media (max-width: 768px) {
  .header-container {
    height: auto;
    flex-wrap: wrap;
    padding: 10px 20px;
  }

  .logo {
    margin-bottom: 10px;
  }

  .main-nav {
    order: 3;
    width: 100%;
    margin-top: 10px;
    justify-content: space-around;
  }
}

@media (max-width: 480px) {
  .auth-btn {
    padding: 6px 12px;
    font-size: 14px;
  }
}

/* Add floating controls styles */
.floating-controls {
  position: fixed;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 99;
}

.floating-btn {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.floating-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.floating-btn span {
  font-size: 0.8rem;
  margin-left: 2px;
}

/* Update auth buttons styles */
.auth-buttons {
  display: flex;
  gap: 10px;
  align-items: center;
}

.auth-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.auth-btn.login {
  color: var(--accent-color);
  border: 1px solid var(--accent-color);
}

.auth-btn.register {
  background-color: var(--accent-color);
  color: white;
}

.auth-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* Stock Search Styles START */
.stock-search-container {
  position: relative;
  display: flex;
  align-items: center;
  margin: 0 1rem;
}

.stock-search-input {
  padding: 0.5rem 0.8rem;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius) 0 0 var(--border-radius);
  font-size: 0.9rem;
  background-color: var(--input-bg);
  color: var(--text-primary);
  width: 200px;
  transition: border-color var(--transition-speed), background-color var(--transition-speed);
}

.stock-search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px var(--primary-color-translucent);
}

.stock-search-button {
  padding: 0.5rem 0.8rem;
  border: 1px solid var(--primary-color);
  background-color: var(--primary-color);
  color: white;
  cursor: pointer;
  border-radius: 0 var(--border-radius) var(--border-radius) 0;
  margin-left: -1px;
  transition: background-color var(--transition-speed);
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(0.5rem * 2 + 0.9rem * 1.6 + 2px);
}

.stock-search-button:hover {
  background-color: var(--primary-color-dark);
}

.stock-search-button:disabled {
  background-color: var(--button-disabled-bg);
  cursor: not-allowed;
}

.stock-search-button .mini-loader {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.stock-search-results-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-top: none;
  border-radius: 0 0 var(--border-radius) var(--border-radius);
  box-shadow: 0 4px 8px var(--shadow-color-light);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  padding: 0.5rem 0;
}

.stock-search-results-dropdown .search-loading-message,
.stock-search-results-dropdown .search-error-message,
.stock-search-results-dropdown .no-results-message {
  padding: 0.8rem 1rem;
  color: var(--text-secondary);
  text-align: center;
}

.stock-search-results-dropdown .search-error-message {
  color: var(--error-color);
}

.stock-search-results-dropdown ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.stock-search-results-dropdown .search-result-item {
  padding: 0.8rem 1rem;
  cursor: pointer;
  transition: background-color var(--transition-speed);
  border-bottom: 1px solid var(--border-color-light);
}
.stock-search-results-dropdown .search-result-item:last-child {
  border-bottom: none;
}

.stock-search-results-dropdown .search-result-item:hover {
  background-color: var(--background-tertiary);
}

.stock-search-results-dropdown .search-result-item strong {
  color: var(--text-primary);
}
.stock-search-results-dropdown .search-result-item span {
  color: var(--text-secondary);
  font-size: 0.9em;
}

/* Ensure dropdown visibility */
.stock-search-container:focus-within .stock-search-results-dropdown,
.stock-search-input:focus + .stock-search-results-dropdown {
  /* display: block; */
}

/* Stock Search Styles END */

.user-menu {
  position: relative;
}
</style>
