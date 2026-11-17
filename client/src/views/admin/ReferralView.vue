<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api'
import type {
  AdminReferralStats,
  AdminReferralDetail,
  ReferralCodeSummary,
  ReferralTransaction,
  ReferralFraudAlert,
  CampaignConfig,
  City,
} from '@/types/api'
import Table, { type Header } from '@/components/common/Table.vue'
import Popup from '@/components/common/Popup.vue'
import Toggle from '@/components/common/Toggle.vue'
import { showToast } from '@/utils/toast'
import {
  Gift,
  Users,
  UserCheck,
  Clock,
  DollarSign,
  Percent,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Calendar,
  Download,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Eye,
  Smartphone,
  MapPin,
  Sliders,
  Sparkles,
  ArrowUpRight,
  RotateCcw,
  Tag,
  FileSpreadsheet,
} from 'lucide-vue-next'

// ── Active Navigation Tab ─────────────────────────────────────────────
type ActiveTab = 'overview' | 'referrals' | 'campaign' | 'codes' | 'transactions' | 'fraud' | 'reports'
const activeTab = ref<ActiveTab>('overview')

// ── Date Range Filter State ───────────────────────────────────────────
type DatePeriod = 'today' | '7d' | '30d' | 'this_month' | 'custom' | 'all'
const selectedPeriod = ref<DatePeriod>('30d')
const customStartDate = ref('')
const customEndDate = ref('')

// ── Data States ───────────────────────────────────────────────────────
const stats = ref<AdminReferralStats>({
  totalReferrals: 0,
  totalRegisteredUsers: 0,
  successfulReferrals: 0,
  pendingReferrals: 0,
  totalRewardsDistributed: 0,
  pendingRewards: 0,
  totalReferralDiscountsUsed: 0,
})

const referrals = ref<AdminReferralDetail[]>([])
const referralCodes = ref<ReferralCodeSummary[]>([])
const transactions = ref<ReferralTransaction[]>([])
const fraudAlerts = ref<ReferralFraudAlert[]>([])
const campaign = ref<CampaignConfig>({
  referrerRewardType: 'WALLET_BONUS',
  referrerRewardAmount: 50,
  maxRewardsPerUser: 10,
  referrerEligibility: 'ON_FIRST_ORDER',
  refereeDiscountType: 'PERCENTAGE',
  refereeDiscountValue: 15,
  refereeMinBookingAmount: 299,
  refereeMaxDiscount: 100,
  couponValidityDays: 30,
  firstBookingOnly: true,
  completionRequired: true,
  paymentRequired: true,
  cancellationHandled: true,
  campaignActive: true,
})
const cities = ref<City[]>([])

// ── Loading & Submitting States ───────────────────────────────────────
const isLoadingStats = ref(false)
const isLoadingReferrals = ref(false)
const isLoadingCodes = ref(false)
const isLoadingTransactions = ref(false)
const isLoadingFraud = ref(false)
const isSavingCampaign = ref(false)
const isUpdatingStatus = ref(false)

// ── Search & Filter Controls ──────────────────────────────────────────
const referralSearch = ref('')
const referralStatusFilter = ref('ALL')
const referralCityFilter = ref('ALL')

const codeSearch = ref('')
const codeStatusFilter = ref('ALL')

const fraudSeverityFilter = ref('ALL')

// ── Detail Modal / Slide-out State ────────────────────────────────────
const isDetailModalOpen = ref(false)
const selectedReferral = ref<AdminReferralDetail | null>(null)

// ── Status Action Modal State ─────────────────────────────────────────
const isActionModalOpen = ref(false)
const actionTargetReferral = ref<AdminReferralDetail | null>(null)
const actionType = ref<'APPROVE' | 'CREDIT' | 'REJECT' | 'REVERSE'>('APPROVE')
const actionReason = ref('')

// ── Fraud Action Modal State ──────────────────────────────────────────
const isFraudModalOpen = ref(false)
const selectedFraudAlert = ref<ReferralFraudAlert | null>(null)
const fraudActionType = ref<'REVIEWED' | 'REJECT' | 'DISMISS'>('REVIEWED')
const fraudActionReason = ref('')

// ── Clipboard Feedback ────────────────────────────────────────────────
const copiedText = ref('')
function copyText(text: string) {
  navigator.clipboard.writeText(text)
  copiedText.value = text
  setTimeout(() => {
    copiedText.value = ''
  }, 2000)
}

// ── Headers for Data Tables ───────────────────────────────────────────
const referralHeaders: Header[] = [
  { key: 'uniqueId', title: 'Referral ID', align: 'left', sortable: true },
  { key: 'referrer', title: 'Referrer', align: 'left', sortable: true },
  { key: 'referee', title: 'Referred Customer', align: 'left', sortable: true },
  { key: 'referralCode', title: 'Code Used', align: 'center', sortable: true },
  { key: 'booking', title: '1st Booking', align: 'center' },
  { key: 'rewardAmount', title: 'Reward (₹)', align: 'right', sortable: true },
  { key: 'rewardStatus', title: 'Status', align: 'center', sortable: true },
  { key: 'registrationDate', title: 'Created', align: 'center', sortable: true },
  { key: 'actions', title: 'Action', align: 'center' },
]

const codeHeaders: Header[] = [
  { key: 'referralCode', title: 'Referral Code', align: 'left', sortable: true },
  { key: 'userName', title: 'Owner Name', align: 'left', sortable: true },
  { key: 'mobileNumber', title: 'Owner Mobile', align: 'left' },
  { key: 'totalUses', title: 'Total Uses', align: 'center', sortable: true },
  { key: 'successfulReferrals', title: 'Successful', align: 'center', sortable: true },
  { key: 'conversionRate', title: 'Conv. Rate', align: 'center' },
  { key: 'active', title: 'Status', align: 'center', sortable: true },
  { key: 'actions', title: 'Actions', align: 'center' },
]

const transactionHeaders: Header[] = [
  { key: 'transactionId', title: 'Tx ID', align: 'left' },
  { key: 'userName', title: 'Credited Account', align: 'left', sortable: true },
  { key: 'rewardType', title: 'Reward Type', align: 'center' },
  { key: 'rewardAmount', title: 'Amount', align: 'right', sortable: true },
  { key: 'transactionDate', title: 'Timestamp', align: 'center', sortable: true },
  { key: 'transactionStatus', title: 'Status', align: 'center', sortable: true },
  { key: 'referralId', title: 'Referral Reference', align: 'center' },
]

// ── Computed Filtered Listings ────────────────────────────────────────
const filteredReferrals = computed(() => {
  return referrals.value.filter((r) => {
    if (referralStatusFilter.value !== 'ALL' && r.rewardStatus !== referralStatusFilter.value) {
      return false
    }
    if (referralCityFilter.value !== 'ALL' && r.city !== referralCityFilter.value) {
      return false
    }
    if (referralSearch.value.trim()) {
      const q = referralSearch.value.trim().toLowerCase()
      const matchCode = r.referralCode?.toLowerCase().includes(q)
      const matchReferrer = r.referrerName?.toLowerCase().includes(q) || r.referrerMobile?.includes(q)
      const matchReferee = r.refereeName?.toLowerCase().includes(q) || r.refereeMobile?.includes(q)
      const matchId = r.uniqueId?.toLowerCase().includes(q)
      if (!matchCode && !matchReferrer && !matchReferee && !matchId) return false
    }
    return true
  })
})

const filteredCodes = computed(() => {
  return referralCodes.value.filter((c) => {
    if (codeStatusFilter.value === 'ACTIVE' && !c.active) return false
    if (codeStatusFilter.value === 'INACTIVE' && c.active) return false
    if (codeSearch.value.trim()) {
      const q = codeSearch.value.trim().toLowerCase()
      const matchCode = c.referralCode?.toLowerCase().includes(q)
      const matchName = c.userName?.toLowerCase().includes(q)
      const matchPhone = c.mobileNumber?.includes(q)
      if (!matchCode && !matchName && !matchPhone) return false
    }
    return true
  })
})

