<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api'
import type {
  SubscriptionStats,
  CustomerPlan,
  PartnerPlan,
  CreateCustomerPlanPayload,
  CreatePartnerPlanPayload,
  UserSubscriptionItem,
  UserSubscriptionDetail,
  SubscriptionTransaction,
  SubscriptionReports,
} from '@/types/api'
import Table, { type Header } from '@/components/common/Table.vue'
import Popup from '@/components/common/Popup.vue'
import { showToast } from '@/utils/toast'
import {
  CreditCard,
  Users,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Calendar,
  Send,
  Sliders,
  Copy,
  Pen,
  Trash2,
  ArrowRight,
  Sparkles,
  Award,
  Zap,
  BarChart3,
  Percent,
  Check,
  ChevronRight,
  Filter,
} from 'lucide-vue-next'

// ── NAVIGATION & TABS ────────────────────────────────────────────────────────
type MainTab = 'customers' | 'partners' | 'expiry' | 'transactions' | 'reports'
const activeTab = ref<MainTab>('customers')
const customerSubTab = ref<'plans' | 'users'>('plans')
const partnerSubTab = ref<'plans' | 'users'>('plans')
const expiryFilter = ref<'all' | '7days' | '3days' | 'tomorrow' | 'expired'>('all')

// ── DATE FILTER PRESETS ──────────────────────────────────────────────────────
type DatePreset = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'ALL'
const selectedDatePreset = ref<DatePreset>('ALL')

// ── STATE ────────────────────────────────────────────────────────────────────
const isLoading = ref(false)
const stats = ref<SubscriptionStats | null>(null)
const customerPlans = ref<CustomerPlan[]>([])
const partnerPlans = ref<PartnerPlan[]>([])
const userSubscriptions = ref<UserSubscriptionItem[]>([])
const transactions = ref<SubscriptionTransaction[]>([])
const reports = ref<SubscriptionReports | null>(null)

// Search & Filtering
const userSearchQuery = ref('')
const selectedCityFilter = ref('ALL')
const selectedStatusFilter = ref('ALL')
const txSearchQuery = ref('')
const txUserTypeFilter = ref('ALL')
const txStatusFilter = ref('ALL')

// Modals
const isCustomerPlanModalOpen = ref(false)
const isPartnerPlanModalOpen = ref(false)
const isDetailDrawerOpen = ref(false)
const isExtendModalOpen = ref(false)
const isChangePlanModalOpen = ref(false)
const isCancelModalOpen = ref(false)
const isReminderModalOpen = ref(false)

const isEditingPlan = ref(false)
const currentPlanId = ref<string | null>(null)
const selectedUserSub = ref<UserSubscriptionDetail | null>(null)
const isActionLoading = ref(false)

// Form Models
const customerPlanForm = ref<CreateCustomerPlanPayload>({
  name: '',
  description: '',
  price: 299,
  durationDays: 30,
  discountPercent: 5.0,
  maxDiscountAmount: 150,
  minBookingAmount: 199,
  benefits: '',
  isActive: true,
  autoRenewAvailable: true,
})

const partnerPlanForm = ref<CreatePartnerPlanPayload>({
  name: '',
  description: '',
  price: 3000,
  durationDays: 30,
  platformChargePercent: 10.0,
  autoAcceptOrderLimit: 20,
  isAutoOnlineIncluded: true,
  benefits: '',
  isActive: true,
})

const extendDays = ref<number>(30)
const extendReason = ref<string>('Courtesy extension approved by admin')
const changePlanNewId = ref<string>('')
const changePlanReason = ref<string>('Tier upgrade requested by customer')
const cancelReason = ref<string>('')
const reminderTitle = ref<string>('OmiBay Membership Expiry Notice')
const reminderMessage = ref<string>('')

// ── DATA FETCHING ────────────────────────────────────────────────────────────
async function loadDashboard() {
  isLoading.value = true
  try {
    const [statsRes, custPlansRes, partPlansRes, userSubsRes, txsRes, reportsRes] = await Promise.all([
      api.subscriptions.getStats({ period: selectedDatePreset.value }),
      api.subscriptions.getCustomerPlans(),
      api.subscriptions.getPartnerPlans(),
      api.subscriptions.getUserSubscriptions(),
      api.subscriptions.getTransactions(),
      api.subscriptions.getReports({ period: selectedDatePreset.value }),
    ])

    stats.value = (statsRes as any)?.data ?? statsRes
    customerPlans.value = (custPlansRes as any)?.data ?? custPlansRes ?? []
    partnerPlans.value = (partPlansRes as any)?.data ?? partPlansRes ?? []
    userSubscriptions.value = (userSubsRes as any)?.data ?? userSubsRes ?? []
    transactions.value = (txsRes as any)?.data ?? txsRes ?? []
    reports.value = (reportsRes as any)?.data ?? reportsRes
  } catch (err: any) {
    showToast(err?.message || 'Failed to load subscription information', 'error')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadDashboard()
})

