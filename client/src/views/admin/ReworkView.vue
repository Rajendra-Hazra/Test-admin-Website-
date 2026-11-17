<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api'
import type {
  ReworkCase,
  ReworkStats,
  ReworkStatusType,
  City,
  ServiceType,
  AdminOrder,
  AdminOrderProof,
} from '@/types/api'
import Table, { type Header } from '@/components/common/Table.vue'
import Popup from '@/components/common/Popup.vue'
import { showToast } from '@/utils/toast'
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Calendar,
  MapPin,
  User,
  Briefcase,
  ShieldAlert,
  FileText,
  ExternalLink,
  MessageSquare,
  Eye,
  ArrowRight,
  ChevronRight,
  Image as ImageIcon,
  Video as VideoIcon,
  DollarSign,
  AlertTriangle,
  Layers,
  Send,
  RefreshCw,
  Info,
} from 'lucide-vue-next'

// ── State ─────────────────────────────────────────────────────────────
const isLoading = ref(false)
const isStatsLoading = ref(false)
const error = ref('')

const reworks = ref<ReworkCase[]>([])
const cities = ref<City[]>([])
const categories = ref<ServiceType[]>([])
const stats = ref<ReworkStats>({
  totalRequests: 0,
  pendingRequests: 0,
  underReview: 0,
  approvedRequests: 0,
  rejectedRequests: 0,
  completedReworks: 0,
})

// Filters
const searchQuery = ref('')
const selectedStatus = ref<string>('ALL')
const selectedCityId = ref<string>('ALL')
const selectedCategoryId = ref<string>('ALL')
const datePreset = ref<string>('ALL')

// Details Drawer / Modal
const isDetailsOpen = ref(false)
const selectedRework = ref<ReworkCase | null>(null)
const selectedOrder = ref<AdminOrder | null>(null)
const isLoadingOrder = ref(false)

// Active Tab inside Details Modal
const detailTab = ref<'overview' | 'evidence' | 'decision' | 'timeline' | 'history'>('overview')

// Media Viewer
const mediaModal = ref<{ open: boolean; url: string; type: 'IMAGE' | 'VIDEO'; title: string }>({
  open: false,
  url: '',
  type: 'IMAGE',
  title: '',
})

// Decision Actions
const isApproveModalOpen = ref(false)
const isRejectModalOpen = ref(false)
const isEscalateModalOpen = ref(false)
const isNoteModalOpen = ref(false)
const isSubmittingDecision = ref(false)

const approveForm = ref({
  assignOption: 'ORIGINAL' as 'ORIGINAL' | 'REPLACEMENT',
  replacementPartnerId: '',
  note: '',
  penaltyAmount: 0,
  penaltyReason: '',
})

const rejectForm = ref({
  reason: '',
})

const noteForm = ref({
  note: '',
})

// ── Table Headers ─────────────────────────────────────────────────────
const headers: Header[] = [
  { key: 'reworkId', title: 'Case / Request ID', align: 'left', sortable: true },
  { key: 'orderInfo', title: 'Original Booking', align: 'left', sortable: true },
  { key: 'customer', title: 'Customer Details', align: 'left' },
  { key: 'partner', title: 'Original Partner', align: 'left' },
  { key: 'categoryCity', title: 'Category & City', align: 'left' },
  { key: 'claimedAt', title: 'Request Date', align: 'left', sortable: true },
  { key: 'eligibility', title: 'Eligibility', align: 'center' },
  { key: 'status', title: 'Status', align: 'center', sortable: true },
  { key: 'actions', title: 'Actions', align: 'center' },
]

// ── Fetching Data ─────────────────────────────────────────────────────
async function fetchStats() {
  isStatsLoading.value = true
  try {
    const res = await api.adminReworks.getStats()
    const raw = (res as any)?.data ?? res
    if (raw) {
      stats.value = {
        totalRequests: Number(raw.totalRequests || 0),
        pendingRequests: Number(raw.pendingRequests || 0),
        underReview: Number(raw.underReview || 0),
        approvedRequests: Number(raw.approvedRequests || 0),
        rejectedRequests: Number(raw.rejectedRequests || 0),
        completedReworks: Number(raw.completedReworks || 0),
      }
    }
  } catch (err: any) {
    console.error('Failed to load stats:', err)
  } finally {
    isStatsLoading.value = false
  }
}

async function fetchReworks() {
  isLoading.value = true
  error.value = ''
  try {
    const res = await api.adminReworks.getAll({
      status: selectedStatus.value === 'ALL' ? undefined : selectedStatus.value,
    })
    const raw = (res as any)?.data ?? res
    reworks.value = Array.isArray(raw) ? raw : []
  } catch (err: any) {
    error.value = err?.message || 'Failed to load rework requests'
    showToast(error.value, 'error')
  } finally {
    isLoading.value = false
  }
}

async function fetchMetadata() {
  try {
    const [cityRes, catRes] = await Promise.allSettled([
      api.cities.getAll(),
      api.services.getAllTypes(),
    ])
    if (cityRes.status === 'fulfilled') {
      const raw = (cityRes.value as any)?.data ?? cityRes.value
      cities.value = Array.isArray(raw) ? raw : []
    }
    if (catRes.status === 'fulfilled') {
      const raw = (catRes.value as any)?.data ?? catRes.value
      categories.value = Array.isArray(raw) ? raw : []
    }
  } catch (e) {
    console.error('Metadata load error:', e)
  }
}

async function refreshAll() {
  await Promise.all([fetchStats(), fetchReworks()])
}

// ── Selection & Detailed Inspection ───────────────────────────────────
async function openDetails(item: ReworkCase) {
  selectedRework.value = item
  selectedOrder.value = null
  detailTab.value = 'overview'
  isDetailsOpen.value = true

  // Fetch full original order details for Evidence & Comparison
  if (item.orderId) {
    isLoadingOrder.value = true
    try {
      const oRes = await api.adminOrders.getById(item.orderId)
      const raw = (oRes as any)?.data ?? oRes
      selectedOrder.value = raw
    } catch (e: any) {
      console.warn('Original order lookup warning:', e?.message)
    } finally {
      isLoadingOrder.value = false
    }
  }
}

// ── Computed Filtered Reworks ─────────────────────────────────────────
const filteredReworks = computed(() => {
  return reworks.value.filter((r) => {
    // City Filter
    if (selectedCityId.value !== 'ALL') {
      if (r.cityId !== selectedCityId.value) return false
    }

    // Category Filter
    if (selectedCategoryId.value !== 'ALL') {
      if (r.serviceTypeId !== selectedCategoryId.value) return false
    }

    // Status Filter (extra local safeguard if status not sent to backend)
    if (selectedStatus.value !== 'ALL') {
      if (r.status !== selectedStatus.value) return false
    }

    // Date Range Presets
    if (datePreset.value !== 'ALL' && r.claimedAt) {
      const claimDate = new Date(r.claimedAt).getTime()
      const now = Date.now()
      if (datePreset.value === 'TODAY') {
        const todayStart = new Date().setHours(0, 0, 0, 0)
        if (claimDate < todayStart) return false
      } else if (datePreset.value === '7D') {
        if (now - claimDate > 7 * 86400000) return false
      } else if (datePreset.value === '30D') {
        if (now - claimDate > 30 * 86400000) return false
      }
    }

    // Global Search Query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const matchId = r.reworkId?.toLowerCase().includes(q)
      const matchOrder = r.displayOrderId?.toLowerCase().includes(q) || r.orderId?.toLowerCase().includes(q)
      const matchCustomer =
        r.customerName?.toLowerCase().includes(q) || r.customerMobile?.toLowerCase().includes(q)
      const matchPartner =
        r.partnerName?.toLowerCase().includes(q) || r.partnerMobile?.toLowerCase().includes(q)
      const matchDesc = r.description?.toLowerCase().includes(q) || false
      if (!matchId && !matchOrder && !matchCustomer && !matchPartner && !matchDesc) {
        return false
      }
    }

    return true
  })
})

