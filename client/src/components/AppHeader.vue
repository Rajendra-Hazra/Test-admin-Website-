<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSidebar } from '@/composables/useSidebar'

const router = useRouter()
const authStore = useAuthStore()
const { isCollapsed, toggle: toggleSidebar, isMobileOpen, toggleMobile } = useSidebar()

const isLoggedIn = computed(() => authStore.isAuthenticated)
const user = computed(() => authStore.user)

// Side panel state
const isPanelOpen = ref(false)
const openPanel = () => { isPanelOpen.value = true }
const closePanel = () => { isPanelOpen.value = false }

function toggleNavigation() {
  if (window.matchMedia('(max-width: 767px)').matches) {
    toggleMobile()
    return
  }

  toggleSidebar()
}

function logout() {
  authStore.clearAuth()
  closePanel()
  router.push('/login')
}
</script>

<template>
  <!-- ── Header ──────────────────────────────────────────────────────────── -->
  <header class="fixed top-0 inset-x-0 z-40 h-14 bg-white border-b border-[#E5E7EB] shadow-none">
    <div class="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">

      <!-- Logo / Brand & Sidebar toggle -->
      <div class="flex items-center gap-2">
        <button
          v-if="isLoggedIn"
          @click="toggleNavigation"
          class="p-1.5 -ml-1 rounded-lg text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8] transition-colors cursor-pointer"
          :title="isMobileOpen ? 'Close navigation' : isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          :aria-expanded="isMobileOpen"
          aria-label="Toggle navigation"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <RouterLink :to="isLoggedIn ? '/' : '/login'" class="text-xl font-black text-[#800020] tracking-tight">
          OMIBAY
        </RouterLink>
      </div>

      <!-- Nav -->
      <nav class="flex items-center gap-3">
        <!-- Home (only when logged in) -->
        <RouterLink
          v-if="isLoggedIn"
          to="/"
          class="px-3 py-1.5 text-sm font-medium text-[#6B7280] hover:text-[#800020] transition-colors"
        >
          Home
        </RouterLink>

        <!-- Login (only when NOT logged in) -->
        <RouterLink
          v-if="!isLoggedIn"
          to="/login"
          class="px-4 py-1.5 text-sm font-semibold text-white bg-[#800020] hover:bg-[#6B001B] rounded-lg transition-colors shadow-none"
        >
          Login
        </RouterLink>

        <!-- Avatar button (only when logged in) -->
        <button
          v-else
          @click="openPanel"
          class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#202124] hover:bg-[#F7F7F8] rounded-lg transition-colors cursor-pointer"
        >
          <span class="w-7 h-7 rounded-full bg-[#800020] text-white flex items-center justify-center text-xs font-bold uppercase select-none">
            {{ (user?.name ?? user?.emailId ?? 'U').charAt(0) }}
          </span>
          <span class="hidden sm:inline max-w-[120px] truncate">
            {{ user?.name ?? user?.emailId ?? 'Account' }}
          </span>
          <svg class="w-4 h-4 text-[#6B7280]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </nav>
    </div>
  </header>

  <!-- ── Side Panel Overlay ─────────────────────────────────────────────── -->
  <Transition name="fade">
    <div
      v-if="isPanelOpen"
      class="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs"
      @click="closePanel"
    />
  </Transition>

  <!-- ── Side Panel ─────────────────────────────────────────────────────── -->
  <Transition name="slide">
    <aside
      v-if="isPanelOpen"
      class="fixed right-0 top-0 z-50 h-full w-72 bg-white border-l border-[#E5E7EB] shadow-xl flex flex-col"
    >
      <!-- Panel header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB] bg-white">
        <h2 class="text-base font-semibold text-[#202124]">My Account</h2>
        <button @click="closePanel" class="p-1 rounded-md hover:bg-[#F7F7F8] text-[#6B7280] transition-colors cursor-pointer">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- User info -->
      <div class="px-5 py-5 border-b border-[#E5E7EB] bg-white">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-[#800020] text-white flex items-center justify-center text-lg font-bold uppercase">
            {{ (user?.name ?? user?.emailId ?? 'U').charAt(0) }}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-[#202124] truncate">{{ user?.name ?? '—' }}</p>
            <p class="text-xs text-[#6B7280] truncate">{{ user?.emailId ?? user?.mobileNo ?? '—' }}</p>
            <span class="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 bg-[#FAF0F2] text-[#800020] rounded-full uppercase tracking-wide border border-[#800020]/20">
              {{ user?.role }}
            </span>
          </div>
        </div>
      </div>

      <!-- Panel links -->
      <nav class="flex-1 px-3 py-4 space-y-1 bg-white">
        <RouterLink
          to="/"
          @click="closePanel"
          class="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-[#202124] hover:bg-[#F7F7F8] rounded-lg transition-colors"
        >
          <svg class="w-4 h-4 text-[#6B7280]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </RouterLink>
      </nav>

      <!-- Logout -->
      <div class="px-3 py-4 border-t border-[#E5E7EB] bg-white">
        <button
          @click="logout"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
/* Overlay fade */
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

/* Panel slide */
.slide-enter-active,
.slide-leave-active { transition: transform 0.25s ease; }
.slide-enter-from,
.slide-leave-to { transform: translateX(100%); }
</style>
