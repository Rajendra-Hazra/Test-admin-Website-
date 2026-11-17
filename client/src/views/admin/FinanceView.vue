<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Highcharts from 'highcharts'
import { api } from '@/api'
import type {
  FinanceOverview,
  FinanceChartsData,
  CustomerWalletItem,
  PartnerWalletItem,
  UserWalletDetail,
  AdminWithdrawalItem,
  RevenueAnalyticsData,
  ApproveWithdrawalPayload,
} from '@/types/api'
import Popup from '@/components/common/Popup.vue'
import { showToast } from '@/utils/toast'
import {
  Coins,
  Wallet,
  Users,
  Briefcase,
  ArrowDownToLine,
  TrendingUp,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  Check,
  X,
  CreditCard,
  Building2,
  ShieldCheck,
  Download,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  FileText,
  BadgeAlert,
  Percent,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

// ── NAVIGATION TABS ──────────────────────────────────────────────────────────
type FinanceTab =
  | 'overview'
  | 'customer-wallets'
  | 'partner-wallets'
  | 'withdrawals'
  | 'revenue'
  | 'reports'

const activeTab = ref<FinanceTab>('overview')

// Sync with route query
watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab && typeof newTab === 'string') {
      const validTabs: FinanceTab[] = [
        'overview',
        'customer-wallets',
        'partner-wallets',
        'withdrawals',
        'revenue',
        'reports',
      ]
      if (validTabs.includes(newTab as FinanceTab)) {
        activeTab.value = newTab as FinanceTab
      }
    }
  },
  { immediate: true }
)

function switchTab(tab: FinanceTab) {
  activeTab.value = tab
  router.replace({ query: { ...route.query, tab } })
  if (tab === 'overview') {
    nextTick(() => {
      renderAllCharts()
    })
  }
}

// ── GLOBAL STATE & PERIOD ────────────────────────────────────────────────────
const isLoading = ref(false)
const isActionLoading = ref(false)
const selectedPeriod = ref('30D')

const periods = [
  { label: 'Today', value: 'TODAY' },
  { label: 'Last 7 Days', value: '7D' },
  { label: 'Last 30 Days', value: '30D' },
  { label: 'Last 3 Months', value: '3M' },
  { label: 'Last 6 Months', value: '6M' },
  { label: 'This Year', value: '1Y' },
]

// ── DATA STORES ──────────────────────────────────────────────────────────────
const overview = ref<FinanceOverview | null>(null)
const chartsData = ref<FinanceChartsData | null>(null)
const customerWallets = ref<CustomerWalletItem[]>([])
const partnerWallets = ref<PartnerWalletItem[]>([])
const withdrawals = ref<AdminWithdrawalItem[]>([])
const revenueData = ref<RevenueAnalyticsData | null>(null)

// ── SEARCH & FILTERS ─────────────────────────────────────────────────────────
// Customer wallets
const customerSearch = ref('')
const customerBalanceFilter = ref('ALL')
const customerStatusFilter = ref('ALL')

// Partner wallets
const partnerSearch = ref('')
const partnerBalanceFilter = ref('ALL')
const partnerStatusFilter = ref('ALL')

// Withdrawals
const withdrawalSubTab = ref<
  | 'ALL'
  | 'CUSTOMER'
  | 'PARTNER'
  | 'PENDING'
  | 'APPROVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'FAILED'
>('ALL')
const withdrawalSearch = ref('')

// ── MODALS ───────────────────────────────────────────────────────────────────
// 1. User Wallet Details
const isWalletModalOpen = ref(false)
const selectedWalletDetail = ref<UserWalletDetail | null>(null)
const isDetailLoading = ref(false)

// 2. Withdrawal Review & Approval
const isWithdrawalModalOpen = ref(false)
const activeWithdrawal = ref<AdminWithdrawalItem | null>(null)
const approveForm = ref<ApproveWithdrawalPayload>({
  utrReference: '',
  remarks: '',
})

// 3. Withdrawal Rejection
const isRejectModalOpen = ref(false)
const rejectReason = ref('')

// ── DATA FETCHING ────────────────────────────────────────────────────────────
async function loadFinancialData() {
  isLoading.value = true
  try {
    const [ovRes, chRes, custRes, partRes, withRes, revRes] = await Promise.all([
      api.finance.getOverview(),
      api.finance.getCharts(selectedPeriod.value),
      api.finance.getCustomerWallets(),
      api.finance.getPartnerWallets(),
      api.finance.getWithdrawals(),
      api.finance.getRevenueAnalytics(selectedPeriod.value),
    ])

    overview.value = (ovRes as any)?.data ?? ovRes
    chartsData.value = (chRes as any)?.data ?? chRes
    customerWallets.value = (custRes as any)?.data ?? custRes ?? []
    partnerWallets.value = (partRes as any)?.data ?? partRes ?? []
    withdrawals.value = (withRes as any)?.data ?? withRes ?? []
    revenueData.value = (revRes as any)?.data ?? revRes

    nextTick(() => {
      if (activeTab.value === 'overview') {
        renderAllCharts()
      }
    })
  } catch (err: any) {
    showToast(err?.message || 'Failed to load financial records', 'error')
  } finally {
    isLoading.value = false
  }
}

watch(selectedPeriod, async () => {
  try {
    const [chRes, revRes] = await Promise.all([
      api.finance.getCharts(selectedPeriod.value),
      api.finance.getRevenueAnalytics(selectedPeriod.value),
    ])
    chartsData.value = (chRes as any)?.data ?? chRes
    revenueData.value = (revRes as any)?.data ?? revRes
    nextTick(() => {
      renderAllCharts()
    })
  } catch (e: any) {
    showToast(e?.message || 'Failed to refresh periodic data', 'error')
  }
})

// ── WALLET DETAIL ACTION ─────────────────────────────────────────────────────
async function openWalletDetail(userId: string) {
  isDetailLoading.value = true
  isWalletModalOpen.value = true
  selectedWalletDetail.value = null
  try {
    const res = await api.finance.getUserWalletDetail(userId)
    selectedWalletDetail.value = (res as any)?.data ?? res
  } catch (err: any) {
    showToast(err?.message || 'Failed to fetch user wallet ledger', 'error')
  } finally {
    isDetailLoading.value = false
  }
}

// ── WITHDRAWAL ACTIONS ───────────────────────────────────────────────────────
function openWithdrawalModal(item: AdminWithdrawalItem) {
  activeWithdrawal.value = item
  approveForm.value = {
    utrReference: item.transactionId || '',
    remarks: item.statusReason || '',
  }
  isWithdrawalModalOpen.value = true
}

async function confirmApproveWithdrawal() {
  if (!activeWithdrawal.value) return
  isActionLoading.value = true
  try {
    await api.finance.approveWithdrawal(activeWithdrawal.value.id, approveForm.value)
    showToast(`Withdrawal #${activeWithdrawal.value.id.slice(0, 8)} approved and settled successfully`, 'success')
    isWithdrawalModalOpen.value = false
    await loadFinancialData()
  } catch (err: any) {
    showToast(err?.message || 'Failed to approve withdrawal', 'error')
  } finally {
    isActionLoading.value = false
  }
}

function openRejectModal(item: AdminWithdrawalItem) {
  activeWithdrawal.value = item
  rejectReason.value = ''
  isRejectModalOpen.value = true
}

async function confirmRejectWithdrawal() {
  if (!activeWithdrawal.value) return
  if (!rejectReason.value.trim()) {
    showToast('A rejection reason is mandatory', 'error')
    return
  }
  isActionLoading.value = true
  try {
    await api.finance.rejectWithdrawal(activeWithdrawal.value.id, rejectReason.value.trim())
    showToast(`Withdrawal rejected. Reserved funds restored to wallet balance`, 'info')
    isRejectModalOpen.value = false
    isWithdrawalModalOpen.value = false
    await loadFinancialData()
  } catch (err: any) {
    showToast(err?.message || 'Failed to reject withdrawal', 'error')
  } finally {
    isActionLoading.value = false
  }
}

