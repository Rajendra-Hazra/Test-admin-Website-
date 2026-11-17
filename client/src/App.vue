<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import SideNav from '@/components/SideNav.vue'
import { useAuthStore } from '@/stores/auth'
import { useSidebar } from '@/composables/useSidebar'
import { computed } from 'vue'
import { Toaster } from 'vue-sonner'

const authStore = useAuthStore()
const isLoggedIn = computed(() => authStore.isAuthenticated)
const { isCollapsed } = useSidebar()
</script>

<template>
  <Toaster position="top-right" richColors expand closeButton />
  <AppHeader />
  <SideNav />
  <!-- Main content: shift right when sidebar is visible -->
  <main
    class="min-w-0 pt-14 min-h-screen bg-white text-[#202124] transition-all duration-300 ease-in-out"
    :class="[!isLoggedIn ? 'ml-0' : isCollapsed ? 'ml-0 md:ml-16' : 'ml-0 md:ml-52']"
  >
    <div class="min-w-0 max-w-full px-3 py-4 bg-white min-h-[calc(100vh-3.5rem)] sm:px-4 sm:py-5 lg:px-6 lg:py-6">
      <RouterView />
    </div>
  </main>
</template>
