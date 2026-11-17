<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSidebar } from '@/composables/useSidebar'
import {
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-vue-next'

const authStore = useAuthStore()
const route = useRoute()
const { isCollapsed, toggle, isMobileOpen, closeMobile } = useSidebar()

const isLoggedIn = computed(() => authStore.isAuthenticated)

interface NavItem {
  label: string
  to: string
  icon: string
  hiddenForRoles?: string[]
  /** When set, the item is shown only to these roles. */
  visibleForRoles?: string[]
  /** Query string for the link, e.g. { tab: 'payouts' } to open a dashboard tab. */
  query?: Record<string, string>
}

const userRole = computed(() => (authStore.user?.role || authStore.role || '').toUpperCase())

const navItems: NavItem[] = [
  // ── Admin items (hidden for PARTNER and CUSTOMER) ──
  {
    label: 'City',
    to: '/admin/city',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />`,
    hiddenForRoles: ['PARTNER'],
  },
  {
    label: 'Category',
    to: '/admin/category',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />`,
    hiddenForRoles: ['PARTNER', 'CUSTOMER'],
  },
  {
    label: 'Sub-Category',
    to: '/admin/subcategory',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />`,
    hiddenForRoles: ['PARTNER', 'CUSTOMER'],
  },
  {
    label: 'Service Problem',
    to: '/admin/service-problem',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />`,
    hiddenForRoles: ['PARTNER', 'CUSTOMER'],
  },
  {
    label: 'City Pricing',
    to: '/admin/problem-pricing',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`,
    hiddenForRoles: ['PARTNER'],
  },
  {
    label: 'Availability Check',
    to: '/admin/availability',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />`,
  },
  {
    label: 'Coupons',
    to: '/admin/coupon',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />`,
    hiddenForRoles: ['PARTNER'],
  },
  {
    label: 'Referrals',
    to: '/admin/referral',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />`,
    hiddenForRoles: ['PARTNER'],
  },
  {
    label: 'Hero Banners',
    to: '/admin/banners',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />`,
    hiddenForRoles: ['PARTNER'],
  },
  {
    label: 'Ad Placements',
    to: '/admin/ad-placements',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M3 11v2a1 1 0 001 1h2l5 4V6l-5 4H4a1 1 0 00-1 1z" /><path stroke-linecap="round" stroke-linejoin="round" d="M11 8a5 5 0 010 8m3-11a9 9 0 010 14" />`,
    visibleForRoles: ['ADMIN'],
  },
  {
    label: 'Offer & Discount',
    to: '/admin/offers-discounts',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />`,
    hiddenForRoles: ['PARTNER'],
  },
  {
    label: 'Push Notifications',
    to: '/admin/notifications',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />`,
    hiddenForRoles: ['PARTNER'],
  },
  {
    label: 'Ground Managers',
    to: '/admin/ground-managers',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />`,
    hiddenForRoles: ['PARTNER'],
  },
  {
    label: 'Orders',
    to: '/admin/orders',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />`,
    hiddenForRoles: ['PARTNER'],
  },
  {
    label: 'Rework Requests',
    to: '/admin/reworks',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />`,
    hiddenForRoles: ['PARTNER'],
  },
  {
    label: 'Subscriptions',
    to: '/admin/subscriptions',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />`,
    hiddenForRoles: ['PARTNER'],
  },
  {
    label: 'Video Management',
    to: '/admin/videos',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />`,
    hiddenForRoles: ['PARTNER'],
  },
  {
    label: 'Partner Verification',
    to: '/admin/partner-media',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />`,
  },
  {
    label: 'Users & Roles',
    to: '/admin/users',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />`,
    hiddenForRoles: ['PARTNER'],
  },
  // ── Financial Management ──
  {
    label: 'Wallet & Revenue',
    to: '/admin/finance',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`,
    hiddenForRoles: ['PARTNER'],
  },
  {
    label: 'Partner Financial Settings',
    to: '/admin/partner-financial-settings',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />`,
    hiddenForRoles: ['PARTNER'],
  },

  // ── App Management ──
  {
    label: 'App Icon Management',
    to: '/admin/app-icons',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />`,
    hiddenForRoles: ['PARTNER'],
  },

  // ── Partner specific side tab items ──
  {
    label: 'Assigned Orders',
    to: '/partner/orders',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />`,
    visibleForRoles: ['PARTNER'],
  },
  {
    label: 'Training & Learning',
    to: '/partner/training',
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />`,
    visibleForRoles: ['PARTNER'],
  },
  {
    label: 'Shift & Schedule',
    to: '/',
    query: { tab: 'profile' },
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />`,
    visibleForRoles: ['PARTNER'],
  },
  {
    label: 'Rework Disputes',
    to: '/',
    query: { tab: 'reworks' },
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />`,
    visibleForRoles: ['PARTNER'],
  },
  {
    label: 'Wallet',
    to: '/',
    query: { tab: 'wallet' },
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />`,
    visibleForRoles: ['PARTNER'],
  },
  {
    label: 'Withdrawals',
    to: '/',
    query: { tab: 'withdrawals' },
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />`,
    visibleForRoles: ['PARTNER'],
  },
  {
    label: 'Bank Accounts',
    to: '/',
    query: { tab: 'bank' },
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />`,
    visibleForRoles: ['PARTNER'],
  },
  {
    label: 'Customer Feedback',
    to: '/',
    query: { tab: 'reviews' },
    icon: `<path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />`,
    visibleForRoles: ['PARTNER'],
  },
]

const visibleNavItems = computed(() => {
  return navItems.filter((item) => {
    if (item.hiddenForRoles && item.hiddenForRoles.includes(userRole.value)) {
      return false
    }
    if (item.visibleForRoles && !item.visibleForRoles.includes(userRole.value)) {
      return false
    }
    return true
  })
})

function isActive(item: NavItem) {
  if (item.query) {
    if (route.path !== item.to) return false
    return Object.entries(item.query).every(([k, v]) => {
      if (k === 'tab' && v === 'jobs') {
        return !route.query.tab || route.query.tab === 'jobs'
      }
      return route.query[k] === v
    })
  }
  if (item.to === '/') {
    return route.path === '/' && (!route.query.tab || route.query.tab === 'jobs')
  }
  return route.path === item.to || route.path.startsWith(item.to + '/')
}
</script>

<template>
  <div
    v-if="isLoggedIn && isMobileOpen"
    class="fixed inset-x-0 bottom-0 top-14 z-20 bg-black/30 md:hidden"
    aria-hidden="true"
    @click="closeMobile"
  />
  <aside
    v-if="isLoggedIn"
    class="fixed left-0 top-14 h-[calc(100vh-3.5rem)] w-52 -translate-x-full bg-white border-r border-[#E5E7EB] flex flex-col z-30 transition-all duration-300 ease-in-out shadow-none md:translate-x-0"
    :class="[isCollapsed ? 'md:w-16' : '', isMobileOpen ? 'translate-x-0' : '']"
  >
    <!-- Nav items -->
    <nav class="flex-1 py-3 px-2 space-y-1 overflow-y-auto overflow-x-hidden bg-white">
      <RouterLink
        v-for="item in visibleNavItems"
        :key="item.label"
        :to="item.query ? { path: item.to, query: item.query } : item.to"
        :title="item.label"
        @click="closeMobile"
        class="flex items-center rounded-xl text-sm font-medium transition-all group relative"
        :class="[
          isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
          isActive(item)
            ? 'bg-[#FAF0F2] text-[#800020] font-semibold border-l-2 border-[#800020]'
            : 'text-[#202124] hover:bg-[#F7F7F8] hover:text-[#202124]',
        ]"
      >
        <!-- SVG Icon -->
        <svg
          class="w-4 h-4 shrink-0 transition-colors"
          :class="isActive(item) ? 'text-[#800020]' : 'text-[#6B7280] group-hover:text-[#202124]'"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
          v-html="item.icon"
        />

        <!-- Text Label (Visible only when expanded) -->
        <span
          class="truncate text-xs tracking-tight transition-opacity duration-200"
          :class="{ 'md:hidden': isCollapsed }"
        >
          {{ item.label }}
        </span>

        <!-- Floating tooltip in collapsed mode -->
        <div
          v-if="isCollapsed"
          class="absolute left-full ml-2 px-2.5 py-1 bg-[#202124] text-white text-xs font-medium rounded-md shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50"
        >
          {{ item.label }}
        </div>
      </RouterLink>
    </nav>

    <!-- Bottom Footer Toggle Bar -->
    <div class="hidden md:block p-2 border-t border-[#E5E7EB] bg-white">
      <button
        @click="toggle"
        class="w-full flex items-center rounded-lg text-xs font-medium text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8] transition-colors p-2 cursor-pointer"
        :class="isCollapsed ? 'justify-center' : 'justify-between'"
        :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
      >
        <div v-if="!isCollapsed" class="flex items-center gap-2">
          <PanelLeftClose class="w-4 h-4 text-[#6B7280]" />
          <span>Collapse Sidebar</span>
        </div>
        <PanelLeftOpen v-else class="w-4 h-4 text-[#6B7280]" />
      </button>
    </div>
  </aside>
</template>
