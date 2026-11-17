<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '@/api'
import type {
  Coupon,
  ScratchCouponPrize,
  WithdrawalRequestItem,
  ReworkCase,
} from '@/types/api'
import {
  Shield,
  Layers,
  MapPin,
  Tag,
  Gift,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Check,
  X,
  Users,
  Settings,
  DollarSign,
  Briefcase,
  ExternalLink,
  Plus,
  Image as ImageIcon,
  Bell,
  CreditCard,
  Video as VideoIcon,
  Percent,
  Smartphone,
  Megaphone,
} from 'lucide-vue-next'

type SubTab = 'coupons' | 'prizes' | 'withdrawals' | 'reworks' | 'ground-managers' | 'settings'
const activeTab = ref<SubTab>('withdrawals')

const isLoading = ref(false)
const statusMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)

function notify(text: string, type: 'success' | 'error' = 'success') {
  statusMessage.value = { type, text }
  setTimeout(() => {
    if (statusMessage.value?.text === text) statusMessage.value = null
  }, 4000)
}

// 1. Withdrawals
const allWithdrawals = ref<WithdrawalRequestItem[]>([])
// 2. Coupons
const allCoupons = ref<Coupon[]>([])
const newCoupon = ref<Partial<Coupon>>({
  code: 'SUMMER25',
  discountType: 'PERCENTAGE',
  discountValue: 25,
  minOrderAmount: 299,
  maxDiscount: 150,
  isActive: true,
})
const assignUserIdInput = ref('')
const selectedCouponId = ref('')
const assignedUsers = ref<string[]>([])

// 3. Scratch Prizes
const allPrizes = ref<ScratchCouponPrize[]>([])
const newPrize = ref<Partial<ScratchCouponPrize>>({
  title: 'Lucky Gold Cashback',
  minReward: 20,
  maxReward: 100,
  probability: 0.25,
  isActive: true,
})

// 4. Admin Reworks & Ground Managers
const adminReworks = ref<ReworkCase[]>([])

// 5. Settings
const settingKey = ref('SYSTEM_PLATFORM_FEE_PCT')
const settingValue = ref('10')

onMounted(async () => {
  await loadAdminData()
})

async function loadAdminData() {
  isLoading.value = true
  try {
    const [wRes, cRes, pRes, rRes] = await Promise.allSettled([
      api.withdrawals.getAll(),
      api.coupons.adminGetAll(),
      api.adminScratchCoupons.getAllPrizes(),
      api.groundManager.adminGetReworks(),
    ])
    if (wRes.status === 'fulfilled') {
      const raw = (wRes.value as any)?.data ?? wRes.value
      allWithdrawals.value = Array.isArray(raw) ? raw : []
    }
    if (cRes.status === 'fulfilled') {
      const raw = (cRes.value as any)?.data ?? cRes.value
      allCoupons.value = Array.isArray(raw) ? raw : []
    }
    if (pRes.status === 'fulfilled') {
      const raw = (pRes.value as any)?.data ?? pRes.value
      allPrizes.value = Array.isArray(raw) ? raw : []
    }
    if (rRes.status === 'fulfilled') {
      const raw = (rRes.value as any)?.data ?? rRes.value
      adminReworks.value = Array.isArray(raw) ? raw : []
    }
  } catch (err: any) {
    console.error('Admin init error:', err)
  } finally {
    isLoading.value = false
  }
}

// ── Withdrawal Approvals ───────────────────────────────────────────────
async function approveWithdrawal(id: string) {
  try {
    await api.withdrawals.approve(id)
    notify(`Withdrawal #${id} APPROVED & payout initiated!`)
    await loadAdminData()
  } catch (err: any) {
    notify('Approval failed: ' + err.message, 'error')
  }
}

async function rejectWithdrawal(id: string) {
  const reason = prompt('Reason for rejection:')
  if (!reason) return
  try {
    await api.withdrawals.reject(id, reason)
    notify(`Withdrawal #${id} REJECTED and refunded to wallet.`)
    await loadAdminData()
  } catch (err: any) {
    notify('Rejection failed: ' + err.message, 'error')
  }
}

