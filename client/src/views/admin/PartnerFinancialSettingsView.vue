<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api'
import type {
  CommissionRule,
  CreateCommissionRulePayload,
  CommissionPreviewRequest,
  CommissionPreviewResponse,
  CancellationRule,
  CreateCancellationRulePayload,
  CancellationPreviewRequest,
  CancellationPreviewResponse,
  IncentiveCampaign,
  CreateIncentiveCampaignPayload,
  IncentiveSlab,
  FinancialSettingsAuditLog,
  PartnerFinancialSettingsSummary,
  City,
  ServiceCategory,
} from '@/types/api'
import Popup from '@/components/common/Popup.vue'
import { showToast } from '@/utils/toast'
import {
  Percent,
  Receipt,
  Flame,
  History,
  Plus,
  RefreshCw,
  Search,
  Pen,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Calculator,
  Building2,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Tag,
  CheckCircle2,
  XCircle,
  HelpCircle,
  DollarSign,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

// ── NAVIGATION TABS ──────────────────────────────────────────────────────────
type SettingsTab = 'commissions' | 'cancellations' | 'incentives' | 'history'
const activeTab = ref<SettingsTab>('commissions')

// Sync with route query
watch(
  () => route.query.tab,
  (newTab) => {
    if (newTab && typeof newTab === 'string') {
      const valid: SettingsTab[] = ['commissions', 'cancellations', 'incentives', 'history']
      if (valid.includes(newTab as SettingsTab)) {
        activeTab.value = newTab as SettingsTab
      }
    }
  },
  { immediate: true }
)

function switchTab(tab: SettingsTab) {
  activeTab.value = tab
  router.replace({ query: { ...route.query, tab } })
}

// ── GLOBAL STATE ─────────────────────────────────────────────────────────────
const isLoading = ref(false)
const isActionLoading = ref(false)
const summary = ref<PartnerFinancialSettingsSummary | null>(null)

const cities = ref<City[]>([])
const categories = ref<ServiceCategory[]>([])

// Data sets
const commissionRules = ref<CommissionRule[]>([])
const cancellationRules = ref<CancellationRule[]>([])
const incentiveCampaigns = ref<IncentiveCampaign[]>([])
const auditLogs = ref<FinancialSettingsAuditLog[]>([])

// ── TAB 1: COMMISSION RULES STATE ────────────────────────────────────────────
const commissionSearch = ref('')
const commissionTypeFilter = ref('ALL')
const commissionCityFilter = ref('ALL')

const isCommissionModalOpen = ref(false)
const isEditingCommission = ref(false)
const editingCommissionId = ref<string | null>(null)

const commissionForm = ref<CreateCommissionRulePayload>({
  ruleName: '',
  commissionType: 'PERCENTAGE',
  commissionValue: 15,
  cityId: '',
  cityName: '',
  serviceCategoryId: '',
  serviceCategoryName: '',
  serviceSubcategoryId: '',
  serviceSubcategoryName: '',
  partnerId: '',
  partnerName: '',
  priority: 10,
  startDate: new Date().toISOString().slice(0, 10),
  isActive: true,
  notes: '',
})

// Commission Live Preview State
const commPreviewReq = ref<CommissionPreviewRequest>({
  bookingAmount: 1000,
  cityId: '',
  serviceCategoryId: '',
  serviceSubcategoryId: '',
  partnerId: '',
})
const commPreviewRes = ref<CommissionPreviewResponse | null>(null)
const isPreviewLoading = ref(false)

// ── TAB 2: CANCELLATION CHARGE STATE ─────────────────────────────────────────
const cancellationUserType = ref<'CUSTOMER' | 'PARTNER'>('CUSTOMER')
const isCancellationModalOpen = ref(false)
const isEditingCancellation = ref(false)
const editingCancellationId = ref<string | null>(null)

const cancellationForm = ref<CreateCancellationRulePayload>({
  ruleName: '',
  userType: 'CUSTOMER',
  chargeType: 'PERCENTAGE',
  chargeValue: 10,
  maxCap: 250,
  freeWindowMinutes: 15,
  freeWindowHoursBeforeSlot: 2,
  applicableStatus: 'ASSIGNED',
  cityId: '',
  cityName: '',
  serviceCategoryId: '',
  serviceCategoryName: '',
  effectiveDate: new Date().toISOString().slice(0, 10),
  isActive: true,
  notes: '',
})

// Cancellation Live Preview State
const cancelPreviewReq = ref<CancellationPreviewRequest>({
  userType: 'CUSTOMER',
  bookingAmount: 1000,
  orderTiming: 'INSTANT',
  minutesSinceAcceptance: 10,
  hoursBeforeSlot: 3,
  bookingStatus: 'ASSIGNED',
})
const cancelPreviewRes = ref<CancellationPreviewResponse | null>(null)

// ── TAB 3: WEEKLY INCENTIVES STATE ───────────────────────────────────────────
const incentiveStatusFilter = ref('ALL')
const isIncentiveModalOpen = ref(false)
const isEditingIncentive = ref(false)
const editingIncentiveId = ref<string | null>(null)

const incentiveForm = ref<CreateIncentiveCampaignPayload>({
  campaignName: '',
  description: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  weeklyPeriod: 'MONDAY_TO_SUNDAY',
  eligiblePartnerTypes: 'ALL',
  minCompletedJobs: 15,
  minBookingValue: 5000,
  incentiveAmount: 1000,
  maxIncentivePerPartner: 5000,
  slabsJson: JSON.stringify([
    { tier: 1, minCompletedJobs: 15, minBookingValue: 5000, incentiveAmount: 1000 },
    { tier: 2, minCompletedJobs: 25, minBookingValue: 10000, incentiveAmount: 2200 },
    { tier: 3, minCompletedJobs: 40, minBookingValue: 18000, incentiveAmount: 4500 },
  ]),
  status: 'ACTIVE',
})
const parsedSlabs = ref<IncentiveSlab[]>([
  { tier: 1, minCompletedJobs: 15, minBookingValue: 5000, incentiveAmount: 1000 },
  { tier: 2, minCompletedJobs: 25, minBookingValue: 10000, incentiveAmount: 2200 },
  { tier: 3, minCompletedJobs: 40, minBookingValue: 18000, incentiveAmount: 4500 },
])

// ── TAB 4: AUDIT LOGS STATE ──────────────────────────────────────────────────
const auditModuleFilter = ref('ALL')

// ── DATA FETCHING ────────────────────────────────────────────────────────────
async function loadAllData() {
  isLoading.value = true
  try {
    const [sumRes, comRes, canRes, incRes, audRes, citRes, catRes] = await Promise.all([
      api.partnerFinancialSettings.getSummary(),
      api.partnerFinancialSettings.getCommissionRules(),
      api.partnerFinancialSettings.getCancellationRules(),
      api.partnerFinancialSettings.getIncentiveCampaigns(),
      api.partnerFinancialSettings.getAuditLogs(),
      api.cities.getAll().catch(() => ({ data: [] })),
      api.catalogCustomer.getCategories().catch(() => ({ data: [] })),
    ])

    summary.value = (sumRes as any)?.data ?? sumRes
    commissionRules.value = (comRes as any)?.data ?? comRes ?? []
    cancellationRules.value = (canRes as any)?.data ?? canRes ?? []
    incentiveCampaigns.value = (incRes as any)?.data ?? incRes ?? []
    auditLogs.value = (audRes as any)?.data ?? audRes ?? []

    const rawCit = (citRes as any)?.data ?? citRes
    cities.value = Array.isArray(rawCit) ? rawCit : []

    const rawCat = (catRes as any)?.data ?? catRes
    categories.value = Array.isArray(rawCat) ? rawCat : []

    // Run initial previews
    runCommissionPreview()
    runCancellationPreview()
  } catch (err: any) {
    showToast(err?.message || 'Failed to load financial settings', 'error')
  } finally {
    isLoading.value = false
  }
}

// ── COMMISSION ACTIONS ───────────────────────────────────────────────────────
async function runCommissionPreview() {
  isPreviewLoading.value = true
  try {
    const res = await api.partnerFinancialSettings.previewCommission(commPreviewReq.value)
    commPreviewRes.value = (res as any)?.data ?? res
  } catch (err: any) {
    console.error(err)
  } finally {
    isPreviewLoading.value = false
  }
}

watch(
  commPreviewReq,
  () => {
    runCommissionPreview()
  },
  { deep: true }
)

function openCreateCommissionModal() {
  isEditingCommission.value = false
  editingCommissionId.value = null
  commissionForm.value = {
    ruleName: '',
    commissionType: 'PERCENTAGE',
    commissionValue: 15,
    cityId: '',
    cityName: '',
    serviceCategoryId: '',
    serviceCategoryName: '',
    serviceSubcategoryId: '',
    serviceSubcategoryName: '',
    partnerId: '',
    partnerName: '',
    priority: 10,
    startDate: new Date().toISOString().slice(0, 10),
    isActive: true,
    notes: '',
  }
  isCommissionModalOpen.value = true
}

function openEditCommissionModal(rule: CommissionRule) {
  isEditingCommission.value = true
  editingCommissionId.value = rule.id
  commissionForm.value = {
    ruleName: rule.ruleName,
    commissionType: rule.commissionType,
    commissionValue: rule.commissionValue,
    cityId: rule.cityId || '',
    cityName: rule.cityName || '',
    serviceCategoryId: rule.serviceCategoryId || '',
    serviceCategoryName: rule.serviceCategoryName || '',
    serviceSubcategoryId: rule.serviceSubcategoryId || '',
    serviceSubcategoryName: rule.serviceSubcategoryName || '',
    partnerId: rule.partnerId || '',
    partnerName: rule.partnerName || '',
    priority: rule.priority,
    startDate: rule.startDate,
    endDate: rule.endDate,
    isActive: rule.isActive,
    notes: rule.notes || '',
  }
  isCommissionModalOpen.value = true
}

async function saveCommissionRule() {
  if (!commissionForm.value.ruleName.trim()) {
    showToast('Commission rule name is required', 'error')
    return
  }

  // Sync city & category names
  if (commissionForm.value.cityId) {
    const c = cities.value.find((x) => x.uniqueId === commissionForm.value.cityId)
    if (c) commissionForm.value.cityName = c.name
  } else {
    commissionForm.value.cityName = ''
  }

  if (commissionForm.value.serviceCategoryId) {
    const cat = categories.value.find((x) => x.uniqueId === commissionForm.value.serviceCategoryId)
    if (cat) commissionForm.value.serviceCategoryName = cat.name
  } else {
    commissionForm.value.serviceCategoryName = ''
  }

  isActionLoading.value = true
  try {
    if (isEditingCommission.value && editingCommissionId.value) {
      await api.partnerFinancialSettings.updateCommissionRule(editingCommissionId.value, commissionForm.value)
      showToast('Commission rule updated successfully', 'success')
    } else {
      await api.partnerFinancialSettings.createCommissionRule(commissionForm.value)
      showToast('Commission rule created successfully', 'success')
    }
    isCommissionModalOpen.value = false
    await loadAllData()
  } catch (err: any) {
    showToast(err?.message || 'Failed to save commission rule', 'error')
  } finally {
    isActionLoading.value = false
  }
}

async function toggleCommissionStatus(rule: CommissionRule) {
  try {
    const nextStatus = !rule.isActive
    await api.partnerFinancialSettings.toggleCommissionRule(rule.id, nextStatus)
    rule.isActive = nextStatus
    showToast(`Rule "${rule.ruleName}" ${nextStatus ? 'activated' : 'deactivated'}`, 'info')
  } catch (err: any) {
    showToast(err?.message || 'Failed to toggle status', 'error')
  }
}

async function deleteCommissionRule(id: string) {
  if (!confirm('Are you sure you want to permanently delete this commission rule?')) return
  try {
    await api.partnerFinancialSettings.deleteCommissionRule(id)
    showToast('Commission rule deleted', 'success')
    await loadAllData()
  } catch (err: any) {
    showToast(err?.message || 'Failed to delete rule', 'error')
  }
}

// ── CANCELLATION CHARGE ACTIONS ──────────────────────────────────────────────
async function runCancellationPreview() {
  try {
    const res = await api.partnerFinancialSettings.previewCancellation(cancelPreviewReq.value)
    cancelPreviewRes.value = (res as any)?.data ?? res
  } catch (err: any) {
    console.error(err)
  }
}

watch(
  cancelPreviewReq,
  () => {
    runCancellationPreview()
  },
  { deep: true }
)

function openCreateCancellationModal(userType: 'CUSTOMER' | 'PARTNER') {
  isEditingCancellation.value = false
  editingCancellationId.value = null
  cancellationForm.value = {
    ruleName: '',
    userType,
    chargeType: 'PERCENTAGE',
    chargeValue: userType === 'CUSTOMER' ? 10 : 15,
    maxCap: userType === 'CUSTOMER' ? 250 : 400,
    freeWindowMinutes: 15,
    freeWindowHoursBeforeSlot: userType === 'CUSTOMER' ? 2 : 1,
    applicableStatus: 'ASSIGNED',
    cityId: '',
    cityName: '',
    serviceCategoryId: '',
    serviceCategoryName: '',
    effectiveDate: new Date().toISOString().slice(0, 10),
    isActive: true,
    notes: '',
  }
  isCancellationModalOpen.value = true
}

function openEditCancellationModal(rule: CancellationRule) {
  isEditingCancellation.value = true
  editingCancellationId.value = rule.id
  cancellationForm.value = {
    ruleName: rule.ruleName,
    userType: rule.userType,
    chargeType: rule.chargeType,
    chargeValue: rule.chargeValue,
    maxCap: rule.maxCap,
    freeWindowMinutes: rule.freeWindowMinutes,
    freeWindowHoursBeforeSlot: rule.freeWindowHoursBeforeSlot,
    applicableStatus: rule.applicableStatus,
    cityId: rule.cityId || '',
    cityName: rule.cityName || '',
    serviceCategoryId: rule.serviceCategoryId || '',
    serviceCategoryName: rule.serviceCategoryName || '',
    effectiveDate: rule.effectiveDate,
    isActive: rule.isActive,
    notes: rule.notes || '',
  }
  isCancellationModalOpen.value = true
}

async function saveCancellationRule() {
  if (!cancellationForm.value.ruleName.trim()) {
    showToast('Policy rule name is required', 'error')
    return
  }

  isActionLoading.value = true
  try {
    if (isEditingCancellation.value && editingCancellationId.value) {
      await api.partnerFinancialSettings.updateCancellationRule(editingCancellationId.value, cancellationForm.value)
      showToast('Cancellation policy updated successfully', 'success')
    } else {
      await api.partnerFinancialSettings.createCancellationRule(cancellationForm.value)
      showToast('Cancellation policy created successfully', 'success')
    }
    isCancellationModalOpen.value = false
    await loadAllData()
  } catch (err: any) {
    showToast(err?.message || 'Failed to save cancellation policy', 'error')
  } finally {
    isActionLoading.value = false
  }
}

async function toggleCancellationStatus(rule: CancellationRule) {
  try {
    const nextStatus = !rule.isActive
    await api.partnerFinancialSettings.toggleCancellationRule(rule.id, nextStatus)
    rule.isActive = nextStatus
    showToast(`Policy "${rule.ruleName}" ${nextStatus ? 'activated' : 'deactivated'}`, 'info')
  } catch (err: any) {
    showToast(err?.message || 'Failed to toggle policy status', 'error')
  }
}

async function deleteCancellationRule(id: string) {
  if (!confirm('Are you sure you want to delete this cancellation policy rule?')) return
  try {
    await api.partnerFinancialSettings.deleteCancellationRule(id)
    showToast('Cancellation policy deleted', 'success')
    await loadAllData()
  } catch (err: any) {
    showToast(err?.message || 'Failed to delete policy', 'error')
  }
}

// ── WEEKLY INCENTIVE ACTIONS ─────────────────────────────────────────────────
function openCreateIncentiveModal() {
  isEditingIncentive.value = false
  editingIncentiveId.value = null
  parsedSlabs.value = [
    { tier: 1, minCompletedJobs: 15, minBookingValue: 5000, incentiveAmount: 1000 },
    { tier: 2, minCompletedJobs: 25, minBookingValue: 10000, incentiveAmount: 2200 },
    { tier: 3, minCompletedJobs: 40, minBookingValue: 18000, incentiveAmount: 4500 },
  ]
  incentiveForm.value = {
    campaignName: '',
    description: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    weeklyPeriod: 'MONDAY_TO_SUNDAY',
    eligiblePartnerTypes: 'ALL',
    minCompletedJobs: 15,
    minBookingValue: 5000,
    incentiveAmount: 1000,
    maxIncentivePerPartner: 5000,
    slabsJson: JSON.stringify(parsedSlabs.value),
    status: 'ACTIVE',
  }
  isIncentiveModalOpen.value = true
}

function openEditIncentiveModal(c: IncentiveCampaign) {
  isEditingIncentive.value = true
  editingIncentiveId.value = c.id
  try {
    parsedSlabs.value = c.slabsJson ? JSON.parse(c.slabsJson) : []
  } catch {
    parsedSlabs.value = []
  }
  incentiveForm.value = {
    campaignName: c.campaignName,
    description: c.description || '',
    startDate: c.startDate,
    endDate: c.endDate,
    weeklyPeriod: c.weeklyPeriod,
    eligiblePartnerTypes: c.eligiblePartnerTypes,
    minCompletedJobs: c.minCompletedJobs,
    minBookingValue: c.minBookingValue,
    incentiveAmount: c.incentiveAmount,
    maxIncentivePerPartner: c.maxIncentivePerPartner,
    slabsJson: c.slabsJson,
    status: c.status,
  }
  isIncentiveModalOpen.value = true
}

function addSlab() {
  const nextTier = parsedSlabs.value.length + 1
  parsedSlabs.value.push({
    tier: nextTier,
    minCompletedJobs: nextTier * 15,
    minBookingValue: nextTier * 5000,
    incentiveAmount: nextTier * 1000,
  })
}

function removeSlab(index: number) {
  parsedSlabs.value.splice(index, 1)
}

async function saveIncentiveCampaign() {
  if (!incentiveForm.value.campaignName.trim()) {
    showToast('Incentive campaign name is required', 'error')
    return
  }

  incentiveForm.value.slabsJson = JSON.stringify(parsedSlabs.value)
  const firstSlab = parsedSlabs.value[0]
  if (firstSlab) {
    incentiveForm.value.incentiveAmount = firstSlab.incentiveAmount
    incentiveForm.value.minCompletedJobs = firstSlab.minCompletedJobs
  }

  isActionLoading.value = true
  try {
    if (isEditingIncentive.value && editingIncentiveId.value) {
      await api.partnerFinancialSettings.updateIncentiveCampaign(editingIncentiveId.value, incentiveForm.value)
      showToast('Weekly incentive campaign updated', 'success')
    } else {
      await api.partnerFinancialSettings.createIncentiveCampaign(incentiveForm.value)
      showToast('Weekly incentive campaign created', 'success')
    }
    isIncentiveModalOpen.value = false
    await loadAllData()
  } catch (err: any) {
    showToast(err?.message || 'Failed to save incentive campaign', 'error')
  } finally {
    isActionLoading.value = false
  }
}

async function updateCampaignStatus(id: string, status: string) {
  try {
    await api.partnerFinancialSettings.updateIncentiveCampaignStatus(id, status)
    showToast(`Campaign status updated to ${status}`, 'info')
    await loadAllData()
  } catch (err: any) {
    showToast(err?.message || 'Failed to update status', 'error')
  }
}

async function deleteIncentiveCampaign(id: string) {
  if (!confirm('Are you sure you want to delete this weekly incentive campaign?')) return
  try {
    await api.partnerFinancialSettings.deleteIncentiveCampaign(id)
    showToast('Incentive campaign deleted', 'success')
    await loadAllData()
  } catch (err: any) {
    showToast(err?.message || 'Failed to delete campaign', 'error')
  }
}

// ── COMPUTED FILTERED LISTS ──────────────────────────────────────────────────
const filteredCommissionRules = computed(() => {
  return commissionRules.value.filter((r) => {
    if (commissionTypeFilter.value !== 'ALL' && r.commissionType !== commissionTypeFilter.value) return false
    if (commissionCityFilter.value !== 'ALL' && r.cityId !== commissionCityFilter.value) return false
    if (commissionSearch.value.trim()) {
      const q = commissionSearch.value.toLowerCase().trim()
      const match =
        r.ruleName.toLowerCase().includes(q) ||
        (r.cityName && r.cityName.toLowerCase().includes(q)) ||
        (r.serviceCategoryName && r.serviceCategoryName.toLowerCase().includes(q)) ||
        (r.partnerName && r.partnerName.toLowerCase().includes(q))
      if (!match) return false
    }
    return true
  })
})

const filteredCancellationRules = computed(() => {
  return cancellationRules.value.filter((r) => r.userType === cancellationUserType.value)
})

const filteredIncentiveCampaigns = computed(() => {
  return incentiveCampaigns.value.filter((c) => {
    if (incentiveStatusFilter.value !== 'ALL' && c.status !== incentiveStatusFilter.value) return false
    return true
  })
})

const filteredAuditLogs = computed(() => {
  return auditLogs.value.filter((a) => {
    if (auditModuleFilter.value !== 'ALL' && a.module !== auditModuleFilter.value) return false
    return true
  })
})

function formatCurrency(val?: number): string {
  if (val === undefined || val === null) return '₹0.00'
  return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

onMounted(() => {
  loadAllData()
})
</script>

<template>
  <div class="min-h-screen bg-white text-[#202124] p-4 sm:p-6 lg:p-8 space-y-6">
    <!-- ── 1. Page Header ── -->
    <div class="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="space-y-2">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#800020]/10 text-[#800020] border border-[#800020]/20">
          <Percent class="size-3.5" />
          <span>Partner Monetization & Financial Policy</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-[#202124] tracking-tight">
          Partner Financial Settings
        </h1>
        <p class="text-sm sm:text-base text-[#6B7280] max-w-2xl leading-relaxed">
          Configure multi-tiered commission rules with strict rule priority, customize customer and partner cancellation policies, and orchestrate weekly partner incentive campaigns.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="loadAllData"
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
          @click="switchTab('commissions')"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition"
          :class="activeTab === 'commissions' ? 'bg-[#800020] text-white shadow-xs' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124]'"
        >
          <Percent class="size-4" />
          <span>Commission Settings ({{ commissionRules.length }})</span>
        </button>

        <button
          type="button"
          @click="switchTab('cancellations')"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition"
          :class="activeTab === 'cancellations' ? 'bg-[#800020] text-white shadow-xs' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124]'"
        >
          <Receipt class="size-4" />
          <span>Cancellation Charges ({{ cancellationRules.length }})</span>
        </button>

        <button
          type="button"
          @click="switchTab('incentives')"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition"
          :class="activeTab === 'incentives' ? 'bg-[#800020] text-white shadow-xs' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124]'"
        >
          <Flame class="size-4" />
          <span>Weekly Incentives ({{ incentiveCampaigns.length }})</span>
        </button>

        <button
          type="button"
          @click="switchTab('history')"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition"
          :class="activeTab === 'history' ? 'bg-[#800020] text-white shadow-xs' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8] hover:text-[#202124]'"
        >
          <History class="size-4" />
          <span>Configuration History</span>
        </button>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- TAB 1: COMMISSION SETTINGS                                            -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <div v-show="activeTab === 'commissions'" class="space-y-6">
      <!-- Live Calculation Preview & Rule Priority Explanation -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Interactive Preview Calculator Widget -->
        <div class="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
          <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div class="flex items-center gap-2">
              <Calculator class="size-4 text-[#800020]" />
              <h3 class="text-sm font-bold text-[#202124]">Live Commission Calculation Preview</h3>
            </div>
            <span class="text-xs text-[#6B7280]">Simulate booking order deduction</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label class="block font-bold text-[#202124] mb-1">Booking Amount (₹)</label>
              <input
                v-model.number="commPreviewReq.bookingAmount"
                type="number"
                min="0"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
              />
            </div>

            <div>
              <label class="block font-bold text-[#202124] mb-1">Applicable City</label>
              <select
                v-model="commPreviewReq.cityId"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
              >
                <option value="">Any / Global City</option>
                <option v-for="c in cities" :key="c.uniqueId" :value="c.uniqueId">{{ c.name }}</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-[#202124] mb-1">Service Category</label>
              <select
                v-model="commPreviewReq.serviceCategoryId"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
              >
                <option value="">Any / General Category</option>
                <option v-for="cat in categories" :key="cat.uniqueId" :value="cat.uniqueId">{{ cat.name }}</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-[#202124] mb-1">Partner ID (Optional)</label>
              <input
                v-model="commPreviewReq.partnerId"
                type="text"
                placeholder="e.g. partner-123"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
              />
            </div>
          </div>

          <!-- Preview Output Cards -->
          <div v-if="commPreviewRes" class="bg-[#F7F7F8] border border-[#E5E7EB] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div class="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Matched Rule & Hierarchy</div>
              <div class="text-sm font-black text-[#202124] mt-0.5">{{ commPreviewRes.matchedRuleName }}</div>
              <div class="text-xs text-[#6B7280] mt-0.5">
                Scope: <span class="font-bold text-[#800020]">{{ commPreviewRes.matchedRuleScope }}</span> (Priority score: {{ commPreviewRes.priorityScore }})
              </div>
            </div>

            <div class="flex items-center gap-6">
              <div class="text-right">
                <div class="text-xs text-[#6B7280]">OmiBay Platform Fee</div>
                <div class="text-base font-black text-red-600 mt-0.5">
                  -{{ formatCurrency(commPreviewRes.commissionDeduction) }}
                  <span class="text-[11px] font-normal text-[#6B7280]">({{ commPreviewRes.effectiveCommissionPercent }}%)</span>
                </div>
              </div>

              <div class="text-right border-l border-[#E5E7EB] pl-6">
                <div class="text-xs text-[#6B7280]">Partner Resulting Earnings</div>
                <div class="text-xl font-black text-emerald-700 mt-0.5">
                  {{ formatCurrency(commPreviewRes.partnerEarnings) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Priority Hierarchy Card -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-3">
          <div class="flex items-center gap-2 text-xs font-bold text-[#202124] uppercase tracking-wider">
            <ShieldCheck class="size-4 text-[#800020]" />
            <span>Rule Priority Engine</span>
          </div>
          <p class="text-xs text-[#6B7280]">
            Overlapping rules resolve deterministically through strict precedence scoring:
          </p>
          <div class="space-y-1.5 text-xs text-[#202124]">
            <div class="flex items-center justify-between p-2 rounded-lg bg-[#F7F7F8] border border-[#E5E7EB]">
              <span>1. Partner-specific rule</span>
              <span class="font-bold text-[#800020]">Score 1000</span>
            </div>
            <div class="flex items-center justify-between p-2 rounded-lg bg-[#F7F7F8] border border-[#E5E7EB]">
              <span>2. Subcategory + City rule</span>
              <span class="font-bold text-[#800020]">Score 500</span>
            </div>
            <div class="flex items-center justify-between p-2 rounded-lg bg-[#F7F7F8] border border-[#E5E7EB]">
              <span>3. Category + City rule</span>
              <span class="font-bold text-[#800020]">Score 300</span>
            </div>
            <div class="flex items-center justify-between p-2 rounded-lg bg-[#F7F7F8] border border-[#E5E7EB]">
              <span>4. Global Platform fallback</span>
              <span class="font-bold text-[#800020]">Score 10</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Commission Rules Table Section -->
      <div class="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-3 flex-1">
            <div class="relative w-full sm:w-72">
              <Search class="size-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                v-model="commissionSearch"
                type="text"
                placeholder="Search rule name, city, category..."
                class="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
              />
            </div>

            <select
              v-model="commissionTypeFilter"
              class="px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
            >
              <option value="ALL">All Types</option>
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed Amount (₹)</option>
            </select>
          </div>

          <button
            type="button"
            @click="openCreateCommissionModal"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#800020] text-white text-xs font-bold hover:bg-[#66001a] transition shadow-xs"
          >
            <Plus class="size-4" />
            <span>Add Commission Rule</span>
          </button>
        </div>

        <div class="border border-[#E5E7EB] rounded-xl overflow-hidden">
          <table class="w-full text-left text-xs text-[#202124]">
            <thead class="bg-[#F7F7F8] border-b border-[#E5E7EB] text-[#6B7280] font-semibold">
              <tr>
                <th class="py-3 px-4">Rule Name</th>
                <th class="py-3 px-4 text-center">Type & Value</th>
                <th class="py-3 px-4">Applicable Scope</th>
                <th class="py-3 px-4 text-center">Priority</th>
                <th class="py-3 px-4">Effective Dates</th>
                <th class="py-3 px-4 text-center">Status</th>
                <th class="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E5E7EB]">
              <tr v-if="filteredCommissionRules.length === 0">
                <td colspan="7" class="py-8 text-center text-[#6B7280]">
                  No commission rules found.
                </td>
              </tr>
              <tr
                v-for="r in filteredCommissionRules"
                :key="r.id"
                class="hover:bg-[#F7F7F8] transition"
              >
                <td class="py-3 px-4">
                  <div class="font-bold text-[#202124]">{{ r.ruleName }}</div>
                  <div class="text-[11px] text-[#6B7280] line-clamp-1">{{ r.notes || 'No description' }}</div>
                </td>
                <td class="py-3 px-4 text-center font-black" :class="r.commissionType === 'PERCENTAGE' ? 'text-[#800020]' : 'text-blue-700'">
                  {{ r.commissionType === 'PERCENTAGE' ? `${r.commissionValue}%` : `₹${r.commissionValue}` }}
                </td>
                <td class="py-3 px-4 text-[#6B7280]">
                  <div v-if="r.partnerName" class="font-bold text-purple-700">Partner: {{ r.partnerName }}</div>
                  <div v-else-if="r.serviceCategoryName" class="font-semibold text-[#202124]">Category: {{ r.serviceCategoryName }}</div>
                  <div v-if="r.cityName" class="text-[11px] text-blue-700">City: {{ r.cityName }}</div>
                  <div v-if="!r.partnerName && !r.serviceCategoryName && !r.cityName" class="italic text-[#6B7280]">Global Platform Fallback</div>
                </td>
                <td class="py-3 px-4 text-center font-mono font-bold text-[#202124]">
                  {{ r.priority }}
                </td>
                <td class="py-3 px-4 text-[#6B7280]">
                  {{ r.startDate || 'Immediate' }} {{ r.endDate ? `to ${r.endDate}` : 'onwards' }}
                </td>
                <td class="py-3 px-4 text-center">
                  <button
                    type="button"
                    @click="toggleCommissionStatus(r)"
                    class="px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer"
                    :class="r.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-300'"
                  >
                    {{ r.isActive ? 'Active' : 'Inactive' }}
                  </button>
                </td>
                <td class="py-3 px-4 text-center">
                  <div class="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      @click="openEditCommissionModal(r)"
                      class="p-1.5 hover:bg-gray-100 rounded-lg text-[#6B7280] hover:text-[#202124]"
                      title="Edit rule"
                    >
                      <Pen class="size-3.5" />
                    </button>
                    <button
                      type="button"
                      @click="deleteCommissionRule(r.id)"
                      class="p-1.5 hover:bg-red-50 rounded-lg text-[#6B7280] hover:text-red-700"
                      title="Delete rule"
                    >
                      <Trash2 class="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- TAB 2: CANCELLATION CHARGES                                           -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <div v-show="activeTab === 'cancellations'" class="space-y-6">
      <!-- Cancellation Sub-Tabs & Live Impact Preview -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Live Impact Simulator -->
        <div class="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4">
          <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div class="flex items-center gap-2">
              <Receipt class="size-4 text-[#800020]" />
              <h3 class="text-sm font-bold text-[#202124]">Cancellation Financial Impact Preview</h3>
            </div>
            <span class="text-xs text-[#6B7280]">Simulate cancellation charge & refund outcome</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label class="block font-bold text-[#202124] mb-1">Cancelling Party</label>
              <select
                v-model="cancelPreviewReq.userType"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
              >
                <option value="CUSTOMER">Customer Cancellation</option>
                <option value="PARTNER">Partner Cancellation</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-[#202124] mb-1">Order Booking Value (₹)</label>
              <input
                v-model.number="cancelPreviewReq.bookingAmount"
                type="number"
                min="0"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
              />
            </div>

            <div>
              <label class="block font-bold text-[#202124] mb-1">Order Timing</label>
              <select
                v-model="cancelPreviewReq.orderTiming"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
              >
                <option value="INSTANT">Instant Booking</option>
                <option value="SCHEDULED">Scheduled Slot</option>
              </select>
            </div>

            <div>
              <label class="block font-bold text-[#202124] mb-1">
                {{ cancelPreviewReq.orderTiming === 'INSTANT' ? 'Elapsed Minutes Since Acceptance' : 'Hours Before Scheduled Slot' }}
              </label>
              <input
                v-if="cancelPreviewReq.orderTiming === 'INSTANT'"
                v-model.number="cancelPreviewReq.minutesSinceAcceptance"
                type="number"
                min="0"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
              />
              <input
                v-else
                v-model.number="cancelPreviewReq.hoursBeforeSlot"
                type="number"
                min="0"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
              />
            </div>
          </div>

          <!-- Preview Result Card -->
          <div v-if="cancelPreviewRes" class="bg-[#F7F7F8] border border-[#E5E7EB] rounded-xl p-4 space-y-2">
            <div class="flex items-center justify-between">
              <span
                class="px-2.5 py-1 rounded-full text-xs font-bold"
                :class="cancelPreviewRes.isFreeCancellation ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'"
              >
                {{ cancelPreviewRes.isFreeCancellation ? 'Free Cancellation Applies' : 'Late Cancellation Fee Charged' }}
              </span>
              <span class="text-xs text-[#6B7280]">Policy: {{ cancelPreviewRes.matchedRuleName }}</span>
            </div>

            <p class="text-xs text-[#202124] font-medium leading-relaxed">
              {{ cancelPreviewRes.freeCancellationReason }}
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E5E7EB] text-xs">
              <div>
                <span class="text-[#6B7280]">Cancellation Charge:</span>
                <div class="text-base font-black text-red-600">{{ formatCurrency(cancelPreviewRes.cancellationCharge) }}</div>
              </div>
              <div>
                <span class="text-[#6B7280]">Customer Refund Amount:</span>
                <div class="text-base font-black text-emerald-700">{{ formatCurrency(cancelPreviewRes.customerRefundAmount) }}</div>
              </div>
              <div>
                <span class="text-[#6B7280]">{{ cancelPreviewRes.userType === 'CUSTOMER' ? 'Partner Compensation:' : 'Partner Penalty:' }}</span>
                <div class="text-base font-black" :class="cancelPreviewRes.userType === 'CUSTOMER' ? 'text-emerald-700' : 'text-red-600'">
                  {{ formatCurrency(cancelPreviewRes.partnerCompensationOrPenalty) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Policy Rules Safeguards -->
        <div class="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-3">
          <div class="flex items-center gap-2 text-xs font-bold text-[#202124] uppercase tracking-wider">
            <ShieldCheck class="size-4 text-[#800020]" />
            <span>Preserved OmiBay Policies</span>
          </div>
          <ul class="space-y-2 text-xs text-[#6B7280]">
            <li class="flex items-start gap-1.5">
              <Check class="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><b>15-Minute Free Window:</b> Partners can drop an order free of charge within 15 minutes of accepting.</span>
            </li>
            <li class="flex items-start gap-1.5">
              <Check class="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><b>Emergency Exception:</b> Genuine emergencies reviewed by admin do not incur partner penalties.</span>
            </li>
            <li class="flex items-start gap-1.5">
              <Check class="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span><b>Customer Continuity:</b> Partner cancellations never cancel the customer booking; order returns to re-assignment.</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Policy Table Section -->
      <div class="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs space-y-4">
        <!-- Sub-Tabs: Customer vs Partner Policy -->
        <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="cancellationUserType = 'CUSTOMER'"
              class="px-4 py-2 rounded-xl text-xs font-semibold transition"
              :class="cancellationUserType === 'CUSTOMER' ? 'bg-[#800020] text-white shadow-xs' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8]'"
            >
              Customer Cancellation Policy
            </button>
            <button
              type="button"
              @click="cancellationUserType = 'PARTNER'"
              class="px-4 py-2 rounded-xl text-xs font-semibold transition"
              :class="cancellationUserType === 'PARTNER' ? 'bg-[#800020] text-white shadow-xs' : 'bg-white text-[#6B7280] hover:bg-[#F7F7F8]'"
            >
              Partner Cancellation Policy
            </button>
          </div>

          <button
            type="button"
            @click="openCreateCancellationModal(cancellationUserType)"
            class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#800020] text-white text-xs font-bold hover:bg-[#66001a] transition"
          >
            <Plus class="size-4" />
            <span>Add Policy Rule</span>
          </button>
        </div>

        <div class="border border-[#E5E7EB] rounded-xl overflow-hidden">
          <table class="w-full text-left text-xs text-[#202124]">
            <thead class="bg-[#F7F7F8] border-b border-[#E5E7EB] text-[#6B7280] font-semibold">
              <tr>
                <th class="py-3 px-4">Policy Name</th>
                <th class="py-3 px-4 text-center">Charge Rate</th>
                <th class="py-3 px-4 text-center">Max Cap</th>
                <th class="py-3 px-4">Free Window</th>
                <th class="py-3 px-4">Applicable Status</th>
                <th class="py-3 px-4 text-center">Status</th>
                <th class="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E5E7EB]">
              <tr v-if="filteredCancellationRules.length === 0">
                <td colspan="7" class="py-8 text-center text-[#6B7280]">
                  No cancellation policy rules configured.
                </td>
              </tr>
              <tr
                v-for="r in filteredCancellationRules"
                :key="r.id"
                class="hover:bg-[#F7F7F8] transition"
              >
                <td class="py-3 px-4">
                  <div class="font-bold text-[#202124]">{{ r.ruleName }}</div>
                  <div class="text-[11px] text-[#6B7280]">{{ r.notes || 'Default policy' }}</div>
                </td>
                <td class="py-3 px-4 text-center font-black text-red-600">
                  {{ r.chargeType === 'PERCENTAGE' ? `${r.chargeValue}%` : `₹${r.chargeValue}` }}
                </td>
                <td class="py-3 px-4 text-center font-mono">
                  {{ r.maxCap ? formatCurrency(r.maxCap) : 'No Cap' }}
                </td>
                <td class="py-3 px-4 text-[#6B7280]">
                  <div>≤ {{ r.freeWindowMinutes }} min (Instant)</div>
                  <div class="text-[11px]">≥ {{ r.freeWindowHoursBeforeSlot }} hrs before slot (Scheduled)</div>
                </td>
                <td class="py-3 px-4 font-mono text-[#6B7280]">
                  {{ r.applicableStatus || 'ASSIGNED' }}
                </td>
                <td class="py-3 px-4 text-center">
                  <button
                    type="button"
                    @click="toggleCancellationStatus(r)"
                    class="px-2.5 py-1 rounded-full text-[10px] font-bold border transition cursor-pointer"
                    :class="r.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-300'"
                  >
                    {{ r.isActive ? 'Active' : 'Inactive' }}
                  </button>
                </td>
                <td class="py-3 px-4 text-center">
                  <div class="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      @click="openEditCancellationModal(r)"
                      class="p-1.5 hover:bg-gray-100 rounded-lg text-[#6B7280] hover:text-[#202124]"
                      title="Edit policy"
                    >
                      <Pen class="size-3.5" />
                    </button>
                    <button
                      type="button"
                      @click="deleteCancellationRule(r.id)"
                      class="p-1.5 hover:bg-red-50 rounded-lg text-[#6B7280] hover:text-red-700"
                      title="Delete policy"
                    >
                      <Trash2 class="size-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- TAB 3: WEEKLY INCENTIVES                                              -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <div v-show="activeTab === 'incentives'" class="space-y-6">
      <!-- Toolbar -->
      <div class="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <select
            v-model="incentiveStatusFilter"
            class="px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
          >
            <option value="ALL">All Campaigns</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>

        <button
          type="button"
          @click="openCreateIncentiveModal"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#800020] text-white text-xs font-bold hover:bg-[#66001a] transition shadow-xs"
        >
          <Plus class="size-4" />
          <span>Create Weekly Incentive Campaign</span>
        </button>
      </div>

      <!-- Campaign Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="c in filteredIncentiveCampaigns"
          :key="c.id"
          class="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs space-y-4 hover:shadow-md transition flex flex-col justify-between"
        >
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span
                class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                :class="{
                  'bg-emerald-50 text-emerald-700 border border-emerald-200': c.status === 'ACTIVE',
                  'bg-gray-100 text-gray-700 border border-gray-200': c.status === 'INACTIVE',
                  'bg-blue-50 text-blue-700 border border-blue-200': c.status === 'DRAFT',
                }"
              >
                {{ c.status }}
              </span>
              <span class="text-xs text-[#6B7280]">{{ c.weeklyPeriod }}</span>
            </div>

            <div>
              <h3 class="text-base font-bold text-[#202124]">{{ c.campaignName }}</h3>
              <p class="text-xs text-[#6B7280] line-clamp-2 mt-1">{{ c.description || 'Weekly partner surge milestone.' }}</p>
            </div>

            <!-- Slabs Preview -->
            <div class="bg-[#F7F7F8] p-3 rounded-xl border border-[#E5E7EB] space-y-1.5 text-xs">
              <div class="font-bold text-[#202124]">Performance Slabs:</div>
              <div
                v-for="slab in (c.slabsJson ? JSON.parse(c.slabsJson) : [{ tier: 1, minCompletedJobs: c.minCompletedJobs, incentiveAmount: c.incentiveAmount }])"
                :key="slab.tier"
                class="flex items-center justify-between text-[#6B7280]"
              >
                <span>Tier {{ slab.tier }}: Complete {{ slab.minCompletedJobs }}+ jobs</span>
                <span class="font-black text-emerald-700">+{{ formatCurrency(slab.incentiveAmount) }}</span>
              </div>
            </div>

            <div class="flex items-center justify-between text-xs text-[#6B7280] pt-1">
              <span>Duration:</span>
              <span class="font-medium text-[#202124]">{{ c.startDate }} to {{ c.endDate }}</span>
            </div>
          </div>

          <!-- Bottom Actions -->
          <div class="pt-3 border-t border-[#E5E7EB] flex items-center justify-between gap-2">
            <button
              type="button"
              @click="updateCampaignStatus(c.id, c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')"
              class="text-xs font-semibold text-[#800020] hover:text-[#66001a]"
            >
              {{ c.status === 'ACTIVE' ? 'Pause Campaign' : 'Activate Campaign' }}
            </button>

            <div class="flex items-center gap-1">
              <button
                type="button"
                @click="openEditIncentiveModal(c)"
                class="p-1.5 hover:bg-gray-100 rounded-lg text-[#6B7280]"
                title="Edit campaign"
              >
                <Pen class="size-3.5" />
              </button>
              <button
                type="button"
                @click="deleteIncentiveCampaign(c.id)"
                class="p-1.5 hover:bg-red-50 rounded-lg text-red-600"
                title="Delete campaign"
              >
                <Trash2 class="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- TAB 4: CONFIGURATION HISTORY (AUDIT LOGS)                             -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <div v-show="activeTab === 'history'" class="space-y-4">
      <div class="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <select
          v-model="auditModuleFilter"
          class="px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
        >
          <option value="ALL">All Modules</option>
          <option value="COMMISSION">Commission Settings</option>
          <option value="CANCELLATION">Cancellation Policies</option>
          <option value="INCENTIVE">Weekly Incentives</option>
        </select>
      </div>

      <div class="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-xs">
        <table class="w-full text-left text-xs text-[#202124]">
          <thead class="bg-[#F7F7F8] border-b border-[#E5E7EB] text-[#6B7280] font-semibold">
            <tr>
              <th class="py-3 px-4">Timestamp</th>
              <th class="py-3 px-4">Module</th>
              <th class="py-3 px-4">Action</th>
              <th class="py-3 px-4">Entity</th>
              <th class="py-3 px-4">Previous Value</th>
              <th class="py-3 px-4">New Value</th>
              <th class="py-3 px-4">Admin / Operator</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#E5E7EB]">
            <tr v-if="filteredAuditLogs.length === 0">
              <td colspan="7" class="py-8 text-center text-[#6B7280]">
                No configuration audit events recorded.
              </td>
            </tr>
            <tr
              v-for="log in filteredAuditLogs"
              :key="log.id"
              class="hover:bg-[#F7F7F8] transition"
            >
              <td class="py-3 px-4 text-[#6B7280]">
                {{ new Date(log.createdAt).toLocaleString() }}
              </td>
              <td class="py-3 px-4 font-bold text-[#800020]">
                {{ log.module }}
              </td>
              <td class="py-3 px-4">
                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  :class="log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-800' : log.action === 'UPDATE' ? 'bg-blue-50 text-blue-800' : 'bg-red-50 text-red-800'"
                >
                  {{ log.action }}
                </span>
              </td>
              <td class="py-3 px-4 font-medium text-[#202124]">
                {{ log.entityName || log.entityId }}
              </td>
              <td class="py-3 px-4 text-[#6B7280]">
                {{ log.previousValue || '—' }}
              </td>
              <td class="py-3 px-4 font-bold text-[#202124]">
                {{ log.newValue || '—' }}
              </td>
              <td class="py-3 px-4 text-[#6B7280]">
                {{ log.changedBy }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- MODAL 1: ADD / EDIT COMMISSION RULE                                   -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <Popup
      v-model="isCommissionModalOpen"
      :title="isEditingCommission ? 'Edit Commission Rule' : 'Add Commission Rule'"
      size="md"
    >
      <form @submit.prevent="saveCommissionRule" class="space-y-4 text-xs">
        <div>
          <label class="block font-bold text-[#202124] mb-1">Rule Name *</label>
          <input
            v-model="commissionForm.ruleName"
            type="text"
            required
            placeholder="e.g. Electrical High-Skill Category Rule"
            class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-[#202124] mb-1">Commission Type *</label>
            <select
              v-model="commissionForm.commissionType"
              class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
            >
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed Amount (₹)</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-[#202124] mb-1">Commission Value *</label>
            <input
              v-model.number="commissionForm.commissionValue"
              type="number"
              step="0.01"
              required
              min="0"
              class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-[#202124] mb-1">City (Optional)</label>
            <select
              v-model="commissionForm.cityId"
              class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
            >
              <option value="">All / Global Cities</option>
              <option v-for="c in cities" :key="c.uniqueId" :value="c.uniqueId">{{ c.name }}</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-[#202124] mb-1">Service Category (Optional)</label>
            <select
              v-model="commissionForm.serviceCategoryId"
              class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
            >
              <option value="">All / General Categories</option>
              <option v-for="cat in categories" :key="cat.uniqueId" :value="cat.uniqueId">{{ cat.name }}</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-[#202124] mb-1">Specific Partner ID (Optional)</label>
            <input
              v-model="commissionForm.partnerId"
              type="text"
              placeholder="Leave empty for all partners"
              class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
            />
          </div>

          <div>
            <label class="block font-bold text-[#202124] mb-1">Effective Start Date</label>
            <input
              v-model="commissionForm.startDate"
              type="date"
              class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
            />
          </div>
        </div>

        <div>
          <label class="block font-bold text-[#202124] mb-1">Internal Notes</label>
          <textarea
            v-model="commissionForm.notes"
            rows="2"
            placeholder="Operational justification for this rate"
            class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="isCommissionModalOpen = false"
            class="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:bg-[#F7F7F8]"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isActionLoading"
            class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#800020] hover:bg-[#66001a] transition shadow-xs disabled:opacity-60"
          >
            {{ isEditingCommission ? 'Update Rule' : 'Save Commission Rule' }}
          </button>
        </div>
      </form>
    </Popup>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- MODAL 2: ADD / EDIT CANCELLATION CHARGE POLICY                        -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <Popup
      v-model="isCancellationModalOpen"
      :title="isEditingCancellation ? 'Edit Cancellation Policy' : 'Add Cancellation Policy'"
      size="md"
    >
      <form @submit.prevent="saveCancellationRule" class="space-y-4 text-xs">
        <div>
          <label class="block font-bold text-[#202124] mb-1">Policy Rule Name *</label>
          <input
            v-model="cancellationForm.ruleName"
            type="text"
            required
            placeholder="e.g. Standard Customer Late Drop Policy"
            class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-[#202124] mb-1">Charge Type *</label>
            <select
              v-model="cancellationForm.chargeType"
              class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
            >
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed Amount (₹)</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-[#202124] mb-1">Charge Value *</label>
            <input
              v-model.number="cancellationForm.chargeValue"
              type="number"
              step="0.01"
              required
              min="0"
              class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-[#202124] mb-1">Maximum Cap (₹)</label>
            <input
              v-model.number="cancellationForm.maxCap"
              type="number"
              placeholder="e.g. 250"
              class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
            />
          </div>

          <div>
            <label class="block font-bold text-[#202124] mb-1">Free Window (Minutes)</label>
            <input
              v-model.number="cancellationForm.freeWindowMinutes"
              type="number"
              min="0"
              placeholder="15"
              class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
            />
          </div>
        </div>

        <div>
          <label class="block font-bold text-[#202124] mb-1">Free Hours Before Slot (Scheduled Orders)</label>
          <input
            v-model.number="cancellationForm.freeWindowHoursBeforeSlot"
            type="number"
            min="0"
            placeholder="2"
            class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
          />
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="isCancellationModalOpen = false"
            class="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:bg-[#F7F7F8]"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isActionLoading"
            class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#800020] hover:bg-[#66001a] transition shadow-xs disabled:opacity-60"
          >
            {{ isEditingCancellation ? 'Update Policy' : 'Save Policy' }}
          </button>
        </div>
      </form>
    </Popup>

    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <!-- MODAL 3: ADD / EDIT WEEKLY INCENTIVE CAMPAIGN                         -->
    <!-- ═══════════════════════════════════════════════════════════════════════ -->
    <Popup
      v-model="isIncentiveModalOpen"
      :title="isEditingIncentive ? 'Edit Weekly Incentive Campaign' : 'Create Weekly Incentive Campaign'"
      size="lg"
    >
      <form @submit.prevent="saveIncentiveCampaign" class="space-y-4 text-xs">
        <div>
          <label class="block font-bold text-[#202124] mb-1">Campaign Name *</label>
          <input
            v-model="incentiveForm.campaignName"
            type="text"
            required
            placeholder="e.g. Diwali Partner Milestone Surge"
            class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
          />
        </div>

        <div>
          <label class="block font-bold text-[#202124] mb-1">Description</label>
          <textarea
            v-model="incentiveForm.description"
            rows="2"
            placeholder="Campaign rules communicated to partners on their app"
            class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-bold text-[#202124] mb-1">Start Date *</label>
            <input
              v-model="incentiveForm.startDate"
              type="date"
              required
              class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
            />
          </div>

          <div>
            <label class="block font-bold text-[#202124] mb-1">End Date *</label>
            <input
              v-model="incentiveForm.endDate"
              type="date"
              required
              class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#202124] focus:outline-hidden focus:border-[#800020]"
            />
          </div>
        </div>

        <!-- Slabs Editor -->
        <div class="space-y-2 pt-2 border-t border-[#E5E7EB]">
          <div class="flex items-center justify-between">
            <span class="font-bold text-[#202124]">Performance Slabs & Rewards</span>
            <button
              type="button"
              @click="addSlab"
              class="text-xs font-bold text-[#800020] hover:underline inline-flex items-center gap-1"
            >
              <Plus class="size-3.5" />
              <span>Add Tier Slab</span>
            </button>
          </div>

          <div class="border border-[#E5E7EB] rounded-xl overflow-hidden">
            <table class="w-full text-left text-xs">
              <thead class="bg-[#F7F7F8] border-b border-[#E5E7EB] text-[#6B7280]">
                <tr>
                  <th class="p-2.5">Tier</th>
                  <th class="p-2.5">Min Completed Jobs</th>
                  <th class="p-2.5">Min Booking Value (₹)</th>
                  <th class="p-2.5">Reward Amount (₹)</th>
                  <th class="p-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E5E7EB]">
                <tr v-for="(slab, index) in parsedSlabs" :key="slab.tier">
                  <td class="p-2.5 font-bold text-[#202124]">Tier {{ slab.tier }}</td>
                  <td class="p-2.5">
                    <input
                      v-model.number="slab.minCompletedJobs"
                      type="number"
                      min="1"
                      class="w-24 px-2 py-1 bg-white border border-[#E5E7EB] rounded-lg"
                    />
                  </td>
                  <td class="p-2.5">
                    <input
                      v-model.number="slab.minBookingValue"
                      type="number"
                      min="0"
                      class="w-28 px-2 py-1 bg-white border border-[#E5E7EB] rounded-lg"
                    />
                  </td>
                  <td class="p-2.5">
                    <input
                      v-model.number="slab.incentiveAmount"
                      type="number"
                      min="1"
                      class="w-28 px-2 py-1 bg-white border border-[#E5E7EB] rounded-lg font-bold text-emerald-700"
                    />
                  </td>
                  <td class="p-2.5 text-center">
                    <button
                      type="button"
                      @click="removeSlab(index)"
                      class="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 class="size-3.5" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="isIncentiveModalOpen = false"
            class="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:bg-[#F7F7F8]"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isActionLoading"
            class="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#800020] hover:bg-[#66001a] transition shadow-xs disabled:opacity-60"
          >
            {{ isEditingIncentive ? 'Update Campaign' : 'Publish Campaign' }}
          </button>
        </div>
      </form>
    </Popup>
  </div>
</template>