// ── Evidence Grouping ─────────────────────────────────────────────────
const beforeProofs = computed<AdminOrderProof[]>(() => {
  if (!selectedOrder.value?.proofs) return []
  return selectedOrder.value.proofs.filter((p: any) => p.proofType === 'BEFORE')
})

const afterProofs = computed<AdminOrderProof[]>(() => {
  if (!selectedOrder.value?.proofs) return []
  return selectedOrder.value.proofs.filter((p: any) => p.proofType === 'AFTER' || p.proofType === 'COMPLETION')
})

// ── Helpers & Formatters ──────────────────────────────────────────────
function formatDate(d?: string | null) {
  if (!d) return '—'
  try {
    const dt = new Date(d)
    return dt.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return d
  }
}

function formatCurrency(val?: number | null) {
  if (val === undefined || val === null) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val)
}

function statusBadgeClass(status?: ReworkStatusType | string) {
  switch (status) {
    case 'PENDING_GROUND_MANAGER_REVIEW':
    case 'PENDING_PARTNER_REVIEW':
    case 'SUBMITTED':
      return 'bg-amber-50 text-amber-800 border border-amber-200'
    case 'ADMIN_REVIEW':
    case 'INSPECTED':
      return 'bg-blue-50 text-blue-800 border border-blue-200'
    case 'APPROVED_ORIGINAL_PARTNER':
    case 'ASSIGNED_NEW_PARTNER':
    case 'APPROVED_BY_ADMIN':
    case 'ACCEPTED_BY_PARTNER':
    case 'APPROVED':
    case 'ASSIGNED':
      return 'bg-emerald-50 text-emerald-800 border border-emerald-200'
    case 'CANCELLED':
    case 'REJECTED_BY_ADMIN':
    case 'REJECTED_BY_PARTNER':
    case 'REJECTED':
      return 'bg-rose-50 text-rose-800 border border-rose-200'
    case 'COMPLETED':
      return 'bg-teal-50 text-teal-800 border border-teal-200'
    default:
      return 'bg-[#F7F7F8] text-[#6B7280] border border-[#E5E7EB]'
  }
}

function statusLabel(status?: ReworkStatusType | string) {
  switch (status) {
    case 'PENDING_GROUND_MANAGER_REVIEW':
      return 'Pending GM Review'
    case 'PENDING_PARTNER_REVIEW':
      return 'Pending Partner Review'
    case 'ADMIN_REVIEW':
      return 'Under Admin Review'
    case 'APPROVED_ORIGINAL_PARTNER':
      return 'Approved (Original Partner)'
    case 'ASSIGNED_NEW_PARTNER':
      return 'Approved (New Partner)'
    case 'ACCEPTED_BY_PARTNER':
      return 'Accepted By Partner'
    case 'APPROVED_BY_ADMIN':
      return 'Approved By Admin'
    case 'CANCELLED':
      return 'Cancelled / Dismissed'
    case 'REJECTED_BY_ADMIN':
      return 'Rejected By Admin'
    case 'REJECTED_BY_PARTNER':
      return 'Rejected By Partner'
    case 'COMPLETED':
      return 'Rework Completed'
    case 'SUBMITTED':
      return 'Submitted'
    default:
      return status || 'Pending'
  }
}

function eligibilityBadgeClass(status?: string) {
  if (status === 'ELIGIBLE') {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
  } else if (status === 'NOT_ELIGIBLE') {
    return 'bg-rose-50 text-rose-700 border border-rose-200'
  }
  return 'bg-amber-50 text-amber-700 border border-amber-200'
}

function previewMedia(url: string, type: 'IMAGE' | 'VIDEO', title: string) {
  mediaModal.value = {
    open: true,
    url,
    type,
    title,
  }
}

// ── Admin Decisions Management ────────────────────────────────────────
function openApproveModal(item: ReworkCase) {
  selectedRework.value = item
  approveForm.value = {
    assignOption: 'ORIGINAL',
    replacementPartnerId: '',
    note: '',
    penaltyAmount: 0,
    penaltyReason: '',
  }
  isApproveModalOpen.value = true
}

function openRejectModal(item: ReworkCase) {
  selectedRework.value = item
  rejectForm.value = { reason: '' }
  isRejectModalOpen.value = true
}

function openEscalateModal(item: ReworkCase) {
  selectedRework.value = item
  noteForm.value = { note: '' }
  isEscalateModalOpen.value = true
}

function openNoteModal(item: ReworkCase) {
  selectedRework.value = item
  noteForm.value = { note: '' }
  isNoteModalOpen.value = true
}

async function handleApprove() {
  if (!selectedRework.value) return
  if (approveForm.value.penaltyAmount > 0 && !approveForm.value.penaltyReason.trim()) {
    showToast('Penalty reason is mandatory when charging a partner penalty.', 'warning')
    return
  }
  if (approveForm.value.assignOption === 'REPLACEMENT' && !approveForm.value.replacementPartnerId.trim()) {
    showToast('Please provide a replacement partner profile ID.', 'warning')
    return
  }

  isSubmittingDecision.value = true
  try {
    const payload = {
      partnerId:
        approveForm.value.assignOption === 'REPLACEMENT'
          ? approveForm.value.replacementPartnerId.trim()
          : undefined,
      note: approveForm.value.note.trim() || undefined,
      penaltyAmount: approveForm.value.penaltyAmount > 0 ? approveForm.value.penaltyAmount : undefined,
      penaltyReason: approveForm.value.penaltyReason.trim() || undefined,
    }

    const res = await api.adminReworks.approve(selectedRework.value.reworkId, payload)
    const updated = (res as any)?.data ?? res
    showToast('Rework request successfully approved! Rework order created.', 'success')
    isApproveModalOpen.value = false

    if (selectedRework.value.reworkId === updated?.reworkId) {
      selectedRework.value = updated
    }
    await refreshAll()
  } catch (err: any) {
    showToast(err?.message || 'Failed to approve rework', 'error')
  } finally {
    isSubmittingDecision.value = false
  }
}

async function handleReject() {
  if (!selectedRework.value) return
  if (!rejectForm.value.reason.trim()) {
    showToast('Rejection reason is required.', 'warning')
    return
  }

  isSubmittingDecision.value = true
  try {
    const res = await api.adminReworks.cancel(selectedRework.value.reworkId, {
      reason: rejectForm.value.reason.trim(),
    })
    const updated = (res as any)?.data ?? res
    showToast('Rework request dismissed / rejected.', 'info')
    isRejectModalOpen.value = false

    if (selectedRework.value.reworkId === updated?.reworkId) {
      selectedRework.value = updated
    }
    await refreshAll()
  } catch (err: any) {
    showToast(err?.message || 'Failed to dismiss rework', 'error')
  } finally {
    isSubmittingDecision.value = false
  }
}

async function handleEscalate() {
  if (!selectedRework.value) return
  isSubmittingDecision.value = true
  try {
    const res = await api.adminReworks.escalate(selectedRework.value.reworkId, {
      note: noteForm.value.note.trim() || 'Escalated to admin review.',
    })
    const updated = (res as any)?.data ?? res
    showToast('Rework case marked for Admin Review.', 'success')
    isEscalateModalOpen.value = false

    if (selectedRework.value.reworkId === updated?.reworkId) {
      selectedRework.value = updated
    }
    await refreshAll()
  } catch (err: any) {
    showToast(err?.message || 'Failed to escalate rework', 'error')
  } finally {
    isSubmittingDecision.value = false
  }
}