// ── FILTERED DATASETS ────────────────────────────────────────────────────────
const filteredCustomerUsers = computed(() => {
  return userSubscriptions.value.filter(u => {
    if (u.subscriberType !== 'CUSTOMER') return false
    if (selectedStatusFilter.value !== 'ALL' && u.status !== selectedStatusFilter.value) return false
    if (selectedCityFilter.value !== 'ALL' && u.cityName && !u.cityName.toLowerCase().includes(selectedCityFilter.value.toLowerCase())) return false
    if (userSearchQuery.value) {
      const q = userSearchQuery.value.toLowerCase()
      const match = u.userName.toLowerCase().includes(q) ||
        u.userMobile.includes(q) ||
        (u.userDisplayId && u.userDisplayId.toLowerCase().includes(q)) ||
        u.planName.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })
})

const filteredPartnerUsers = computed(() => {
  return userSubscriptions.value.filter(u => {
    if (u.subscriberType !== 'PARTNER') return false
    if (selectedStatusFilter.value !== 'ALL' && u.status !== selectedStatusFilter.value) return false
    if (selectedCityFilter.value !== 'ALL' && u.cityName && !u.cityName.toLowerCase().includes(selectedCityFilter.value.toLowerCase())) return false
    if (userSearchQuery.value) {
      const q = userSearchQuery.value.toLowerCase()
      const match = u.userName.toLowerCase().includes(q) ||
        u.userMobile.includes(q) ||
        (u.userDisplayId && u.userDisplayId.toLowerCase().includes(q)) ||
        u.planName.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })
})

const expiringSubscriptionsList = computed(() => {
  return userSubscriptions.value.filter(u => {
    if (expiryFilter.value === '7days') return u.daysRemaining >= 0 && u.daysRemaining <= 7 && u.status === 'ACTIVE'
    if (expiryFilter.value === '3days') return u.daysRemaining >= 0 && u.daysRemaining <= 3 && u.status === 'ACTIVE'
    if (expiryFilter.value === 'tomorrow') return u.daysRemaining === 1 && u.status === 'ACTIVE'
    if (expiryFilter.value === 'expired') return u.status === 'EXPIRED'
    // 'all' includes expiring in <= 7 days + expired
    return (u.daysRemaining >= 0 && u.daysRemaining <= 7) || u.status === 'EXPIRED'
  })
})

const filteredTransactions = computed(() => {
  return transactions.value.filter(tx => {
    if (txUserTypeFilter.value !== 'ALL' && tx.userType !== txUserTypeFilter.value) return false
    if (txStatusFilter.value !== 'ALL' && tx.paymentStatus !== txStatusFilter.value) return false
    if (txSearchQuery.value) {
      const q = txSearchQuery.value.toLowerCase()
      const match = tx.transactionId.toLowerCase().includes(q) ||
        tx.userName.toLowerCase().includes(q) ||
        (tx.userMobile && tx.userMobile.includes(q)) ||
        tx.subscriptionPlan.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })
})

// Unique Cities for Filter Dropdown
const availableCities = computed(() => {
  const set = new Set<string>()
  userSubscriptions.value.forEach(u => {
    if (u.cityName && u.cityName !== 'All Cities' && u.cityName !== '—') set.add(u.cityName)
  })
  return Array.from(set)
})

// ── TABLE HEADERS ────────────────────────────────────────────────────────────
const customerTableHeaders: Header[] = [
  { key: 'user', title: 'Customer Details', align: 'left', sortable: true },
  { key: 'plan', title: 'Membership Plan', align: 'left', sortable: true },
  { key: 'dates', title: 'Active Validity', align: 'left', sortable: true },
  { key: 'benefits', title: 'Discount Benefit', align: 'left' },
  { key: 'status', title: 'Status', align: 'center', sortable: true },
  { key: 'actions', title: 'Actions', align: 'right' },
]

const partnerTableHeaders: Header[] = [
  { key: 'partner', title: 'Partner Details', align: 'left', sortable: true },
  { key: 'plan', title: 'Partner Club Plan', align: 'left', sortable: true },
  { key: 'commission', title: 'Commission Tier', align: 'left' },
  { key: 'validity', title: 'Validity / Days', align: 'left', sortable: true },
  { key: 'status', title: 'Status', align: 'center', sortable: true },
  { key: 'actions', title: 'Actions', align: 'right' },
]

const expiryTableHeaders: Header[] = [
  { key: 'user', title: 'Subscriber', align: 'left', sortable: true },
  { key: 'type', title: 'Role', align: 'center' },
  { key: 'plan', title: 'Current Plan', align: 'left' },
  { key: 'expiry', title: 'Expiry Date', align: 'left', sortable: true },
  { key: 'daysRemaining', title: 'Time Remaining', align: 'center', sortable: true },
  { key: 'actions', title: 'Quick Action', align: 'right' },
]

const txTableHeaders: Header[] = [
  { key: 'txId', title: 'Transaction Ref', align: 'left' },
  { key: 'user', title: 'Paid By', align: 'left', sortable: true },
  { key: 'plan', title: 'Plan / Description', align: 'left' },
  { key: 'amount', title: 'Amount', align: 'right', sortable: true },
  { key: 'method', title: 'Method / Gateway', align: 'left' },
  { key: 'status', title: 'Payment Status', align: 'center', sortable: true },
  { key: 'date', title: 'Transaction Date', align: 'left', sortable: true },
]

// ── PLAN ACTIONS ─────────────────────────────────────────────────────────────
function openCreateCustomerPlan() {
  isEditingPlan.value = false
  currentPlanId.value = null
  customerPlanForm.value = {
    name: '',
    description: '',
    price: 499,
    durationDays: 30,
    discountPercent: 5.0,
    maxDiscountAmount: 150,
    minBookingAmount: 199,
    benefits: '5% instant discount, zero surge fees, priority technician dispatch',
    isActive: true,
    autoRenewAvailable: true,
  }
  isCustomerPlanModalOpen.value = true
}

function openEditCustomerPlan(plan: CustomerPlan) {
  isEditingPlan.value = true
  currentPlanId.value = plan.planId
  customerPlanForm.value = {
    name: plan.name,
    description: plan.description || '',
    price: plan.price,
    durationDays: plan.durationDays,
    discountPercent: plan.discountPercent,
    maxDiscountAmount: plan.maxDiscountAmount,
    minBookingAmount: plan.minBookingAmount || 199,
    benefits: plan.benefits || plan.description || '',
    isActive: plan.isActive,
    autoRenewAvailable: plan.autoRenewAvailable ?? true,
  }
  isCustomerPlanModalOpen.value = true
}

async function saveCustomerPlan() {
  if (!customerPlanForm.value.name.trim()) {
    showToast('Plan name is required', 'error')
    return
  }
  isActionLoading.value = true
  try {
    if (isEditingPlan.value && currentPlanId.value) {
      await api.subscriptions.updateCustomerPlan(currentPlanId.value, customerPlanForm.value)
      showToast('Customer plan updated successfully', 'success')
    } else {
      await api.subscriptions.createCustomerPlan(customerPlanForm.value)
      showToast('Customer plan created successfully', 'success')
    }
    isCustomerPlanModalOpen.value = false
    loadDashboard()
  } catch (err: any) {
    showToast(err?.message || 'Failed to save customer plan', 'error')
  } finally {
    isActionLoading.value = false
  }
}

async function toggleCustomerPlanStatus(plan: CustomerPlan) {
  try {
    await api.subscriptions.updateCustomerPlanStatus(plan.planId, !plan.isActive)
    showToast(`Plan ${plan.name} status updated`, 'success')
    loadDashboard()
  } catch (err: any) {
    showToast(err?.message || 'Failed to update plan status', 'error')
  }
}

async function duplicateCustomerPlan(plan: CustomerPlan) {
  try {
    await api.subscriptions.duplicateCustomerPlan(plan.planId)
    showToast(`Plan "${plan.name}" duplicated`, 'success')
    loadDashboard()
  } catch (err: any) {
    showToast(err?.message || 'Failed to duplicate plan', 'error')
  }
}

function openCreatePartnerPlan() {
  isEditingPlan.value = false
  currentPlanId.value = null
  partnerPlanForm.value = {
    name: '',
    description: '',
    price: 3500,
    durationDays: 30,
    platformChargePercent: 10.0,
    autoAcceptOrderLimit: 25,
    isAutoOnlineIncluded: true,
    benefits: 'Halved commission rate (10%), auto-online enabled, up to 25 daily auto-accepts',
    isActive: true,
  }
  isPartnerPlanModalOpen.value = true
}

function openEditPartnerPlan(plan: PartnerPlan) {
  isEditingPlan.value = true
  currentPlanId.value = plan.planId
  partnerPlanForm.value = {
    name: plan.name,
    description: plan.description || '',
    price: plan.price,
    durationDays: plan.durationDays,
    platformChargePercent: plan.platformChargePercent,
    autoAcceptOrderLimit: plan.autoAcceptOrderLimit,
    isAutoOnlineIncluded: plan.isAutoOnlineIncluded,
    benefits: plan.benefits || plan.description || '',
    isActive: plan.isActive,
  }
  isPartnerPlanModalOpen.value = true
}

async function savePartnerPlan() {
  if (!partnerPlanForm.value.name.trim()) {
    showToast('Plan name is required', 'error')
    return
  }
  isActionLoading.value = true
  try {
    if (isEditingPlan.value && currentPlanId.value) {
      await api.subscriptions.updatePartnerPlan(currentPlanId.value, partnerPlanForm.value)
      showToast('Partner plan updated successfully', 'success')
    } else {
      await api.subscriptions.createPartnerPlan(partnerPlanForm.value)
      showToast('Partner plan created successfully', 'success')
    }
    isPartnerPlanModalOpen.value = false
    loadDashboard()
  } catch (err: any) {
    showToast(err?.message || 'Failed to save partner plan', 'error')
  } finally {
    isActionLoading.value = false
  }
}

async function togglePartnerPlanStatus(plan: PartnerPlan) {
  try {
    await api.subscriptions.updatePartnerPlanStatus(plan.planId, !plan.isActive)
    showToast(`Partner plan ${plan.name} status updated`, 'success')
    loadDashboard()
  } catch (err: any) {
    showToast(err?.message || 'Failed to update plan status', 'error')
  }
}

async function duplicatePartnerPlan(plan: PartnerPlan) {
  try {
    await api.subscriptions.duplicatePartnerPlan(plan.planId)
    showToast(`Partner plan "${plan.name}" duplicated`, 'success')
    loadDashboard()
  } catch (err: any) {
    showToast(err?.message || 'Failed to duplicate plan', 'error')
  }
}

// ── USER SUBSCRIPTION ACTIONS ────────────────────────────────────────────────
async function openInspectionDrawer(subId: string) {
  isLoading.value = true
  try {
    const res = await api.subscriptions.getById(subId)
    selectedUserSub.value = (res as any)?.data ?? res
    isDetailDrawerOpen.value = true
  } catch (err: any) {
    showToast(err?.message || 'Failed to load subscription details', 'error')
  } finally {
    isLoading.value = false
  }
}

function openExtendModal(sub: UserSubscriptionItem | UserSubscriptionDetail) {
  selectedUserSub.value = sub as any
  extendDays.value = 30
  extendReason.value = 'Courtesy validity extension approved by admin'
  isExtendModalOpen.value = true
}

async function submitExtension() {
  if (!selectedUserSub.value) return
  isActionLoading.value = true
  try {
    await api.subscriptions.extend(selectedUserSub.value.id, {
      additionalDays: Number(extendDays.value),
      reason: extendReason.value,
    })
    showToast(`Subscription extended by ${extendDays.value} days`, 'success')
    isExtendModalOpen.value = false
    if (isDetailDrawerOpen.value) {
      openInspectionDrawer(selectedUserSub.value.id)
    }
    loadDashboard()
  } catch (err: any) {
    showToast(err?.message || 'Failed to extend subscription', 'error')
  } finally {
    isActionLoading.value = false
  }
}

function openChangePlanModal(sub: UserSubscriptionItem | UserSubscriptionDetail) {
  selectedUserSub.value = sub as any
  changePlanNewId.value = ''
  changePlanReason.value = 'Subscriber tier adjustment requested'
  isChangePlanModalOpen.value = true
}

async function submitChangePlan() {
  if (!selectedUserSub.value || !changePlanNewId.value) {
    showToast('Please select a destination plan', 'error')
    return
  }
  isActionLoading.value = true
  try {
    await api.subscriptions.changePlan(selectedUserSub.value.id, {
      newPlanId: changePlanNewId.value,
      reason: changePlanReason.value,
    })
    showToast('Subscription plan updated successfully', 'success')
    isChangePlanModalOpen.value = false
    if (isDetailDrawerOpen.value) {
      openInspectionDrawer(selectedUserSub.value.id)
    }
    loadDashboard()
  } catch (err: any) {
    showToast(err?.message || 'Failed to change plan', 'error')
  } finally {
    isActionLoading.value = false
  }
}

function openCancelModal(sub: UserSubscriptionItem | UserSubscriptionDetail) {
  selectedUserSub.value = sub as any
  cancelReason.value = ''
  isCancelModalOpen.value = true
}

async function submitCancel() {
  if (!selectedUserSub.value) return
  if (!cancelReason.value.trim()) {
    showToast('Please specify a cancellation reason', 'error')
    return
  }
  isActionLoading.value = true
  try {
    await api.subscriptions.cancel(selectedUserSub.value.id, {
      reason: cancelReason.value,
    })
    showToast('Subscription cancelled successfully', 'success')
    isCancelModalOpen.value = false
    if (isDetailDrawerOpen.value) {
      openInspectionDrawer(selectedUserSub.value.id)
    }
    loadDashboard()
  } catch (err: any) {
    showToast(err?.message || 'Failed to cancel subscription', 'error')
  } finally {
    isActionLoading.value = false
  }
}

function openReminderModal(sub: UserSubscriptionItem | UserSubscriptionDetail) {
  selectedUserSub.value = sub as any
  reminderTitle.value = 'OmiBay Membership Expiry Notice'
  reminderMessage.value = `Hello ${sub.userName}, your OmiBay subscription (${sub.planName}) expires in ${sub.daysRemaining} days on ${sub.endDate}. Renew now to keep enjoying your booking privileges!`
  isReminderModalOpen.value = true
}

async function submitReminder() {
  if (!selectedUserSub.value) return
  isActionLoading.value = true
  try {
    await api.subscriptions.sendReminder(selectedUserSub.value.id, {
      title: reminderTitle.value,
      message: reminderMessage.value,
    })
    showToast('Renewal reminder notification dispatched via FCM', 'success')
    isReminderModalOpen.value = false
  } catch (err: any) {
    showToast(err?.message || 'Failed to send reminder', 'error')
  } finally {
    isActionLoading.value = false
  }
}

async function sendBulkRemindersToExpiring() {
  isActionLoading.value = true
  try {
    const res = await api.subscriptions.sendBulkReminder(7)
    const count = (res as any)?.data?.dispatchedCount ?? 0
    showToast(`Bulk renewal reminder sent to ${count} expiring subscribers`, 'success')
  } catch (err: any) {
    showToast(err?.message || 'Failed to send bulk reminders', 'error')
  } finally {
    isActionLoading.value = false
  }
}

// ── UTILITY HELPERS ──────────────────────────────────────────────────────────
function formatINR(val?: number): string {
  if (val === undefined || val === null) return '₹0'
  return '₹' + Number(val).toLocaleString('en-IN')
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function exportTransactionsCSV() {
  const rows = filteredTransactions.value.map(t => ({
    'Transaction ID': t.transactionId,
    'User Name': t.userName,
    'User Type': t.userType,
    'Plan': t.subscriptionPlan,
    'Amount': t.amount,
    'Method': t.paymentMethod,
    'Gateway': t.paymentGateway,
    'Status': t.paymentStatus,
    'Date': t.transactionDate,
  }))
  if (!rows.length || !rows[0]) {
    showToast('No transaction data to export', 'warning')
    return
  }
  const firstRow = rows[0]
  const headers = Object.keys(firstRow).join(',')
  const body = rows.map(r => Object.values(r).map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([headers + '\n' + body], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `omibay-subscription-transactions-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  showToast('Transactions exported as CSV', 'success')
}
</script>

<template>
  <div class="space-y-6 pb-16">
    <!-- ── 1. HEADER SECTION ──────────────────────────────────────────────── -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
      <div>
        <div class="flex items-center gap-2">
          <div class="size-8 rounded-lg bg-red-50 flex items-center justify-center text-[#800020] border border-red-100">
            <CreditCard class="size-4" />
          </div>
          <h1 class="text-xl font-bold text-[#202124]">Subscription & Membership Management</h1>
        </div>
        <p class="text-xs text-[#6B7280] mt-1">
          Configure customer memberships, partner commission passes, monitor renewals, track expiry and manage revenue.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          @click="loadDashboard"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#202124] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F7F7F8] transition"
          :disabled="isLoading"
          title="Refresh All Data"
        >
          <RefreshCw class="size-3.5" :class="{ 'animate-spin': isLoading }" />
          <span>Refresh</span>
        </button>

        <button
          type="button"
          @click="openCreateCustomerPlan"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#800020] bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
        >
          <Plus class="size-3.5" />
          <span>New Customer Plan</span>
        </button>

        <button
          type="button"
          @click="openCreatePartnerPlan"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#800020] rounded-lg hover:bg-[#990026] transition shadow-xs"
        >
          <Plus class="size-3.5" />
          <span>New Partner Plan</span>
        </button>
      </div>
    </div>

    <!-- ── 2. DASHBOARD ANALYTICS OVERVIEW (9 METRICS) ────────────────────── -->
    <div class="space-y-3">
      <!-- Date Filter Toolbar -->
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-[#202124] uppercase tracking-wider">Subscription Overview</span>
        <div class="flex items-center gap-1 bg-white border border-[#E5E7EB] rounded-lg p-0.5 text-xs">
          <button
            v-for="preset in (['ALL', 'TODAY', 'LAST_7_DAYS', 'LAST_30_DAYS', 'THIS_MONTH'] as DatePreset[])"
            :key="preset"
            type="button"
            @click="selectedDatePreset = preset; loadDashboard()"
            class="px-2.5 py-1 rounded text-xs font-medium transition"
            :class="selectedDatePreset === preset ? 'bg-[#800020] text-white' : 'text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8]'"
          >
            {{ preset === 'ALL' ? 'All Time' : preset === 'TODAY' ? 'Today' : preset === 'LAST_7_DAYS' ? '7 Days' : preset === 'LAST_30_DAYS' ? '30 Days' : 'This Month' }}
          </button>
        </div>
      </div>

      <!-- Metrics Grid -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <!-- 1. Total Active -->
        <div class="bg-white border border-[#E5E7EB] p-4 rounded-xl space-y-1">
          <div class="flex items-center justify-between text-xs text-[#6B7280]">
            <span>Active Subscriptions</span>
            <Users class="size-3.5 text-[#800020]" />
          </div>
          <div class="text-xl font-bold text-[#202124]">
            {{ stats?.totalActiveSubscriptions ?? 0 }}
          </div>
          <div class="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
            <TrendingUp class="size-3" />
            <span>+{{ stats?.monthlyGrowthRate ?? 14.8 }}% growth</span>
          </div>
        </div>

        <!-- 2. Customer Subscriptions -->
        <div class="bg-white border border-[#E5E7EB] p-4 rounded-xl space-y-1">
          <div class="flex items-center justify-between text-xs text-[#6B7280]">
            <span>Customer Members</span>
            <Award class="size-3.5 text-blue-600" />
          </div>
          <div class="text-xl font-bold text-[#202124]">
            {{ stats?.activeCustomerSubscriptions ?? 0 }}
          </div>
          <p class="text-[11px] text-[#6B7280]">5%–10% privilege discounts</p>
        </div>

        <!-- 3. Partner Subscriptions -->
        <div class="bg-white border border-[#E5E7EB] p-4 rounded-xl space-y-1">
          <div class="flex items-center justify-between text-xs text-[#6B7280]">
            <span>Partner Club Passes</span>
            <Zap class="size-3.5 text-amber-600" />
          </div>
          <div class="text-xl font-bold text-[#202124]">
            {{ stats?.activePartnerSubscriptions ?? 0 }}
          </div>
          <p class="text-[11px] text-[#6B7280]">Reduced 8%–10% platform fee</p>
        </div>

        <!-- 4. Total Revenue -->
        <div class="bg-white border border-[#E5E7EB] p-4 rounded-xl space-y-1">
          <div class="flex items-center justify-between text-xs text-[#6B7280]">
            <span>Total Subscription Rev.</span>
            <DollarSign class="size-3.5 text-emerald-600" />
          </div>
          <div class="text-xl font-bold text-[#202124]">
            {{ formatINR(stats?.totalSubscriptionRevenue) }}
          </div>
          <p class="text-[11px] text-[#6B7280]">Direct fee collections</p>
        </div>

        <!-- 5. Expiring <= 7 Days -->
        <div class="bg-white border border-[#E5E7EB] p-4 rounded-xl space-y-1">
          <div class="flex items-center justify-between text-xs text-[#6B7280]">
            <span>Expiring in 7 Days</span>
            <AlertTriangle class="size-3.5 text-amber-500" />
          </div>
          <div class="text-xl font-bold text-amber-700">
            {{ stats?.expiring7Days ?? 0 }}
          </div>
          <button
            type="button"
            @click="activeTab = 'expiry'; expiryFilter = '7days'"
            class="text-[11px] text-[#800020] hover:underline font-medium"
          >
            Review & Remind &rarr;
          </button>
        </div>
      </div>

      <!-- Secondary Metric Bar -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-white border border-[#E5E7EB] px-4 py-3 rounded-xl flex items-center justify-between">
          <div>
            <p class="text-xs text-[#6B7280]">Customer Revenue</p>
            <p class="text-sm font-bold text-[#202124]">{{ formatINR(stats?.customerSubscriptionRevenue) }}</p>
          </div>
          <span class="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">Customers</span>
        </div>

        <div class="bg-white border border-[#E5E7EB] px-4 py-3 rounded-xl flex items-center justify-between">
          <div>
            <p class="text-xs text-[#6B7280]">Partner Revenue</p>
            <p class="text-sm font-bold text-[#202124]">{{ formatINR(stats?.partnerSubscriptionRevenue) }}</p>
          </div>
          <span class="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">Partners</span>
        </div>

        <div class="bg-white border border-[#E5E7EB] px-4 py-3 rounded-xl flex items-center justify-between">
          <div>
            <p class="text-xs text-[#6B7280]">Expired Memberships</p>
            <p class="text-sm font-bold text-gray-700">{{ stats?.expiredSubscriptions ?? 0 }}</p>
          </div>
          <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold">Historical</span>
        </div>

        <div class="bg-white border border-[#E5E7EB] px-4 py-3 rounded-xl flex items-center justify-between">
          <div>
            <p class="text-xs text-[#6B7280]">Renewal Retention</p>
            <p class="text-sm font-bold text-emerald-700">{{ stats?.renewalRate ?? 78.4 }}%</p>
          </div>
          <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">Retention</span>
        </div>
      </div>
    </div>

    <!-- ── 3. MAIN SECTION NAVIGATION TABS ────────────────────────────────── -->
    <div class="border-b border-[#E5E7EB]">
      <nav class="flex items-center gap-1 -mb-px overflow-x-auto">
        <button
          type="button"
          @click="activeTab = 'customers'"
          class="flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap"
          :class="activeTab === 'customers' ? 'border-[#800020] text-[#800020] bg-red-50/40' : 'border-transparent text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8]'"
        >
          <Award class="size-4" />
          <span>Customer Memberships</span>
          <span class="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-[#202124] font-bold">{{ customerPlans.length }}</span>
        </button>

        <button
          type="button"
          @click="activeTab = 'partners'"
          class="flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap"
          :class="activeTab === 'partners' ? 'border-[#800020] text-[#800020] bg-red-50/40' : 'border-transparent text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8]'"
        >
          <Zap class="size-4" />
          <span>Partner Subscriptions</span>
          <span class="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-[#202124] font-bold">{{ partnerPlans.length }}</span>
        </button>

        <button
          type="button"
          @click="activeTab = 'expiry'"
          class="flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap"
          :class="activeTab === 'expiry' ? 'border-[#800020] text-[#800020] bg-red-50/40' : 'border-transparent text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8]'"
        >
          <Clock class="size-4" />
          <span>Renewal & Expiry Watch</span>
          <span
            v-if="(stats?.expiring7Days ?? 0) > 0"
            class="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-800 font-bold"
          >
            {{ stats?.expiring7Days }}
          </span>
        </button>

        <button
          type="button"
          @click="activeTab = 'transactions'"
          class="flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap"
          :class="activeTab === 'transactions' ? 'border-[#800020] text-[#800020] bg-red-50/40' : 'border-transparent text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8]'"
        >
          <CreditCard class="size-4" />
          <span>Subscription Transactions</span>
          <span class="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-[#202124] font-bold">{{ transactions.length }}</span>
        </button>

        <button
          type="button"
          @click="activeTab = 'reports'"
          class="flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition whitespace-nowrap"
          :class="activeTab === 'reports' ? 'border-[#800020] text-[#800020] bg-red-50/40' : 'border-transparent text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8]'"
        >
          <BarChart3 class="size-4" />
          <span>Reports & Growth</span>
        </button>
      </nav>
    </div>

    <!-- ── 4. TAB 1: CUSTOMER MEMBERSHIPS ─────────────────────────────────── -->
    <div v-if="activeTab === 'customers'" class="space-y-5">
      <!-- Subtabs Toggle: Plans vs Subscribers -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E5E7EB]">
        <div class="flex items-center gap-1 bg-[#F7F7F8] p-1 rounded-lg">
          <button
            type="button"
            @click="customerSubTab = 'plans'"
            class="px-3 py-1.5 rounded-md text-xs font-semibold transition"
            :class="customerSubTab === 'plans' ? 'bg-white text-[#800020] shadow-xs' : 'text-[#6B7280] hover:text-[#202124]'"
          >
            Membership Plans ({{ customerPlans.length }})
          </button>
          <button
            type="button"
            @click="customerSubTab = 'users'"
            class="px-3 py-1.5 rounded-md text-xs font-semibold transition"
            :class="customerSubTab === 'users' ? 'bg-white text-[#800020] shadow-xs' : 'text-[#6B7280] hover:text-[#202124]'"
          >
            Subscribed Customers ({{ filteredCustomerUsers.length }})
          </button>
        </div>

        <div v-if="customerSubTab === 'plans'">
          <button
            type="button"
            @click="openCreateCustomerPlan"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#800020] rounded-lg hover:bg-[#990026] transition"
          >
            <Plus class="size-3.5" />
            <span>Create Customer Plan</span>
          </button>
        </div>
      </div>

      <!-- Subtab 1A: Customer Plans Grid -->
      <div v-if="customerSubTab === 'plans'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="plan in customerPlans"
          :key="plan.planId"
          class="bg-white border border-[#E5E7EB] rounded-xl p-5 flex flex-col justify-between hover:shadow-md transition space-y-4"
        >
          <div class="space-y-3">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full"
                  :class="plan.isActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-gray-100 text-gray-700'">
                  {{ plan.isActive ? 'Active Plan' : 'Inactive' }}
                </span>
                <h3 class="text-sm font-bold text-[#202124] mt-1.5">{{ plan.name }}</h3>
              </div>
              <div class="text-right">
                <span class="text-lg font-extrabold text-[#202124]">{{ formatINR(plan.price) }}</span>
                <p class="text-[10px] text-[#6B7280]">/ {{ plan.durationDays }} days</p>
              </div>
            </div>

            <p class="text-xs text-[#6B7280] line-clamp-2">{{ plan.description || 'Customer membership tier' }}</p>

            <!-- Benefits Specs -->
            <div class="bg-[#F7F7F8] p-3 rounded-lg space-y-1.5 text-xs">
              <div class="flex items-center justify-between text-[#202124]">
                <span class="text-[#6B7280]">Booking Discount:</span>
                <span class="font-bold text-emerald-700">{{ plan.discountPercent }}% OFF</span>
              </div>
              <div class="flex items-center justify-between text-[#202124]">
                <span class="text-[#6B7280]">Max Discount / Order:</span>
                <span class="font-semibold">{{ formatINR(plan.maxDiscountAmount) }}</span>
              </div>
              <div class="flex items-center justify-between text-[#202124]">
                <span class="text-[#6B7280]">Duration:</span>
                <span class="font-semibold">{{ Math.round(plan.durationDays / 30) }} Month(s) ({{ plan.durationDays }}d)</span>
              </div>
            </div>

            <div class="flex items-center justify-between text-[11px] text-[#6B7280] pt-1">
              <span>Active Subscribers:</span>
              <span class="font-bold text-[#202124]">{{ plan.activeSubscribersCount }}</span>
            </div>
          </div>

          <!-- Card Actions -->
          <div class="flex items-center justify-between border-t border-[#E5E7EB] pt-3">
            <button
              type="button"
              @click="toggleCustomerPlanStatus(plan)"
              class="text-xs font-semibold"
              :class="plan.isActive ? 'text-amber-700 hover:text-amber-800' : 'text-emerald-700 hover:text-emerald-800'"
            >
              {{ plan.isActive ? 'Deactivate' : 'Activate' }}
            </button>

            <div class="flex items-center gap-1">
              <button
                type="button"
                @click="duplicateCustomerPlan(plan)"
                class="p-1.5 hover:bg-[#F7F7F8] text-[#6B7280] rounded"
                title="Duplicate Plan"
              >
                <Copy class="size-3.5" />
              </button>
              <button
                type="button"
                @click="openEditCustomerPlan(plan)"
                class="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#800020] bg-red-50 hover:bg-red-100 rounded"
              >
                <Pen class="size-3" />
                <span>Edit</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Subtab 1B: Customer Subscribers Listing -->
      <div v-if="customerSubTab === 'users'" class="space-y-4">
        <!-- Search & Filters -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="relative">
            <Search class="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              v-model="userSearchQuery"
              type="text"
              placeholder="Search by customer name, mobile, display ID..."
              class="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            />
          </div>

          <select
            v-model="selectedCityFilter"
            class="px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          >
            <option value="ALL">All Cities</option>
            <option v-for="c in availableCities" :key="c" :value="c">{{ c }}</option>
          </select>

          <select
            v-model="selectedStatusFilter"
            class="px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <!-- Table -->
        <div class="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <Table
            :items="filteredCustomerUsers"
            :headers="customerTableHeaders"
            :loading="isLoading"
            paginate
            :itemsPerPage="10"
          >
            <!-- Cell: User -->
            <template #cell(user)="{ item }">
              <div>
                <p class="text-xs font-bold text-[#202124]">{{ item.userName }}</p>
                <p class="text-[11px] text-[#6B7280] font-mono">{{ item.userMobile }} • {{ item.cityName || 'Kolkata' }}</p>
                <span class="text-[10px] text-[#6B7280]">ID: {{ item.userDisplayId || item.userId?.slice(0, 8) }}</span>
              </div>
            </template>

            <!-- Cell: Plan -->
            <template #cell(plan)="{ item }">
              <div>
                <p class="text-xs font-semibold text-[#202124]">{{ item.planName }}</p>
                <p class="text-[11px] text-[#6B7280]">{{ formatINR(item.price) }} / {{ item.planDurationDays }}d</p>
              </div>
            </template>

            <!-- Cell: Dates -->
            <template #cell(dates)="{ item }">
              <div class="text-xs">
                <p class="text-[#202124]">{{ formatDate(item.startDate) }} &rarr; {{ formatDate(item.endDate) }}</p>
                <p class="text-[11px] font-medium" :class="item.daysRemaining <= 7 && item.daysRemaining >= 0 ? 'text-amber-600' : 'text-[#6B7280]'">
                  {{ item.daysRemaining >= 0 ? `${item.daysRemaining} days left` : 'Expired' }}
                </p>
              </div>
            </template>

            <!-- Cell: Benefits -->
            <template #cell(benefits)="{ item }">
              <span class="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                {{ item.discountPercent ?? 5 }}% OFF
              </span>
            </template>

            <!-- Cell: Status -->
            <template #cell(status)="{ item }">
              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                :class="item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        item.status === 'CANCELLED' ? 'bg-gray-100 text-gray-700' :
                        'bg-red-50 text-red-800 border border-red-200'"
              >
                {{ item.status }}
              </span>
            </template>

            <!-- Cell: Actions -->
            <template #cell(actions)="{ item }">
              <div class="flex items-center justify-end gap-1">
                <button
                  type="button"
                  @click="openInspectionDrawer(item.id)"
                  class="p-1 hover:bg-[#F7F7F8] rounded text-[#6B7280] hover:text-[#202124]"
                  title="View Details"
                >
                  <Eye class="size-4" />
                </button>
                <button
                  type="button"
                  @click="openExtendModal(item)"
                  class="p-1 hover:bg-[#F7F7F8] rounded text-[#800020]"
                  title="Extend Subscription"
                >
                  <Calendar class="size-4" />
                </button>
                <button
                  type="button"
                  @click="openReminderModal(item)"
                  class="p-1 hover:bg-[#F7F7F8] rounded text-blue-600"
                  title="Send FCM Renewal Reminder"
                >
                  <Send class="size-4" />
                </button>
              </div>
            </template>
          </Table>
        </div>
      </div>
    </div>

    <!-- ── 5. TAB 2: PARTNER SUBSCRIPTIONS ────────────────────────────────── -->
    <div v-if="activeTab === 'partners'" class="space-y-5">
      <!-- Subtabs Toggle: Plans vs Subscribers -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E5E7EB]">
        <div class="flex items-center gap-1 bg-[#F7F7F8] p-1 rounded-lg">
          <button
            type="button"
            @click="partnerSubTab = 'plans'"
            class="px-3 py-1.5 rounded-md text-xs font-semibold transition"
            :class="partnerSubTab === 'plans' ? 'bg-white text-[#800020] shadow-xs' : 'text-[#6B7280] hover:text-[#202124]'"
          >
            Commission Passes ({{ partnerPlans.length }})
          </button>
          <button
            type="button"
            @click="partnerSubTab = 'users'"
            class="px-3 py-1.5 rounded-md text-xs font-semibold transition"
            :class="partnerSubTab === 'users' ? 'bg-white text-[#800020] shadow-xs' : 'text-[#6B7280] hover:text-[#202124]'"
          >
            Subscribed Partners ({{ filteredPartnerUsers.length }})
          </button>
        </div>

        <div v-if="partnerSubTab === 'plans'">
          <button
            type="button"
            @click="openCreatePartnerPlan"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#800020] rounded-lg hover:bg-[#990026] transition"
          >
            <Plus class="size-3.5" />
            <span>Create Partner Pass</span>
          </button>
        </div>
      </div>

      <!-- Subtab 2A: Partner Plans Grid -->
      <div v-if="partnerSubTab === 'plans'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="plan in partnerPlans"
          :key="plan.planId"
          class="bg-white border border-[#E5E7EB] rounded-xl p-5 flex flex-col justify-between hover:shadow-md transition space-y-4"
        >
          <div class="space-y-3">
            <div class="flex items-start justify-between">
              <div>
                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full"
                  :class="plan.isActive ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-gray-100 text-gray-700'">
                  {{ plan.isActive ? 'Active Pass' : 'Inactive' }}
                </span>
                <h3 class="text-sm font-bold text-[#202124] mt-1.5">{{ plan.name }}</h3>
              </div>
              <div class="text-right">
                <span class="text-lg font-extrabold text-[#202124]">{{ formatINR(plan.price) }}</span>
                <p class="text-[10px] text-[#6B7280]">/ {{ plan.durationDays }} days</p>
              </div>
            </div>

            <p class="text-xs text-[#6B7280] line-clamp-2">{{ plan.description || 'Partner commission tier' }}</p>

            <!-- Commission Engine Integration Specs -->
            <div class="bg-amber-50/50 border border-amber-100 p-3 rounded-lg space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-[#6B7280]">Platform Charge (Subscribed):</span>
                <span class="font-extrabold text-[#800020] text-sm">{{ plan.platformChargePercent }}%</span>
              </div>
              <div class="flex items-center justify-between text-[11px] text-[#6B7280]">
                <span>Standard Platform Fee:</span>
                <span class="line-through">{{ plan.standardPlatformChargePercent }}%</span>
              </div>
              <div class="flex items-center justify-between text-[11px] text-emerald-700 font-semibold border-t border-amber-200/50 pt-1">
                <span>Effective Partner Savings:</span>
                <span>+{{ plan.commissionBenefitPercent }}% Higher Payout</span>
              </div>
            </div>

            <!-- Auto-accept & auto-online specs -->
            <div class="flex items-center justify-between text-xs text-[#6B7280] bg-[#F7F7F8] p-2 rounded-lg">
              <span>Auto-Accept Limit: <b>{{ plan.autoAcceptOrderLimit }}/day</b></span>
              <span class="flex items-center gap-1" :class="plan.isAutoOnlineIncluded ? 'text-emerald-700' : 'text-gray-500'">
                <CheckCircle2 v-if="plan.isAutoOnlineIncluded" class="size-3.5" />
                <span>Auto-Online {{ plan.isAutoOnlineIncluded ? 'Included' : 'Off' }}</span>
              </span>
            </div>

            <div class="flex items-center justify-between text-[11px] text-[#6B7280] pt-1">
              <span>Active Partners Subscribed:</span>
              <span class="font-bold text-[#202124]">{{ plan.activeSubscribersCount }}</span>
            </div>
          </div>

          <!-- Card Actions -->
          <div class="flex items-center justify-between border-t border-[#E5E7EB] pt-3">
            <button
              type="button"
              @click="togglePartnerPlanStatus(plan)"
              class="text-xs font-semibold"
              :class="plan.isActive ? 'text-amber-700 hover:text-amber-800' : 'text-emerald-700 hover:text-emerald-800'"
            >
              {{ plan.isActive ? 'Deactivate' : 'Activate' }}
            </button>

            <div class="flex items-center gap-1">
              <button
                type="button"
                @click="duplicatePartnerPlan(plan)"
                class="p-1.5 hover:bg-[#F7F7F8] text-[#6B7280] rounded"
                title="Duplicate Plan"
              >
                <Copy class="size-3.5" />
              </button>
              <button
                type="button"
                @click="openEditPartnerPlan(plan)"
                class="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#800020] bg-red-50 hover:bg-red-100 rounded"
              >
                <Pen class="size-3" />
                <span>Edit</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Subtab 2B: Partner Subscribers Listing -->
      <div v-if="partnerSubTab === 'users'" class="space-y-4">
        <!-- Search & Filters -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="relative">
            <Search class="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              v-model="userSearchQuery"
              type="text"
              placeholder="Search partner name, mobile, display ID..."
              class="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            />
          </div>

          <select
            v-model="selectedCityFilter"
            class="px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          >
            <option value="ALL">All Hubs & Cities</option>
            <option v-for="c in availableCities" :key="c" :value="c">{{ c }}</option>
          </select>

          <select
            v-model="selectedStatusFilter"
            class="px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRED">Expired</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <!-- Table -->
        <div class="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
          <Table
            :items="filteredPartnerUsers"
            :headers="partnerTableHeaders"
            :loading="isLoading"
            paginate
            :itemsPerPage="10"
          >
            <!-- Cell: Partner -->
            <template #cell(partner)="{ item }">
              <div>
                <p class="text-xs font-bold text-[#202124]">{{ item.userName }}</p>
                <p class="text-[11px] text-[#6B7280] font-mono">{{ item.userMobile }} • {{ item.cityName || 'Kolkata Hub' }}</p>
                <span class="text-[10px] text-[#6B7280]">Partner ID: {{ item.userDisplayId || item.userId?.slice(0, 8) }}</span>
              </div>
            </template>

            <!-- Cell: Plan -->
            <template #cell(plan)="{ item }">
              <div>
                <p class="text-xs font-semibold text-[#202124]">{{ item.planName }}</p>
                <p class="text-[11px] text-[#6B7280]">{{ formatINR(item.price) }} / {{ item.planDurationDays }}d</p>
              </div>
            </template>

            <!-- Cell: Commission -->
            <template #cell(commission)="{ item }">
              <div class="text-xs">
                <span class="font-extrabold text-[#800020]">{{ item.platformChargePercent ?? 10 }}%</span>
                <span class="text-[10px] text-emerald-700 font-semibold block">+{{ item.commissionBenefitPercent ?? 10 }}% Savings</span>
              </div>
            </template>

            <!-- Cell: Validity -->
            <template #cell(validity)="{ item }">
              <div class="text-xs">
                <p class="text-[#202124]">{{ formatDate(item.endDate) }}</p>
                <p class="text-[11px] font-medium" :class="item.daysRemaining <= 7 && item.daysRemaining >= 0 ? 'text-amber-600' : 'text-[#6B7280]'">
                  {{ item.daysRemaining >= 0 ? `${item.daysRemaining} days left` : 'Expired' }}
                </p>
              </div>
            </template>

            <!-- Cell: Status -->
            <template #cell(status)="{ item }">
              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                :class="item.status === 'ACTIVE' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        item.status === 'CANCELLED' ? 'bg-gray-100 text-gray-700' :
                        'bg-red-50 text-red-800 border border-red-200'"
              >
                {{ item.status }}
              </span>
            </template>

            <!-- Cell: Actions -->
            <template #cell(actions)="{ item }">
              <div class="flex items-center justify-end gap-1">
                <button
                  type="button"
                  @click="openInspectionDrawer(item.id)"
                  class="p-1 hover:bg-[#F7F7F8] rounded text-[#6B7280] hover:text-[#202124]"
                  title="View Details"
                >
                  <Eye class="size-4" />
                </button>
                <button
                  type="button"
                  @click="openExtendModal(item)"
                  class="p-1 hover:bg-[#F7F7F8] rounded text-[#800020]"
                  title="Extend Pass"
                >
                  <Calendar class="size-4" />
                </button>
                <button
                  type="button"
                  @click="openReminderModal(item)"
                  class="p-1 hover:bg-[#F7F7F8] rounded text-blue-600"
                  title="Send FCM Renewal Reminder"
                >
                  <Send class="size-4" />
                </button>
              </div>
            </template>
          </Table>
        </div>
      </div>
    </div>

    <!-- ── 6. TAB 3: RENEWAL & EXPIRY WATCH ───────────────────────────────── -->
    <div v-if="activeTab === 'expiry'" class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5E7EB]">
        <div>
          <h3 class="text-sm font-bold text-[#202124]">Subscription Expiry & Renewal Queue</h3>
          <p class="text-xs text-[#6B7280]">
            Review upcoming expiries and send targeted automated reminders before benefits lapse.
          </p>
        </div>

        <button
          type="button"
          @click="sendBulkRemindersToExpiring"
          :disabled="isActionLoading"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#800020] rounded-lg hover:bg-[#990026] transition"
        >
          <Send class="size-3.5" />
          <span>Send Bulk Reminder (7-Day Expiries)</span>
        </button>
      </div>

      <!-- Quick Filter Pills -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          @click="expiryFilter = 'all'"
          class="px-3 py-1.5 rounded-lg text-xs font-medium border transition"
          :class="expiryFilter === 'all' ? 'bg-[#800020] text-white border-[#800020]' : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F7F7F8]'"
        >
          All Watchlist
        </button>
        <button
          type="button"
          @click="expiryFilter = '7days'"
          class="px-3 py-1.5 rounded-lg text-xs font-medium border transition"
          :class="expiryFilter === '7days' ? 'bg-[#800020] text-white border-[#800020]' : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F7F7F8]'"
        >
          Expiring in 7 Days ({{ stats?.expiring7Days ?? 0 }})
        </button>
        <button
          type="button"
          @click="expiryFilter = '3days'"
          class="px-3 py-1.5 rounded-lg text-xs font-medium border transition"
          :class="expiryFilter === '3days' ? 'bg-[#800020] text-white border-[#800020]' : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F7F7F8]'"
        >
          Expiring in 3 Days ({{ stats?.expiring3Days ?? 0 }})
        </button>
        <button
          type="button"
          @click="expiryFilter = 'tomorrow'"
          class="px-3 py-1.5 rounded-lg text-xs font-medium border transition"
          :class="expiryFilter === 'tomorrow' ? 'bg-[#800020] text-white border-[#800020]' : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F7F7F8]'"
        >
          Expiring Tomorrow ({{ stats?.expiringTomorrow ?? 0 }})
        </button>
        <button
          type="button"
          @click="expiryFilter = 'expired'"
          class="px-3 py-1.5 rounded-lg text-xs font-medium border transition"
          :class="expiryFilter === 'expired' ? 'bg-[#800020] text-white border-[#800020]' : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F7F7F8]'"
        >
          Expired Subscriptions ({{ stats?.expiredSubscriptions ?? 0 }})
        </button>
      </div>

      <!-- Watch Table -->
      <div class="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <Table
          :items="expiringSubscriptionsList"
          :headers="expiryTableHeaders"
          :loading="isLoading"
          paginate
          :itemsPerPage="10"
        >
          <template #cell(user)="{ item }">
            <div>
              <p class="text-xs font-bold text-[#202124]">{{ item.userName }}</p>
              <p class="text-[11px] text-[#6B7280]">{{ item.userMobile }} • {{ item.cityName }}</p>
            </div>
          </template>

          <template #cell(type)="{ item }">
            <span
              class="px-2 py-0.5 rounded-full text-[10px] font-bold"
              :class="item.subscriberType === 'CUSTOMER' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'"
            >
              {{ item.subscriberType }}
            </span>
          </template>

          <template #cell(plan)="{ item }">
            <p class="text-xs font-semibold text-[#202124]">{{ item.planName }}</p>
          </template>

          <template #cell(expiry)="{ item }">
            <p class="text-xs text-[#202124]">{{ formatDate(item.endDate) }}</p>
          </template>

          <template #cell(daysRemaining)="{ item }">
            <span
              class="px-2.5 py-1 rounded text-xs font-bold"
              :class="item.daysRemaining <= 1 ? 'bg-red-100 text-red-800' :
                      item.daysRemaining <= 3 ? 'bg-amber-100 text-amber-800' :
                      item.daysRemaining <= 7 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-700'"
            >
              {{ item.daysRemaining >= 0 ? `${item.daysRemaining}d remaining` : 'Expired' }}
            </span>
          </template>

          <template #cell(actions)="{ item }">
            <div class="flex items-center justify-end gap-1.5">
              <button
                type="button"
                @click="openReminderModal(item)"
                class="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded"
              >
                <Send class="size-3" />
                <span>Remind</span>
              </button>
              <button
                type="button"
                @click="openExtendModal(item)"
                class="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#800020] bg-red-50 hover:bg-red-100 rounded"
              >
                <Calendar class="size-3" />
                <span>Extend</span>
              </button>
            </div>
          </template>
        </Table>
      </div>
    </div>

    <!-- ── 7. TAB 4: SUBSCRIPTION TRANSACTIONS LEDGER ─────────────────────── -->
    <div v-if="activeTab === 'transactions'" class="space-y-4">
      <!-- Filter Toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E5E7EB]">
        <div class="flex flex-wrap items-center gap-2 flex-1">
          <div class="relative min-w-[200px]">
            <Search class="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              v-model="txSearchQuery"
              type="text"
              placeholder="Search by transaction ID, user name, mobile..."
              class="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            />
          </div>

          <select
            v-model="txUserTypeFilter"
            class="px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          >
            <option value="ALL">All Roles</option>
            <option value="CUSTOMER">Customers</option>
            <option value="PARTNER">Partners</option>
          </select>

          <select
            v-model="txStatusFilter"
            class="px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESSFUL">Successful</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        <button
          type="button"
          @click="exportTransactionsCSV"
          class="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#202124] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F7F7F8] transition"
        >
          <Sliders class="size-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      <!-- Transactions Table -->
      <div class="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <Table
          :items="filteredTransactions"
          :headers="txTableHeaders"
          :loading="isLoading"
          paginate
          :itemsPerPage="10"
        >
          <template #cell(txId)="{ item }">
            <span class="font-mono text-xs font-bold text-[#202124]">#{{ item.transactionId?.slice(0, 10) }}</span>
          </template>

          <template #cell(user)="{ item }">
            <div>
              <p class="text-xs font-bold text-[#202124]">{{ item.userName }}</p>
              <span class="text-[10px] text-[#6B7280]">{{ item.userType }}</span>
            </div>
          </template>

          <template #cell(plan)="{ item }">
            <p class="text-xs font-semibold text-[#202124]">{{ item.subscriptionPlan }}</p>
          </template>

          <template #cell(amount)="{ item }">
            <span class="text-xs font-bold text-[#202124]">{{ formatINR(item.amount) }}</span>
          </template>

          <template #cell(method)="{ item }">
            <div class="text-xs text-[#6B7280]">
              <span>{{ item.paymentMethod }}</span>
              <span class="block text-[10px]">{{ item.paymentGateway }}</span>
            </div>
          </template>

          <template #cell(status)="{ item }">
            <span
              class="px-2 py-0.5 rounded-full text-[10px] font-bold"
              :class="item.paymentStatus === 'SUCCESSFUL' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      item.paymentStatus === 'PENDING' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                      'bg-red-50 text-red-800 border border-red-200'"
            >
              {{ item.paymentStatus }}
            </span>
          </template>

          <template #cell(date)="{ item }">
            <span class="text-xs text-[#6B7280]">{{ formatDate(item.transactionDate) }}</span>
          </template>
        </Table>
      </div>
    </div>

    <!-- ── 8. TAB 5: REPORTS & INSIGHTS ───────────────────────────────────── -->
    <div v-if="activeTab === 'reports'" class="space-y-5">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Monthly Revenue Trends -->
        <div class="bg-white border border-[#E5E7EB] p-5 rounded-xl space-y-4">
          <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
            <h3 class="text-sm font-bold text-[#202124]">Monthly Subscription Growth</h3>
            <span class="text-xs text-[#6B7280]">Past 6 Months</span>
          </div>

          <div class="space-y-3">
            <div
              v-for="m in reports?.monthlyRevenue ?? []"
              :key="m.month"
              class="space-y-1"
            >
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold text-[#202124]">{{ m.month }}</span>
                <span class="font-bold text-[#800020]">{{ formatINR(Number(m.customerRevenue) + Number(m.partnerRevenue)) }}</span>
              </div>
              <div class="h-2 w-full bg-[#F7F7F8] rounded-full overflow-hidden flex">
                <div
                  class="bg-blue-600 h-full"
                  :style="{ width: `${(Number(m.customerRevenue) / (Number(m.customerRevenue) + Number(m.partnerRevenue))) * 100}%` }"
                  title="Customer Revenue"
                />
                <div
                  class="bg-amber-600 h-full"
                  :style="{ width: `${(Number(m.partnerRevenue) / (Number(m.customerRevenue) + Number(m.partnerRevenue))) * 100}%` }"
                  title="Partner Revenue"
                />
              </div>
              <div class="flex items-center justify-between text-[10px] text-[#6B7280]">
                <span>Customer: {{ formatINR(m.customerRevenue) }}</span>
                <span>Partner: {{ formatINR(m.partnerRevenue) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Plan Revenue Breakdown -->
        <div class="bg-white border border-[#E5E7EB] p-5 rounded-xl space-y-4">
          <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
            <h3 class="text-sm font-bold text-[#202124]">Plan-Wise Performance</h3>
            <span class="text-xs text-[#6B7280]">Active Collections</span>
          </div>

          <div class="space-y-3">
            <div
              v-for="p in reports?.planPerformance ?? []"
              :key="p.planName"
              class="flex items-center justify-between p-2.5 bg-[#F7F7F8] rounded-lg text-xs"
            >
              <div>
                <p class="font-bold text-[#202124]">{{ p.planName }}</p>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-white text-[#6B7280] border border-[#E5E7EB]">
                  {{ p.type }}
                </span>
              </div>
              <div class="text-right">
                <p class="font-extrabold text-[#202124]">{{ formatINR(p.totalRevenue) }}</p>
                <p class="text-[10px] text-[#6B7280]">{{ p.subscriberCount }} active subscribers</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- City Performance & Retention Distribution -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- City Breakdown -->
        <div class="bg-white border border-[#E5E7EB] p-5 rounded-xl space-y-3">
          <h3 class="text-sm font-bold text-[#202124] border-b border-[#E5E7EB] pb-2">City-Wise Subscription Performance</h3>
          <div class="space-y-2">
            <div
              v-for="c in reports?.cityPerformance ?? []"
              :key="c.cityName"
              class="flex items-center justify-between py-1.5 text-xs border-b border-[#E5E7EB]/40 last:border-0"
            >
              <span class="font-medium text-[#202124]">{{ c.cityName }}</span>
              <div class="flex items-center gap-4">
                <span class="text-[#6B7280]">{{ c.activeSubscriptions }} Active</span>
                <span class="font-bold text-[#800020]">{{ formatINR(c.totalRevenue) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Churn & Retention Metrics -->
        <div class="bg-white border border-[#E5E7EB] p-5 rounded-xl space-y-4">
          <h3 class="text-sm font-bold text-[#202124] border-b border-[#E5E7EB] pb-2">Subscription Health & Retention</h3>
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center space-y-1">
              <span class="text-xs text-emerald-800 font-medium">Renewal Retention</span>
              <p class="text-2xl font-black text-emerald-700">{{ reports?.renewalRate ?? 78.4 }}%</p>
              <span class="text-[10px] text-emerald-600">Auto-renew & re-purchases</span>
            </div>

            <div class="bg-red-50 border border-red-100 p-4 rounded-xl text-center space-y-1">
              <span class="text-xs text-red-800 font-medium">Cancellation Rate</span>
              <p class="text-2xl font-black text-red-700">{{ reports?.cancellationRate ?? 4.2 }}%</p>
              <span class="text-[10px] text-red-600">Voluntary churn rate</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 9. SUBSCRIPTION DETAILS INSPECTION DRAWER ─────────────────────── -->
    <Popup v-model="isDetailDrawerOpen" title="Subscription Inspection" size="lg">
      <div v-if="selectedUserSub" class="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        <!-- Header summary card -->
        <div class="bg-gradient-to-r from-red-50 via-white to-red-50/30 p-4 rounded-xl border border-red-100 space-y-3">
          <div class="flex items-start justify-between">
            <div>
              <span
                class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                :class="selectedUserSub.subscriberType === 'CUSTOMER' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'"
              >
                {{ selectedUserSub.subscriberType }} MEMBERSHIP
              </span>
              <h2 class="text-base font-bold text-[#202124] mt-1">{{ selectedUserSub.userName }}</h2>
              <p class="text-xs text-[#6B7280] font-mono">{{ selectedUserSub.userMobile }} • {{ selectedUserSub.userEmail }}</p>
            </div>
            <div class="text-right">
              <span
                class="px-2.5 py-1 rounded-full text-xs font-bold"
                :class="selectedUserSub.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                        selectedUserSub.status === 'CANCELLED' ? 'bg-gray-100 text-gray-700' :
                        'bg-red-100 text-red-800'"
              >
                {{ selectedUserSub.status }}
              </span>
              <p class="text-[10px] text-[#6B7280] mt-1">{{ selectedUserSub.daysRemaining }} days remaining</p>
            </div>
          </div>

          <!-- Validity timeline -->
          <div class="grid grid-cols-3 gap-2 bg-white/80 p-2.5 rounded-lg border border-[#E5E7EB] text-xs">
            <div>
              <span class="text-[#6B7280] text-[10px] block">Start Date:</span>
              <span class="font-semibold text-[#202124]">{{ formatDate(selectedUserSub.startDate) }}</span>
            </div>
            <div>
              <span class="text-[#6B7280] text-[10px] block">Expiry Date:</span>
              <span class="font-semibold text-[#202124]">{{ formatDate(selectedUserSub.endDate) }}</span>
            </div>
            <div>
              <span class="text-[#6B7280] text-[10px] block">Auto-Renew:</span>
              <span class="font-semibold" :class="selectedUserSub.autoRenew ? 'text-emerald-700' : 'text-gray-500'">
                {{ selectedUserSub.autoRenew ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Plan Specifications & Benefits -->
        <div class="bg-white border border-[#E5E7EB] p-4 rounded-xl space-y-3">
          <h4 class="text-xs font-bold text-[#202124] uppercase tracking-wider">Plan Privileges & Commission Model</h4>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div class="bg-[#F7F7F8] p-2.5 rounded-lg">
              <span class="text-[#6B7280] block text-[10px]">Plan Name:</span>
              <span class="font-bold text-[#202124]">{{ selectedUserSub.planName }}</span>
            </div>
            <div class="bg-[#F7F7F8] p-2.5 rounded-lg">
              <span class="text-[#6B7280] block text-[10px]">Subscription Fee:</span>
              <span class="font-bold text-[#800020]">{{ formatINR(selectedUserSub.price) }}</span>
            </div>
            <div v-if="selectedUserSub.subscriberType === 'CUSTOMER'" class="bg-[#F7F7F8] p-2.5 rounded-lg">
              <span class="text-[#6B7280] block text-[10px]">Discount Benefit:</span>
              <span class="font-bold text-emerald-700">{{ selectedUserSub.discountPercent }}% OFF</span>
            </div>
            <div v-if="selectedUserSub.subscriberType === 'PARTNER'" class="bg-[#F7F7F8] p-2.5 rounded-lg">
              <span class="text-[#6B7280] block text-[10px]">Platform Charge:</span>
              <span class="font-bold text-[#800020]">{{ selectedUserSub.platformChargePercent }}% (Reduced)</span>
            </div>
            <div class="bg-[#F7F7F8] p-2.5 rounded-lg">
              <span class="text-[#6B7280] block text-[10px]">Total Bookings:</span>
              <span class="font-bold text-[#202124]">{{ selectedUserSub.totalBookings }} Orders</span>
            </div>
          </div>

          <p class="text-xs text-[#6B7280] italic">{{ selectedUserSub.planDescription }}</p>
        </div>

        <!-- Chronological Timeline -->
        <div class="bg-white border border-[#E5E7EB] p-4 rounded-xl space-y-3">
          <h4 class="text-xs font-bold text-[#202124] uppercase tracking-wider">Subscription Lifecycle Timeline</h4>
          <div class="space-y-3 pl-2">
            <div
              v-for="(evt, i) in selectedUserSub.timeline ?? []"
              :key="i"
              class="flex items-start gap-3 relative"
            >
              <div
                class="size-2 rounded-full mt-1.5 shrink-0"
                :class="evt.type === 'SUCCESS' ? 'bg-emerald-600' :
                        evt.type === 'WARNING' ? 'bg-amber-500' :
                        evt.type === 'DANGER' ? 'bg-red-600' : 'bg-blue-600'"
              />
              <div class="text-xs space-y-0.5">
                <p class="font-bold text-[#202124]">{{ evt.title }}</p>
                <p class="text-[#6B7280]">{{ evt.description }}</p>
                <span class="text-[10px] text-gray-400">{{ formatDate(evt.timestamp) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Drawer Admin Actions Toolbar -->
        <div class="flex flex-wrap items-center justify-end gap-2 border-t border-[#E5E7EB] pt-4">
          <button
            type="button"
            @click="openReminderModal(selectedUserSub)"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
          >
            <Send class="size-3.5" />
            <span>Send FCM Reminder</span>
          </button>

          <button
            type="button"
            @click="openChangePlanModal(selectedUserSub)"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#202124] bg-white border border-[#E5E7EB] hover:bg-[#F7F7F8] rounded-lg transition"
          >
            <Sliders class="size-3.5" />
            <span>Change Plan</span>
          </button>

          <button
            type="button"
            @click="openExtendModal(selectedUserSub)"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#800020] hover:bg-[#990026] rounded-lg transition"
          >
            <Calendar class="size-3.5" />
            <span>Extend Subscription</span>
          </button>

          <button
            v-if="selectedUserSub.status === 'ACTIVE'"
            type="button"
            @click="openCancelModal(selectedUserSub)"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition"
          >
            <XCircle class="size-3.5" />
            <span>Cancel Subscription</span>
          </button>
        </div>
      </div>
    </Popup>

    <!-- ── 10. MODAL: CREATE / EDIT CUSTOMER PLAN ────────────────────────── -->
    <Popup
      v-model="isCustomerPlanModalOpen"
      :title="isEditingPlan ? 'Edit Customer Membership Plan' : 'Create Customer Membership Plan'"
      size="md"
    >
      <form @submit.prevent="saveCustomerPlan" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-[#202124] mb-1">Plan Name *</label>
          <input
            v-model="customerPlanForm.name"
            type="text"
            required
            placeholder="e.g. Gold Tier - 3 Months"
            class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-[#202124] mb-1">Duration *</label>
            <select
              v-model.number="customerPlanForm.durationDays"
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            >
              <option :value="30">1 Month (30 Days)</option>
              <option :value="90">3 Months (90 Days)</option>
              <option :value="180">6 Months (180 Days)</option>
              <option :value="365">12 Months (365 Days)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-[#202124] mb-1">Price (₹) *</label>
            <input
              v-model.number="customerPlanForm.price"
              type="number"
              min="0"
              required
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-[#202124] mb-1">Discount Percentage (%) *</label>
            <input
              v-model.number="customerPlanForm.discountPercent"
              type="number"
              step="0.5"
              min="0"
              max="50"
              required
              placeholder="e.g. 5.0"
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-[#202124] mb-1">Max Discount Per Booking (₹)</label>
            <input
              v-model.number="customerPlanForm.maxDiscountAmount"
              type="number"
              min="0"
              placeholder="e.g. 150"
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-[#202124] mb-1">Plan Description / Summary</label>
          <textarea
            v-model="customerPlanForm.description"
            rows="2"
            placeholder="Highlight benefits for customers..."
            class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          />
        </div>

        <div class="flex items-center gap-4 pt-2">
          <label class="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#202124]">
            <input v-model="customerPlanForm.isActive" type="checkbox" class="rounded text-[#800020]" />
            <span>Active Plan for new purchases</span>
          </label>
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-[#E5E7EB] pt-4">
          <button
            type="button"
            @click="isCustomerPlanModalOpen = false"
            class="px-3 py-2 text-xs font-semibold text-[#6B7280] hover:bg-[#F7F7F8] rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isActionLoading"
            class="px-4 py-2 text-xs font-semibold text-white bg-[#800020] hover:bg-[#990026] rounded-lg"
          >
            {{ isActionLoading ? 'Saving...' : 'Save Customer Plan' }}
          </button>
        </div>
      </form>
    </Popup>

    <!-- ── 11. MODAL: CREATE / EDIT PARTNER PLAN ──────────────────────────── -->
    <Popup
      v-model="isPartnerPlanModalOpen"
      :title="isEditingPlan ? 'Edit Partner Club Pass' : 'Create Partner Club Pass'"
      size="md"
    >
      <form @submit.prevent="savePartnerPlan" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-[#202124] mb-1">Pass Name *</label>
          <input
            v-model="partnerPlanForm.name"
            type="text"
            required
            placeholder="e.g. Partner Pro Club - Quarterly"
            class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-[#202124] mb-1">Duration *</label>
            <select
              v-model.number="partnerPlanForm.durationDays"
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            >
              <option :value="30">Monthly (30 Days)</option>
              <option :value="90">Quarterly (90 Days)</option>
              <option :value="180">Half-Yearly (180 Days)</option>
              <option :value="365">Yearly (365 Days)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-[#202124] mb-1">Subscription Fee (₹) *</label>
            <input
              v-model.number="partnerPlanForm.price"
              type="number"
              min="0"
              required
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-[#202124] mb-1">Subscribed Platform Charge (%) *</label>
            <input
              v-model.number="partnerPlanForm.platformChargePercent"
              type="number"
              step="0.5"
              min="0"
              max="50"
              required
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-[#202124] mb-1">Daily Auto-Accept Orders</label>
            <input
              v-model.number="partnerPlanForm.autoAcceptOrderLimit"
              type="number"
              min="1"
              placeholder="20"
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            />
          </div>
        </div>

        <!-- Live Commission Savings Preview -->
        <div class="bg-amber-50/60 border border-amber-200 p-3 rounded-lg text-xs space-y-1">
          <div class="flex items-center justify-between text-[#800020] font-bold">
            <span>Effective Partner Commission Savings:</span>
            <span>+{{ Math.max(0, 20.0 - Number(partnerPlanForm.platformChargePercent || 10)) }}% Take-Home</span>
          </div>
          <p class="text-[11px] text-[#6B7280]">
            Reduces standard 20% platform charge to {{ partnerPlanForm.platformChargePercent }}% on each completed order.
          </p>
        </div>

        <div>
          <label class="block text-xs font-bold text-[#202124] mb-1">Membership Description & Benefits</label>
          <textarea
            v-model="partnerPlanForm.description"
            rows="2"
            placeholder="Priority matching, reduced charge, auto-online perks..."
            class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          />
        </div>

        <div class="flex items-center gap-4 pt-1">
          <label class="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#202124]">
            <input v-model="partnerPlanForm.isAutoOnlineIncluded" type="checkbox" class="rounded text-[#800020]" />
            <span>Include Auto-Online shift privilege</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer text-xs font-medium text-[#202124]">
            <input v-model="partnerPlanForm.isActive" type="checkbox" class="rounded text-[#800020]" />
            <span>Active for partner purchase</span>
          </label>
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-[#E5E7EB] pt-4">
          <button
            type="button"
            @click="isPartnerPlanModalOpen = false"
            class="px-3 py-2 text-xs font-semibold text-[#6B7280] hover:bg-[#F7F7F8] rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isActionLoading"
            class="px-4 py-2 text-xs font-semibold text-white bg-[#800020] hover:bg-[#990026] rounded-lg"
          >
            {{ isActionLoading ? 'Saving...' : 'Save Partner Pass' }}
          </button>
        </div>
      </form>
    </Popup>

    <!-- ── 12. MODAL: EXTEND SUBSCRIPTION ────────────────────────────────── -->
    <Popup v-model="isExtendModalOpen" title="Extend Subscription Validity" size="sm">
      <form @submit.prevent="submitExtension" class="space-y-4">
        <p class="text-xs text-[#6B7280]">
          Add validity days to <b>{{ selectedUserSub?.userName }}</b>'s subscription.
        </p>

        <div>
          <label class="block text-xs font-bold text-[#202124] mb-1">Additional Validity Days *</label>
          <div class="grid grid-cols-4 gap-2 mb-2">
            <button
              v-for="d in [7, 15, 30, 90]"
              :key="d"
              type="button"
              @click="extendDays = d"
              class="px-2 py-1 text-xs rounded border transition"
              :class="extendDays === d ? 'bg-[#800020] text-white border-[#800020]' : 'bg-white text-[#202124] border-[#E5E7EB]'"
            >
              +{{ d }}d
            </button>
          </div>
          <input
            v-model.number="extendDays"
            type="number"
            min="1"
            max="365"
            required
            class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-[#202124] mb-1">Admin Reason *</label>
          <input
            v-model="extendReason"
            type="text"
            required
            placeholder="e.g. Operational goodwill extension"
            class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          />
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-[#E5E7EB] pt-3">
          <button
            type="button"
            @click="isExtendModalOpen = false"
            class="px-3 py-1.5 text-xs text-[#6B7280]"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isActionLoading"
            class="px-4 py-1.5 text-xs font-semibold text-white bg-[#800020] rounded-lg"
          >
            {{ isActionLoading ? 'Extending...' : 'Confirm Extension' }}
          </button>
        </div>
      </form>
    </Popup>

    <!-- ── 13. MODAL: CHANGE SUBSCRIPTION PLAN ───────────────────────────── -->
    <Popup v-model="isChangePlanModalOpen" title="Change Subscription Plan" size="sm">
      <form @submit.prevent="submitChangePlan" class="space-y-4">
        <p class="text-xs text-[#6B7280]">
          Switch <b>{{ selectedUserSub?.userName }}</b> to a new membership tier.
        </p>

        <div>
          <label class="block text-xs font-bold text-[#202124] mb-1">Target Plan *</label>
          <select
            v-model="changePlanNewId"
            required
            class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          >
            <option value="" disabled>Select destination tier</option>
            <template v-if="selectedUserSub?.subscriberType === 'CUSTOMER'">
              <option v-for="p in customerPlans" :key="p.planId" :value="p.planId">
                {{ p.name }} ({{ formatINR(p.price) }} / {{ p.durationDays }}d)
              </option>
            </template>
            <template v-else>
              <option v-for="p in partnerPlans" :key="p.planId" :value="p.planId">
                {{ p.name }} ({{ formatINR(p.price) }} / {{ p.durationDays }}d)
              </option>
            </template>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-[#202124] mb-1">Reason for Change *</label>
          <input
            v-model="changePlanReason"
            type="text"
            required
            placeholder="e.g. Customer requested upgrade to annual pass"
            class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          />
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-[#E5E7EB] pt-3">
          <button
            type="button"
            @click="isChangePlanModalOpen = false"
            class="px-3 py-1.5 text-xs text-[#6B7280]"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isActionLoading"
            class="px-4 py-1.5 text-xs font-semibold text-white bg-[#800020] rounded-lg"
          >
            {{ isActionLoading ? 'Updating...' : 'Update Plan' }}
          </button>
        </div>
      </form>
    </Popup>

    <!-- ── 14. MODAL: CANCEL / SUSPEND SUBSCRIPTION ──────────────────────── -->
    <Popup v-model="isCancelModalOpen" title="Cancel Subscription" size="sm">
      <form @submit.prevent="submitCancel" class="space-y-4">
        <div class="flex items-start gap-3 bg-red-50 p-3 rounded-lg border border-red-200">
          <AlertTriangle class="size-5 text-red-600 shrink-0 mt-0.5" />
          <p class="text-xs text-red-800">
            Deactivating this subscription will terminate booking discounts or partner commission reductions immediately.
          </p>
        </div>

        <div>
          <label class="block text-xs font-bold text-[#202124] mb-1">Cancellation Reason *</label>
          <textarea
            v-model="cancelReason"
            rows="3"
            required
            placeholder="Provide mandatory operational or customer-requested reason..."
            class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          />
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-[#E5E7EB] pt-3">
          <button
            type="button"
            @click="isCancelModalOpen = false"
            class="px-3 py-1.5 text-xs text-[#6B7280]"
          >
            Back
          </button>
          <button
            type="submit"
            :disabled="isActionLoading"
            class="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
          >
            {{ isActionLoading ? 'Processing...' : 'Confirm Deactivation' }}
          </button>
        </div>
      </form>
    </Popup>

    <!-- ── 15. MODAL: SEND FCM RENEWAL REMINDER ──────────────────────────── -->
    <Popup v-model="isReminderModalOpen" title="Send Renewal Reminder" size="sm">
      <form @submit.prevent="submitReminder" class="space-y-4">
        <p class="text-xs text-[#6B7280]">
          Dispatch an instant push notification to <b>{{ selectedUserSub?.userName }}</b>.
        </p>

        <div>
          <label class="block text-xs font-bold text-[#202124] mb-1">Notification Title *</label>
          <input
            v-model="reminderTitle"
            type="text"
            required
            class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-[#202124] mb-1">Push Notification Body *</label>
          <textarea
            v-model="reminderMessage"
            rows="3"
            required
            class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          />
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-[#E5E7EB] pt-3">
          <button
            type="button"
            @click="isReminderModalOpen = false"
            class="px-3 py-1.5 text-xs text-[#6B7280]"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isActionLoading"
            class="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold text-white bg-[#800020] rounded-lg"
          >
            <Send class="size-3" />
            <span>{{ isActionLoading ? 'Sending...' : 'Dispatch FCM' }}</span>
          </button>
        </div>
      </form>
    </Popup>
  </div>
</template>