const filteredFraudAlerts = computed(() => {
  return fraudAlerts.value.filter((a) => {
    if (fraudSeverityFilter.value !== 'ALL' && a.severity !== fraudSeverityFilter.value) {
      return false
    }
    return true
  })
})

// ── Date Computations ─────────────────────────────────────────────────
function getDateBounds(): { start?: string; end?: string } {
  const now = new Date()
  if (selectedPeriod.value === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    return { start, end: now.toISOString() }
  } else if (selectedPeriod.value === '7d') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    return { start, end: now.toISOString() }
  } else if (selectedPeriod.value === '30d') {
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    return { start, end: now.toISOString() }
  } else if (selectedPeriod.value === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    return { start, end: now.toISOString() }
  } else if (selectedPeriod.value === 'custom') {
    return {
      start: customStartDate.value ? new Date(customStartDate.value).toISOString() : undefined,
      end: customEndDate.value ? new Date(customEndDate.value).toISOString() : undefined,
    }
  }
  return {}
}

// ── Data Fetching Methods ─────────────────────────────────────────────
async function fetchStats() {
  isLoadingStats.value = true
  try {
    const { start, end } = getDateBounds()
    const res = await api.adminReferral.getStats({
      period: selectedPeriod.value,
      startDate: start,
      endDate: end,
    })
    const payload = (res as any)?.data ?? res
    if (payload) {
      stats.value = {
        totalReferrals: Number(payload.totalReferrals || 0),
        totalRegisteredUsers: Number(payload.totalRegisteredUsers || 0),
        successfulReferrals: Number(payload.successfulReferrals || 0),
        pendingReferrals: Number(payload.pendingReferrals || 0),
        totalRewardsDistributed: Number(payload.totalRewardsDistributed || 0),
        pendingRewards: Number(payload.pendingRewards || 0),
        totalReferralDiscountsUsed: Number(payload.totalReferralDiscountsUsed || 0),
      }
    }
  } catch (err: any) {
    showToast(err?.message || 'Failed to fetch referral statistics', 'error')
  } finally {
    isLoadingStats.value = false
  }
}

async function fetchReferrals() {
  isLoadingReferrals.value = true
  try {
    const { start, end } = getDateBounds()
    const res = await api.adminReferral.getAll({
      startDate: start,
      endDate: end,
    })
    const payload = (res as any)?.data ?? res
    referrals.value = Array.isArray(payload) ? payload : []
  } catch (err: any) {
    showToast(err?.message || 'Failed to fetch referrals listing', 'error')
  } finally {
    isLoadingReferrals.value = false
  }
}

async function fetchCodes() {
  isLoadingCodes.value = true
  try {
    const res = await api.adminReferral.getCodes()
    const payload = (res as any)?.data ?? res
    referralCodes.value = Array.isArray(payload) ? payload : []
  } catch (err: any) {
    showToast(err?.message || 'Failed to fetch referral codes', 'error')
  } finally {
    isLoadingCodes.value = false
  }
}

async function fetchTransactions() {
  isLoadingTransactions.value = true
  try {
    const res = await api.adminReferral.getTransactions()
    const payload = (res as any)?.data ?? res
    transactions.value = Array.isArray(payload) ? payload : []
  } catch (err: any) {
    showToast(err?.message || 'Failed to fetch reward transactions', 'error')
  } finally {
    isLoadingTransactions.value = false
  }
}

async function fetchFraudAlerts() {
  isLoadingFraud.value = true
  try {
    const res = await api.adminReferral.getFraudAlerts()
    const payload = (res as any)?.data ?? res
    fraudAlerts.value = Array.isArray(payload) ? payload : []
  } catch (err: any) {
    showToast(err?.message || 'Failed to fetch fraud alerts', 'error')
  } finally {
    isLoadingFraud.value = false
  }
}

async function fetchCampaign() {
  try {
    const res = await api.adminReferral.getCampaign()
    const payload = (res as any)?.data ?? res
    if (payload) {
      campaign.value = {
        ...campaign.value,
        ...payload,
        referrerRewardAmount: Number(payload.referrerRewardAmount || 50),
        refereeDiscountValue: Number(payload.refereeDiscountValue || 15),
        refereeMinBookingAmount: Number(payload.refereeMinBookingAmount || 299),
        refereeMaxDiscount: Number(payload.refereeMaxDiscount || 100),
      }
    }
  } catch (err: any) {
    showToast(err?.message || 'Failed to fetch campaign configuration', 'error')
  }
}

async function fetchCities() {
  try {
    const res = await api.cities.getActive()
    cities.value = Array.isArray(res) ? res : []
  } catch {
    // Non-blocking fallback
  }
}

function refreshAllData() {
  fetchStats()
  fetchReferrals()
  fetchCodes()
  fetchTransactions()
  fetchFraudAlerts()
  fetchCampaign()
}

// ── Campaign Save ─────────────────────────────────────────────────────
async function handleSaveCampaign() {
  isSavingCampaign.value = true
  try {
    const res = await api.adminReferral.updateCampaign(campaign.value)
    showToast('Referral campaign configuration saved and deployed successfully', 'success')
    fetchCampaign()
    fetchStats()
  } catch (err: any) {
    showToast(err?.message || 'Failed to update campaign configuration', 'error')
  } finally {
    isSavingCampaign.value = false
  }
}

// ── Referral Detail & Actions ─────────────────────────────────────────
function openDetail(item: AdminReferralDetail) {
  selectedReferral.value = item
  isDetailModalOpen.value = true
}

function openActionModal(item: AdminReferralDetail, type: 'APPROVE' | 'CREDIT' | 'REJECT' | 'REVERSE') {
  actionTargetReferral.value = item
  actionType.value = type
  actionReason.value = ''
  isActionModalOpen.value = true
}

async function submitReferralAction() {
  if (!actionTargetReferral.value) return
  if ((actionType.value === 'REJECT' || actionType.value === 'REVERSE') && !actionReason.value.trim()) {
    showToast('A specific reason is required for rejection or reversal.', 'warning')
    return
  }

  isUpdatingStatus.value = true
  try {
    let targetStatus = 'APPROVED'
    if (actionType.value === 'CREDIT') targetStatus = 'CREDITED'
    else if (actionType.value === 'REJECT') targetStatus = 'REJECTED'
    else if (actionType.value === 'REVERSE') targetStatus = 'REVERSED'

    await api.adminReferral.updateStatus(actionTargetReferral.value.uniqueId, {
      status: targetStatus,
      reason: actionReason.value.trim() || undefined,
    })

    showToast(`Referral #${actionTargetReferral.value.uniqueId.slice(0, 8)} status updated to ${targetStatus}`, 'success')
    isActionModalOpen.value = false
    if (selectedReferral.value && selectedReferral.value.uniqueId === actionTargetReferral.value.uniqueId) {
      selectedReferral.value.rewardStatus = targetStatus as any
    }
    fetchReferrals()
    fetchStats()
    fetchTransactions()
  } catch (err: any) {
    showToast(err?.message || 'Failed to update referral status', 'error')
  } finally {
    isUpdatingStatus.value = false
  }
}

// ── Referral Code Activation ──────────────────────────────────────────
async function toggleCodeStatus(code: ReferralCodeSummary) {
  const nextState = !code.active
  try {
    await api.adminReferral.setCodeStatus(code.referralCode, nextState)
    code.active = nextState
    showToast(`Referral code ${code.referralCode} ${nextState ? 'ACTIVATED' : 'DEACTIVATED'}`, 'success')
  } catch (err: any) {
    showToast(err?.message || 'Failed to update referral code status', 'error')
  }
}

function filterByCode(code: string) {
  referralSearch.value = code
  activeTab.value = 'referrals'
}

// ── Fraud Resolution ──────────────────────────────────────────────────
function openFraudAction(alert: ReferralFraudAlert, type: 'REVIEWED' | 'REJECT' | 'DISMISS') {
  selectedFraudAlert.value = alert
  fraudActionType.value = type
  fraudActionReason.value = ''
  isFraudModalOpen.value = true
}