// ── Coupon Management ──────────────────────────────────────────────────
async function createCoupon() {
  try {
    await api.coupons.adminCreate(newCoupon.value)
    notify(`Coupon ${newCoupon.value.code} created!`)
    await loadAdminData()
  } catch (err: any) {
    notify('Failed to create coupon: ' + err.message, 'error')
  }
}

async function toggleCouponActive(coupon: Coupon) {
  const cId = coupon.id || coupon.couponId
  if (!cId) return
  try {
    await api.coupons.adminSetActive(cId, !coupon.isActive)
    coupon.isActive = !coupon.isActive
    notify(`Coupon status updated`)
  } catch (err: any) {
    notify('Failed to update: ' + err.message, 'error')
  }
}

async function viewCouponUsers(couponId: string) {
  selectedCouponId.value = couponId
  try {
    const res = await api.coupons.adminGetAssignedUsers(couponId)
    const raw = (res as any)?.data ?? res
    assignedUsers.value = Array.isArray(raw) ? raw : []
  } catch {
    assignedUsers.value = []
  }
}

async function assignUserToCoupon() {
  if (!assignUserIdInput.value.trim() || !selectedCouponId.value) return
  try {
    await api.coupons.adminAssignUsers(selectedCouponId.value, [assignUserIdInput.value.trim()])
    notify(`User assigned to coupon!`)
    assignUserIdInput.value = ''
    await viewCouponUsers(selectedCouponId.value)
  } catch (err: any) {
    notify('Failed to assign: ' + err.message, 'error')
  }
}

// ── Scratch Prizes ─────────────────────────────────────────────────────
async function createPrize() {
  try {
    await api.adminScratchCoupons.createPrize(newPrize.value)
    notify('Scratch prize pool item added!')
    await loadAdminData()
  } catch (err: any) {
    notify('Failed: ' + err.message, 'error')
  }
}

async function togglePrizeActive(prize: ScratchCouponPrize) {
  const pId = prize.id || prize.prizeId
  if (!pId) return
  try {
    await api.adminScratchCoupons.setActive(pId, !prize.isActive)
    prize.isActive = !prize.isActive
    notify('Prize active status changed')
  } catch (err: any) {
    notify('Update failed: ' + err.message, 'error')
  }
}

// ── Reworks (ground managers are created on /admin/ground-managers) ────
async function approveRework(reworkId: string) {
  try {
    await api.groundManager.adminApproveRework(reworkId)
    notify(`Rework dispute #${reworkId} APPROVED!`)
    await loadAdminData()
  } catch (err: any) {
    notify('Failed to approve rework: ' + err.message, 'error')
  }
}

async function cancelRework(reworkId: string) {
  const reason = prompt('Reason for dismissal:')
  if (!reason) return
  try {
    await api.groundManager.adminCancelRework(reworkId, reason)
    notify(`Rework dispute #${reworkId} CANCELLED.`)
    await loadAdminData()
  } catch (err: any) {
    notify('Failed to cancel rework: ' + err.message, 'error')
  }
}

// ── Settings ───────────────────────────────────────────────────────────
async function saveSetting() {
  try {
    await api.settings.update(settingKey.value, settingValue.value)
    notify(`Setting ${settingKey.value} updated to ${settingValue.value}`)
  } catch (err: any) {
    notify('Failed to save setting: ' + err.message, 'error')
  }
}
</script>

