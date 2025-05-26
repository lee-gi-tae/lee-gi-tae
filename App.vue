<template>
  <div id="app" class="min-h-screen bg-gray-900 text-gray-100">
    <!-- Navigation Bar -->
    <nav class="bg-gray-800 shadow-lg">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center">
            <router-link to="/" class="text-2xl font-bold text-white hover:text-blue-400 transition-colors">
              My Stock App
            </router-link>
          </div>
          <div class="hidden md:block">
            <div class="ml-10 flex items-baseline space-x-4">
              <router-link 
                to="/"
                class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                active-class="bg-gray-900 text-white"
              >
                Home
              </router-link>
              <router-link 
                to="/dashboard"
                class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                active-class="bg-gray-900 text-white"
              >
                Stock Dashboard
              </router-link>
              <router-link 
                to="/split-info"
                class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                active-class="bg-gray-900 text-white"
              >
                Stock Splits
              </router-link>
              <!-- Add other navigation links here if needed -->
            </div>
          </div>
          <div class="-mr-2 flex md:hidden">
            <!-- Mobile menu button -->
            <button @click="mobileMenuOpen = !mobileMenuOpen" type="button" class="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white" aria-controls="mobile-menu" aria-expanded="false">
              <span class="sr-only">Open main menu</span>
              <svg :class="{'hidden': mobileMenuOpen, 'block': !mobileMenuOpen }" class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg :class="{'hidden': !mobileMenuOpen, 'block': mobileMenuOpen }" class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile menu, show/hide based on menu state. -->
      <div v-if="mobileMenuOpen" class="md:hidden" id="mobile-menu">
        <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <router-link 
            to="/"
            class="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
            active-class="bg-gray-900 text-white"
            @click="mobileMenuOpen = false"
          >
            Home
          </router-link>
          <router-link 
            to="/dashboard"
            class="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
            active-class="bg-gray-900 text-white"
            @click="mobileMenuOpen = false"
          >
            Stock Dashboard
          </router-link>
          <router-link 
            to="/split-info"
            class="text-gray-300 hover:bg-gray-700 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
            active-class="bg-gray-900 text-white"
            @click="mobileMenuOpen = false"
          >
            Stock Splits
          </router-link>
          <!-- Add other mobile navigation links here if needed -->
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="py-8">
      <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <!-- Router view to render the current page -->
        <router-view />
      </div>
    </main>

    <!-- Footer (Optional) -->
    <footer class="bg-gray-800 text-center p-4 mt-auto">
      <p class="text-sm text-gray-400">&copy; {{ new Date().getFullYear() }} Stock App. All rights reserved.</p>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue';
// Vue Router is typically already globally available if configured in main.js
// import { RouterLink, RouterView } from 'vue-router'; // Not strictly necessary for <router-link> and <router-view> in script setup if globally registered

const mobileMenuOpen = ref(false);
</script>

<style scoped>
/* Add any App.vue specific styles here if needed */
#app {
  display: flex;
  flex-direction: column;
}
main {
  flex-grow: 1;
}

/* Tailwind active-class for router-link might sometimes need explicit styling for specificity */
.router-link-exact-active {
  /* Example: if active-class="bg-gray-900 text-white" needs more specificity */
  /* You can also use a more specific selector if needed */
}
</style> 