async function submitFraudAction() {
  if (!selectedFraudAlert.value) return
  if (fraudActionType.value === 'REJECT' && !fraudActionReason.value.trim()) {
    showToast('Mandatory rejection reason required.', 'warning')
    return
  }

  try {
    await api.adminReferral.resolveFraudAlert(
      selectedFraudAlert.value.alertId,
      fraudActionType.value,
      fraudActionReason.value.trim() || undefined
    )
    selectedFraudAlert.value.status = fraudActionType.value as any
    showToast(`Fraud alert resolved as ${fraudActionType.value}`, 'success')
    isFraudModalOpen.value = false
    fetchFraudAlerts()
  } catch (err: any) {
    showToast(err?.message || 'Failed to resolve fraud alert', 'error')
  }
}

// ── Export Utility ────────────────────────────────────────────────────
function exportDataToCsv(filename: string, rows: object[]) {
  if (!rows || rows.length === 0) {
    showToast('No data available to export', 'warning')
    return
  }
  const headers = Object.keys(rows[0]!)
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const val = (row as any)[header] ?? ''
          return `"${String(val).replace(/"/g, '""')}"`
        })
        .join(',')
    ),
  ].join('\r\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  showToast(`${filename}.csv exported successfully`, 'success')
}

function exportReferralsReport() {
  const data = referrals.value.map((r) => ({
    'Referral ID': r.uniqueId,
    'Referrer Name': r.referrerName,
    'Referrer Mobile': r.referrerMobile,
    'Referred Customer': r.refereeName,
    'Referred Customer Mobile': r.refereeMobile,
    'Referral Code': r.referralCode,
    'City': r.city,
    'Reward Amount (INR)': r.rewardAmount,
    'Status': r.rewardStatus,
    'Created At': r.registrationDate,
    'Credited At': r.creditedAt || 'N/A',
  }))
  exportDataToCsv('omibay_referrals_report', data)
}

function exportTransactionsReport() {
  const data = transactions.value.map((t) => ({
    'Transaction ID': t.transactionId,
    'Referral ID': t.referralId,
    'User Name': t.userName,
    'User ID': t.userId,
    'Reward Amount (INR)': t.rewardAmount,
    'Reward Type': t.rewardType,
    'Date': t.transactionDate,
    'Status': t.transactionStatus,
    'Description': t.description,
  }))
  exportDataToCsv('omibay_referral_rewards_ledger', data)
}

function exportCityStatistics() {
  const map: Record<string, { city: string; total: number; successful: number; rewards: number }> = {}
  for (const r of referrals.value) {
    const c = r.city || 'Metro Hub'
    if (!map[c]) map[c] = { city: c, total: 0, successful: 0, rewards: 0 }
    map[c]!.total++
    if (r.rewardStatus === 'CREDITED') {
      map[c]!.successful++
      map[c]!.rewards += Number(r.rewardAmount || 0)
    }
  }
  exportDataToCsv('omibay_city_referral_metrics', Object.values(map))
}

// ── Helpers ───────────────────────────────────────────────────────────
function formatCurrency(val?: number): string {
  if (val === undefined || val === null) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val)
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return '—'
  }
}

function statusBadgeClass(status?: string): string {
  switch (status) {
    case 'CREDITED':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200'
    case 'APPROVED':
      return 'bg-blue-50 text-blue-800 border-blue-200'
    case 'PENDING':
      return 'bg-amber-50 text-amber-800 border-amber-200'
    case 'REJECTED':
    case 'FAILED':
      return 'bg-rose-50 text-rose-800 border-rose-200'
    case 'REVERSED':
      return 'bg-purple-50 text-purple-800 border-purple-200'
    case 'FLAGGED_FRAUD':
      return 'bg-red-100 text-red-900 border-red-300 font-bold'
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200'
  }
}

onMounted(() => {
  refreshAllData()
  fetchCities()
})
</script>