<template>
  <div class="space-y-6 bg-white text-[#202124]">
    <!-- Status Notification -->
    <div
      v-if="statusMessage"
      class="px-4 py-3 rounded-xl border flex items-center gap-3 transition-all bg-white"
      :class="statusMessage.type === 'success' ? 'border-emerald-300 text-emerald-800' : 'border-rose-300 text-rose-800'"
    >
      <CheckCircle2 v-if="statusMessage.type === 'success'" class="w-5 h-5 text-emerald-600 shrink-0" />
      <AlertCircle v-else class="w-5 h-5 text-rose-600 shrink-0" />
      <span class="text-sm font-medium">{{ statusMessage.text }}</span>
    </div>

    <!-- Quick Navigation to Dedicated Admin Views -->
    <div class="bg-white p-5 rounded-xl border border-[#E5E7EB]">
      <h3 class="text-xs font-bold text-[#202124] uppercase tracking-wider mb-3">
        Dedicated Catalog & City Admin Screens
      </h3>
      <div class="flex flex-wrap gap-2">
        <RouterLink
          to="/admin/category"
          class="px-3 py-1.5 bg-white text-[#202124] font-medium text-xs rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F8] hover:text-[#800020] hover:border-[#800020]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Layers class="w-3.5 h-3.5" />
          Categories
          <ExternalLink class="w-3 h-3 text-[#6B7280]" />
        </RouterLink>

        <RouterLink
          to="/admin/subcategory"
          class="px-3 py-1.5 bg-white text-[#202124] font-medium text-xs rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F8] hover:text-[#800020] hover:border-[#800020]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Layers class="w-3.5 h-3.5" />
          Sub-Categories
          <ExternalLink class="w-3 h-3 text-[#6B7280]" />
        </RouterLink>

        <RouterLink
          to="/admin/service-problem"
          class="px-3 py-1.5 bg-white text-[#202124] font-medium text-xs rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F8] hover:text-[#800020] hover:border-[#800020]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Layers class="w-3.5 h-3.5" />
          Service Problems
          <ExternalLink class="w-3 h-3 text-[#6B7280]" />
        </RouterLink>

        <RouterLink
          to="/admin/city"
          class="px-3 py-1.5 bg-white text-[#202124] font-medium text-xs rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F8] hover:text-[#800020] hover:border-[#800020]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <MapPin class="w-3.5 h-3.5" />
          Operational Cities
          <ExternalLink class="w-3 h-3 text-[#6B7280]" />
        </RouterLink>

        <RouterLink
          to="/admin/problem-pricing"
          class="px-3 py-1.5 bg-white text-[#202124] font-medium text-xs rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F8] hover:text-[#800020] hover:border-[#800020]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <DollarSign class="w-3.5 h-3.5" />
          City Pricing Matrix
          <ExternalLink class="w-3 h-3 text-[#6B7280]" />
        </RouterLink>

        <RouterLink
          to="/admin/availability"
          class="px-3 py-1.5 bg-white text-[#202124] font-medium text-xs rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F8] hover:text-[#800020] hover:border-[#800020]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <CheckCircle2 class="w-3.5 h-3.5" />
          Availability Checker
          <ExternalLink class="w-3 h-3 text-[#6B7280]" />
        </RouterLink>

        <RouterLink
          to="/admin/coupon"
          class="px-3 py-1.5 bg-white text-[#202124] font-medium text-xs rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F8] hover:text-[#800020] hover:border-[#800020]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Tag class="w-3.5 h-3.5" />
          Coupons & Discounts
          <ExternalLink class="w-3 h-3 text-[#6B7280]" />
        </RouterLink>

        <RouterLink
          to="/admin/referral"
          class="px-3 py-1.5 bg-white text-[#202124] font-medium text-xs rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F8] hover:text-[#800020] hover:border-[#800020]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Gift class="w-3.5 h-3.5" />
          Referral System
          <ExternalLink class="w-3 h-3 text-[#6B7280]" />
        </RouterLink>

        <RouterLink
          to="/admin/banners"
          class="px-3 py-1.5 bg-white text-[#202124] font-medium text-xs rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F8] hover:text-[#800020] hover:border-[#800020]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ImageIcon class="w-3.5 h-3.5" />
          Hero Banners
          <ExternalLink class="w-3 h-3 text-[#6B7280]" />
        </RouterLink>

        <RouterLink
          to="/admin/ad-placements"
          class="px-3 py-1.5 bg-white text-[#202124] font-medium text-xs rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F8] hover:text-[#800020] hover:border-[#800020]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Megaphone class="w-3.5 h-3.5" />
          Ad Placements
          <ExternalLink class="w-3 h-3 text-[#6B7280]" />
        </RouterLink>

        <RouterLink
          to="/admin/offers-discounts"
          class="px-3 py-1.5 bg-white text-[#202124] font-medium text-xs rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F8] hover:text-[#800020] hover:border-[#800020]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Percent class="w-3.5 h-3.5" />
          Offer &amp; Discount
          <ExternalLink class="w-3 h-3 text-[#6B7280]" />
        </RouterLink>

        <RouterLink
          to="/admin/notifications"
          class="px-3 py-1.5 bg-white text-[#202124] font-medium text-xs rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F8] hover:text-[#800020] hover:border-[#800020]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Bell class="w-3.5 h-3.5" />
          Push Notifications
          <ExternalLink class="w-3 h-3 text-[#6B7280]" />
        </RouterLink>

        <RouterLink
          to="/admin/subscriptions"
          class="px-3 py-1.5 bg-white text-[#202124] font-medium text-xs rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F8] hover:text-[#800020] hover:border-[#800020]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <CreditCard class="w-3.5 h-3.5" />
          Subscriptions & Memberships
          <ExternalLink class="w-3 h-3 text-[#6B7280]" />
        </RouterLink>

        <RouterLink
          to="/admin/videos"
          class="px-3 py-1.5 bg-white text-[#202124] font-medium text-xs rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F8] hover:text-[#800020] hover:border-[#800020]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <VideoIcon class="w-3.5 h-3.5" />
          Video Management
          <ExternalLink class="w-3 h-3 text-[#6B7280]" />
        </RouterLink>

        <RouterLink
          to="/admin/finance"
          class="px-3 py-1.5 bg-white text-[#202124] font-medium text-xs rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F8] hover:text-[#800020] hover:border-[#800020]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <DollarSign class="w-3.5 h-3.5" />
          Wallet & Revenue Management
          <ExternalLink class="w-3 h-3 text-[#6B7280]" />
        </RouterLink>

        <RouterLink
          to="/admin/partner-financial-settings"
          class="px-3 py-1.5 bg-white text-[#202124] font-medium text-xs rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F8] hover:text-[#800020] hover:border-[#800020]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Percent class="w-3.5 h-3.5" />
          Partner Financial Settings
          <ExternalLink class="w-3 h-3 text-[#6B7280]" />
        </RouterLink>

        <RouterLink
          to="/admin/app-icons"
          class="px-3 py-1.5 bg-white text-[#202124] font-medium text-xs rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F8] hover:text-[#800020] hover:border-[#800020]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Smartphone class="w-3.5 h-3.5" />
          App Icon Management
          <ExternalLink class="w-3 h-3 text-[#6B7280]" />
        </RouterLink>

        <RouterLink
          to="/admin/users"
          class="px-3 py-1.5 bg-white text-[#202124] font-medium text-xs rounded-lg border border-[#E5E7EB] hover:bg-[#F7F7F8] hover:text-[#800020] hover:border-[#800020]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Users class="w-3.5 h-3.5" />
          Users & Roles
          <ExternalLink class="w-3 h-3 text-[#6B7280]" />
        </RouterLink>
      </div>
    </div>

    <!-- Subtabs -->
    <div class="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E5E7EB] bg-white">
      <button
        @click="activeTab = 'withdrawals'"
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
        :class="activeTab === 'withdrawals' ? 'bg-[#800020] text-white' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124] border border-[#E5E7EB]'"
      >
        <DollarSign class="w-4 h-4" />
        Payout Approvals ({{ allWithdrawals.length }})
      </button>

      <button
        @click="activeTab = 'coupons'"
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
        :class="activeTab === 'coupons' ? 'bg-[#800020] text-white' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124] border border-[#E5E7EB]'"
      >
        <Tag class="w-4 h-4" />
        Coupons & Targeting
      </button>

      <button
        @click="activeTab = 'prizes'"
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
        :class="activeTab === 'prizes' ? 'bg-[#800020] text-white' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124] border border-[#E5E7EB]'"
      >
        <Gift class="w-4 h-4" />
        Scratch Prize Pools
      </button>

      <button
        @click="activeTab = 'reworks'"
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
        :class="activeTab === 'reworks' ? 'bg-[#800020] text-white' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124] border border-[#E5E7EB]'"
      >
        <AlertCircle class="w-4 h-4" />
        Dispute Escalations
      </button>

      <button
        @click="activeTab = 'ground-managers'"
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
        :class="activeTab === 'ground-managers' ? 'bg-[#800020] text-white' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124] border border-[#E5E7EB]'"
      >
        <Briefcase class="w-4 h-4" />
        Ground Managers
      </button>

      <button
        @click="activeTab = 'settings'"
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
        :class="activeTab === 'settings' ? 'bg-[#800020] text-white' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124] border border-[#E5E7EB]'"
      >
        <Settings class="w-4 h-4" />
        Platform Settings
      </button>
    </div>

    <!-- ── TAB 1: PAYOUT APPROVALS ───────────────────────────────────── -->
    <div v-if="activeTab === 'withdrawals'" class="max-w-4xl mx-auto space-y-4">
      <h3 class="text-base font-bold text-[#202124]">Pending & Historical Payout Requests</h3>

      <div v-if="allWithdrawals.length === 0" class="p-12 text-center bg-white rounded-xl border border-[#E5E7EB] text-[#6B7280] text-xs">
        No withdrawal requests found.
      </div>

      <div
        v-for="w in allWithdrawals"
        :key="w.requestId"
        class="bg-white p-5 rounded-xl border border-[#E5E7EB] flex items-center justify-between gap-4"
      >
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-[#202124]">#{{ w.requestId }}</span>
            <span class="text-xs text-[#6B7280]">Partner ID: {{ w.partnerId || 'partner-01' }}</span>
            <span
              class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
              :class="w.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : w.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'"
            >
              {{ w.status }}
            </span>
          </div>
          <p class="text-xs text-[#6B7280] mt-1 font-mono">Bank A/C: {{ w.bankAccountId || 'Verified Linked A/C' }}</p>
        </div>

        <div class="flex items-center gap-4">
          <span class="text-base font-bold text-[#202124]">₹{{ w.amount }}</span>
          <div v-if="w.status === 'PENDING'" class="flex gap-2">
            <button
              @click="approveWithdrawal(w.requestId)"
              class="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition cursor-pointer"
            >
              Approve
            </button>
            <button
              @click="rejectWithdrawal(w.requestId)"
              class="px-3 py-1.5 border border-[#E5E7EB] bg-white text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-50 transition cursor-pointer"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB 2: COUPONS & TARGETING ────────────────────────────────── -->
    <div v-if="activeTab === 'coupons'" class="max-w-4xl mx-auto space-y-6">
      <!-- Create Coupon Form -->
      <div class="bg-white p-6 rounded-xl border border-[#E5E7EB] space-y-4">
        <h3 class="text-base font-bold text-[#202124]">Create New Promotional Coupon</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-semibold text-[#202124] mb-1">Coupon Code</label>
            <input v-model="newCoupon.code" class="w-full text-xs rounded-lg border-[#E5E7EB] bg-white text-[#202124] font-mono uppercase px-3 py-2 border focus:outline-none focus:ring-1 focus:ring-[#800020]" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#202124] mb-1">Discount % or Flat ₹</label>
            <input type="number" v-model="newCoupon.discountValue" class="w-full text-xs rounded-lg border-[#E5E7EB] bg-white text-[#202124] px-3 py-2 border focus:outline-none focus:ring-1 focus:ring-[#800020]" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#202124] mb-1">Min Order Amount</label>
            <input type="number" v-model="newCoupon.minOrderAmount" class="w-full text-xs rounded-lg border-[#E5E7EB] bg-white text-[#202124] px-3 py-2 border focus:outline-none focus:ring-1 focus:ring-[#800020]" />
          </div>
        </div>
        <button
          @click="createCoupon"
          class="px-4 py-2 bg-[#800020] text-white rounded-lg text-xs font-semibold hover:bg-[#6B001B] transition cursor-pointer"
        >
          Publish Coupon
        </button>
      </div>

      <!-- Coupon List & User Targeting -->
      <div class="bg-white p-6 rounded-xl border border-[#E5E7EB] space-y-4">
        <h3 class="text-base font-bold text-[#202124]">Configured Coupons</h3>
        <div
          v-for="c in allCoupons"
          :key="c.couponId"
          class="p-4 bg-white rounded-xl border border-[#E5E7EB] space-y-3"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold font-mono text-[#800020] bg-[#FAF0F2] px-2 py-0.5 rounded border border-[#800020]/20">{{ c.code }}</span>
              <span class="text-xs text-[#6B7280] font-medium">Value: {{ c.discountValue }} ({{ c.discountType }})</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="toggleCouponActive(c)"
                class="px-2.5 py-1 text-[11px] font-semibold rounded-lg border cursor-pointer"
                :class="c.isActive ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-[#F7F7F8] text-[#6B7280] border-[#E5E7EB]'"
              >
                {{ c.isActive ? 'Active' : 'Disabled' }}
              </button>
              <button
                @click="viewCouponUsers(c.id || c.couponId || '')"
                class="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white text-[#800020] border border-[#E5E7EB] hover:bg-[#FAF0F2] cursor-pointer transition"
              >
                Target Users
              </button>
            </div>
          </div>

          <!-- User Assignment Drawer if selected -->
          <div v-if="selectedCouponId === (c.id || c.couponId)" class="pt-3 border-t border-[#E5E7EB] text-xs space-y-2">
            <p class="font-bold text-[#202124]">Assigned Users ({{ assignedUsers.length }}):</p>
            <div class="flex gap-2">
              <input
                v-model="assignUserIdInput"
                placeholder="User ID (e.g. user-987)"
                class="text-xs rounded-lg border border-[#E5E7EB] bg-white text-[#202124] px-3 py-1.5 w-64 focus:outline-none focus:ring-1 focus:ring-[#800020]"
              />
              <button
                @click="assignUserToCoupon"
                class="px-3 py-1.5 bg-[#800020] text-white rounded-lg text-xs font-semibold hover:bg-[#6B001B] transition cursor-pointer"
              >
                Assign
              </button>
            </div>
            <div v-if="assignedUsers.length" class="flex flex-wrap gap-1.5 pt-1">
              <span v-for="u in assignedUsers" :key="u" class="px-2 py-0.5 rounded bg-[#F7F7F8] border border-[#E5E7EB] text-[10px] font-mono text-[#202124]">
                {{ u }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB 3: SCRATCH PRIZE POOLS ────────────────────────────────── -->
    <div v-if="activeTab === 'prizes'" class="max-w-4xl mx-auto space-y-6">
      <div class="bg-white p-6 rounded-xl border border-[#E5E7EB] space-y-4">
        <h3 class="text-base font-bold text-[#202124]">Configure Scratch Prize Tier</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-semibold text-[#202124] mb-1">Prize Title</label>
            <input v-model="newPrize.title" class="w-full text-xs rounded-lg border border-[#E5E7EB] bg-white text-[#202124] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800020]" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#202124] mb-1">Min Reward (₹)</label>
            <input type="number" v-model="newPrize.minReward" class="w-full text-xs rounded-lg border border-[#E5E7EB] bg-white text-[#202124] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800020]" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#202124] mb-1">Max Reward (₹)</label>
            <input type="number" v-model="newPrize.maxReward" class="w-full text-xs rounded-lg border border-[#E5E7EB] bg-white text-[#202124] px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800020]" />
          </div>
        </div>
        <button
          @click="createPrize"
          class="px-4 py-2 bg-[#800020] text-white rounded-lg text-xs font-semibold hover:bg-[#6B001B] transition cursor-pointer"
        >
          Save Prize Tier
        </button>
      </div>

      <div class="bg-white p-6 rounded-xl border border-[#E5E7EB] space-y-3">
        <h3 class="text-sm font-bold text-[#202124]">Active Prize Distribution Tiers</h3>
        <div
          v-for="p in allPrizes"
          :key="p.prizeId"
          class="flex items-center justify-between p-3.5 bg-white rounded-xl border border-[#E5E7EB] text-xs"
        >
          <div>
            <p class="font-bold text-[#202124]">{{ p.title }}</p>
            <p class="text-[#6B7280]">Reward Range: ₹{{ p.minReward }} - ₹{{ p.maxReward }}</p>
          </div>
          <button
            @click="togglePrizeActive(p)"
            class="px-2.5 py-1 text-[11px] font-semibold rounded-lg border cursor-pointer"
            :class="p.isActive ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-[#F7F7F8] text-[#6B7280] border-[#E5E7EB]'"
          >
            {{ p.isActive ? 'Enabled' : 'Disabled' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── TAB 4: DISPUTE ESCALATIONS ────────────────────────────────── -->
    <div v-if="activeTab === 'reworks'" class="max-w-4xl mx-auto space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-bold text-[#202124]">All Service Rework Disputes</h3>
          <p class="text-xs text-[#6B7280]">Quick dispute review queue</p>
        </div>
        <RouterLink
          to="/admin/reworks"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#800020] rounded-lg hover:bg-[#990026] transition"
        >
          <span>Open Dedicated Rework Console</span>
          <ExternalLink class="size-3.5" />
        </RouterLink>
      </div>
      <div v-if="adminReworks.length === 0" class="py-8 text-center text-xs text-[#6B7280] bg-white rounded-xl border border-[#E5E7EB]">
        No open disputes.
      </div>
      <div
        v-for="r in adminReworks"
        :key="r.reworkId"
        class="bg-white p-5 rounded-xl border border-[#E5E7EB] space-y-3"
      >
        <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
          <span class="text-xs font-bold text-[#202124]">Case #{{ r.reworkId }} • Order #{{ r.orderId }}</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">{{ r.status }}</span>
        </div>
        <p class="text-xs text-[#6B7280]">Claim: {{ r.description || r.reason }}</p>
        <div class="flex gap-2 justify-end pt-2">
          <button
            @click="approveRework(r.reworkId)"
            class="px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition cursor-pointer"
          >
            Approve Free Fix
          </button>
          <button
            @click="cancelRework(r.reworkId)"
            class="px-3 py-1 border border-[#E5E7EB] bg-white text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-50 transition cursor-pointer"
          >
            Dismiss Claim
          </button>
        </div>
      </div>
    </div>

    <!-- ── TAB 5: GROUND MANAGERS ────────────────────────────────────── -->
    <div v-if="activeTab === 'ground-managers'" class="max-w-4xl mx-auto space-y-6">
      <div class="bg-white p-6 rounded-xl border border-[#E5E7EB] space-y-3">
        <h3 class="text-base font-bold text-[#202124]">City Ground Managers</h3>
        <p class="text-xs text-[#6B7280]">
          Create a ground manager account (email + password) for a city, or promote an existing customer.
          The new manager gets an email naming their city.
        </p>
        <RouterLink
          to="/admin/ground-managers"
          class="inline-block px-4 py-2 bg-[#800020] text-white rounded-lg text-xs font-semibold hover:bg-[#6B001B] transition cursor-pointer"
        >
          Manage Ground Managers
        </RouterLink>
      </div>
    </div>

    <!-- ── TAB 6: SETTINGS ───────────────────────────────────────────── -->
    <div v-if="activeTab === 'settings'" class="max-w-4xl mx-auto space-y-6">
      <div class="bg-white p-6 rounded-xl border border-[#E5E7EB] space-y-4">
        <h3 class="text-base font-bold text-[#202124]">Platform Dynamic Configurations</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-[#202124] mb-1">Configuration Key</label>
            <input v-model="settingKey" class="w-full text-xs rounded-lg border border-[#E5E7EB] bg-white text-[#202124] font-mono px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800020]" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#202124] mb-1">Configuration Value</label>
            <input v-model="settingValue" class="w-full text-xs rounded-lg border border-[#E5E7EB] bg-white text-[#202124] font-mono px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#800020]" />
          </div>
        </div>
        <button
          @click="saveSetting"
          class="px-4 py-2 bg-[#800020] text-white rounded-lg text-xs font-semibold hover:bg-[#6B001B] transition cursor-pointer"
        >
          Update Setting
        </button>
      </div>
    </div>
  </div>
</template>