async function handleAddNote() {
  if (!selectedRework.value) return
  if (!noteForm.value.note.trim()) {
    showToast('Note cannot be blank.', 'warning')
    return
  }
  isSubmittingDecision.value = true
  try {
    const res = await api.adminReworks.addNote(selectedRework.value.reworkId, {
      note: noteForm.value.note.trim(),
    })
    const updated = (res as any)?.data ?? res
    showToast('Internal admin note recorded.', 'success')
    isNoteModalOpen.value = false

    if (selectedRework.value.reworkId === updated?.reworkId) {
      selectedRework.value = updated
    }
    await refreshAll()
  } catch (err: any) {
    showToast(err?.message || 'Failed to record note', 'error')
  } finally {
    isSubmittingDecision.value = false
  }
}

onMounted(() => {
  fetchStats()
  fetchReworks()
  fetchMetadata()
})
</script>

<template>
  <div class="space-y-6 bg-white min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
    <!-- ── Header & Action Controls ──────────────────────────────────── -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E7EB] pb-5">
      <div>
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-[#FAF0F2] text-[#800020] rounded-xl border border-[#E5E7EB]">
            <RotateCcw class="size-6" />
          </div>
          <div>
            <h1 class="text-xl sm:text-2xl font-bold text-[#202124]">Rework Request Management</h1>
            <p class="text-xs sm:text-sm text-[#6B7280] mt-0.5">
              Review customer service complaints, evaluate warranty eligibility, and adjudicate partner rework assignments.
            </p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          type="button"
          @click="refreshAll"
          :disabled="isLoading || isStatsLoading"
          class="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#202124] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F7F7F8] transition cursor-pointer disabled:opacity-50"
          title="Reload rework disputes"
        >
          <RefreshCw class="size-3.5" :class="{ 'animate-spin': isLoading || isStatsLoading }" />
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- ── 1. Analytics Cards Overview ───────────────────────────────── -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      <!-- Total Requests -->
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] flex flex-col justify-between">
        <div class="flex items-center justify-between text-[#6B7280]">
          <span class="text-xs font-medium">Total Claims</span>
          <Layers class="size-4 text-[#800020]" />
        </div>
        <div class="mt-3">
          <span class="text-2xl font-bold text-[#202124]">{{ stats.totalRequests }}</span>
          <p class="text-[11px] text-[#6B7280] mt-0.5">All customer claims</p>
        </div>
      </div>

      <!-- Pending Requests -->
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] flex flex-col justify-between">
        <div class="flex items-center justify-between text-[#6B7280]">
          <span class="text-xs font-medium">Pending Review</span>
          <Clock class="size-4 text-amber-600" />
        </div>
        <div class="mt-3">
          <span class="text-2xl font-bold text-amber-600">{{ stats.pendingRequests }}</span>
          <p class="text-[11px] text-[#6B7280] mt-0.5">Awaiting adjudication</p>
        </div>
      </div>

      <!-- Under Review -->
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] flex flex-col justify-between">
        <div class="flex items-center justify-between text-[#6B7280]">
          <span class="text-xs font-medium">Under Review</span>
          <AlertCircle class="size-4 text-blue-600" />
        </div>
        <div class="mt-3">
          <span class="text-2xl font-bold text-blue-600">{{ stats.underReview }}</span>
          <p class="text-[11px] text-[#6B7280] mt-0.5">Admin or partner clarification</p>
        </div>
      </div>

      <!-- Approved Requests -->
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] flex flex-col justify-between">
        <div class="flex items-center justify-between text-[#6B7280]">
          <span class="text-xs font-medium">Approved Claims</span>
          <CheckCircle2 class="size-4 text-emerald-600" />
        </div>
        <div class="mt-3">
          <span class="text-2xl font-bold text-emerald-600">{{ stats.approvedRequests }}</span>
          <p class="text-[11px] text-[#6B7280] mt-0.5">Rework orders dispatched</p>
        </div>
      </div>

      <!-- Rejected Requests -->
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] flex flex-col justify-between">
        <div class="flex items-center justify-between text-[#6B7280]">
          <span class="text-xs font-medium">Dismissed / Rejected</span>
          <XCircle class="size-4 text-rose-600" />
        </div>
        <div class="mt-3">
          <span class="text-2xl font-bold text-rose-600">{{ stats.rejectedRequests }}</span>
          <p class="text-[11px] text-[#6B7280] mt-0.5">Ineligible or unfounded</p>
        </div>
      </div>

      <!-- Completed Reworks -->
      <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] flex flex-col justify-between">
        <div class="flex items-center justify-between text-[#6B7280]">
          <span class="text-xs font-medium">Completed</span>
          <CheckCircle2 class="size-4 text-teal-600" />
        </div>
        <div class="mt-3">
          <span class="text-2xl font-bold text-teal-600">{{ stats.completedReworks }}</span>
          <p class="text-[11px] text-[#6B7280] mt-0.5">Satisfactorily redone</p>
        </div>
      </div>
    </div>

    <!-- ── 2. Filters & Search Control Bar ──────────────────────────── -->
    <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <!-- Search Input -->
        <div class="relative lg:col-span-2">
          <Search class="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by Claim ID, Booking ID, Mobile, Name..."
            class="w-full pl-9 pr-3 py-2 text-xs text-[#202124] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020] placeholder-[#6B7280]"
          />
        </div>

        <!-- Status Filter -->
        <div>
          <select
            v-model="selectedStatus"
            class="w-full px-3 py-2 text-xs text-[#202124] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020] cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_GROUND_MANAGER_REVIEW">Pending Review</option>
            <option value="ADMIN_REVIEW">Under Admin Review</option>
            <option value="APPROVED_ORIGINAL_PARTNER">Approved (Original Partner)</option>
            <option value="ASSIGNED_NEW_PARTNER">Approved (New Partner)</option>
            <option value="CANCELLED">Cancelled / Rejected</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <!-- City Filter -->
        <div>
          <select
            v-model="selectedCityId"
            class="w-full px-3 py-2 text-xs text-[#202124] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020] cursor-pointer"
          >
            <option value="ALL">All Operational Cities</option>
            <option v-for="c in cities" :key="c.uniqueId" :value="c.uniqueId">
              {{ c.name }}
            </option>
          </select>
        </div>

        <!-- Date Range Filter -->
        <div>
          <select
            v-model="datePreset"
            class="w-full px-3 py-2 text-xs text-[#202124] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020] cursor-pointer"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today's Claims</option>
            <option value="7D">Past 7 Days</option>
            <option value="30D">Past 30 Days</option>
          </select>
        </div>
      </div>
    </div>

    <!-- ── 3. Rework Requests Listing Table ─────────────────────────── -->
    <div class="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
      <Table
        :items="filteredReworks"
        :headers="headers"
        :loading="isLoading"
        paginate
        :itemsPerPage="10"
      >
        <!-- Case / Request ID Slot -->
        <template #cell(reworkId)="{ item }">
          <div class="flex flex-col">
            <span class="font-mono text-xs font-bold text-[#800020]">#{{ item.reworkId?.slice(0, 10) }}</span>
            <span v-if="item.proofs?.length" class="text-[10px] text-[#6B7280] mt-0.5 flex items-center gap-1">
              <ImageIcon class="size-2.5 text-[#800020]" />
              <span>{{ item.proofs.length }} evidence file(s)</span>
            </span>
          </div>
        </template>

        <!-- Original Booking Slot -->
        <template #cell(orderInfo)="{ item }">
          <div class="flex flex-col">
            <span class="font-semibold text-xs text-[#202124]">{{ item.displayOrderId || item.orderId }}</span>
            <span class="text-[11px] text-[#6B7280]">
              Amount: <strong class="text-[#202124]">{{ formatCurrency(item.orderTotalAmount) }}</strong>
            </span>
          </div>
        </template>

        <!-- Customer Slot -->
        <template #cell(customer)="{ item }">
          <div class="flex flex-col">
            <span class="text-xs font-medium text-[#202124]">{{ item.customerName || 'Customer' }}</span>
            <span class="text-[11px] text-[#6B7280] font-mono">{{ item.customerMobile || item.customerId?.slice(0, 10) }}</span>
          </div>
        </template>

        <!-- Partner Slot -->
        <template #cell(partner)="{ item }">
          <div class="flex flex-col">
            <span class="text-xs font-medium text-[#202124]">{{ item.partnerName || 'Original Partner' }}</span>
            <span class="text-[11px] text-[#6B7280] font-mono">{{ item.partnerMobile || item.partnerId?.slice(0, 10) || '—' }}</span>
          </div>
        </template>

        <!-- Category & City Slot -->
        <template #cell(categoryCity)="{ item }">
          <div class="flex flex-col">
            <span class="text-xs font-medium text-[#202124]">{{ item.serviceCategoryName || 'General Service' }}</span>
            <span class="text-[11px] text-[#6B7280] flex items-center gap-1">
              <MapPin class="size-3 text-[#6B7280]" />
              <span>{{ item.cityName || 'City' }}</span>
            </span>
          </div>
        </template>

        <!-- Claimed At Slot -->
        <template #cell(claimedAt)="{ item }">
          <span class="text-xs text-[#6B7280]">{{ formatDate(item.claimedAt || item.createdAt) }}</span>
        </template>

        <!-- Eligibility Status Slot -->
        <template #cell(eligibility)="{ item }">
          <span
            class="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider inline-block"
            :class="eligibilityBadgeClass(item.eligibilityStatus)"
          >
            {{ item.eligibilityStatus || 'UNDER REVIEW' }}
          </span>
        </template>

        <!-- Status Slot -->
        <template #cell(status)="{ item }">
          <span
            class="px-2.5 py-1 text-xs font-semibold rounded-full inline-block"
            :class="statusBadgeClass(item.status)"
          >
            {{ statusLabel(item.status) }}
          </span>
        </template>

        <!-- Actions Slot -->
        <template #cell(actions)="{ item }">
          <div class="flex items-center justify-center gap-1.5">
            <button
              type="button"
              @click="openDetails(item)"
              class="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#800020] bg-[#FAF0F2] rounded-lg hover:bg-[#800020] hover:text-white transition cursor-pointer"
              title="Inspect Complete Claim"
            >
              <Eye class="size-3.5" />
              <span>Inspect</span>
            </button>

            <!-- Quick Approve (if still pending) -->
            <button
              v-if="item.status === 'PENDING_GROUND_MANAGER_REVIEW' || item.status === 'ADMIN_REVIEW'"
              type="button"
              @click="openApproveModal(item)"
              class="p-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-lg transition cursor-pointer"
              title="Approve Rework"
            >
              <CheckCircle2 class="size-4" />
            </button>

            <!-- Quick Reject (if still pending) -->
            <button
              v-if="item.status === 'PENDING_GROUND_MANAGER_REVIEW' || item.status === 'ADMIN_REVIEW'"
              type="button"
              @click="openRejectModal(item)"
              class="p-1 text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-lg transition cursor-pointer"
              title="Reject Rework"
            >
              <XCircle class="size-4" />
            </button>
          </div>
        </template>

        <template #empty>
          <div class="py-12 text-center text-[#6B7280]">
            <RotateCcw class="size-8 mx-auto text-[#6B7280] mb-2 opacity-60" />
            <p class="text-sm font-medium">No rework dispute requests match your criteria.</p>
            <p class="text-xs text-[#6B7280] mt-1">Try resetting your status, city, or date filters.</p>
          </div>
        </template>
      </Table>
    </div>

    <!-- ── 4. Rework Request Details Modal / Inspection Drawer ───────── -->
    <Popup
      v-model="isDetailsOpen"
      :title="`Rework Claim #${selectedRework?.reworkId?.slice(0, 10)} — ${selectedRework?.displayOrderId || selectedRework?.orderId}`"
      size="xl"
    >
      <div v-if="selectedRework" class="space-y-6">
        <!-- Top Status & Eligibility Summary Banner -->
        <div class="p-4 bg-[#F7F7F8] rounded-xl border border-[#E5E7EB] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span
              class="px-3 py-1 text-xs font-bold rounded-full uppercase"
              :class="statusBadgeClass(selectedRework.status)"
            >
              {{ statusLabel(selectedRework.status) }}
            </span>

            <span
              class="px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider"
              :class="eligibilityBadgeClass(selectedRework.eligibilityStatus)"
            >
              Eligibility: {{ selectedRework.eligibilityStatus || 'UNDER REVIEW' }}
            </span>
          </div>

          <!-- Quick Action Buttons -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="openNoteModal(selectedRework)"
              class="px-3 py-1.5 text-xs font-semibold text-[#202124] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F7F7F8] cursor-pointer flex items-center gap-1.5"
            >
              <MessageSquare class="size-3.5 text-[#800020]" />
              <span>Internal Note</span>
            </button>

            <button
              v-if="selectedRework.status === 'PENDING_GROUND_MANAGER_REVIEW'"
              type="button"
              @click="openEscalateModal(selectedRework)"
              class="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-600 hover:text-white cursor-pointer"
            >
              Escalate to Admin
            </button>

            <button
              v-if="selectedRework.status === 'PENDING_GROUND_MANAGER_REVIEW' || selectedRework.status === 'ADMIN_REVIEW'"
              type="button"
              @click="openApproveModal(selectedRework)"
              class="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 class="size-3.5" />
              <span>Approve Rework</span>
            </button>

            <button
              v-if="selectedRework.status === 'PENDING_GROUND_MANAGER_REVIEW' || selectedRework.status === 'ADMIN_REVIEW'"
              type="button"
              @click="openRejectModal(selectedRework)"
              class="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-600 hover:text-white cursor-pointer flex items-center gap-1.5"
            >
              <XCircle class="size-3.5" />
              <span>Reject Claim</span>
            </button>
          </div>
        </div>

        <!-- Section Navigation Tabs -->
        <div class="border-b border-[#E5E7EB] flex items-center gap-4 text-xs font-semibold">
          <button
            type="button"
            @click="detailTab = 'overview'"
            class="pb-2.5 transition border-b-2 cursor-pointer"
            :class="detailTab === 'overview' ? 'border-[#800020] text-[#800020]' : 'border-transparent text-[#6B7280] hover:text-[#202124]'"
          >
            Overview & Booking
          </button>
          <button
            type="button"
            @click="detailTab = 'evidence'"
            class="pb-2.5 transition border-b-2 cursor-pointer flex items-center gap-1.5"
            :class="detailTab === 'evidence' ? 'border-[#800020] text-[#800020]' : 'border-transparent text-[#6B7280] hover:text-[#202124]'"
          >
            <span>Service Evidence</span>
            <span class="px-1.5 py-0.2 bg-[#FAF0F2] text-[#800020] rounded-full text-[10px]">
              {{ (selectedRework.proofs?.length || 0) + (selectedOrder?.proofs?.length || 0) }}
            </span>
          </button>
          <button
            type="button"
            @click="detailTab = 'decision'"
            class="pb-2.5 transition border-b-2 cursor-pointer"
            :class="detailTab === 'decision' ? 'border-[#800020] text-[#800020]' : 'border-transparent text-[#6B7280] hover:text-[#202124]'"
          >
            Decision & Assignment
          </button>
          <button
            type="button"
            @click="detailTab = 'timeline'"
            class="pb-2.5 transition border-b-2 cursor-pointer"
            :class="detailTab === 'timeline' ? 'border-[#800020] text-[#800020]' : 'border-transparent text-[#6B7280] hover:text-[#202124]'"
          >
            Lifecycle Timeline
          </button>
          <button
            type="button"
            @click="detailTab = 'history'"
            class="pb-2.5 transition border-b-2 cursor-pointer"
            :class="detailTab === 'history' ? 'border-[#800020] text-[#800020]' : 'border-transparent text-[#6B7280] hover:text-[#202124]'"
          >
            Communication & Notes
          </button>
        </div>

        <!-- ── TAB 1: OVERVIEW & ORIGINAL BOOKING ──────────────────────── -->
        <div v-if="detailTab === 'overview'" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- SECTION A: ORIGINAL BOOKING -->
            <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-3">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                <span class="text-xs font-bold text-[#800020] uppercase tracking-wider">SECTION A: ORIGINAL BOOKING</span>
                <RouterLink
                  v-if="selectedRework.orderId"
                  :to="`/admin/orders`"
                  class="text-[11px] text-[#800020] hover:underline flex items-center gap-1 font-medium"
                >
                  <span>Orders Console</span>
                  <ExternalLink class="size-3" />
                </RouterLink>
              </div>

              <div class="grid grid-cols-2 gap-y-2 text-xs">
                <span class="text-[#6B7280]">Original Booking ID:</span>
                <span class="font-semibold text-[#202124]">{{ selectedRework.displayOrderId || selectedRework.orderId }}</span>

                <span class="text-[#6B7280]">Customer Name:</span>
                <span class="font-medium text-[#202124]">{{ selectedRework.customerName || selectedOrder?.customer?.name || 'Customer' }}</span>

                <span class="text-[#6B7280]">Customer Mobile:</span>
                <span class="font-mono text-[#202124]">{{ selectedRework.customerMobile || selectedOrder?.customer?.mobileNo || '—' }}</span>

                <span class="text-[#6B7280]">Original Partner:</span>
                <span class="font-medium text-[#202124]">{{ selectedRework.partnerName || selectedOrder?.partner?.name || 'Partner' }}</span>

                <span class="text-[#6B7280]">Partner Mobile:</span>
                <span class="font-mono text-[#202124]">{{ selectedRework.partnerMobile || selectedOrder?.partner?.phone || '—' }}</span>

                <span class="text-[#6B7280]">Service Category:</span>
                <span class="font-medium text-[#202124]">{{ selectedRework.serviceCategoryName || 'General Category' }}</span>

                <span class="text-[#6B7280]">Operating City:</span>
                <span class="font-medium text-[#202124]">{{ selectedRework.cityName || 'City' }}</span>

                <span class="text-[#6B7280]">Booking Date:</span>
                <span class="text-[#202124]">{{ formatDate(selectedRework.orderCreatedAt || selectedOrder?.createdAt) }}</span>

                <span class="text-[#6B7280]">Service Completion:</span>
                <span class="text-[#202124] font-medium">{{ formatDate(selectedRework.orderCompletedAt || selectedOrder?.orderCompletedAt) }}</span>

                <span class="text-[#6B7280]">Original Amount:</span>
                <span class="font-bold text-[#202124]">{{ formatCurrency(selectedRework.orderTotalAmount || selectedOrder?.totalAmount) }}</span>

                <span class="text-[#6B7280]">Payment Status:</span>
                <span class="font-medium text-emerald-700">{{ selectedRework.orderPaymentStatus || selectedOrder?.paymentStatus || 'PAID' }}</span>
              </div>
            </div>

            <!-- SECTION D: REWORK ELIGIBILITY (EVALUATED BY BACKEND) -->
            <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-3">
              <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                <span class="text-xs font-bold text-[#800020] uppercase tracking-wider">SECTION D: REWORK ELIGIBILITY</span>
                <span
                  class="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase"
                  :class="eligibilityBadgeClass(selectedRework.eligibilityStatus)"
                >
                  {{ selectedRework.eligibilityStatus || 'UNDER REVIEW' }}
                </span>
              </div>

              <div class="space-y-2 text-xs">
                <div>
                  <span class="text-[#6B7280] block text-[11px]">Applicable Rule:</span>
                  <span class="font-semibold text-[#202124]">{{ selectedRework.eligibilityRule || 'Standard Service Warranty Window' }}</span>
                </div>

                <div>
                  <span class="text-[#6B7280] block text-[11px]">Eligibility Explanation:</span>
                  <p class="text-xs text-[#202124] bg-[#F7F7F8] p-2.5 rounded-lg border border-[#E5E7EB] mt-1 leading-relaxed">
                    {{ selectedRework.eligibilityExplanation || 'Claim was filed within the eligible warranty period.' }}
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E7EB] text-[11px]">
                  <div>
                    <span class="text-[#6B7280] block">Service Completed:</span>
                    <span class="font-medium text-[#202124]">{{ formatDate(selectedRework.orderCompletedAt) }}</span>
                  </div>
                  <div>
                    <span class="text-[#6B7280] block">Warranty Deadline:</span>
                    <span class="font-medium text-[#800020]">{{ formatDate(selectedRework.eligibilityDeadline) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SECTION B: CUSTOMER COMPLAINT & REQUEST -->
          <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-3">
            <span class="text-xs font-bold text-[#800020] uppercase tracking-wider">SECTION B: CUSTOMER REQUEST & COMPLAINT</span>

            <div class="bg-[#FAF0F2] p-3.5 rounded-xl border border-[#E5E7EB] text-xs space-y-1">
              <div class="flex items-center justify-between text-[11px] text-[#6B7280]">
                <span>Customer Claim Explanation:</span>
                <span>Claimed At: {{ formatDate(selectedRework.claimedAt) }}</span>
              </div>
              <p class="text-xs font-medium text-[#202124] italic">
                "{{ selectedRework.description || 'No specific description provided by customer.' }}"
              </p>
            </div>

            <!-- Customer Uploaded Evidence Files -->
            <div>
              <span class="text-xs font-semibold text-[#202124] block mb-2">Customer Attached Evidence Files:</span>
              <div v-if="!selectedRework.proofs || selectedRework.proofs.length === 0" class="text-xs text-[#6B7280] italic">
                No customer media files attached to this claim.
              </div>
              <div v-else class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                <div
                  v-for="(p, idx) in selectedRework.proofs"
                  :key="idx"
                  class="group relative bg-[#F7F7F8] rounded-lg border border-[#E5E7EB] overflow-hidden cursor-pointer"
                  @click="previewMedia(p.fileUrl, p.fileType, `Customer Proof #${idx + 1}`)"
                >
                  <img
                    v-if="p.fileType === 'IMAGE'"
                    :src="p.fileUrl"
                    alt="Proof"
                    class="h-24 w-full object-cover group-hover:scale-105 transition"
                  />
                  <div
                    v-else
                    class="h-24 w-full flex flex-col items-center justify-center bg-slate-900 text-white"
                  >
                    <VideoIcon class="size-6 text-[#800020]" />
                    <span class="text-[10px] mt-1 font-mono">Video Clip</span>
                  </div>
                  <div class="p-1.5 text-[10px] text-[#6B7280] truncate bg-white">
                    {{ p.fileName || `Proof ${idx + 1}` }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Original Partner's Clarification -->
            <div class="mt-4 pt-3 border-t border-[#E5E7EB]">
              <span class="text-xs font-semibold text-[#202124] block mb-1">Original Partner's Response / Clarification:</span>
              <div
                v-if="selectedRework.partnerClarification"
                class="bg-[#F7F7F8] p-3 rounded-lg border border-[#E5E7EB] text-xs"
              >
                <div class="text-[11px] text-[#6B7280] mb-1">
                  Submitted on {{ formatDate(selectedRework.partnerClarifiedAt) }}
                </div>
                <p class="text-xs text-[#202124]">
                  {{ selectedRework.partnerClarification }}
                </p>
              </div>
              <div v-else class="text-xs text-[#6B7280] italic">
                The original partner has not submitted a formal dispute response yet.
              </div>
            </div>
          </div>
        </div>

        <!-- ── TAB 2: SERVICE EVIDENCE (BEFORE / AFTER COMPARISON) ────── -->
        <div v-if="detailTab === 'evidence'" class="space-y-6">
          <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-4">
            <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
              <div>
                <span class="text-xs font-bold text-[#800020] uppercase tracking-wider">SECTION C: SERVICE EVIDENCE COMPARISON</span>
                <p class="text-xs text-[#6B7280] mt-0.5">
                  Inspect job photographs uploaded by the partner prior to work and upon completion.
                </p>
              </div>
              <span v-if="isLoadingOrder" class="text-xs text-[#6B7280] animate-pulse">Loading order proofs...</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Before Service Proofs -->
              <div class="border border-[#E5E7EB] rounded-xl p-3 bg-white">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-bold text-[#202124]">Before-Service Proofs (Inspection)</span>
                  <span class="text-[11px] font-semibold text-[#6B7280]">{{ beforeProofs.length }} file(s)</span>
                </div>
                <div v-if="beforeProofs.length === 0" class="py-8 text-center text-xs text-[#6B7280] italic bg-[#F7F7F8] rounded-lg">
                  No before-service photos recorded by the partner.
                </div>
                <div v-else class="grid grid-cols-3 gap-2">
                  <div
                    v-for="(p, i) in beforeProofs"
                    :key="p.uniqueId || i"
                    class="rounded-lg border border-[#E5E7EB] overflow-hidden cursor-pointer group"
                    @click="previewMedia(p.fileUrl, p.fileType === 'VIDEO' ? 'VIDEO' : 'IMAGE', `Before Service Proof #${i + 1}`)"
                  >
                    <img :src="p.fileUrl" alt="Before" class="h-24 w-full object-cover group-hover:scale-105 transition" />
                    <div class="p-1 text-[10px] text-center text-[#6B7280] bg-white">Before #{{ i + 1 }}</div>
                  </div>
                </div>
              </div>

              <!-- After Service Proofs -->
              <div class="border border-[#E5E7EB] rounded-xl p-3 bg-white">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-bold text-[#202124]">After-Service Proofs (Completion)</span>
                  <span class="text-[11px] font-semibold text-[#6B7280]">{{ afterProofs.length }} file(s)</span>
                </div>
                <div v-if="afterProofs.length === 0" class="py-8 text-center text-xs text-[#6B7280] italic bg-[#F7F7F8] rounded-lg">
                  No after-service completion photos recorded by the partner.
                </div>
                <div v-else class="grid grid-cols-3 gap-2">
                  <div
                    v-for="(p, i) in afterProofs"
                    :key="p.uniqueId || i"
                    class="rounded-lg border border-[#E5E7EB] overflow-hidden cursor-pointer group"
                    @click="previewMedia(p.fileUrl, p.fileType === 'VIDEO' ? 'VIDEO' : 'IMAGE', `After Service Proof #${i + 1}`)"
                  >
                    <img :src="p.fileUrl" alt="After" class="h-24 w-full object-cover group-hover:scale-105 transition" />
                    <div class="p-1 text-[10px] text-center text-[#6B7280] bg-white">After #{{ i + 1 }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Customer Defect Claim Proofs -->
            <div class="border border-[#E5E7EB] rounded-xl p-3 bg-white">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-[#800020]">Customer Defect / Problem Claim Media</span>
                <span class="text-[11px] font-semibold text-[#6B7280]">{{ selectedRework.proofs?.length || 0 }} file(s)</span>
              </div>
              <div v-if="!selectedRework.proofs || selectedRework.proofs.length === 0" class="py-6 text-center text-xs text-[#6B7280] italic bg-[#F7F7F8] rounded-lg">
                No customer defect media uploaded.
              </div>
              <div v-else class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                <div
                  v-for="(p, idx) in selectedRework.proofs"
                  :key="idx"
                  class="rounded-lg border border-[#E5E7EB] overflow-hidden cursor-pointer group"
                  @click="previewMedia(p.fileUrl, p.fileType, `Customer Claim #${idx + 1}`)"
                >
                  <img
                    v-if="p.fileType === 'IMAGE'"
                    :src="p.fileUrl"
                    alt="Claim Media"
                    class="h-24 w-full object-cover group-hover:scale-105 transition"
                  />
                  <div v-else class="h-24 w-full flex flex-col items-center justify-center bg-slate-900 text-white">
                    <VideoIcon class="size-6 text-[#800020]" />
                    <span class="text-[10px] mt-1 font-mono">Video</span>
                  </div>
                  <div class="p-1 text-[10px] text-center text-[#6B7280] bg-white">Claim #{{ idx + 1 }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── TAB 3: DECISION & REWORK ASSIGNMENT ──────────────────────── -->
        <div v-if="detailTab === 'decision'" class="space-y-6">
          <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-4">
            <span class="text-xs font-bold text-[#800020] uppercase tracking-wider">SECTION E: ADJUDICATION & PARTNER REASSIGNMENT</span>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div class="space-y-2 p-3 bg-[#F7F7F8] rounded-xl border border-[#E5E7EB]">
                <span class="font-bold text-[#202124] block">Review Decision State:</span>
                <div class="grid grid-cols-2 gap-y-1.5 text-xs">
                  <span class="text-[#6B7280]">Adjudicated By:</span>
                  <span class="font-medium text-[#202124]">{{ selectedRework.reviewedByRole || 'PENDING' }} ({{ selectedRework.reviewedBy?.slice(0, 8) || '—' }})</span>

                  <span class="text-[#6B7280]">Decision Time:</span>
                  <span class="text-[#202124]">{{ formatDate(selectedRework.reviewedAt) }}</span>

                  <span class="text-[#6B7280]">Reviewer Note:</span>
                  <span class="text-[#202124] font-medium">{{ selectedRework.reviewNote || '—' }}</span>

                  <span class="text-[#6B7280]">Assigned Partner:</span>
                  <span class="font-semibold text-[#800020]">
                    {{ selectedRework.assignedPartnerId ? 'Replacement Partner (' + selectedRework.assignedPartnerId.slice(0, 8) + ')' : (selectedRework.partnerName || 'Original Partner') }}
                  </span>

                  <span class="text-[#6B7280]">Rework Order ID:</span>
                  <span class="font-mono text-[#202124] font-bold">{{ selectedRework.reworkOrderId || 'Not Created Yet' }}</span>
                </div>
              </div>

              <div class="space-y-2 p-3 bg-[#F7F7F8] rounded-xl border border-[#E5E7EB]">
                <span class="font-bold text-[#202124] block">Original Partner Penalty Assessment:</span>
                <div class="grid grid-cols-2 gap-y-1.5 text-xs">
                  <span class="text-[#6B7280]">Penalty Charged:</span>
                  <span class="font-bold text-rose-700">
                    {{ selectedRework.penaltyAmount ? formatCurrency(selectedRework.penaltyAmount) : 'None' }}
                  </span>

                  <span class="text-[#6B7280]">Penalty Reason:</span>
                  <span class="text-[#202124]">{{ selectedRework.penaltyReason || '—' }}</span>

                  <span class="text-[#6B7280]">Debited At:</span>
                  <span class="text-[#202124]">{{ formatDate(selectedRework.penaltyAppliedAt) }}</span>
                </div>
              </div>
            </div>

            <!-- Adjudicate Actions if claim is active -->
            <div
              v-if="selectedRework.status === 'PENDING_GROUND_MANAGER_REVIEW' || selectedRework.status === 'ADMIN_REVIEW'"
              class="pt-4 border-t border-[#E5E7EB] flex flex-wrap items-center gap-3"
            >
              <button
                type="button"
                @click="openApproveModal(selectedRework)"
                class="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer flex items-center gap-2"
              >
                <CheckCircle2 class="size-4" />
                <span>Approve Claim & Dispatch Order</span>
              </button>

              <button
                type="button"
                @click="openRejectModal(selectedRework)"
                class="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-600 hover:text-white rounded-lg cursor-pointer flex items-center gap-2"
              >
                <XCircle class="size-4" />
                <span>Reject / Dismiss Claim</span>
              </button>
            </div>
          </div>
        </div>

        <!-- ── TAB 4: VISUAL LIFECYCLE TIMELINE ───────────────────────── -->
        <div v-if="detailTab === 'timeline'" class="space-y-6">
          <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-4">
            <span class="text-xs font-bold text-[#800020] uppercase tracking-wider">SECTION F: REWORK PROCESS TRACKING</span>

            <div class="relative pl-6 space-y-6 border-l-2 border-[#E5E7EB] ml-3 mt-4 text-xs">
              <!-- Step 1: Requested -->
              <div class="relative">
                <div class="absolute -left-[31px] top-0 p-1 rounded-full bg-emerald-600 text-white">
                  <CheckCircle2 class="size-3.5" />
                </div>
                <div>
                  <span class="font-bold text-[#202124]">Claim Requested by Customer</span>
                  <span class="text-[11px] text-[#6B7280] block">{{ formatDate(selectedRework.claimedAt) }}</span>
                  <p class="text-[#6B7280] mt-1">Customer reported complaint: "{{ selectedRework.description || 'Service dissatisfaction' }}"</p>
                </div>
              </div>

              <!-- Step 2: Under Review / Clarification -->
              <div class="relative">
                <div
                  class="absolute -left-[31px] top-0 p-1 rounded-full text-white"
                  :class="selectedRework.status !== 'PENDING_GROUND_MANAGER_REVIEW' ? 'bg-emerald-600' : 'bg-blue-600'"
                >
                  <AlertCircle class="size-3.5" />
                </div>
                <div>
                  <span class="font-bold text-[#202124]">Adjudication & Partner Clarification</span>
                  <span v-if="selectedRework.partnerClarifiedAt" class="text-[11px] text-[#6B7280] block">
                    Partner responded on {{ formatDate(selectedRework.partnerClarifiedAt) }}
                  </span>
                  <p class="text-[#6B7280] mt-1">
                    {{ selectedRework.partnerClarification ? 'Partner provided statement.' : 'Claim routed to city ground managers & admins.' }}
                  </p>
                </div>
              </div>

              <!-- Step 3: Approval / Dismissal Decision -->
              <div class="relative">
                <div
                  class="absolute -left-[31px] top-0 p-1 rounded-full text-white"
                  :class="selectedRework.reviewedAt ? (selectedRework.status.includes('CANCEL') || selectedRework.status.includes('REJECT') ? 'bg-rose-600' : 'bg-emerald-600') : 'bg-slate-300'"
                >
                  <Clock v-if="!selectedRework.reviewedAt" class="size-3.5" />
                  <XCircle v-else-if="selectedRework.status.includes('CANCEL') || selectedRework.status.includes('REJECT')" class="size-3.5" />
                  <CheckCircle2 v-else class="size-3.5" />
                </div>
                <div>
                  <span class="font-bold text-[#202124]">Review Decision</span>
                  <span v-if="selectedRework.reviewedAt" class="text-[11px] text-[#6B7280] block">
                    Decision recorded by {{ selectedRework.reviewedByRole }} on {{ formatDate(selectedRework.reviewedAt) }}
                  </span>
                  <span v-else class="text-[11px] text-[#6B7280] block">Pending review decision</span>
                  <p v-if="selectedRework.reviewNote" class="text-xs font-medium text-[#202124] mt-1">
                    Note: {{ selectedRework.reviewNote }}
                  </p>
                </div>
              </div>

              <!-- Step 4: Rework Order Execution -->
              <div class="relative">
                <div
                  class="absolute -left-[31px] top-0 p-1 rounded-full text-white"
                  :class="selectedRework.status === 'COMPLETED' ? 'bg-teal-600' : (selectedRework.reworkOrderId ? 'bg-emerald-600' : 'bg-slate-300')"
                >
                  <Briefcase class="size-3.5" />
                </div>
                <div>
                  <span class="font-bold text-[#202124]">Rework Service Order Execution</span>
                  <span v-if="selectedRework.reworkOrderId" class="text-[11px] text-[#6B7280] block">
                    Order #{{ selectedRework.reworkOrderId }}
                  </span>
                  <p class="text-[#6B7280] mt-1">
                    {{ selectedRework.status === 'COMPLETED' ? 'Rework job verified and marked complete.' : (selectedRework.reworkOrderId ? 'Service job in progress by assigned partner.' : 'Awaiting claim approval.') }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── TAB 5: COMMUNICATION & NOTES ───────────────────────────── -->
        <div v-if="detailTab === 'history'" class="space-y-6">
          <div class="bg-white p-4 rounded-xl border border-[#E5E7EB] space-y-4">
            <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
              <span class="text-xs font-bold text-[#800020] uppercase tracking-wider">SECTION G: COMMUNICATION & AUDIT HISTORY</span>
              <button
                type="button"
                @click="openNoteModal(selectedRework)"
                class="px-2.5 py-1 text-xs font-semibold text-[#800020] bg-[#FAF0F2] rounded-lg hover:bg-[#800020] hover:text-white cursor-pointer"
              >
                + Add Internal Note
              </button>
            </div>

            <div class="space-y-3 text-xs">
              <div class="p-3 bg-[#F7F7F8] rounded-xl border border-[#E5E7EB] space-y-1">
                <div class="flex items-center justify-between text-[11px] text-[#6B7280]">
                  <span class="font-semibold text-[#202124]">Customer Submission</span>
                  <span>{{ formatDate(selectedRework.claimedAt) }}</span>
                </div>
                <p class="text-xs text-[#202124]">{{ selectedRework.description }}</p>
              </div>

              <div v-if="selectedRework.partnerClarification" class="p-3 bg-white rounded-xl border border-[#E5E7EB] space-y-1">
                <div class="flex items-center justify-between text-[11px] text-[#6B7280]">
                  <span class="font-semibold text-[#202124]">Partner Response</span>
                  <span>{{ formatDate(selectedRework.partnerClarifiedAt) }}</span>
                </div>
                <p class="text-xs text-[#202124]">{{ selectedRework.partnerClarification }}</p>
              </div>

              <div v-if="selectedRework.reviewNote" class="p-3 bg-[#FAF0F2] rounded-xl border border-[#E5E7EB] space-y-1">
                <div class="flex items-center justify-between text-[11px] text-[#800020]">
                  <span class="font-bold">Official Review Decision / Internal Notes</span>
                  <span>{{ formatDate(selectedRework.reviewedAt) }}</span>
                </div>
                <p class="text-xs text-[#202124] whitespace-pre-line">{{ selectedRework.reviewNote }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Popup>

    <!-- ── 5. Approve Rework Confirmation Modal ──────────────────────── -->
    <Popup v-model="isApproveModalOpen" title="Approve Service Rework Claim" size="md">
      <div v-if="selectedRework" class="space-y-4 text-xs">
        <p class="text-[#6B7280]">
          Approving this rework dispute creates an order (<span class="font-mono text-[#202124]">RWK-...</span>) with zero cost to the customer for the claimed service items.
        </p>

        <!-- Partner Assignment Selector -->
        <div>
          <label class="font-semibold text-[#202124] block mb-1.5">Who will execute the rework?</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              @click="approveForm.assignOption = 'ORIGINAL'"
              class="p-3 rounded-xl border text-left cursor-pointer transition"
              :class="approveForm.assignOption === 'ORIGINAL' ? 'border-[#800020] bg-[#FAF0F2] text-[#800020]' : 'border-[#E5E7EB] bg-white text-[#202124] hover:bg-[#F7F7F8]'"
            >
              <span class="font-bold block">Original Partner</span>
              <span class="text-[11px] text-[#6B7280]">Redoes the work unpaid under warranty.</span>
            </button>

            <button
              type="button"
              @click="approveForm.assignOption = 'REPLACEMENT'"
              class="p-3 rounded-xl border text-left cursor-pointer transition"
              :class="approveForm.assignOption === 'REPLACEMENT' ? 'border-[#800020] bg-[#FAF0F2] text-[#800020]' : 'border-[#E5E7EB] bg-white text-[#202124] hover:bg-[#F7F7F8]'"
            >
              <span class="font-bold block">Replacement Partner</span>
              <span class="text-[11px] text-[#6B7280]">Assign a new partner (paid normal payout).</span>
            </button>
          </div>
        </div>

        <!-- Replacement Partner Profile ID Input -->
        <div v-if="approveForm.assignOption === 'REPLACEMENT'">
          <label class="font-semibold text-[#202124] block mb-1">Replacement Partner Profile ID *</label>
          <input
            v-model="approveForm.replacementPartnerId"
            type="text"
            placeholder="e.g. prt_9876543210"
            class="w-full px-3 py-2 text-xs text-[#202124] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          />
        </div>

        <!-- Partner Penalty Option -->
        <div class="pt-2 border-t border-[#E5E7EB] space-y-2">
          <label class="font-semibold text-[#202124] block">Penalty Charged to Original Partner (Optional)</label>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <span class="text-[11px] text-[#6B7280] block mb-1">Penalty Amount (₹)</span>
              <input
                v-model.number="approveForm.penaltyAmount"
                type="number"
                min="0"
                step="50"
                class="w-full px-3 py-2 text-xs text-[#202124] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
              />
            </div>
            <div>
              <span class="text-[11px] text-[#6B7280] block mb-1">Penalty Reason</span>
              <input
                v-model="approveForm.penaltyReason"
                type="text"
                placeholder="Reason for penalty..."
                class="w-full px-3 py-2 text-xs text-[#202124] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
              />
            </div>
          </div>
        </div>

        <!-- Review Note -->
        <div>
          <label class="font-semibold text-[#202124] block mb-1">Approval Note (Max 255 chars)</label>
          <textarea
            v-model="approveForm.note"
            rows="2"
            maxlength="255"
            placeholder="Optional adjudication note..."
            class="w-full px-3 py-2 text-xs text-[#202124] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="isApproveModalOpen = false"
            class="px-3.5 py-2 text-xs font-semibold text-[#6B7280] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F7F7F8] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleApprove"
            :disabled="isSubmittingDecision"
            class="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer disabled:opacity-50"
          >
            <span v-if="!isSubmittingDecision">Confirm Approval</span>
            <span v-else>Processing...</span>
          </button>
        </div>
      </div>
    </Popup>

    <!-- ── 6. Reject / Dismiss Rework Modal ─────────────────────────── -->
    <Popup v-model="isRejectModalOpen" title="Dismiss / Reject Rework Claim" size="md">
      <div v-if="selectedRework" class="space-y-4 text-xs">
        <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2">
          <AlertTriangle class="size-4 shrink-0 mt-0.5" />
          <p>
            Dismissing this claim is final. The customer will receive this explanation in their notification and the dispute will be marked as Cancelled.
          </p>
        </div>

        <div>
          <label class="font-semibold text-[#202124] block mb-1">Rejection / Dismissal Reason *</label>
          <textarea
            v-model="rejectForm.reason"
            rows="3"
            maxlength="255"
            placeholder="Explain why this claim is dismissed (e.g., Warranty expired, defect caused by customer misuse)..."
            class="w-full px-3 py-2 text-xs text-[#202124] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="isRejectModalOpen = false"
            class="px-3.5 py-2 text-xs font-semibold text-[#6B7280] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F7F7F8] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleReject"
            :disabled="isSubmittingDecision"
            class="px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg cursor-pointer disabled:opacity-50"
          >
            <span v-if="!isSubmittingDecision">Confirm Rejection</span>
            <span v-else>Processing...</span>
          </button>
        </div>
      </div>
    </Popup>

    <!-- ── 7. Internal Admin Note Modal ──────────────────────────────── -->
    <Popup v-model="isNoteModalOpen" title="Add Internal Admin Note" size="md">
      <div v-if="selectedRework" class="space-y-4 text-xs">
        <div>
          <label class="font-semibold text-[#202124] block mb-1">Internal Note (Recorded in Audit History)</label>
          <textarea
            v-model="noteForm.note"
            rows="3"
            maxlength="255"
            placeholder="Record review observations, customer phone conversation notes, or technician remarks..."
            class="w-full px-3 py-2 text-xs text-[#202124] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="isNoteModalOpen = false"
            class="px-3.5 py-2 text-xs font-semibold text-[#6B7280] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F7F7F8] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleAddNote"
            :disabled="isSubmittingDecision"
            class="px-4 py-2 text-xs font-semibold text-white bg-[#800020] hover:bg-[#990026] rounded-lg cursor-pointer disabled:opacity-50"
          >
            Save Note
          </button>
        </div>
      </div>
    </Popup>

    <!-- ── 8. Escalate Modal ─────────────────────────────────────────── -->
    <Popup v-model="isEscalateModalOpen" title="Escalate Rework Dispute to Admin Review" size="md">
      <div v-if="selectedRework" class="space-y-4 text-xs">
        <p class="text-[#6B7280]">
          Mark this dispute as <span class="font-bold text-blue-700">Under Admin Review</span> so operations management can coordinate with the customer and partner before a final approval or dismissal.
        </p>

        <div>
          <label class="font-semibold text-[#202124] block mb-1">Escalation Note</label>
          <textarea
            v-model="noteForm.note"
            rows="2"
            maxlength="255"
            placeholder="e.g. Requiring field inspection by ground team..."
            class="w-full px-3 py-2 text-xs text-[#202124] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          ></textarea>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="isEscalateModalOpen = false"
            class="px-3.5 py-2 text-xs font-semibold text-[#6B7280] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F7F7F8] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="handleEscalate"
            :disabled="isSubmittingDecision"
            class="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer disabled:opacity-50"
          >
            Confirm Escalation
          </button>
        </div>
      </div>
    </Popup>

    <!-- ── 9. Media Lightbox Modal ──────────────────────────────────── -->
    <Popup v-model="mediaModal.open" :title="mediaModal.title" size="lg">
      <div class="flex flex-col items-center justify-center p-2">
        <img
          v-if="mediaModal.type === 'IMAGE'"
          :src="mediaModal.url"
          :alt="mediaModal.title"
          class="max-h-[70vh] max-w-full rounded-lg object-contain shadow-sm border border-[#E5E7EB]"
        />
        <video
          v-else
          :src="mediaModal.url"
          controls
          class="max-h-[70vh] max-w-full rounded-lg border border-[#E5E7EB]"
        ></video>
        <a
          :href="mediaModal.url"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-3 text-xs text-[#800020] hover:underline flex items-center gap-1 font-semibold"
        >
          <span>Open Full Resolution Asset</span>
          <ExternalLink class="size-3" />
        </a>
      </div>
    </Popup>
  </div>
</template>
