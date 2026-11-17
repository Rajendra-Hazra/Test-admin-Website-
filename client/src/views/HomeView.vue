<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api'
import type { UserRole } from '@/types/api'
import CustomerView from '@/components/roles/CustomerView.vue'
import PartnerView from '@/components/roles/PartnerView.vue'
import AdminView from '@/components/roles/AdminView.vue'
import GroundManagerView from '@/components/roles/GroundManagerView.vue'
import OrganizationView from '@/components/roles/OrganizationView.vue'
import {
  Shield,
  User,
  Wrench,
  Briefcase,
  Building2,
} from 'lucide-vue-next'

const authStore = useAuthStore()

// The active role is strictly determined by the authenticated user's session
const userRole = computed<UserRole>(() => {
  const r = authStore.user?.role || authStore.role
  if (r && ['CUSTOMER', 'PARTNER', 'ADMIN', 'GROUND_MANAGER', 'ORGANISATION'].includes(r)) {
    return r as UserRole
  }
  return 'CUSTOMER'
})

// Role styling & titles
const roleInfo = computed(() => {
  switch (userRole.value) {
    case 'ADMIN':
      return {
        title: 'System Administration Dashboard',
        description: 'Manage service catalog, pricing, coupons, prizes, withdrawals & system settings',
        icon: Shield,
        badgeColor: 'bg-[#FAF0F2] text-[#800020] border-[#800020]/20',
      }
    case 'PARTNER':
      return {
        title: 'Service Partner Portal',
        description: 'Manage incoming orders, arrival verification, order proofs, extra charges & schedule',
        icon: Wrench,
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      }
    case 'GROUND_MANAGER':
      return {
        title: 'Ground Manager Console',
        description: 'Inspect field reports, mediate complaints and handle dispute rework cases',
        icon: Briefcase,
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      }
    case 'ORGANISATION':
      return {
        title: 'Corporate Organisation Portal',
        description: 'Enterprise bulk service requests, quotation management and GST invoices',
        icon: Building2,
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      }
    case 'CUSTOMER':
    default:
      return {
        title: 'Customer Marketplace',
        description: 'Explore services, book appointments, track orders and manage your wallet',
        icon: User,
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      }
  }
})

// System Health State
const systemHealthy = ref<boolean | null>(null)
const serverTime = ref<string>('')

onMounted(async () => {
  try {
    const res = await api.health.check()
    const data = (res as any)?.data ?? res
    systemHealthy.value = true
    serverTime.value = data?.timestamp || new Date().toLocaleTimeString()
  } catch {
    systemHealthy.value = false
  }
})
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6 pb-16 bg-white">
    <!-- Top Bar: System Status & User Session -->
    <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-none flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-[#FAF0F2] text-[#800020] flex items-center justify-center border border-[#800020]/10">
          <component :is="roleInfo.icon" class="w-5 h-5" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-base font-bold text-[#202124]">{{ roleInfo.title }}</h2>
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border" :class="roleInfo.badgeColor">
              {{ userRole }}
            </span>
          </div>
          <p class="text-xs text-[#6B7280] mt-0.5">{{ roleInfo.description }}</p>
        </div>
      </div>

      <div class="flex items-center gap-4 text-xs">
        <div class="flex items-center gap-2">
          <div class="w-2.5 h-2.5 rounded-full" :class="systemHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'"></div>
          <span class="text-[#6B7280]">API: <strong class="text-[#202124]">{{ systemHealthy ? 'Online' : 'Connecting...' }}</strong></span>
        </div>
        <div class="h-4 w-px bg-[#E5E7EB]"></div>
        <div class="text-right">
          <p class="font-semibold text-[#202124]">{{ authStore.user?.name || 'User' }}</p>
          <p class="text-[#6B7280] font-mono text-[11px]">{{ authStore.user?.emailId || authStore.user?.mobileNo || 'Authenticated' }}</p>
        </div>
      </div>
    </div>

    <!-- Role Specific Page (strictly based on logged-in role) -->
    <main class="transition-all duration-300 bg-white">
      <CustomerView v-if="userRole === 'CUSTOMER'" />
      <PartnerView v-else-if="userRole === 'PARTNER'" />
      <AdminView v-else-if="userRole === 'ADMIN'" />
      <GroundManagerView v-else-if="userRole === 'GROUND_MANAGER'" />
      <OrganizationView v-else-if="userRole === 'ORGANISATION'" />
    </main>
  </div>
</template>