// ── COMPUTED FILTERED LISTS ──────────────────────────────────────────────────
const filteredCustomerWallets = computed(() => {
  return customerWallets.value.filter((w) => {
    if (customerBalanceFilter.value === 'POSITIVE' && w.totalBalance <= 0) return false
    if (customerBalanceFilter.value === 'ZERO' && w.totalBalance !== 0) return false
    if (customerStatusFilter.value !== 'ALL' && w.walletStatus !== customerStatusFilter.value) return false
    if (customerSearch.value.trim()) {
      const q = customerSearch.value.toLowerCase().trim()
      const match =
        w.name.toLowerCase().includes(q) ||
        w.mobileNo.includes(q) ||
        w.displayId.toLowerCase().includes(q) ||
        w.userId.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })
})

const filteredPartnerWallets = computed(() => {
  return partnerWallets.value.filter((w) => {
    if (partnerBalanceFilter.value === 'POSITIVE' && w.totalBalance <= 0) return false
    if (partnerBalanceFilter.value === 'ZERO' && w.totalBalance !== 0) return false
    if (partnerStatusFilter.value !== 'ALL' && w.walletStatus !== partnerStatusFilter.value) return false
    if (partnerSearch.value.trim()) {
      const q = partnerSearch.value.toLowerCase().trim()
      const match =
        w.name.toLowerCase().includes(q) ||
        w.mobileNo.includes(q) ||
        w.displayId.toLowerCase().includes(q) ||
        w.userId.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })
})

const pendingWithdrawalsCount = computed(() => {
  return withdrawals.value.filter((w) => w.status === 'PENDING').length
})

const filteredWithdrawals = computed(() => {
  return withdrawals.value.filter((w) => {
    // Sub-tab
    if (withdrawalSubTab.value === 'CUSTOMER' && w.userType !== 'CUSTOMER') return false
    if (withdrawalSubTab.value === 'PARTNER' && w.userType !== 'PARTNER') return false
    if (withdrawalSubTab.value === 'PENDING' && w.status !== 'PENDING') return false
    if (withdrawalSubTab.value === 'APPROVED' && w.status !== 'SUCCESS') return false
    if (withdrawalSubTab.value === 'COMPLETED' && w.status !== 'SUCCESS') return false
    if (withdrawalSubTab.value === 'REJECTED' && w.status !== 'REJECTED') return false
    if (withdrawalSubTab.value === 'FAILED' && w.status !== 'FAILED') return false

    // Search query
    if (withdrawalSearch.value.trim()) {
      const q = withdrawalSearch.value.toLowerCase().trim()
      const match =
        w.id.toLowerCase().includes(q) ||
        w.userName.toLowerCase().includes(q) ||
        w.mobileNo.includes(q) ||
        w.displayId.toLowerCase().includes(q) ||
        (w.transactionId && w.transactionId.toLowerCase().includes(q))
      if (!match) return false
    }
    return true
  })
})

// ── HIGHCHARTS RENDERING ─────────────────────────────────────────────────────
const revenueTrendChartEl = ref<HTMLElement | null>(null)
const walletCompChartEl = ref<HTMLElement | null>(null)
const revenueBreakdownChartEl = ref<HTMLElement | null>(null)
const withdrawalAnalyticsChartEl = ref<HTMLElement | null>(null)

function renderAllCharts() {
  if (!chartsData.value) return

  // 1. Revenue Trend Line / Area Chart
  if (revenueTrendChartEl.value) {
    const dates = chartsData.value.revenueTrend.map((p) => p.date)
    const revs = chartsData.value.revenueTrend.map((p) => p.totalRevenue)
    const comms = chartsData.value.revenueTrend.map((p) => p.orderCommissions)
    const subs = chartsData.value.revenueTrend.map((p) => p.subscriptionRevenue)

    Highcharts.chart(revenueTrendChartEl.value, {
      chart: { type: 'areaspline', backgroundColor: '#FFFFFF', style: { fontFamily: 'inherit' } },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: {
        categories: dates,
        lineColor: '#E5E7EB',
        labels: { style: { color: '#6B7280', fontSize: '11px' } },
      },
      yAxis: {
        title: { text: 'Revenue (₹)', style: { color: '#6B7280', fontSize: '12px' } },
        gridLineColor: '#F3F4F6',
        labels: {
          style: { color: '#6B7280', fontSize: '11px' },
          formatter() {
            return `₹${this.value}`
          },
        },
      },
      tooltip: {
        shared: true,
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        borderRadius: 8,
        valuePrefix: '₹',
      },
      colors: ['#800020', '#10B981', '#6366F1'],
      plotOptions: {
        areaspline: {
          fillOpacity: 0.1,
          marker: { radius: 3 },
        },
      },
      series: [
        { name: 'Recognized Revenue', data: revs, type: 'areaspline' },
        { name: 'Order Commissions', data: comms, type: 'areaspline' },
        { name: 'Subscriptions', data: subs, type: 'areaspline' },
      ],
    })
  }

  // 2. Wallet Balance Comparison Column Chart
  if (walletCompChartEl.value) {
    const wb = chartsData.value.walletBalanceComparison
    Highcharts.chart(walletCompChartEl.value, {
      chart: { type: 'column', backgroundColor: '#FFFFFF', style: { fontFamily: 'inherit' } },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: {
        categories: ['Customer Balances', 'Partner Balances', 'Combined Balance', 'Reserved Balances'],
        lineColor: '#E5E7EB',
        labels: { style: { color: '#6B7280', fontSize: '11px' } },
      },
      yAxis: {
        title: { text: 'Amount (₹)', style: { color: '#6B7280', fontSize: '12px' } },
        gridLineColor: '#F3F4F6',
        labels: {
          formatter() {
            return `₹${this.value}`
          },
        },
      },
      tooltip: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        borderRadius: 8,
        valuePrefix: '₹',
      },
      legend: { enabled: false },
      series: [
        {
          name: 'Balance',
          type: 'column',
          data: [
            { y: wb.customerBalance, color: '#3B82F6' },
            { y: wb.partnerBalance, color: '#10B981' },
            { y: wb.combinedBalance, color: '#800020' },
            { y: wb.reservedBalance, color: '#F59E0B' },
          ],
        },
      ],
    })
  }

  // 3. Revenue Breakdown Donut Chart
  if (revenueBreakdownChartEl.value) {
    const rb = chartsData.value.revenueBreakdown
    Highcharts.chart(revenueBreakdownChartEl.value, {
      chart: { type: 'pie', backgroundColor: '#FFFFFF', style: { fontFamily: 'inherit' } },
      title: { text: undefined },
      credits: { enabled: false },
      tooltip: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        borderRadius: 8,
        pointFormat: '{series.name}: <b>₹{point.y:.2f}</b> ({point.percentage:.1f}%)',
      },
      plotOptions: {
        pie: {
          innerSize: '60%',
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.percentage:.1f}%',
            style: { color: '#202124', fontSize: '11px' },
          },
        },
      },
      colors: ['#800020', '#6366F1', '#10B981', '#F59E0B', '#9CA3AF'],
      series: [
        {
          name: 'Revenue',
          type: 'pie',
          data: [
            { name: 'Booking Commission', y: rb.bookingCommissions || 1 },
            { name: 'Partner Subscriptions', y: rb.partnerSubscriptions || 0 },
            { name: 'Customer Memberships', y: rb.customerMemberships || 0 },
            { name: 'Cancellation Charges', y: rb.cancellationCharges || 0 },
            { name: 'Other Services', y: rb.other || 0 },
          ],
        },
      ],
    })
  }

  // 4. Withdrawal Analytics Column Chart
  if (withdrawalAnalyticsChartEl.value) {
    const wa = chartsData.value.withdrawalAnalytics
    Highcharts.chart(withdrawalAnalyticsChartEl.value, {
      chart: { type: 'bar', backgroundColor: '#FFFFFF', style: { fontFamily: 'inherit' } },
      title: { text: undefined },
      credits: { enabled: false },
      xAxis: {
        categories: ['Customer Payouts', 'Partner Payouts', 'Pending Escrow', 'Completed Payouts'],
        lineColor: '#E5E7EB',
        labels: { style: { color: '#6B7280', fontSize: '11px' } },
      },
      yAxis: {
        title: { text: 'Amount (₹)', style: { color: '#6B7280', fontSize: '12px' } },
        gridLineColor: '#F3F4F6',
        labels: {
          formatter() {
            return `₹${this.value}`
          },
        },
      },
      tooltip: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        borderRadius: 8,
        valuePrefix: '₹',
      },
      legend: { enabled: false },
      series: [
        {
          name: 'Amount',
          type: 'bar',
          data: [
            { y: wa.customerWithdrawals, color: '#3B82F6' },
            { y: wa.partnerWithdrawals, color: '#10B981' },
            { y: wa.pendingAmount, color: '#F59E0B' },
            { y: wa.completedAmount, color: '#800020' },
          ],
        },
      ],
    })
  }
}