<template>
  <div class="space-y-6 bg-white min-h-screen text-[#202124] pb-12">
    <!-- ── Top Header Ribbon ─────────────────────────────────────────── -->
    <div class="bg-white p-6 rounded-2xl border border-[#E5E7EB] flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-xl bg-[#FAF0F2] flex items-center justify-center text-[#800020] border border-[#800020]/20">
            <Gift class="w-5 h-5" />
          </div>
          <div>
            <h1 class="text-xl font-bold text-[#202124] tracking-tight">Referral Management System</h1>
            <p class="text-xs text-[#6B7280]">
              Monitor referrals, configure rewards, manage user invite codes, audit credits, and detect fraudulent loops.
            </p>
          </div>
        </div>
      </div>

      <!-- Action Controls -->
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Date Period Switcher -->
        <div class="flex items-center bg-[#F7F7F8] p-1 rounded-xl border border-[#E5E7EB] text-xs">
          <button
            type="button"
            @click="selectedPeriod = 'today'; fetchStats(); fetchReferrals()"
            class="px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer"
            :class="selectedPeriod === 'today' ? 'bg-[#800020] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#202124]'"
          >
            Today
          </button>
          <button
            type="button"
            @click="selectedPeriod = '7d'; fetchStats(); fetchReferrals()"
            class="px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer"
            :class="selectedPeriod === '7d' ? 'bg-[#800020] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#202124]'"
          >
            7D
          </button>
          <button
            type="button"
            @click="selectedPeriod = '30d'; fetchStats(); fetchReferrals()"
            class="px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer"
            :class="selectedPeriod === '30d' ? 'bg-[#800020] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#202124]'"
          >
            30D
          </button>
          <button
            type="button"
            @click="selectedPeriod = 'this_month'; fetchStats(); fetchReferrals()"
            class="px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer"
            :class="selectedPeriod === 'this_month' ? 'bg-[#800020] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#202124]'"
          >
            This Month
          </button>
          <button
            type="button"
            @click="selectedPeriod = 'all'; fetchStats(); fetchReferrals()"
            class="px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer"
            :class="selectedPeriod === 'all' ? 'bg-[#800020] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#202124]'"
          >
            All Time
          </button>
        </div>

        <button
          type="button"
          @click="refreshAllData"
          class="flex items-center gap-1.5 px-3 py-2 bg-white text-[#202124] border border-[#E5E7EB] hover:bg-[#F7F7F8] rounded-xl text-xs font-semibold transition cursor-pointer"
          title="Refresh All"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoadingStats }" />
          <span>Sync</span>
        </button>
      </div>
    </div>

    <!-- ── Section 1: Dashboard Analytics Ribbon (7 Cards) ────────────── -->
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <!-- Card 1: Total Referrals -->
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-1 hover:border-[#800020]/30 transition-all">
        <div class="flex items-center justify-between text-[#6B7280]">
          <span class="text-[11px] font-semibold uppercase tracking-wider">Total Referrals</span>
          <Gift class="w-4 h-4 text-[#800020]" />
        </div>
        <p class="text-xl font-bold text-[#202124]">{{ stats.totalReferrals }}</p>
        <p class="text-[10px] text-[#6B7280]">All recorded invites</p>
      </div>

      <!-- Card 2: Total Registered Users -->
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-1 hover:border-[#800020]/30 transition-all">
        <div class="flex items-center justify-between text-[#6B7280]">
          <span class="text-[11px] font-semibold uppercase tracking-wider">Registered</span>
          <Users class="w-4 h-4 text-blue-600" />
        </div>
        <p class="text-xl font-bold text-[#202124]">{{ stats.totalRegisteredUsers }}</p>
        <p class="text-[10px] text-[#6B7280]">Total user base</p>
      </div>

      <!-- Card 3: Successful Referrals -->
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-1 hover:border-emerald-500/30 transition-all">
        <div class="flex items-center justify-between text-[#6B7280]">
          <span class="text-[11px] font-semibold uppercase tracking-wider">Successful</span>
          <UserCheck class="w-4 h-4 text-emerald-600" />
        </div>
        <p class="text-xl font-bold text-emerald-600">{{ stats.successfulReferrals }}</p>
        <p class="text-[10px] text-emerald-700/80 font-medium">Orders completed</p>
      </div>

      <!-- Card 4: Pending Referrals -->
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-1 hover:border-amber-500/30 transition-all">
        <div class="flex items-center justify-between text-[#6B7280]">
          <span class="text-[11px] font-semibold uppercase tracking-wider">Pending</span>
          <Clock class="w-4 h-4 text-amber-600" />
        </div>
        <p class="text-xl font-bold text-amber-600">{{ stats.pendingReferrals }}</p>
        <p class="text-[10px] text-amber-700/80">Awaiting 1st booking</p>
      </div>

      <!-- Card 5: Total Rewards Distributed -->
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-1 hover:border-emerald-500/30 transition-all">
        <div class="flex items-center justify-between text-[#6B7280]">
          <span class="text-[11px] font-semibold uppercase tracking-wider">Distributed</span>
          <DollarSign class="w-4 h-4 text-emerald-600" />
        </div>
        <p class="text-xl font-bold text-[#202124]">{{ formatCurrency(stats.totalRewardsDistributed) }}</p>
        <p class="text-[10px] text-emerald-600 font-medium">Bonus credited</p>
      </div>

      <!-- Card 6: Pending Rewards -->
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-1 hover:border-amber-500/30 transition-all">
        <div class="flex items-center justify-between text-[#6B7280]">
          <span class="text-[11px] font-semibold uppercase tracking-wider">Pending Rewards</span>
          <Clock class="w-4 h-4 text-amber-600" />
        </div>
        <p class="text-xl font-bold text-[#202124]">{{ formatCurrency(stats.pendingRewards) }}</p>
        <p class="text-[10px] text-[#6B7280]">Pipeline liability</p>
      </div>

      <!-- Card 7: Total Discounts Used -->
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-1 hover:border-purple-500/30 transition-all">
        <div class="flex items-center justify-between text-[#6B7280]">
          <span class="text-[11px] font-semibold uppercase tracking-wider">Discounts Used</span>
          <Percent class="w-4 h-4 text-purple-600" />
        </div>
        <p class="text-xl font-bold text-purple-700">{{ formatCurrency(stats.totalReferralDiscountsUsed) }}</p>
        <p class="text-[10px] text-[#6B7280]">Order checkouts</p>
      </div>
    </div>

    <!-- ── Main Navigation Subtabs ───────────────────────────────────── -->
    <div class="border-b border-[#E5E7EB] flex items-center gap-1 overflow-x-auto pb-px bg-white">
      <button
        type="button"
        @click="activeTab = 'overview'"
        class="flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap"
        :class="activeTab === 'overview' ? 'border-[#800020] text-[#800020]' : 'border-transparent text-[#6B7280] hover:text-[#202124]'"
      >
        <TrendingUp class="w-4 h-4" />
        <span>Directory & Activity</span>
        <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-[#6B7280] font-bold">
          {{ filteredReferrals.length }}
        </span>
      </button>

      <button
        type="button"
        @click="activeTab = 'campaign'"
        class="flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap"
        :class="activeTab === 'campaign' ? 'border-[#800020] text-[#800020]' : 'border-transparent text-[#6B7280] hover:text-[#202124]'"
      >
        <Sliders class="w-4 h-4" />
        <span>Campaign Configuration</span>
        <span
          class="w-2 h-2 rounded-full"
          :class="campaign.campaignActive ? 'bg-emerald-500' : 'bg-rose-500'"
        ></span>
      </button>

      <button
        type="button"
        @click="activeTab = 'codes'"
        class="flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap"
        :class="activeTab === 'codes' ? 'border-[#800020] text-[#800020]' : 'border-transparent text-[#6B7280] hover:text-[#202124]'"
      >
        <Tag class="w-4 h-4" />
        <span>Referral Codes</span>
        <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-[#6B7280] font-bold">
          {{ referralCodes.length }}
        </span>
      </button>

      <button
        type="button"
        @click="activeTab = 'transactions'"
        class="flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap"
        :class="activeTab === 'transactions' ? 'border-[#800020] text-[#800020]' : 'border-transparent text-[#6B7280] hover:text-[#202124]'"
      >
        <DollarSign class="w-4 h-4" />
        <span>Reward Transactions</span>
        <span class="px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 text-[#6B7280] font-bold">
          {{ transactions.length }}
        </span>
      </button>

      <button
        type="button"
        @click="activeTab = 'fraud'"
        class="flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap"
        :class="activeTab === 'fraud' ? 'border-[#800020] text-[#800020]' : 'border-transparent text-[#6B7280] hover:text-[#202124]'"
      >
        <ShieldAlert class="w-4 h-4" />
        <span>Fraud Detection</span>
        <span
          v-if="fraudAlerts.length > 0"
          class="px-1.5 py-0.5 rounded-full text-[10px] bg-red-100 text-red-700 font-bold"
        >
          {{ fraudAlerts.length }}
        </span>
      </button>

      <button
        type="button"
        @click="activeTab = 'reports'"
        class="flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap"
        :class="activeTab === 'reports' ? 'border-[#800020] text-[#800020]' : 'border-transparent text-[#6B7280] hover:text-[#202124]'"
      >
        <FileSpreadsheet class="w-4 h-4" />
        <span>Reports & Export</span>
      </button>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- TAB 1: REFERRAL DIRECTORY & LISTING                                -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'overview' || activeTab === 'referrals'" class="space-y-4">
      <!-- Search & Filters Ribbon -->
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div class="flex items-center gap-3 flex-1 flex-wrap">
          <!-- Text Search -->
          <div class="relative flex-1 min-w-[240px]">
            <Search class="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="referralSearch"
              type="text"
              placeholder="Search by code, referrer, customer, mobile, ID..."
              class="w-full pl-9 pr-3 py-2 bg-white text-xs border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020] transition"
            />
          </div>

          <!-- Status Filter -->
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-[#6B7280] font-medium">Status:</span>
            <select
              v-model="referralStatusFilter"
              class="px-2.5 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-[#800020]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending (Awaiting 1st Order)</option>
              <option value="APPROVED">Approved by Admin</option>
              <option value="CREDITED">Credited (Completed)</option>
              <option value="REJECTED">Rejected</option>
              <option value="FLAGGED_FRAUD">Flagged Fraud</option>
            </select>
          </div>

          <!-- City Filter -->
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-[#6B7280] font-medium">City:</span>
            <select
              v-model="referralCityFilter"
              class="px-2.5 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-[#800020]"
            >
              <option value="ALL">All Cities</option>
              <option v-for="c in cities" :key="c.uniqueId" :value="c.name">{{ c.name }}</option>
            </select>
          </div>
        </div>

        <!-- Export CSV Button -->
        <button
          type="button"
          @click="exportReferralsReport"
          class="flex items-center gap-1.5 px-3 py-2 bg-white text-[#202124] border border-[#E5E7EB] hover:bg-[#F7F7F8] rounded-lg text-xs font-semibold transition cursor-pointer"
        >
          <Download class="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      <!-- Professional Table -->
      <div class="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <Table :headers="referralHeaders" :items="filteredReferrals" :loading="isLoadingReferrals" paginate :itemsPerPage="15">
          <template #row="{ item }">
            <tr
              @click="openDetail(item as any)"
              class="hover:bg-[#F7F7F8] transition-colors border-b border-[#E5E7EB] last:border-0 cursor-pointer text-xs"
            >
              <!-- Referral ID -->
              <td class="py-3 px-4 font-mono font-bold text-[#800020]">
                <div class="flex items-center gap-1">
                  <span>{{ (item as any).uniqueId ? (item as any).uniqueId.slice(0, 8).toUpperCase() : 'REF-—' }}</span>
                  <button
                    type="button"
                    @click.stop="copyText((item as any).uniqueId)"
                    class="text-[#6B7280] hover:text-[#202124]"
                    title="Copy UUID"
                  >
                    <Check v-if="copiedText === (item as any).uniqueId" class="w-3 h-3 text-emerald-600" />
                    <Copy v-else class="w-3 h-3" />
                  </button>
                </div>
              </td>

              <!-- Referrer -->
              <td class="py-3 px-4">
                <p class="font-bold text-[#202124]">{{ (item as any).referrerName }}</p>
                <p class="text-[11px] text-[#6B7280]">{{ (item as any).referrerMobile }}</p>
              </td>

              <!-- Referee (Referred Customer) -->
              <td class="py-3 px-4">
                <p class="font-bold text-[#202124]">{{ (item as any).refereeName }}</p>
                <p class="text-[11px] text-[#6B7280]">{{ (item as any).refereeMobile }}</p>
              </td>

              <!-- Referral Code -->
              <td class="py-3 px-4 text-center">
                <span class="px-2 py-0.5 font-mono text-[11px] font-bold bg-[#FAF0F2] text-[#800020] rounded border border-[#800020]/20">
                  {{ (item as any).referralCode }}
                </span>
              </td>

              <!-- 1st Booking Status -->
              <td class="py-3 px-4 text-center">
                <div class="inline-flex flex-col items-center">
                  <span class="font-mono text-[10px] text-[#6B7280]">{{ (item as any).firstBookingId || '—' }}</span>
                  <span
                    class="text-[9px] font-bold px-1.5 py-0.2 rounded"
                    :class="(item as any).bookingStatus === 'COMPLETED' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'"
                  >
                    {{ (item as any).bookingStatus || 'AWAITING' }}
                  </span>
                </div>
              </td>

              <!-- Reward Amount -->
              <td class="py-3 px-4 text-right font-bold text-[#202124]">
                {{ formatCurrency((item as any).rewardAmount) }}
              </td>

              <!-- Reward Status Badge -->
              <td class="py-3 px-4 text-center">
                <span
                  class="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border inline-block"
                  :class="statusBadgeClass((item as any).rewardStatus)"
                >
                  {{ (item as any).rewardStatus }}
                </span>
              </td>

              <!-- Registration Date -->
              <td class="py-3 px-4 text-center text-[#6B7280]">
                {{ formatDate((item as any).registrationDate) }}
              </td>

              <!-- Actions -->
              <td class="py-3 px-4 text-center" @click.stop>
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    @click="openDetail(item as any)"
                    class="px-2 py-1 text-xs font-semibold text-[#800020] hover:bg-[#FAF0F2] rounded transition cursor-pointer"
                  >
                    View
                  </button>
                  <button
                    v-if="(item as any).rewardStatus === 'PENDING'"
                    type="button"
                    @click="openActionModal(item as any, 'APPROVE')"
                    class="px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded transition cursor-pointer"
                  >
                    Approve
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </Table>

        <div v-if="!isLoadingReferrals && filteredReferrals.length === 0" class="py-12 text-center">
          <Gift class="w-10 h-10 text-[#6B7280] mx-auto mb-2 opacity-40" />
          <p class="text-sm font-bold text-[#202124]">No referrals match your current filters</p>
          <p class="text-xs text-[#6B7280]">Try clearing search parameters or adjusting date bounds.</p>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- TAB 2: CAMPAIGN CONFIGURATION                                      -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'campaign'" class="max-w-4xl space-y-6">
      <form @submit.prevent="handleSaveCampaign" class="space-y-6">
        <!-- Master Campaign Activation Ribbon -->
        <div class="bg-white p-5 rounded-2xl border border-[#E5E7EB] flex items-center justify-between">
          <div class="space-y-0.5">
            <h3 class="text-sm font-bold text-[#202124]">Campaign Master Switch</h3>
            <p class="text-xs text-[#6B7280]">
              Enable or pause the OmiBay referral program. When paused, new invite codes cannot be redeemed.
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span
              class="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              :class="campaign.campaignActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'"
            >
              {{ campaign.campaignActive ? 'Active & Live' : 'Program Paused' }}
            </span>
            <Toggle v-model="campaign.campaignActive" />
          </div>
        </div>

        <!-- Card A: Referrer Reward Settings -->
        <div class="bg-white p-6 rounded-2xl border border-[#E5E7EB] space-y-4">
          <div class="flex items-center gap-2 pb-3 border-b border-[#E5E7EB]">
            <Gift class="w-4 h-4 text-[#800020]" />
            <h3 class="text-sm font-bold text-[#202124] uppercase tracking-wider">
              1. Referrer Reward (Invite Owner)
            </h3>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-[#202124] mb-1">Reward Type</label>
              <select
                v-model="campaign.referrerRewardType"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-[#800020]"
              >
                <option value="WALLET_BONUS">Wallet Promotional Bonus (Non-Withdrawable)</option>
                <option value="FIXED_CASHBACK">Withdrawable Cashback Credit</option>
                <option value="PROMOTIONAL_CREDIT">Service Discount Credits</option>
              </select>
              <p class="text-[10px] text-[#6B7280] mt-1">
                Promotional credits can be spent on orders but cannot be withdrawn to bank accounts.
              </p>
            </div>

            <div>
              <label class="block text-xs font-bold text-[#202124] mb-1">Reward Amount (₹ per successful invite)</label>
              <input
                v-model.number="campaign.referrerRewardAmount"
                type="number"
                min="0"
                step="5"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-[#800020]"
              />
              <p class="text-[10px] text-[#6B7280] mt-1">Amount credited to the referrer once conditions are met.</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-[#202124] mb-1">Maximum Referral Rewards Per User</label>
              <input
                v-model.number="campaign.maxRewardsPerUser"
                type="number"
                min="1"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-[#800020]"
              />
              <p class="text-[10px] text-[#6B7280] mt-1">Protects against excessive automated affiliate pooling.</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-[#202124] mb-1">Reward Eligibility Trigger</label>
              <select
                v-model="campaign.referrerEligibility"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-[#800020]"
              >
                <option value="ON_FIRST_ORDER">On Customer's First Order Completion (Recommended)</option>
                <option value="ON_SIGNUP">Immediately on Mobile OTP Verification</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Card B: Referred Friend Reward (New Customer Discount) -->
        <div class="bg-white p-6 rounded-2xl border border-[#E5E7EB] space-y-4">
          <div class="flex items-center gap-2 pb-3 border-b border-[#E5E7EB]">
            <Percent class="w-4 h-4 text-purple-600" />
            <h3 class="text-sm font-bold text-[#202124] uppercase tracking-wider">
              2. Referred Friend Reward (Welcome Incentive)
            </h3>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-[#202124] mb-1">Discount Type</label>
              <select
                v-model="campaign.refereeDiscountType"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-[#800020]"
              >
                <option value="PERCENTAGE">Percentage Discount (%)</option>
                <option value="FIXED">Flat Cash Off (₹)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-[#202124] mb-1">
                Discount Value ({{ campaign.refereeDiscountType === 'PERCENTAGE' ? '%' : '₹' }})
              </label>
              <input
                v-model.number="campaign.refereeDiscountValue"
                type="number"
                min="1"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-[#800020]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-[#202124] mb-1">Minimum Booking Amount (₹)</label>
              <input
                v-model.number="campaign.refereeMinBookingAmount"
                type="number"
                min="0"
                step="10"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-[#800020]"
              />
              <p class="text-[10px] text-[#6B7280] mt-1">Minimum cart subtotal to apply the referral discount.</p>
            </div>

            <div>
              <label class="block text-xs font-bold text-[#202124] mb-1">Maximum Discount Cap (₹)</label>
              <input
                v-model.number="campaign.refereeMaxDiscount"
                type="number"
                min="0"
                step="10"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-[#800020]"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-[#202124] mb-1">Coupon Validity (Days from Signup)</label>
              <input
                v-model.number="campaign.couponValidityDays"
                type="number"
                min="1"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-[#800020]"
              />
            </div>
          </div>
        </div>

        <!-- Card C: Eligibility & Anti-Fraud Rules -->
        <div class="bg-white p-6 rounded-2xl border border-[#E5E7EB] space-y-4">
          <div class="flex items-center gap-2 pb-3 border-b border-[#E5E7EB]">
            <ShieldCheck class="w-4 h-4 text-emerald-600" />
            <h3 class="text-sm font-bold text-[#202124] uppercase tracking-wider">
              3. Verification & Compliance Criteria
            </h3>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between p-3 rounded-xl bg-[#F7F7F8] border border-[#E5E7EB]">
              <div>
                <p class="text-xs font-bold text-[#202124]">First Eligible Booking Only</p>
                <p class="text-[11px] text-[#6B7280]">Strictly 1 referral reward per referred customer phone/account.</p>
              </div>
              <Toggle v-model="campaign.firstBookingOnly" />
            </div>

            <div class="flex items-center justify-between p-3 rounded-xl bg-[#F7F7F8] border border-[#E5E7EB]">
              <div>
                <p class="text-xs font-bold text-[#202124]">Booking Completion Requirement</p>
                <p class="text-[11px] text-[#6B7280]">
                  Reward is issued only when the partner completes the service order (arrival and completion OTP verified).
                </p>
              </div>
              <Toggle v-model="campaign.completionRequired" />
            </div>

            <div class="flex items-center justify-between p-3 rounded-xl bg-[#F7F7F8] border border-[#E5E7EB]">
              <div>
                <p class="text-xs font-bold text-[#202124]">Successful Payment Requirement</p>
                <p class="text-[11px] text-[#6B7280]">Order must be settled in full with zero balance due.</p>
              </div>
              <Toggle v-model="campaign.paymentRequired" />
            </div>

            <div class="flex items-center justify-between p-3 rounded-xl bg-[#F7F7F8] border border-[#E5E7EB]">
              <div>
                <p class="text-xs font-bold text-[#202124]">Automatic Cancellation Invalidation</p>
                <p class="text-[11px] text-[#6B7280]">
                  If an order is cancelled or refunded, any pending referral credit is cancelled automatically.
                </p>
              </div>
              <Toggle v-model="campaign.cancellationHandled" />
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="isSavingCampaign"
            class="px-6 py-2.5 bg-[#800020] text-white text-xs font-bold rounded-xl hover:bg-[#6B001B] transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Check class="w-4 h-4" />
            <span>{{ isSavingCampaign ? 'Deploying Changes...' : 'Save & Deploy Configuration' }}</span>
          </button>
        </div>
      </form>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- TAB 3: REFERRAL CODE MANAGEMENT                                    -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'codes'" class="space-y-4">
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div class="flex items-center gap-3 flex-1">
          <div class="relative flex-1 max-w-md">
            <Search class="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="codeSearch"
              type="text"
              placeholder="Search by code, user name, mobile number..."
              class="w-full pl-9 pr-3 py-2 bg-white text-xs border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            />
          </div>

          <select
            v-model="codeStatusFilter"
            class="px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-[#800020]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Codes</option>
            <option value="INACTIVE">Deactivated Codes</option>
          </select>
        </div>

        <button
          type="button"
          @click="fetchCodes"
          class="flex items-center gap-1.5 px-3 py-2 bg-white text-[#202124] border border-[#E5E7EB] hover:bg-[#F7F7F8] rounded-lg text-xs font-semibold cursor-pointer"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoadingCodes }" />
          <span>Refresh</span>
        </button>
      </div>

      <div class="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <Table :headers="codeHeaders" :items="filteredCodes" :loading="isLoadingCodes" paginate :itemsPerPage="15">
          <template #row="{ item }">
            <tr class="hover:bg-[#F7F7F8] transition-colors border-b border-[#E5E7EB] last:border-0 text-xs">
              <!-- Referral Code -->
              <td class="py-3 px-4 font-mono font-bold text-[#800020]">
                <div class="flex items-center gap-1">
                  <span>{{ (item as any).referralCode }}</span>
                  <button
                    type="button"
                    @click="copyText((item as any).referralCode)"
                    class="text-[#6B7280] hover:text-[#202124]"
                    title="Copy Code"
                  >
                    <Check v-if="copiedText === (item as any).referralCode" class="w-3 h-3 text-emerald-600" />
                    <Copy v-else class="w-3 h-3" />
                  </button>
                </div>
              </td>

              <!-- Owner Name -->
              <td class="py-3 px-4 font-bold text-[#202124]">
                {{ (item as any).userName }}
              </td>

              <!-- Mobile -->
              <td class="py-3 px-4 text-[#6B7280]">
                {{ (item as any).mobileNumber || '—' }}
              </td>

              <!-- Total Uses -->
              <td class="py-3 px-4 text-center font-bold text-[#202124]">
                {{ (item as any).totalUses }}
              </td>

              <!-- Successful -->
              <td class="py-3 px-4 text-center font-bold text-emerald-600">
                {{ (item as any).successfulReferrals }}
              </td>

              <!-- Conversion Rate -->
              <td class="py-3 px-4 text-center text-[#6B7280]">
                <span v-if="(item as any).totalUses > 0" class="font-bold text-[#202124]">
                  {{ Math.round(((item as any).successfulReferrals / (item as any).totalUses) * 100) }}%
                </span>
                <span v-else>0%</span>
              </td>

              <!-- Active Status Toggle -->
              <td class="py-3 px-4 text-center">
                <span
                  class="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border inline-block"
                  :class="(item as any).active ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'"
                >
                  {{ (item as any).active ? 'Active' : 'Deactivated' }}
                </span>
              </td>

              <!-- Actions -->
              <td class="py-3 px-4 text-center">
                <div class="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    @click="filterByCode((item as any).referralCode)"
                    class="px-2 py-1 text-xs font-medium text-[#800020] hover:bg-[#FAF0F2] rounded cursor-pointer"
                    title="View Referrals"
                  >
                    View Invites
                  </button>
                  <button
                    type="button"
                    @click="toggleCodeStatus(item as any)"
                    class="px-2 py-1 text-xs font-medium rounded cursor-pointer"
                    :class="(item as any).active ? 'text-rose-700 hover:bg-rose-50' : 'text-emerald-700 hover:bg-emerald-50'"
                  >
                    {{ (item as any).active ? 'Deactivate' : 'Activate' }}
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </Table>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- TAB 4: REWARD TRANSACTIONS LEDGER                                  -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'transactions'" class="space-y-4">
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] flex items-center justify-between">
        <div>
          <h3 class="text-sm font-bold text-[#202124]">Wallet Reward Credit Ledger</h3>
          <p class="text-xs text-[#6B7280]">
            Complete transaction history of all promotional bonus credits and cashbacks paid out to referrers.
          </p>
        </div>
        <button
          type="button"
          @click="exportTransactionsReport"
          class="flex items-center gap-1.5 px-3 py-2 bg-white text-[#202124] border border-[#E5E7EB] hover:bg-[#F7F7F8] rounded-lg text-xs font-semibold cursor-pointer"
        >
          <Download class="w-3.5 h-3.5" />
          <span>Export Ledger</span>
        </button>
      </div>

      <div class="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <Table :headers="transactionHeaders" :items="transactions" :loading="isLoadingTransactions" paginate :itemsPerPage="15">
          <template #row="{ item }">
            <tr class="hover:bg-[#F7F7F8] transition-colors border-b border-[#E5E7EB] last:border-0 text-xs">
              <td class="py-3 px-4 font-mono font-bold text-[#800020]">
                {{ (item as any).transactionId }}
              </td>
              <td class="py-3 px-4 font-bold text-[#202124]">
                {{ (item as any).userName }}
              </td>
              <td class="py-3 px-4 text-center">
                <span class="px-2 py-0.5 text-[10px] bg-purple-50 text-purple-800 rounded font-bold">
                  {{ (item as any).rewardType }}
                </span>
              </td>
              <td class="py-3 px-4 text-right font-bold text-emerald-600">
                +{{ formatCurrency((item as any).rewardAmount) }}
              </td>
              <td class="py-3 px-4 text-center text-[#6B7280]">
                {{ formatDateTime((item as any).transactionDate) }}
              </td>
              <td class="py-3 px-4 text-center">
                <span
                  class="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border inline-block"
                  :class="statusBadgeClass((item as any).transactionStatus)"
                >
                  {{ (item as any).transactionStatus }}
                </span>
              </td>
              <td class="py-3 px-4 text-center font-mono text-[10px] text-[#6B7280]">
                {{ (item as any).referralId ? (item as any).referralId.slice(0, 8).toUpperCase() : '—' }}
              </td>
            </tr>
          </template>
        </Table>

        <div v-if="!isLoadingTransactions && transactions.length === 0" class="py-12 text-center">
          <DollarSign class="w-10 h-10 text-[#6B7280] mx-auto mb-2 opacity-40" />
          <p class="text-sm font-bold text-[#202124]">No reward transactions recorded yet</p>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- TAB 5: FRAUD DETECTION & MONITORING                                -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'fraud'" class="space-y-4">
      <div class="bg-white p-5 rounded-2xl border border-[#E5E7EB] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <ShieldAlert class="w-5 h-5 text-red-600" />
            <h3 class="text-sm font-bold text-[#202124]">Referral Loop & Anti-Abuse Monitor</h3>
          </div>
          <p class="text-xs text-[#6B7280] mt-1">
            Suspicious device matching, self-referrals, and abnormal frequency spikes flagged for manual administrative inspection.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <select
            v-model="fraudSeverityFilter"
            class="px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-[#800020]"
          >
            <option value="ALL">All Severities</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>
          <button
            type="button"
            @click="fetchFraudAlerts"
            class="flex items-center gap-1.5 px-3 py-2 bg-white text-[#202124] border border-[#E5E7EB] hover:bg-[#F7F7F8] rounded-lg text-xs font-semibold cursor-pointer"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoadingFraud }" />
            <span>Scan</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3">
        <div
          v-for="alert in filteredFraudAlerts"
          :key="alert.alertId"
          class="bg-white p-5 rounded-xl border border-[#E5E7EB] hover:border-red-300 transition-all space-y-3"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-2.5">
              <span
                class="px-2 py-0.5 text-[10px] font-bold uppercase rounded border"
                :class="alert.severity === 'HIGH' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-amber-50 text-amber-800 border-amber-200'"
              >
                {{ alert.severity }} RISK
              </span>
              <span class="font-mono text-xs font-bold text-[#800020]">{{ alert.fraudType }}</span>
              <span class="text-xs text-[#6B7280]">• Flagged on {{ formatDate(alert.createdAt) }}</span>
            </div>

            <!-- Resolution Status Badge -->
            <span
              class="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border"
              :class="alert.status === 'REVIEWED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : alert.status === 'REJECTED' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-amber-50 text-amber-800 border-amber-200'"
            >
              {{ alert.status }}
            </span>
          </div>

          <p class="text-xs text-[#202124] leading-relaxed font-medium">
            {{ alert.details }}
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg bg-[#F7F7F8] text-xs">
            <div>
              <span class="text-[#6B7280] block text-[11px]">Referrer Account:</span>
              <span class="font-bold text-[#202124]">{{ alert.referrerName }} ({{ alert.referrerMobile }})</span>
            </div>
            <div>
              <span class="text-[#6B7280] block text-[11px]">Referred Customer:</span>
              <span class="font-bold text-[#202124]">{{ alert.refereeName }} ({{ alert.refereeMobile }})</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
            <button
              v-if="alert.status === 'PENDING_REVIEW'"
              type="button"
              @click="openFraudAction(alert, 'REVIEWED')"
              class="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition cursor-pointer"
            >
              Mark as Reviewed
            </button>
            <button
              v-if="alert.status === 'PENDING_REVIEW'"
              type="button"
              @click="openFraudAction(alert, 'REJECT')"
              class="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition cursor-pointer"
            >
              Reject Referral
            </button>
            <button
              type="button"
              @click="filterByCode(alert.referrerMobile)"
              class="px-3 py-1.5 text-xs font-medium text-[#202124] border border-[#E5E7EB] hover:bg-[#F7F7F8] rounded-lg transition cursor-pointer"
            >
              View Related Accounts
            </button>
          </div>
        </div>

        <div v-if="!isLoadingFraud && filteredFraudAlerts.length === 0" class="py-12 text-center bg-white rounded-xl border border-[#E5E7EB]">
          <ShieldCheck class="w-10 h-10 text-emerald-600 mx-auto mb-2 opacity-80" />
          <p class="text-sm font-bold text-[#202124]">Clean Referral Ecosystem</p>
          <p class="text-xs text-[#6B7280]">Zero active fraud alerts detected across the platform.</p>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- TAB 6: REPORTS & EXPORT                                            -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'reports'" class="max-w-4xl space-y-4">
      <div class="bg-white p-5 rounded-2xl border border-[#E5E7EB]">
        <h3 class="text-sm font-bold text-[#202124]">Data Extraction & Business Intelligence</h3>
        <p class="text-xs text-[#6B7280]">
          Export complete analytical spreadsheets in CSV/Excel compatible formats for external audits and stakeholder reports.
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Export 1 -->
        <div class="bg-white p-5 rounded-xl border border-[#E5E7EB] space-y-3 flex flex-col justify-between">
          <div class="space-y-1">
            <div class="w-9 h-9 rounded-lg bg-[#FAF0F2] flex items-center justify-center text-[#800020] mb-2">
              <Gift class="w-5 h-5" />
            </div>
            <h4 class="text-xs font-bold text-[#202124]">All Referrals Master Report</h4>
            <p class="text-[11px] text-[#6B7280]">
              Full audit dataset of all invite links, user names, phone numbers, first bookings and lifecycle statuses.
            </p>
          </div>
          <button
            type="button"
            @click="exportReferralsReport"
            class="w-full py-2 bg-white text-[#800020] border border-[#800020] hover:bg-[#FAF0F2] text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Download class="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>

        <!-- Export 2 -->
        <div class="bg-white p-5 rounded-xl border border-[#E5E7EB] space-y-3 flex flex-col justify-between">
          <div class="space-y-1">
            <div class="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 mb-2">
              <DollarSign class="w-5 h-5" />
            </div>
            <h4 class="text-xs font-bold text-[#202124]">Reward Transactions Ledger</h4>
            <p class="text-[11px] text-[#6B7280]">
              Financial breakdown of every bonus credited to user wallets, timestamps, and reversal logs.
            </p>
          </div>
          <button
            type="button"
            @click="exportTransactionsReport"
            class="w-full py-2 bg-white text-emerald-700 border border-emerald-600 hover:bg-emerald-50 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Download class="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>

        <!-- Export 3 -->
        <div class="bg-white p-5 rounded-xl border border-[#E5E7EB] space-y-3 flex flex-col justify-between">
          <div class="space-y-1">
            <div class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 mb-2">
              <MapPin class="w-5 h-5" />
            </div>
            <h4 class="text-xs font-bold text-[#202124]">City-wise Statistics</h4>
            <p class="text-[11px] text-[#6B7280]">
              Geographic breakdown comparing conversion velocity and reward distribution per operational city.
            </p>
          </div>
          <button
            type="button"
            @click="exportCityStatistics"
            class="w-full py-2 bg-white text-blue-700 border border-blue-600 hover:bg-blue-50 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Download class="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- MODAL: REFERRAL 360-DEGREE DETAIL                                  -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <Popup v-model="isDetailModalOpen" title="Referral Record 360° Audit" size="lg">
      <div v-if="selectedReferral" class="space-y-5 text-xs text-[#202124]">
        <!-- Top Info Header -->
        <div class="flex items-center justify-between p-4 rounded-xl bg-[#F7F7F8] border border-[#E5E7EB]">
          <div>
            <span class="text-[10px] text-[#6B7280] uppercase tracking-wider block font-bold">Referral ID</span>
            <span class="font-mono font-bold text-sm text-[#800020]">{{ selectedReferral.uniqueId }}</span>
          </div>
          <div class="text-right">
            <span class="text-[10px] text-[#6B7280] uppercase tracking-wider block font-bold">Current Status</span>
            <span
              class="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-full border inline-block"
              :class="statusBadgeClass(selectedReferral.rewardStatus)"
            >
              {{ selectedReferral.rewardStatus }}
            </span>
          </div>
        </div>

        <!-- Referrer & Referee Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Referrer -->
          <div class="p-4 rounded-xl border border-[#E5E7EB] space-y-2">
            <div class="flex items-center gap-1.5 text-[#800020] font-bold text-xs uppercase">
              <Gift class="w-4 h-4" />
              <span>Referrer (Invite Owner)</span>
            </div>
            <p class="font-bold text-sm text-[#202124]">{{ selectedReferral.referrerName }}</p>
            <div class="space-y-1 text-[#6B7280] text-xs">
              <p>Mobile: <span class="text-[#202124] font-medium">{{ selectedReferral.referrerMobile }}</span></p>
              <p>User ID: <span class="font-mono text-[#202124] text-[11px]">{{ selectedReferral.referrerUserId }}</span></p>
              <p>Referral Code: <span class="font-mono font-bold text-[#800020]">{{ selectedReferral.referralCode }}</span></p>
            </div>
          </div>

          <!-- Referee -->
          <div class="p-4 rounded-xl border border-[#E5E7EB] space-y-2">
            <div class="flex items-center gap-1.5 text-blue-600 font-bold text-xs uppercase">
              <Users class="w-4 h-4" />
              <span>Referred Customer</span>
            </div>
            <p class="font-bold text-sm text-[#202124]">{{ selectedReferral.refereeName }}</p>
            <div class="space-y-1 text-[#6B7280] text-xs">
              <p>Mobile: <span class="text-[#202124] font-medium">{{ selectedReferral.refereeMobile }}</span></p>
              <p>User ID: <span class="font-mono text-[#202124] text-[11px]">{{ selectedReferral.refereeUserId }}</span></p>
              <p>City: <span class="text-[#202124] font-medium">{{ selectedReferral.city }}</span></p>
            </div>
          </div>
        </div>

        <!-- 1st Booking & Reward Card -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 rounded-xl border border-[#E5E7EB] space-y-2 bg-[#F7F7F8]">
            <span class="text-xs font-bold text-[#202124] uppercase tracking-wider block">First Order Tracking</span>
            <div class="flex justify-between">
              <span class="text-[#6B7280]">Booking ID:</span>
              <span class="font-mono font-bold">{{ selectedReferral.firstBookingId || '—' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[#6B7280]">Order Status:</span>
              <span class="font-bold text-emerald-700">{{ selectedReferral.bookingStatus || 'Awaiting Checkout' }}</span>
            </div>
          </div>

          <div class="p-4 rounded-xl border border-[#E5E7EB] space-y-2 bg-[#F7F7F8]">
            <span class="text-xs font-bold text-[#202124] uppercase tracking-wider block">Reward Details</span>
            <div class="flex justify-between">
              <span class="text-[#6B7280]">Reward Amount:</span>
              <span class="font-bold text-emerald-700">{{ formatCurrency(selectedReferral.rewardAmount) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[#6B7280]">Credited Timestamp:</span>
              <span>{{ formatDateTime(selectedReferral.creditedAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Fraud Alert Banner if Flagged -->
        <div v-if="selectedReferral.isFlagged" class="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 space-y-1">
          <div class="flex items-center gap-1.5 font-bold text-xs">
            <AlertTriangle class="w-4 h-4 text-red-600 shrink-0" />
            <span>Fraud Risk Warning</span>
          </div>
          <p class="text-[11px]">{{ selectedReferral.flagReason || 'Matched identical phone or hardware fingerprint.' }}</p>
        </div>

        <!-- Administrative Actions -->
        <div class="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-2 flex-wrap">
          <button
            type="button"
            @click="isDetailModalOpen = false"
            class="px-4 py-2 border border-[#E5E7EB] text-[#202124] hover:bg-[#F7F7F8] rounded-xl font-bold cursor-pointer"
          >
            Close
          </button>
          <button
            v-if="selectedReferral.rewardStatus !== 'REJECTED'"
            type="button"
            @click="isDetailModalOpen = false; openActionModal(selectedReferral, 'REJECT')"
            class="px-4 py-2 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl font-bold cursor-pointer"
          >
            Reject Referral
          </button>
          <button
            v-if="selectedReferral.rewardStatus === 'PENDING'"
            type="button"
            @click="isDetailModalOpen = false; openActionModal(selectedReferral, 'APPROVE')"
            class="px-4 py-2 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl font-bold cursor-pointer"
          >
            Approve Referral
          </button>
          <button
            v-if="selectedReferral.rewardStatus === 'APPROVED' || selectedReferral.rewardStatus === 'PENDING'"
            type="button"
            @click="isDetailModalOpen = false; openActionModal(selectedReferral, 'CREDIT')"
            class="px-4 py-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold cursor-pointer"
          >
            Credit Reward Now
          </button>
        </div>
      </div>
    </Popup>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- MODAL: REFERRAL ACTION CONFIRMATION                                -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <Popup v-model="isActionModalOpen" :title="`Confirm Referral ${actionType}`" size="md">
      <div v-if="actionTargetReferral" class="space-y-4 text-xs text-[#202124]">
        <p>
          Are you sure you want to mark referral
          <strong class="font-mono text-[#800020]">#{{ actionTargetReferral.uniqueId.slice(0, 8) }}</strong>
          as <strong>{{ actionType }}</strong>?
        </p>

        <div v-if="actionType === 'REJECT' || actionType === 'REVERSE'">
          <label class="block font-bold mb-1">Mandatory Reason for Action <span class="text-red-600">*</span></label>
          <textarea
            v-model="actionReason"
            rows="3"
            placeholder="Explain why this referral reward is being rejected or reversed..."
            class="w-full p-2.5 bg-white border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-[#800020]"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="isActionModalOpen = false"
            class="px-4 py-2 border border-[#E5E7EB] hover:bg-[#F7F7F8] rounded-xl font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="submitReferralAction"
            :disabled="isUpdatingStatus"
            class="px-4 py-2 bg-[#800020] text-white hover:bg-[#6B001B] rounded-xl font-bold cursor-pointer disabled:opacity-50"
          >
            {{ isUpdatingStatus ? 'Applying...' : 'Confirm Action' }}
          </button>
        </div>
      </div>
    </Popup>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- MODAL: FRAUD RESOLUTION                                            -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <Popup v-model="isFraudModalOpen" title="Resolve Fraud Alert" size="md">
      <div v-if="selectedFraudAlert" class="space-y-4 text-xs text-[#202124]">
        <p>
          Resolving alert for referral
          <strong class="font-mono text-[#800020]">#{{ selectedFraudAlert.referralId.slice(0, 8) }}</strong>
          as <strong>{{ fraudActionType }}</strong>.
        </p>

        <div v-if="fraudActionType === 'REJECT'">
          <label class="block font-bold mb-1">Rejection Reason <span class="text-red-600">*</span></label>
          <textarea
            v-model="fraudActionReason"
            rows="3"
            placeholder="Enter reason for fraud rejection..."
            class="w-full p-2.5 bg-white border border-[#E5E7EB] rounded-lg text-xs focus:outline-none focus:border-[#800020]"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="isFraudModalOpen = false"
            class="px-4 py-2 border border-[#E5E7EB] hover:bg-[#F7F7F8] rounded-xl font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="submitFraudAction"
            class="px-4 py-2 bg-[#800020] text-white hover:bg-[#6B001B] rounded-xl font-bold cursor-pointer"
          >
            Save Resolution
          </button>
        </div>
      </div>
    </Popup>
  </div>
</template>