// ── CSV EXPORT UTILITY ───────────────────────────────────────────────────────
function exportToCsv(filename: string, rows: object[]) {
  if (!rows || !rows.length) {
    showToast('No records available to export', 'error')
    return
  }
  const headers = Object.keys(rows[0] as Record<string, any>)
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((header) => {
          let cell = (row as Record<string, any>)[header]
          if (cell === null || cell === undefined) cell = ''
          const stringCell = String(cell).replace(/"/g, '""')
          return `"${stringCell}"`
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
  showToast(`Exported ${filename}.csv successfully`, 'success')
}

function exportCustomerWallets() {
  exportToCsv(
    'Customer_Wallets',
    customerWallets.value.map((w) => ({
      'Customer ID': w.displayId,
      Name: w.name,
      'Mobile Number': w.mobileNo,
      'Available Balance': w.availableBalance,
      'Bonus Balance': w.nonWithdrawableBalance,
      'Total Balance': w.totalBalance,
      'Total Credits': w.totalCredits,
      'Total Debits': w.totalDebits,
      Status: w.walletStatus,
      'Last Transaction': w.lastTransactionDesc || '—',
    }))
  )
}

function exportPartnerWallets() {
  exportToCsv(
    'Partner_Wallets',
    partnerWallets.value.map((w) => ({
      'Partner ID': w.displayId,
      Name: w.name,
      'Mobile Number': w.mobileNo,
      'Available Balance': w.availableBalance,
      'Reserved Balance': w.reservedBalance,
      'Total Balance': w.totalBalance,
      'Total Earnings': w.totalEarnings,
      'Total Withdrawals': w.totalWithdrawals,
      'Pending Withdrawals': w.pendingWithdrawals,
      Status: w.walletStatus,
      'Last Transaction': w.lastTransactionDesc || '—',
    }))
  )
}

function exportWithdrawals() {
  exportToCsv(
    'Withdrawal_Requests',
    withdrawals.value.map((w) => ({
      'Request ID': w.id,
      'User Type': w.userType,
      'User Name': w.userName,
      'Mobile Number': w.mobileNo,
      'Requested Amount': w.requestedAmount,
      'Payment Method': w.paymentMethod,
      'Bank Account': w.bankAccountMasked,
      IFSC: w.ifsc,
      Status: w.status,
      'UTR Reference': w.transactionId || '—',
      'Request Date': w.requestedAt ? new Date(w.requestedAt).toLocaleString() : '—',
      'Processed Date': w.processedAt ? new Date(w.processedAt).toLocaleString() : '—',
    }))
  )
}

function exportRevenueReport() {
  if (!revenueData.value) return
  exportToCsv(
    'Revenue_Analytics_Report',
    revenueData.value.periodicBreakdown.map((r) => ({
      Period: r.period,
      GMV: r.gmv,
      'Recognized Revenue': r.recognizedRevenue,
      'Booking Commissions': r.bookingCommissions,
      'Subscription Revenue': r.subscriptions,
      Refunds: r.refunds,
      Discounts: r.discounts,
      'Net Revenue': r.netRevenue,
    }))
  )
}

function formatCurrency(val?: number): string {
  if (val === undefined || val === null) return '₹0.00'
  return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

onMounted(() => {
  loadFinancialData()
})
</script>

<template>
  <div class="min-h-screen bg-white text-[#202124] p-4 sm:p-6 lg:p-8 space-y-6">
    <!-- ── 1. Page Header ── -->
    <div class="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="space-y-2">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#800020]/10 text-[#800020] border border-[#800020]/20">
          <Coins class="size-3.5" />
          <span>Financial Administration & Settlement</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-[#202124] tracking-tight">
          Wallet & Revenue Management
        </h1>
        <p class="text-sm sm:text-base text-[#6B7280] max-w-2xl leading-relaxed">
          Monitor customer and partner wallets, authorize bank payout disbursements with atomic fund release, and analyze recognized platform revenue.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <!-- Time Filter Dropdown -->
        <select
          v-model="selectedPeriod"
          class="px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-xs sm:text-sm font-semibold text-[#202124] hover:bg-[#F7F7F8] focus:outline-hidden focus:border-[#800020] transition shadow-xs"
        >
          <option v-for="p in periods" :key="p.value" :value="p.value">
            {{ p.label }}
          </option>
        </select>

        <button
          type="button"
          @click="loadFinancialData"
          :disabled="isLoading"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-xs sm:text-sm font-semibold text-[#202124] hover:bg-[#F7F7F8] active:bg-[#F0F0F1] transition shadow-xs disabled:opacity-60"
        >
          <RefreshCw class="size-4 text-[#6B7280]" :class="{ 'animate-spin': isLoading }" />
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- ── 2. Primary Navigation Tabs ── -->
    <div class="bg-white border border-[#E5E7EB] rounded-2xl p-2 shadow-xs">
      <div class="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          @click="switchTab('overview')"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition"
          :class="activeTab === 'overview' ? 'bg-[#800020] text-white shadow-xs' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124]'"
        >
          <Coins class="size-4" />
          <span>Financial Overview</span>
        </button>

        <button
          type="button"
          @click="switchTab('customer-wallets')"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition"
          :class="activeTab === 'customer-wallets' ? 'bg-[#800020] text-white shadow-xs' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124]'"
        >
          <Users class="size-4" />
          <span>Customer Wallets ({{ customerWallets.length }})</span>
        </button>

        <button
          type="button"
          @click="switchTab('partner-wallets')"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition"
          :class="activeTab === 'partner-wallets' ? 'bg-[#800020] text-white shadow-xs' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124]'"
        >
          <Briefcase class="size-4" />
          <span>Partner Wallets ({{ partnerWallets.length }})</span>
        </button>

        <button
          type="button"
          @click="switchTab('withdrawals')"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition relative"
          :class="activeTab === 'withdrawals' ? 'bg-[#800020] text-white shadow-xs' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124]'"
        >
          <ArrowDownToLine class="size-4" />
          <span>Withdrawal Management</span>
          <span
            v-if="pendingWithdrawalsCount > 0"
            class="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
            :class="activeTab === 'withdrawals' ? 'bg-white text-[#800020]' : 'bg-amber-100 text-amber-800'"
          >
            {{ pendingWithdrawalsCount }} pending
          </span>
        </button>

        <button
          type="button"
          @click="switchTab('revenue')"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition"
          :class="activeTab === 'revenue' ? 'bg-[#800020] text-white shadow-xs' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124]'"
        >
          <TrendingUp class="size-4" />
          <span>Revenue Analytics</span>
        </button>

        <button
          type="button"
          @click="switchTab('reports')"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition"
          :class="activeTab === 'reports' ? 'bg-[#800020] text-white shadow-xs' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124]'"
        >
          <FileSpreadsheet class="size-4" />
          <span>Financial Reports</span>
        </button>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- TAB 1: FINANCIAL OVERVIEW                                             -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <div v-show="activeTab === 'overview'" class="space-y-6">
      <!-- 10 Primary KPI Cards Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <!-- 1. Customer Wallet Balance -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-2">
          <div class="flex items-center justify-between text-xs text-[#6B7280]">
            <span class="font-medium uppercase tracking-wider">Customer Balances</span>
            <Users class="size-4 text-blue-600" />
          </div>
          <div class="text-xl font-black text-[#202124]">
            {{ formatCurrency(overview?.totalCustomerBalance) }}
          </div>
          <div class="text-[11px] text-[#6B7280] flex items-center gap-1">
            <span class="text-emerald-700 font-semibold inline-flex items-center">
              <ArrowUpRight class="size-3" /> +5.4%
            </span>
            <span>vs previous period</span>
          </div>
        </div>

        <!-- 2. Partner Wallet Balance -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-2">
          <div class="flex items-center justify-between text-xs text-[#6B7280]">
            <span class="font-medium uppercase tracking-wider">Partner Balances</span>
            <Briefcase class="size-4 text-emerald-600" />
          </div>
          <div class="text-xl font-black text-[#202124]">
            {{ formatCurrency(overview?.totalPartnerBalance) }}
          </div>
          <div class="text-[11px] text-[#6B7280] flex items-center gap-1">
            <span class="text-emerald-700 font-semibold inline-flex items-center">
              <ArrowUpRight class="size-3" /> +8.2%
            </span>
            <span>vs previous period</span>
          </div>
        </div>

        <!-- 3. Combined Wallet Balance -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-2">
          <div class="flex items-center justify-between text-xs text-[#6B7280]">
            <span class="font-medium uppercase tracking-wider">Combined Balance</span>
            <Wallet class="size-4 text-[#800020]" />
          </div>
          <div class="text-xl font-black text-[#800020]">
            {{ formatCurrency(overview?.combinedWalletBalance) }}
          </div>
          <div class="text-[11px] text-[#6B7280]">
            User wallet liabilities
          </div>
        </div>

        <!-- 4. Total Recognized Revenue -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-2">
          <div class="flex items-center justify-between text-xs text-[#6B7280]">
            <span class="font-medium uppercase tracking-wider">Recognized Revenue</span>
            <TrendingUp class="size-4 text-purple-600" />
          </div>
          <div class="text-xl font-black text-[#202124]">
            {{ formatCurrency(overview?.recognizedRevenue) }}
          </div>
          <div class="text-[11px] text-[#6B7280] flex items-center gap-1">
            <span class="text-emerald-700 font-semibold inline-flex items-center">
              <ArrowUpRight class="size-3" /> +12.7%
            </span>
            <span>platform commission</span>
          </div>
        </div>

        <!-- 5. Today's Revenue -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-2">
          <div class="flex items-center justify-between text-xs text-[#6B7280]">
            <span class="font-medium uppercase tracking-wider">Today's Revenue</span>
            <Clock class="size-4 text-amber-600" />
          </div>
          <div class="text-xl font-black text-[#202124]">
            {{ formatCurrency(overview?.todayRevenue) }}
          </div>
          <div class="text-[11px] text-[#6B7280]">
            Today's realized earnings
          </div>
        </div>

        <!-- 6. Monthly Revenue -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-2">
          <div class="flex items-center justify-between text-xs text-[#6B7280]">
            <span class="font-medium uppercase tracking-wider">Monthly Revenue</span>
            <Receipt class="size-4 text-indigo-600" />
          </div>
          <div class="text-xl font-black text-[#202124]">
            {{ formatCurrency(overview?.monthlyRevenue) }}
          </div>
          <div class="text-[11px] text-[#6B7280]">
            Current month to date
          </div>
        </div>

        <!-- 7. Pending Withdrawal Amount -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-2">
          <div class="flex items-center justify-between text-xs text-[#6B7280]">
            <span class="font-medium uppercase tracking-wider">Pending Withdrawals</span>
            <BadgeAlert class="size-4 text-amber-600" />
          </div>
          <div class="text-xl font-black text-amber-700">
            {{ formatCurrency(overview?.pendingWithdrawalAmount) }}
          </div>
          <div class="text-[11px] text-amber-800 font-medium">
            {{ overview?.pendingWithdrawalCount || 0 }} requests awaiting review
          </div>
        </div>

        <!-- 8. Completed Withdrawal Amount -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-2">
          <div class="flex items-center justify-between text-xs text-[#6B7280]">
            <span class="font-medium uppercase tracking-wider">Completed Payouts</span>
            <CheckCircle2 class="size-4 text-emerald-600" />
          </div>
          <div class="text-xl font-black text-[#202124]">
            {{ formatCurrency(overview?.completedWithdrawalAmount) }}
          </div>
          <div class="text-[11px] text-[#6B7280]">
            Settled bank transfers
          </div>
        </div>

        <!-- 9. Total Customer Withdrawals -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-2">
          <div class="flex items-center justify-between text-xs text-[#6B7280]">
            <span class="font-medium uppercase tracking-wider">Customer Payouts</span>
            <ArrowDownToLine class="size-4 text-blue-600" />
          </div>
          <div class="text-xl font-black text-[#202124]">
            {{ formatCurrency(overview?.totalCustomerWithdrawals) }}
          </div>
          <div class="text-[11px] text-[#6B7280]">
            Customer wallet cashouts
          </div>
        </div>

        <!-- 10. Total Partner Withdrawals -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-2">
          <div class="flex items-center justify-between text-xs text-[#6B7280]">
            <span class="font-medium uppercase tracking-wider">Partner Payouts</span>
            <ArrowDownToLine class="size-4 text-emerald-600" />
          </div>
          <div class="text-xl font-black text-[#202124]">
            {{ formatCurrency(overview?.totalPartnerWithdrawals) }}
          </div>
          <div class="text-[11px] text-[#6B7280]">
            Partner earnings payouts
          </div>
        </div>
      </div>

      <!-- Financial Safety & Accounting Distinction Banner -->
      <div class="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-3">
        <div class="flex items-center gap-2 text-sm font-bold text-[#202124]">
          <ShieldCheck class="size-5 text-[#800020]" />
          <span>Accounting Principles & Financial Safety Controls</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div class="bg-[#F7F7F8] p-3 rounded-xl border border-[#E5E7EB]">
            <div class="font-bold text-[#202124] mb-1">Available Wallet Balances</div>
            <div class="text-[#6B7280]">
              User funds held in trust ({{ formatCurrency(overview?.availableBalance) }}). Treated strictly as liabilities, never as recognized revenue.
            </div>
          </div>
          <div class="bg-[#F7F7F8] p-3 rounded-xl border border-[#E5E7EB]">
            <div class="font-bold text-[#202124] mb-1">Reserved / Locked Escrow</div>
            <div class="text-[#6B7280]">
              Atomic locks ({{ formatCurrency(overview?.reservedBalance) }}) held during active withdrawal requests to prevent double spending.
            </div>
          </div>
          <div class="bg-[#F7F7F8] p-3 rounded-xl border border-[#E5E7EB]">
            <div class="font-bold text-[#202124] mb-1">Pending Withdrawal Queue</div>
            <div class="text-[#6B7280]">
              {{ overview?.pendingWithdrawalCount || 0 }} requests ({{ formatCurrency(overview?.pendingWithdrawalAmount) }}) verified against available balances.
            </div>
          </div>
          <div class="bg-[#F7F7F8] p-3 rounded-xl border border-[#E5E7EB]">
            <div class="font-bold text-[#202124] mb-1">Company Recognized Revenue</div>
            <div class="text-[#6B7280]">
              Net platform commission and subscriptions only ({{ formatCurrency(overview?.recognizedRevenue) }}). Excludes user wallet recharges.
            </div>
          </div>
        </div>
      </div>

      <!-- Financial Charts Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Chart 1: Revenue Trend -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-[#202124]">Recognized Revenue & Order Commission Trend</h3>
            <span class="text-xs text-[#6B7280]">{{ selectedPeriod }} interval</span>
          </div>
          <div ref="revenueTrendChartEl" class="w-full h-72"></div>
        </div>

        <!-- Chart 2: Wallet Balance Comparison -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-[#202124]">Wallet Balance Distribution & Escrow</h3>
            <span class="text-xs text-[#6B7280]">Platform Liabilities</span>
          </div>
          <div ref="walletCompChartEl" class="w-full h-72"></div>
        </div>

        <!-- Chart 3: Revenue Breakdown -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-[#202124]">Revenue Source Breakdown</h3>
            <span class="text-xs text-[#6B7280]">Accounting Channels</span>
          </div>
          <div ref="revenueBreakdownChartEl" class="w-full h-72"></div>
        </div>

        <!-- Chart 4: Withdrawal Analytics -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-[#202124]">Withdrawals & Payout Status Distribution</h3>
            <span class="text-xs text-[#6B7280]">Disbursements</span>
          </div>
          <div ref="withdrawalAnalyticsChartEl" class="w-full h-72"></div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- TAB 2: CUSTOMER WALLET MANAGEMENT                                     -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <div v-show="activeTab === 'customer-wallets'" class="space-y-4">
      <!-- Toolbar -->
      <div class="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3 flex-1">
          <!-- Search -->
          <div class="relative w-full sm:w-72">
            <Search class="size-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              v-model="customerSearch"
              type="text"
              placeholder="Search by customer name, mobile, ID..."
              class="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
            />
          </div>

          <!-- Balance Filter -->
          <select
            v-model="customerBalanceFilter"
            class="px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
          >
            <option value="ALL">All Balances</option>
            <option value="POSITIVE">Positive Balance (> ₹0)</option>
            <option value="ZERO">Zero Balance (₹0)</option>
          </select>

          <!-- Status Filter -->
          <select
            v-model="customerStatusFilter"
            class="px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Wallets</option>
            <option value="FROZEN">Frozen Wallets</option>
          </select>
        </div>

        <button
          type="button"
          @click="exportCustomerWallets"
          class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#202124] hover:bg-[#F7F7F8] transition"
        >
          <Download class="size-3.5 text-[#6B7280]" />
          <span>Export CSV</span>
        </button>
      </div>

      <!-- Data Table -->
      <div class="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-[#202124]">
            <thead class="bg-[#F7F7F8] border-b border-[#E5E7EB] text-[#6B7280] font-semibold">
              <tr>
                <th class="py-3 px-4">Customer ID</th>
                <th class="py-3 px-4">Customer Name</th>
                <th class="py-3 px-4">Mobile</th>
                <th class="py-3 px-4 text-right">Available Balance</th>
                <th class="py-3 px-4 text-right">Bonus / Non-Withdrawable</th>
                <th class="py-3 px-4 text-right">Total Balance</th>
                <th class="py-3 px-4 text-right">Total Credits</th>
                <th class="py-3 px-4 text-right">Total Debits</th>
                <th class="py-3 px-4 text-center">Status</th>
                <th class="py-3 px-4">Last Activity</th>
                <th class="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E5E7EB]">
              <tr v-if="filteredCustomerWallets.length === 0">
                <td colspan="11" class="py-8 text-center text-[#6B7280]">
                  No customer wallets match your filter criteria.
                </td>
              </tr>
              <tr
                v-for="c in filteredCustomerWallets"
                :key="c.userId"
                class="hover:bg-[#F7F7F8] transition"
              >
                <td class="py-3 px-4 font-mono font-medium text-[#800020]">
                  {{ c.displayId }}
                </td>
                <td class="py-3 px-4 font-bold text-[#202124]">
                  {{ c.name }}
                </td>
                <td class="py-3 px-4 font-mono text-[#6B7280]">
                  {{ c.mobileNo }}
                </td>
                <td class="py-3 px-4 text-right font-black text-emerald-700">
                  {{ formatCurrency(c.availableBalance) }}
                </td>
                <td class="py-3 px-4 text-right text-[#6B7280]">
                  {{ formatCurrency(c.nonWithdrawableBalance) }}
                </td>
                <td class="py-3 px-4 text-right font-bold text-[#202124]">
                  {{ formatCurrency(c.totalBalance) }}
                </td>
                <td class="py-3 px-4 text-right text-emerald-700">
                  +{{ formatCurrency(c.totalCredits) }}
                </td>
                <td class="py-3 px-4 text-right text-red-600">
                  -{{ formatCurrency(c.totalDebits) }}
                </td>
                <td class="py-3 px-4 text-center">
                  <span
                    class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    :class="c.walletStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'"
                  >
                    {{ c.walletStatus }}
                  </span>
                </td>
                <td class="py-3 px-4 text-[#6B7280] max-w-xs truncate" :title="c.lastTransactionDesc">
                  {{ c.lastTransactionDesc || '—' }}
                </td>
                <td class="py-3 px-4 text-center">
                  <button
                    type="button"
                    @click="openWalletDetail(c.userId)"
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#800020] hover:bg-[#800020]/10 transition"
                  >
                    <Eye class="size-3.5" />
                    <span>Ledger</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- TAB 3: PARTNER WALLET MANAGEMENT                                      -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <div v-show="activeTab === 'partner-wallets'" class="space-y-4">
      <!-- Toolbar -->
      <div class="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-3 flex-1">
          <!-- Search -->
          <div class="relative w-full sm:w-72">
            <Search class="size-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              v-model="partnerSearch"
              type="text"
              placeholder="Search by partner name, mobile, ID..."
              class="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
            />
          </div>

          <!-- Balance Filter -->
          <select
            v-model="partnerBalanceFilter"
            class="px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
          >
            <option value="ALL">All Balances</option>
            <option value="POSITIVE">Positive Balance (> ₹0)</option>
            <option value="ZERO">Zero Balance (₹0)</option>
          </select>

          <!-- Status Filter -->
          <select
            v-model="partnerStatusFilter"
            class="px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Wallets</option>
            <option value="FROZEN">Frozen Wallets</option>
          </select>
        </div>

        <button
          type="button"
          @click="exportPartnerWallets"
          class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#202124] hover:bg-[#F7F7F8] transition"
        >
          <Download class="size-3.5 text-[#6B7280]" />
          <span>Export CSV</span>
        </button>
      </div>

      <!-- Data Table -->
      <div class="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-[#202124]">
            <thead class="bg-[#F7F7F8] border-b border-[#E5E7EB] text-[#6B7280] font-semibold">
              <tr>
                <th class="py-3 px-4">Partner ID</th>
                <th class="py-3 px-4">Partner Name</th>
                <th class="py-3 px-4">Mobile</th>
                <th class="py-3 px-4 text-right">Available Balance</th>
                <th class="py-3 px-4 text-right">Reserved Escrow</th>
                <th class="py-3 px-4 text-right">Total Earnings</th>
                <th class="py-3 px-4 text-right">Total Withdrawals</th>
                <th class="py-3 px-4 text-right">Pending Payout</th>
                <th class="py-3 px-4 text-center">Status</th>
                <th class="py-3 px-4">Last Activity</th>
                <th class="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E5E7EB]">
              <tr v-if="filteredPartnerWallets.length === 0">
                <td colspan="11" class="py-8 text-center text-[#6B7280]">
                  No partner wallets match your filter criteria.
                </td>
              </tr>
              <tr
                v-for="p in filteredPartnerWallets"
                :key="p.userId"
                class="hover:bg-[#F7F7F8] transition"
              >
                <td class="py-3 px-4 font-mono font-medium text-[#800020]">
                  {{ p.displayId }}
                </td>
                <td class="py-3 px-4 font-bold text-[#202124]">
                  {{ p.name }}
                </td>
                <td class="py-3 px-4 font-mono text-[#6B7280]">
                  {{ p.mobileNo }}
                </td>
                <td class="py-3 px-4 text-right font-black text-emerald-700">
                  {{ formatCurrency(p.availableBalance) }}
                </td>
                <td class="py-3 px-4 text-right text-amber-700 font-semibold">
                  {{ formatCurrency(p.reservedBalance) }}
                </td>
                <td class="py-3 px-4 text-right font-bold text-[#202124]">
                  {{ formatCurrency(p.totalEarnings) }}
                </td>
                <td class="py-3 px-4 text-right text-[#6B7280]">
                  {{ formatCurrency(p.totalWithdrawals) }}
                </td>
                <td class="py-3 px-4 text-right text-amber-800 font-bold">
                  {{ formatCurrency(p.pendingWithdrawals) }}
                </td>
                <td class="py-3 px-4 text-center">
                  <span
                    class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    :class="p.walletStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'"
                  >
                    {{ p.walletStatus }}
                  </span>
                </td>
                <td class="py-3 px-4 text-[#6B7280] max-w-xs truncate" :title="p.lastTransactionDesc">
                  {{ p.lastTransactionDesc || '—' }}
                </td>
                <td class="py-3 px-4 text-center">
                  <button
                    type="button"
                    @click="openWalletDetail(p.userId)"
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#800020] hover:bg-[#800020]/10 transition"
                  >
                    <Eye class="size-3.5" />
                    <span>Ledger</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- TAB 4: WITHDRAWAL MANAGEMENT                                          -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <div v-show="activeTab === 'withdrawals'" class="space-y-4">
      <!-- Sub-Tabs Bar -->
      <div class="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-4">
        <div class="flex flex-wrap items-center gap-2 border-b border-[#E5E7EB] pb-3">
          <button
            type="button"
            @click="withdrawalSubTab = 'ALL'"
            class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition"
            :class="withdrawalSubTab === 'ALL' ? 'bg-[#800020] text-white' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8]'"
          >
            All Requests ({{ withdrawals.length }})
          </button>

          <button
            type="button"
            @click="withdrawalSubTab = 'PENDING'"
            class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1"
            :class="withdrawalSubTab === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8]'"
          >
            <span>Pending Review</span>
            <span
              v-if="pendingWithdrawalsCount > 0"
              class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
              :class="withdrawalSubTab === 'PENDING' ? 'bg-white text-amber-700' : 'bg-amber-100 text-amber-800'"
            >
              {{ pendingWithdrawalsCount }}
            </span>
          </button>

          <button
            type="button"
            @click="withdrawalSubTab = 'CUSTOMER'"
            class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition"
            :class="withdrawalSubTab === 'CUSTOMER' ? 'bg-[#800020] text-white' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8]'"
          >
            Customer Requests
          </button>

          <button
            type="button"
            @click="withdrawalSubTab = 'PARTNER'"
            class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition"
            :class="withdrawalSubTab === 'PARTNER' ? 'bg-[#800020] text-white' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8]'"
          >
            Partner Requests
          </button>

          <button
            type="button"
            @click="withdrawalSubTab = 'COMPLETED'"
            class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition"
            :class="withdrawalSubTab === 'COMPLETED' ? 'bg-emerald-700 text-white' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8]'"
          >
            Completed Payouts
          </button>

          <button
            type="button"
            @click="withdrawalSubTab = 'REJECTED'"
            class="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition"
            :class="withdrawalSubTab === 'REJECTED' ? 'bg-red-700 text-white' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8]'"
          >
            Rejected
          </button>
        </div>

        <!-- Filter Row -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="relative w-full sm:w-80">
            <Search class="size-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              v-model="withdrawalSearch"
              type="text"
              placeholder="Search by Request ID, user name, mobile, UTR..."
              class="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
            />
          </div>

          <button
            type="button"
            @click="exportWithdrawals"
            class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#202124] hover:bg-[#F7F7F8] transition"
          >
            <Download class="size-3.5 text-[#6B7280]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <!-- Data Table -->
      <div class="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-[#202124]">
            <thead class="bg-[#F7F7F8] border-b border-[#E5E7EB] text-[#6B7280] font-semibold">
              <tr>
                <th class="py-3 px-4">Request ID</th>
                <th class="py-3 px-4">User Type</th>
                <th class="py-3 px-4">User Details</th>
                <th class="py-3 px-4 text-right">Amount</th>
                <th class="py-3 px-4">Payout Method</th>
                <th class="py-3 px-4">Bank Account</th>
                <th class="py-3 px-4">Requested At</th>
                <th class="py-3 px-4 text-center">Status</th>
                <th class="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E5E7EB]">
              <tr v-if="filteredWithdrawals.length === 0">
                <td colspan="9" class="py-8 text-center text-[#6B7280]">
                  No withdrawal requests match your search or filter criteria.
                </td>
              </tr>
              <tr
                v-for="w in filteredWithdrawals"
                :key="w.id"
                class="hover:bg-[#F7F7F8] transition"
              >
                <td class="py-3 px-4 font-mono font-bold text-[#800020]">
                  #{{ w.id.slice(0, 8) }}
                </td>
                <td class="py-3 px-4">
                  <span
                    class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    :class="w.userType === 'CUSTOMER' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'"
                  >
                    {{ w.userType }}
                  </span>
                </td>
                <td class="py-3 px-4">
                  <div class="font-bold text-[#202124]">{{ w.userName }}</div>
                  <div class="font-mono text-[11px] text-[#6B7280]">{{ w.mobileNo }}</div>
                </td>
                <td class="py-3 px-4 text-right font-black text-[#202124]">
                  {{ formatCurrency(w.requestedAmount) }}
                </td>
                <td class="py-3 px-4 text-[#6B7280]">
                  {{ w.paymentMethod }}
                </td>
                <td class="py-3 px-4">
                  <div class="font-mono text-[#202124]">{{ w.bankAccountMasked }}</div>
                  <div class="text-[11px] text-[#6B7280]">IFSC: {{ w.ifsc }}</div>
                </td>
                <td class="py-3 px-4 text-[#6B7280]">
                  {{ w.requestedAt ? new Date(w.requestedAt).toLocaleDateString() : '—' }}
                </td>
                <td class="py-3 px-4 text-center">
                  <span
                    class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    :class="{
                      'bg-amber-50 text-amber-800 border border-amber-200': w.status === 'PENDING',
                      'bg-emerald-50 text-emerald-700 border border-emerald-200': w.status === 'SUCCESS',
                      'bg-red-50 text-red-700 border border-red-200': w.status === 'REJECTED',
                      'bg-gray-100 text-gray-700': w.status === 'FAILED',
                    }"
                  >
                    {{ w.status }}
                  </span>
                </td>
                <td class="py-3 px-4 text-center">
                  <button
                    type="button"
                    @click="openWithdrawalModal(w)"
                    class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                    :class="w.status === 'PENDING' ? 'bg-[#800020] text-white hover:bg-[#66001a]' : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:bg-[#F7F7F8]'"
                  >
                    <span>{{ w.status === 'PENDING' ? 'Review & Settle' : 'View Details' }}</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- TAB 5: REVENUE ANALYTICS                                              -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <div v-show="activeTab === 'revenue'" class="space-y-6">
      <!-- High Level Revenue Breakdown Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- 1. GMV -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-2">
          <div class="text-xs font-medium text-[#6B7280] uppercase tracking-wider">Gross Merchandise Value (GMV)</div>
          <div class="text-2xl font-black text-[#202124]">
            {{ formatCurrency(revenueData?.gmv) }}
          </div>
          <div class="text-xs text-[#6B7280]">
            Total marketplace order value
          </div>
        </div>

        <!-- 2. Recognized Revenue -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-2">
          <div class="text-xs font-medium text-[#6B7280] uppercase tracking-wider">Recognized Platform Revenue</div>
          <div class="text-2xl font-black text-[#800020]">
            {{ formatCurrency(revenueData?.recognizedRevenue) }}
          </div>
          <div class="text-xs text-emerald-700 font-semibold">
            Booking commissions + Subscriptions
          </div>
        </div>

        <!-- 3. Discounts & Refunds -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-2">
          <div class="text-xs font-medium text-[#6B7280] uppercase tracking-wider">Discounts & Refunds</div>
          <div class="text-2xl font-black text-red-600">
            -{{ formatCurrency((revenueData?.refunds || 0) + (revenueData?.discounts || 0)) }}
          </div>
          <div class="text-xs text-[#6B7280]">
            Refunds: {{ formatCurrency(revenueData?.refunds) }} | Coupons: {{ formatCurrency(revenueData?.discounts) }}
          </div>
        </div>

        <!-- 4. Net Revenue -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-2">
          <div class="text-xs font-medium text-[#6B7280] uppercase tracking-wider">Net Realized Revenue</div>
          <div class="text-2xl font-black text-emerald-700">
            {{ formatCurrency(revenueData?.netRevenue) }}
          </div>
          <div class="text-xs text-[#6B7280]">
            Realized bottom-line margin
          </div>
        </div>
      </div>

      <!-- Periodic Breakdown Table -->
      <div class="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-xs space-y-4 p-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-[#202124]">Periodic Financial Statement</h3>
            <p class="text-xs text-[#6B7280]">Detailed breakdown of order volume, revenue recognition, deductions, and margins.</p>
          </div>
          <button
            type="button"
            @click="exportRevenueReport"
            class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#E5E7EB] bg-white text-xs font-semibold text-[#202124] hover:bg-[#F7F7F8] transition"
          >
            <Download class="size-4 text-[#6B7280]" />
            <span>Export Statement</span>
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-[#202124]">
            <thead class="bg-[#F7F7F8] border-b border-[#E5E7EB] text-[#6B7280] font-semibold">
              <tr>
                <th class="py-3 px-4">Period</th>
                <th class="py-3 px-4 text-right">GMV</th>
                <th class="py-3 px-4 text-right">Recognized Revenue</th>
                <th class="py-3 px-4 text-right">Commissions</th>
                <th class="py-3 px-4 text-right">Subscriptions</th>
                <th class="py-3 px-4 text-right">Refunds</th>
                <th class="py-3 px-4 text-right">Discounts</th>
                <th class="py-3 px-4 text-right font-black">Net Margin</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E5E7EB]">
              <tr
                v-for="r in revenueData?.periodicBreakdown || []"
                :key="r.period"
                class="hover:bg-[#F7F7F8] transition"
              >
                <td class="py-3 px-4 font-bold text-[#202124]">
                  {{ r.period }}
                </td>
                <td class="py-3 px-4 text-right font-mono text-[#6B7280]">
                  {{ formatCurrency(r.gmv) }}
                </td>
                <td class="py-3 px-4 text-right font-mono font-bold text-[#800020]">
                  {{ formatCurrency(r.recognizedRevenue) }}
                </td>
                <td class="py-3 px-4 text-right font-mono text-[#202124]">
                  {{ formatCurrency(r.bookingCommissions) }}
                </td>
                <td class="py-3 px-4 text-right font-mono text-[#202124]">
                  {{ formatCurrency(r.subscriptions) }}
                </td>
                <td class="py-3 px-4 text-right font-mono text-red-600">
                  -{{ formatCurrency(r.refunds) }}
                </td>
                <td class="py-3 px-4 text-right font-mono text-red-600">
                  -{{ formatCurrency(r.discounts) }}
                </td>
                <td class="py-3 px-4 text-right font-mono font-black text-emerald-700">
                  {{ formatCurrency(r.netRevenue) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- TAB 6: FINANCIAL REPORTS                                              -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <div v-show="activeTab === 'reports'" class="space-y-6">
      <div class="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
        <div>
          <h2 class="text-lg font-bold text-[#202124]">Audit & Financial Report Exports</h2>
          <p class="text-xs text-[#6B7280]">Generate CSV extracts of platform balances, transaction histories, withdrawal queues, and tax statements.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          <!-- 1. Customer Wallets Export -->
          <div class="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3 hover:shadow-xs transition">
            <div class="size-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users class="size-5" />
            </div>
            <div>
              <h4 class="text-sm font-bold text-[#202124]">Customer Wallet Balances</h4>
              <p class="text-xs text-[#6B7280] mt-1">Export customer balances, bonus allocations, total debits, and last transaction dates.</p>
            </div>
            <button
              type="button"
              @click="exportCustomerWallets"
              class="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#800020] text-white text-xs font-semibold hover:bg-[#66001a] transition"
            >
              <Download class="size-3.5" />
              <span>Download Customer Ledger CSV</span>
            </button>
          </div>

          <!-- 2. Partner Wallets Export -->
          <div class="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3 hover:shadow-xs transition">
            <div class="size-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Briefcase class="size-5" />
            </div>
            <div>
              <h4 class="text-sm font-bold text-[#202124]">Partner Wallet & Earnings</h4>
              <p class="text-xs text-[#6B7280] mt-1">Export partner earnings, locked escrow amounts, completed withdrawals, and net balances.</p>
            </div>
            <button
              type="button"
              @click="exportPartnerWallets"
              class="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#800020] text-white text-xs font-semibold hover:bg-[#66001a] transition"
            >
              <Download class="size-3.5" />
              <span>Download Partner Ledger CSV</span>
            </button>
          </div>

          <!-- 3. Withdrawal Queue Export -->
          <div class="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3 hover:shadow-xs transition">
            <div class="size-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <ArrowDownToLine class="size-5" />
            </div>
            <div>
              <h4 class="text-sm font-bold text-[#202124]">Withdrawals & Payout Queue</h4>
              <p class="text-xs text-[#6B7280] mt-1">Complete log of customer and partner payout requests, IFSC, bank accounts, and UTR numbers.</p>
            </div>
            <button
              type="button"
              @click="exportWithdrawals"
              class="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#800020] text-white text-xs font-semibold hover:bg-[#66001a] transition"
            >
              <Download class="size-3.5" />
              <span>Download Withdrawals CSV</span>
            </button>
          </div>

          <!-- 4. Revenue & Margin Statement -->
          <div class="bg-white border border-[#E5E7EB] rounded-2xl p-5 space-y-3 hover:shadow-xs transition">
            <div class="size-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <TrendingUp class="size-5" />
            </div>
            <div>
              <h4 class="text-sm font-bold text-[#202124]">Platform Revenue & P&L Statement</h4>
              <p class="text-xs text-[#6B7280] mt-1">Monthly breakdown of gross booking value, commissions, subscriptions, and realized net revenue.</p>
            </div>
            <button
              type="button"
              @click="exportRevenueReport"
              class="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#800020] text-white text-xs font-semibold hover:bg-[#66001a] transition"
            >
              <Download class="size-3.5" />
              <span>Download Revenue Statement CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- MODAL 1: USER WALLET PROFILE & TRANSACTION LEDGER                     -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <Popup
      v-model="isWalletModalOpen"
      :title="`Wallet Profile: ${selectedWalletDetail?.name || 'User Ledger'}`"
      size="xl"
    >
      <div v-if="isDetailLoading" class="p-12 text-center text-[#6B7280]">
        <RefreshCw class="size-6 animate-spin mx-auto text-[#800020] mb-2" />
        <p class="text-xs">Loading ledger details...</p>
      </div>

      <div v-else-if="selectedWalletDetail" class="space-y-5">
        <!-- User Header Info -->
        <div class="bg-[#F7F7F8] border border-[#E5E7EB] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="size-12 rounded-full bg-[#800020]/10 text-[#800020] font-black flex items-center justify-center text-sm">
              {{ selectedWalletDetail.name.slice(0, 2).toUpperCase() }}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-base font-bold text-[#202124]">{{ selectedWalletDetail.name }}</span>
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  :class="selectedWalletDetail.role === 'CUSTOMER' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'"
                >
                  {{ selectedWalletDetail.role }}
                </span>
              </div>
              <div class="text-xs text-[#6B7280] font-mono mt-0.5">
                {{ selectedWalletDetail.displayId }} • {{ selectedWalletDetail.mobileNo }} • {{ selectedWalletDetail.emailId }}
              </div>
            </div>
          </div>

          <div class="text-right">
            <div class="text-xs text-[#6B7280]">Current Available Balance</div>
            <div class="text-2xl font-black text-emerald-700">
              {{ formatCurrency(selectedWalletDetail.availableBalance) }}
            </div>
          </div>
        </div>

        <!-- Balances Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div class="bg-white border border-[#E5E7EB] p-3 rounded-xl">
            <div class="text-[#6B7280]">Available Balance</div>
            <div class="text-sm font-black text-[#202124] mt-0.5">{{ formatCurrency(selectedWalletDetail.availableBalance) }}</div>
          </div>
          <div class="bg-white border border-[#E5E7EB] p-3 rounded-xl">
            <div class="text-[#6B7280]">Bonus / Non-Withdrawable</div>
            <div class="text-sm font-black text-[#202124] mt-0.5">{{ formatCurrency(selectedWalletDetail.nonWithdrawableBalance) }}</div>
          </div>
          <div class="bg-white border border-[#E5E7EB] p-3 rounded-xl">
            <div class="text-[#6B7280]">Locked / Escrow Amount</div>
            <div class="text-sm font-black text-amber-700 mt-0.5">{{ formatCurrency(selectedWalletDetail.reservedBalance) }}</div>
          </div>
          <div class="bg-white border border-[#E5E7EB] p-3 rounded-xl">
            <div class="text-[#6B7280]">Total Gross Balance</div>
            <div class="text-sm font-black text-[#800020] mt-0.5">{{ formatCurrency(selectedWalletDetail.totalBalance) }}</div>
          </div>
        </div>

        <!-- Bank Details if Present -->
        <div v-if="selectedWalletDetail.bankAccountMasked" class="bg-white border border-[#E5E7EB] rounded-2xl p-4 flex items-center justify-between text-xs">
          <div class="flex items-center gap-3">
            <Building2 class="size-5 text-[#800020]" />
            <div>
              <div class="font-bold text-[#202124]">Primary Bank Account: {{ selectedWalletDetail.bankAccountMasked }}</div>
              <div class="text-[#6B7280]">IFSC: {{ selectedWalletDetail.ifsc }} | Holder: {{ selectedWalletDetail.bankHolderName || selectedWalletDetail.name }}</div>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Verified Bank
          </span>
        </div>

        <!-- Transaction History -->
        <div class="space-y-2">
          <h4 class="text-xs font-bold text-[#202124] uppercase tracking-wider">Transaction Ledger History ({{ selectedWalletDetail.transactions.length }})</h4>
          <div class="border border-[#E5E7EB] rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-[#F7F7F8] border-b border-[#E5E7EB] text-[#6B7280] font-semibold sticky top-0">
                <tr>
                  <th class="py-2.5 px-3">Date</th>
                  <th class="py-2.5 px-3">Type</th>
                  <th class="py-2.5 px-3 text-right">Amount</th>
                  <th class="py-2.5 px-3">Description</th>
                  <th class="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E5E7EB]">
                <tr v-if="selectedWalletDetail.transactions.length === 0">
                  <td colspan="5" class="py-4 text-center text-[#6B7280]">No transaction records found.</td>
                </tr>
                <tr
                  v-for="tx in selectedWalletDetail.transactions"
                  :key="tx.id"
                  class="hover:bg-[#F7F7F8]"
                >
                  <td class="py-2.5 px-3 text-[#6B7280]">
                    {{ tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '—' }}
                  </td>
                  <td class="py-2.5 px-3 font-semibold text-[#202124]">
                    {{ tx.transactionType }}
                  </td>
                  <td
                    class="py-2.5 px-3 text-right font-black"
                    :class="['RECHARGE', 'REFUND', 'WELCOME_BONUS', 'PARTNER_SETTLEMENT', 'CANCELLATION_COMPENSATION'].includes(tx.transactionType) ? 'text-emerald-700' : 'text-red-600'"
                  >
                    {{ ['RECHARGE', 'REFUND', 'WELCOME_BONUS', 'PARTNER_SETTLEMENT', 'CANCELLATION_COMPENSATION'].includes(tx.transactionType) ? '+' : '-' }}{{ formatCurrency(tx.amount) }}
                  </td>
                  <td class="py-2.5 px-3 text-[#6B7280] max-w-xs truncate" :title="tx.description">
                    {{ tx.description || '—' }}
                  </td>
                  <td class="py-2.5 px-3 text-center">
                    <span
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      :class="tx.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : tx.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'"
                    >
                      {{ tx.status || 'SUCCESS' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Popup>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- MODAL 2: WITHDRAWAL REVIEW & APPROVAL                                 -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <Popup
      v-model="isWithdrawalModalOpen"
      :title="`Withdrawal Request #${activeWithdrawal?.id.slice(0, 8)}`"
      size="md"
    >
      <div v-if="activeWithdrawal" class="space-y-4 text-xs">
        <!-- User Details Card -->
        <div class="bg-[#F7F7F8] border border-[#E5E7EB] p-4 rounded-xl space-y-1">
          <div class="flex items-center justify-between">
            <span class="font-bold text-sm text-[#202124]">{{ activeWithdrawal.userName }}</span>
            <span
              class="px-2 py-0.5 rounded-full text-[10px] font-bold"
              :class="activeWithdrawal.userType === 'CUSTOMER' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'"
            >
              {{ activeWithdrawal.userType }}
            </span>
          </div>
          <div class="text-[#6B7280] font-mono">
            {{ activeWithdrawal.displayId }} • {{ activeWithdrawal.mobileNo }}
          </div>
        </div>

        <!-- Amount & Bank Card -->
        <div class="bg-white border border-[#E5E7EB] p-4 rounded-xl space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-[#6B7280]">Requested Payout Amount:</span>
            <span class="text-xl font-black text-[#800020]">{{ formatCurrency(activeWithdrawal.requestedAmount) }}</span>
          </div>
          <div class="flex items-center justify-between border-t border-[#E5E7EB] pt-2">
            <span class="text-[#6B7280]">Current Available Balance:</span>
            <span class="font-bold text-emerald-700">{{ formatCurrency(activeWithdrawal.availableBalanceAtRequest) }}</span>
          </div>
          <div class="border-t border-[#E5E7EB] pt-2 space-y-1">
            <div class="font-bold text-[#202124]">Bank Account Details:</div>
            <div class="text-[#6B7280]">Account: <span class="font-mono text-[#202124]">{{ activeWithdrawal.bankAccountMasked }}</span></div>
            <div class="text-[#6B7280]">IFSC: <span class="font-mono text-[#202124]">{{ activeWithdrawal.ifsc }}</span></div>
            <div class="text-[#6B7280]">Beneficiary Name: <span class="font-semibold text-[#202124]">{{ activeWithdrawal.bankUserName }}</span></div>
          </div>
        </div>

        <!-- Approval Inputs (If Pending) -->
        <div v-if="activeWithdrawal.status === 'PENDING'" class="space-y-3">
          <div>
            <label class="block font-bold text-[#202124] mb-1">
              Payment Provider Reference / UTR Number (Optional)
            </label>
            <input
              v-model="approveForm.utrReference"
              type="text"
              placeholder="e.g. UTR-20261103-984391"
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
            />
          </div>

          <div>
            <label class="block font-bold text-[#202124] mb-1">Internal Remarks</label>
            <input
              v-model="approveForm.remarks"
              type="text"
              placeholder="Disbursed via bank transfer"
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
            />
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
            <button
              type="button"
              @click="openRejectModal(activeWithdrawal)"
              :disabled="isActionLoading"
              class="px-4 py-2.5 rounded-xl text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition border border-red-200"
            >
              Reject Request
            </button>
            <button
              type="button"
              @click="confirmApproveWithdrawal"
              :disabled="isActionLoading"
              class="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#800020] hover:bg-[#66001a] transition shadow-xs disabled:opacity-60"
            >
              Approve & Confirm Settlement
            </button>
          </div>
        </div>

        <div v-else class="bg-[#F7F7F8] p-3 rounded-xl border border-[#E5E7EB] text-[#6B7280]">
          Status: <span class="font-bold uppercase text-[#202124]">{{ activeWithdrawal.status }}</span>
          <div v-if="activeWithdrawal.transactionId" class="mt-1">
            UTR / Ref: <span class="font-mono text-[#202124]">{{ activeWithdrawal.transactionId }}</span>
          </div>
          <div v-if="activeWithdrawal.statusReason" class="mt-1">
            Remarks/Reason: {{ activeWithdrawal.statusReason }}
          </div>
        </div>
      </div>
    </Popup>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- MODAL 3: WITHDRAWAL REJECTION DIALOG                                  -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <Popup
      v-model="isRejectModalOpen"
      title="Reject Withdrawal Request"
      size="sm"
    >
      <div class="space-y-4 text-xs">
        <p class="text-[#6B7280] leading-relaxed">
          Please provide a reason for rejecting withdrawal <span class="font-mono font-bold text-[#800020]">#{{ activeWithdrawal?.id.slice(0, 8) }}</span>. The locked funds (<span class="font-bold text-[#202124]">{{ formatCurrency(activeWithdrawal?.requestedAmount) }}</span>) will automatically be released and credited back to the user's available wallet balance.
        </p>

        <div>
          <label class="block font-bold text-[#202124] mb-1">Mandatory Rejection Reason *</label>
          <textarea
            v-model="rejectReason"
            rows="3"
            placeholder="e.g. Invalid bank account IFSC, suspicious activity, or customer requested cancellation."
            class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            @click="isRejectModalOpen = false"
            class="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:bg-[#F7F7F8]"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="confirmRejectWithdrawal"
            :disabled="isActionLoading || !rejectReason.trim()"
            class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50"
          >
            Confirm Rejection & Refund
          </button>
        </div>
      </div>
    </Popup>
  </div>
</template>

