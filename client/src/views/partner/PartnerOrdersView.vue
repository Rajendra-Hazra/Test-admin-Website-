<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api'
import type { Order, OrderStatusName, OrderProofItem } from '@/types/api'
import Popup from '@/components/common/Popup.vue'
import { toast } from 'vue-sonner'
import {
  Wrench,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Pause,
  Play,
  Camera,
  RefreshCw,
  Search,
  MapPin,
  Phone,
  User,
  DollarSign,
  Plus,
  Receipt,
  AlertTriangle,
  XCircle,
  Eye,
  Upload,
  ArrowRight,
  ShieldCheck,
} from 'lucide-vue-next'

// ── State ─────────────────────────────────────────────────────────────
const orders = ref<Order[]>([])
const isLoading = ref(false)
const search = ref('')
const selectedStatus = ref<string>('')

// Token accept
const acceptToken = ref('')
const isAccepting = ref(false)

// Action states
const arrivalOtps = ref<Record<string, string>>({})
const completionOtps = ref<Record<string, string>>({})
const isActionBusy = ref<Record<string, boolean>>({})

// Pause modal
const pauseModal = ref<{ open: boolean; orderId: string; reason: string }>({
  open: false,
  orderId: '',
  reason: '',
})

// Extra charges modal
const extraChargesModal = ref<{
  open: boolean
  orderId: string
  amount: number
  description: string
  preview: any
  isLoadingPreview: boolean
  isSubmitting: boolean
}>({
  open: false,
  orderId: '',
  amount: 150,
  description: 'Replacement spare part',
  preview: null,
  isLoadingPreview: false,
  isSubmitting: false,
})

// Proofs upload modal
const proofModal = ref<{
  open: boolean
  orderId: string
  proofType: 'BEFORE' | 'AFTER'
  file: File | null
  previewUrl: string | null
  isUploading: boolean
}>({
  open: false,
  orderId: '',
  proofType: 'BEFORE',
  file: null,
  previewUrl: null,
  isUploading: false,
})

// Proofs gallery modal
const galleryModal = ref<{
  open: boolean
  orderId: string
  proofs: any[]
  isLoading: boolean
}>({
  open: false,
  orderId: '',
  proofs: [],
  isLoading: false,
})

const tabs: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Assigned', value: 'ASSIGNED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Paused', value: 'PAUSED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

const statusClasses: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  ASSIGNED: 'bg-sky-50 text-sky-700 border-sky-200',
  IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  PAUSED: 'bg-orange-50 text-orange-700 border-orange-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
}

// ── Computed ──────────────────────────────────────────────────────────
const metrics = computed(() => {
  const all = orders.value
  const assigned = all.filter((o) => ['ASSIGNED', 'PENDING'].includes(o.status)).length
  const inProgress = all.filter((o) => ['IN_PROGRESS', 'PAUSED'].includes(o.status)).length
  const completed = all.filter((o) => o.status === 'COMPLETED').length
  const totalPayout = all
    .filter((o) => o.status === 'COMPLETED')
    .reduce((sum, o) => sum + (Number((o as any).partnerPayAmount) || 0), 0)

  return { total: all.length, assigned, inProgress, completed, totalPayout }
})

const statusCounts = computed(() => {
  const counts: Record<string, number> = { '': orders.value.length }
  for (const o of orders.value) {
    counts[o.status] = (counts[o.status] || 0) + 1
  }
  return counts
})

const filteredOrders = computed(() => {
  let list = orders.value

  if (selectedStatus.value) {
    list = list.filter((o) => (o.status || '').toUpperCase() === selectedStatus.value)
  }

  const q = search.value.trim().toLowerCase()
  if (q) {
    list = list.filter((o) => {
      const id = (o.displayOrderId || o.orderId || o.uniqueId || '').toLowerCase()
      const customer = (o.customer?.name || '').toLowerCase()
      const phone = (o.customer?.mobileNo || '').toLowerCase()
      const loc = (o.locationMarker || o.address || '').toLowerCase()
      const items = (o.items || []).map((i) => (i.problemName || i.pricingType || '').toLowerCase()).join(' ')
      return id.includes(q) || customer.includes(q) || phone.includes(q) || loc.includes(q) || items.includes(q)
    })
  }

  return list
})

// ── Lifecycle ─────────────────────────────────────────────────────────
onMounted(fetchOrders)

// ── Operations ────────────────────────────────────────────────────────
async function fetchOrders() {
  isLoading.value = true
  try {
    const res = await api.orders.getPartnerOrders()
    const raw = (res as any)?.data ?? res
    orders.value = Array.isArray(raw) ? raw : []
  } catch (err: any) {
    toast.error('Failed to load orders: ' + (err?.message || 'Server error'))
  } finally {
    isLoading.value = false
  }
}

async function acceptOrderWithToken() {
  const token = acceptToken.value.trim()
  if (!token) return toast.error('Please enter a dispatch token')
  isAccepting.value = true
  try {
    await api.orders.accept(token)
    toast.success('Order accepted successfully!')
    acceptToken.value = ''
    await fetchOrders()
  } catch (err: any) {
    toast.error('Failed to accept order: ' + (err?.message || 'Invalid or expired token'))
  } finally {
    isAccepting.value = false
  }
}

async function submitArrivalOtp(orderId: string) {
  const otp = (arrivalOtps.value[orderId] || '').trim()
  if (!otp) return toast.error('Please enter the customer arrival OTP')
  isActionBusy.value[orderId] = true
  try {
    await api.orders.verifyArrival(orderId, otp)
    toast.success('Arrival verified! Job is now In Progress.')
    arrivalOtps.value[orderId] = ''
    await fetchOrders()
  } catch (err: any) {
    toast.error('Invalid arrival OTP: ' + (err?.message || 'Verification failed'))
  } finally {
    isActionBusy.value[orderId] = false
  }
}

function openPauseModal(order: Order) {
  pauseModal.value = {
    open: true,
    orderId: order.orderId || order.uniqueId || '',
    reason: '',
  }
}

async function confirmPause() {
  const { orderId, reason } = pauseModal.value
  if (!reason.trim()) return toast.error('Please provide a reason for pausing')
  try {
    await api.orders.pause(orderId, reason.trim())
    toast.success('Order paused')
    pauseModal.value.open = false
    await fetchOrders()
  } catch (err: any) {
    toast.error('Failed to pause order: ' + (err?.message || 'Error'))
  }
}

async function resumeOrder(orderId: string) {
  isActionBusy.value[orderId] = true
  try {
    await api.orders.resume(orderId)
    toast.success('Order resumed! Continue servicing.')
    await fetchOrders()
  } catch (err: any) {
    toast.error('Failed to resume order: ' + (err?.message || 'Error'))
  } finally {
    isActionBusy.value[orderId] = false
  }
}

function openExtraChargesModal(order: Order) {
  extraChargesModal.value = {
    open: true,
    orderId: order.orderId || order.uniqueId || '',
    amount: 150,
    description: 'Replacement spare valve',
    preview: null,
    isLoadingPreview: false,
    isSubmitting: false,
  }
  calculateChargePreview()
}

async function calculateChargePreview() {
  const { orderId, amount, description } = extraChargesModal.value
  if (amount <= 0) return
  extraChargesModal.value.isLoadingPreview = true
  try {
    const res = await api.orders.previewAddCharges(orderId, { amount, description })
    extraChargesModal.value.preview = (res as any)?.data ?? res
  } catch (err: any) {
    console.warn('Preview calculation failed:', err)
  } finally {
    extraChargesModal.value.isLoadingPreview = false
  }
}

async function commitExtraCharges() {
  const { orderId, amount, description } = extraChargesModal.value
  if (amount <= 0) return toast.error('Amount must be greater than 0')
  if (!description.trim()) return toast.error('Description is required')

  extraChargesModal.value.isSubmitting = true
  try {
    await api.orders.addCharges(orderId, { amount, description: description.trim() })
    toast.success('Extra charges added to order!')
    extraChargesModal.value.open = false
    await fetchOrders()
  } catch (err: any) {
    toast.error('Failed to add extra charges: ' + (err?.message || 'Error'))
  } finally {
    extraChargesModal.value.isSubmitting = false
  }
}

function openProofModal(order: Order) {
  proofModal.value = {
    open: true,
    orderId: order.orderId || order.uniqueId || '',
    proofType: 'BEFORE',
    file: null,
    previewUrl: null,
    isUploading: false,
  }
}

function handleProofFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  proofModal.value.file = file
  if (proofModal.value.previewUrl) URL.revokeObjectURL(proofModal.value.previewUrl)
  proofModal.value.previewUrl = URL.createObjectURL(file)
}

async function uploadProof() {
  const { orderId, proofType, file } = proofModal.value
  if (!file) return toast.error('Please choose a photo or video to upload')

  proofModal.value.isUploading = true
  try {
    const fd = new FormData()
    fd.append('files', file)
    await api.orders.uploadProof(orderId, proofType, fd)
    toast.success(`${proofType} service proof uploaded successfully!`)
    proofModal.value.open = false
    await fetchOrders()
  } catch (err: any) {
    toast.error('Failed to upload proof: ' + (err?.message || 'Error'))
  } finally {
    proofModal.value.isUploading = false
  }
}

async function openGallery(orderId: string) {
  galleryModal.value = {
    open: true,
    orderId,
    proofs: [],
    isLoading: true,
  }
  try {
    const res = await api.orders.getProofs(orderId)
    const raw = (res as any)?.data ?? res
    galleryModal.value.proofs = Array.isArray(raw) ? raw : []
  } catch (err: any) {
    toast.error('Failed to load proofs: ' + (err?.message || 'Error'))
  } finally {
    galleryModal.value.isLoading = false
  }
}

async function submitCompletion(orderId: string) {
  const otp = (completionOtps.value[orderId] || '').trim()
  if (!otp) return toast.error('Customer completion OTP is required')
  isActionBusy.value[orderId] = true
  try {
    await api.orders.complete(orderId, { otp })
    toast.success('Order completed successfully! Earnings transferred to your wallet.')
    completionOtps.value[orderId] = ''
    await fetchOrders()
  } catch (err: any) {
    toast.error('Failed to complete order: ' + (err?.message || 'Invalid completion OTP'))
  } finally {
    isActionBusy.value[orderId] = false
  }
}

async function partnerCancel(orderId: string) {
  const reason = prompt('Please specify a reason for rejecting/cancelling this job assignment:')
  if (!reason || !reason.trim()) return
  try {
    await api.orders.partnerCancel(orderId, reason.trim())
    toast.success('Job assignment cancelled')
    await fetchOrders()
  } catch (err: any) {
    toast.error('Cancellation failed: ' + (err?.message || 'Error'))
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-6 pb-16">
    <!-- Page Header & Metrics Card -->
    <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
      <div>
        <div class="flex items-center gap-2">
          <div class="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-sm">
            <Wrench class="w-5 h-5" />
          </div>
          <div>
            <h1 class="text-xl font-bold text-slate-800">Assigned Orders</h1>
            <p class="text-xs text-slate-500">Track, execute, verify and complete your customer bookings</p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3 w-full md:w-auto">
        <button
          @click="fetchOrders"
          :disabled="isLoading"
          class="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" />
          Refresh
        </button>
      </div>
    </div>

    <!-- Quick Token Dispatch Accept Bar -->
    <div class="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
          ⚡
        </div>
        <div>
          <h3 class="text-xs font-bold text-amber-950 uppercase tracking-wider">Fast Accept Offer by Token</h3>
          <p class="text-[11px] text-amber-800">Received a direct job dispatch notification via SMS or Push? Enter your dispatch token to claim it:</p>
        </div>
      </div>
      <div class="flex gap-2 w-full md:w-auto">
        <input
          v-model="acceptToken"
          placeholder="Enter dispatch token..."
          class="px-3 py-1.5 bg-white rounded-xl border border-amber-300 text-xs font-mono w-full md:w-56 focus:outline-none focus:ring-2 focus:ring-amber-500"
          @keyup.enter="acceptOrderWithToken"
        />
        <button
          @click="acceptOrderWithToken"
          :disabled="isAccepting"
          class="px-4 py-1.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
        >
          {{ isAccepting ? 'Claiming...' : 'Claim Job' }}
        </button>
      </div>
    </div>

    <!-- Metrics Summary Bar -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Assigned</span>
          <span class="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs">📋</span>
        </div>
        <p class="text-2xl font-black text-slate-900 mt-2">{{ metrics.total }}</p>
      </div>

      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Progress</span>
          <span class="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">🚀</span>
        </div>
        <p class="text-2xl font-black text-indigo-600 mt-2">{{ metrics.inProgress }}</p>
      </div>

      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</span>
          <span class="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">✅</span>
        </div>
        <p class="text-2xl font-black text-emerald-600 mt-2">{{ metrics.completed }}</p>
      </div>

      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Earnings</span>
          <span class="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xs">₹</span>
        </div>
        <p class="text-2xl font-black text-amber-700 mt-2">₹{{ metrics.totalPayout }}</p>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
        <!-- Status Tabs -->
        <div class="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            v-for="t in tabs"
            :key="t.value"
            @click="selectedStatus = t.value"
            class="px-3 py-1.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            :class="selectedStatus === t.value
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
          >
            <span>{{ t.label }}</span>
            <span
              class="px-1.5 py-0.2 rounded-full text-[10px]"
              :class="selectedStatus === t.value ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'"
            >
              {{ statusCounts[t.value] || 0 }}
            </span>
          </button>
        </div>

        <!-- Search Input -->
        <div class="relative w-full sm:w-72">
          <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            v-model="search"
            placeholder="Search by ID, customer, address..."
            class="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
    </div>

    <!-- Orders Loading State -->
    <div v-if="isLoading && orders.length === 0" class="p-16 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
      <RefreshCw class="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
      <p class="text-sm font-semibold text-slate-700">Loading your assigned orders...</p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredOrders.length === 0"
      class="p-16 text-center bg-white rounded-2xl border border-slate-200 space-y-3"
    >
      <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
        📦
      </div>
      <h3 class="text-base font-bold text-slate-700">No Orders Found</h3>
      <p class="text-xs text-slate-400 max-w-sm mx-auto">
        {{ search || selectedStatus ? 'No assigned orders match your active filter/search criteria.' : 'You have no assigned orders right now. Make sure you are ONLINE in your dashboard to receive customer dispatch calls!' }}
      </p>
    </div>

    <!-- Orders Cards List -->
    <div v-else class="space-y-5">
      <div
        v-for="order in filteredOrders"
        :key="order.orderId || order.uniqueId"
        class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-all"
      >
        <!-- Card Top Bar -->
        <div class="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-base font-black text-slate-900 font-mono">
                #{{ order.displayOrderId || order.orderId || order.uniqueId }}
              </span>
              <span
                class="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border"
                :class="statusClasses[order.status] || 'bg-slate-100 text-slate-700 border-slate-300'"
              >
                {{ order.status }}
              </span>
              <span
                v-if="order.paymentStatus"
                class="px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                :class="order.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'"
              >
                {{ order.paymentStatus }}
              </span>
            </div>

            <p class="text-xs text-slate-500 flex items-center gap-3">
              <span class="flex items-center gap-1">
                <Calendar class="w-3.5 h-3.5 text-slate-400" />
                {{ order.scheduledDate || order.scheduleTime || 'Scheduled for today' }}
              </span>
              <span v-if="order.scheduledTime" class="flex items-center gap-1">
                <Clock class="w-3.5 h-3.5 text-slate-400" />
                {{ order.scheduledTime }}
              </span>
            </p>
          </div>

          <!-- Payout & Total -->
          <div class="text-right">
            <p class="text-lg font-black text-slate-900">₹{{ order.totalAmount }}</p>
            <p v-if="order.partnerPayAmount" class="text-xs font-bold text-emerald-600">
              Payout: ₹{{ order.partnerPayAmount }}
            </p>
          </div>
        </div>

        <div class="p-5 space-y-4">
          <!-- Customer & Location Details -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
            <!-- Customer -->
            <div class="flex items-start gap-2.5">
              <div class="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                <User class="w-4 h-4" />
              </div>
              <div>
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer</span>
                <p class="font-semibold text-slate-800">{{ order.customer?.name || 'Customer' }}</p>
                <a
                  v-if="order.customer?.mobileNo"
                  :href="`tel:${order.customer.mobileNo}`"
                  class="text-indigo-600 hover:underline flex items-center gap-1 mt-0.5 font-medium"
                >
                  <Phone class="w-3 h-3" />
                  {{ order.customer.mobileNo }}
                </a>
              </div>
            </div>

            <!-- Service Location -->
            <div class="flex items-start gap-2.5">
              <div class="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 shrink-0">
                <MapPin class="w-4 h-4" />
              </div>
              <div class="min-w-0">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service Address</span>
                <p class="font-medium text-slate-700 mt-0.5 break-words">
                  {{ order.locationMarker || order.address || 'Address provided upon dispatch' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Line Items Visual Representation -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span class="flex items-center gap-1.5">
                <Receipt class="w-3.5 h-3.5 text-slate-400" />
                Booked Services / Line Items ({{ order.items?.length || 0 }})
              </span>
              <button
                v-if="(order as any).proofs?.length"
                @click="openGallery(order.orderId || order.uniqueId || '')"
                class="text-indigo-600 hover:underline flex items-center gap-1 normal-case font-semibold text-xs cursor-pointer"
              >
                <Eye class="w-3 h-3" />
                View Uploaded Proofs ({{ (order as any).proofs.length }})
              </button>
            </div>

            <!-- Items Table / List -->
            <div
              v-if="order.items && order.items.length > 0"
              class="divide-y divide-slate-100 bg-slate-50/70 rounded-xl border border-slate-200/70 overflow-hidden"
            >
              <div
                v-for="(item, idx) in order.items"
                :key="item.uniqueId || item.itemId || idx"
                class="p-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-100/60 transition-colors"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-8 h-8 rounded-lg bg-indigo-100/80 text-indigo-700 flex items-center justify-center shrink-0">
                    <Wrench class="w-4 h-4" />
                  </div>
                  <div class="min-w-0">
                    <p class="font-semibold text-slate-800 truncate">
                      {{ item.problemName || item.pricingType || 'Service Problem' }}
                    </p>
                    <div class="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span v-if="item.quantity != null" class="font-medium">Qty: {{ item.quantity }}</span>
                      <span v-if="item.durationMinutes">• {{ item.durationMinutes }} mins</span>
                      <span
                        v-if="item.proofRequired"
                        class="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-200"
                      >
                        Proof Required
                      </span>
                    </div>
                  </div>
                </div>

                <div class="text-right shrink-0">
                  <p class="font-bold text-slate-900">₹{{ item.totalPrice ?? item.price ?? item.unitPrice ?? 0 }}</p>
                  <p v-if="item.unitPrice && item.quantity && item.quantity > 1" class="text-[10px] text-slate-400">
                    ₹{{ item.unitPrice }} each
                  </p>
                </div>
              </div>
            </div>

            <div v-else class="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200 text-center">
              No line items recorded for this order.
            </div>
          </div>

          <!-- Order Workflow Actions -->
          <div class="pt-2 border-t border-slate-100">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <!-- Step 1: Verify Arrival -->
              <div class="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-200/70">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-bold text-slate-600 uppercase tracking-wider">1. Arrival OTP</p>
                  <span
                    v-if="['IN_PROGRESS', 'PAUSED', 'COMPLETED'].includes(order.status)"
                    class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"
                  >
                    ✓ Verified
                  </span>
                </div>

                <div v-if="!['IN_PROGRESS', 'PAUSED', 'COMPLETED'].includes(order.status)" class="flex gap-1.5">
                  <input
                    v-model="arrivalOtps[order.orderId || order.uniqueId || '']"
                    placeholder="4-digit OTP"
                    maxlength="6"
                    class="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono bg-white"
                  />
                  <button
                    @click="submitArrivalOtp(order.orderId || order.uniqueId || '')"
                    :disabled="isActionBusy[order.orderId || order.uniqueId || '']"
                    class="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    Verify
                  </button>
                </div>
                <p v-else class="text-[11px] text-slate-500">
                  Arrival verified. Service underway.
                </p>
              </div>

              <!-- Step 2: In-Progress Controls & Proofs -->
              <div class="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-200/70">
                <p class="text-[11px] font-bold text-slate-600 uppercase tracking-wider">2. Service Controls</p>

                <div class="flex flex-wrap gap-1.5">
                  <!-- Pause / Resume -->
                  <button
                    v-if="order.status === 'IN_PROGRESS'"
                    @click="openPauseModal(order)"
                    class="flex-1 py-1.5 px-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Pause class="w-3 h-3 text-orange-600" />
                    Pause
                  </button>
                  <button
                    v-else-if="order.status === 'PAUSED'"
                    @click="resumeOrder(order.orderId || order.uniqueId || '')"
                    class="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Play class="w-3 h-3 text-emerald-600" />
                    Resume
                  </button>

                  <!-- Extra Charges -->
                  <button
                    v-if="['IN_PROGRESS', 'PAUSED'].includes(order.status)"
                    @click="openExtraChargesModal(order)"
                    class="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold hover:bg-amber-100 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus class="w-3 h-3" />
                    Add Charges
                  </button>

                  <!-- Upload Proofs -->
                  <button
                    v-if="['IN_PROGRESS', 'PAUSED'].includes(order.status)"
                    @click="openProofModal(order)"
                    class="w-full py-1.5 px-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Camera class="w-3.5 h-3.5 text-indigo-600" />
                    Upload Proof (Before/After)
                  </button>
                </div>

                <p v-if="!['IN_PROGRESS', 'PAUSED'].includes(order.status)" class="text-[11px] text-slate-400 italic">
                  Active only after arrival verification.
                </p>
              </div>

              <!-- Step 3: Complete Order -->
              <div class="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-200/70">
                <div class="flex items-center justify-between">
                  <p class="text-[11px] font-bold text-slate-600 uppercase tracking-wider">3. Completion & Payout</p>
                  <span
                    v-if="order.status === 'COMPLETED'"
                    class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"
                  >
                    ✓ Completed
                  </span>
                </div>

                <div v-if="['IN_PROGRESS', 'PAUSED'].includes(order.status)" class="flex gap-1.5">
                  <input
                    v-model="completionOtps[order.orderId || order.uniqueId || '']"
                    placeholder="Customer OTP"
                    maxlength="6"
                    class="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono bg-white"
                  />
                  <button
                    @click="submitCompletion(order.orderId || order.uniqueId || '')"
                    :disabled="isActionBusy[order.orderId || order.uniqueId || '']"
                    class="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    Finish
                  </button>
                </div>
                <p v-else-if="order.status === 'COMPLETED'" class="text-[11px] text-slate-500">
                  Job finished and earnings credited.
                </p>
                <p v-else class="text-[11px] text-slate-400 italic">
                  Complete once work is finished.
                </p>
              </div>
            </div>
          </div>

          <!-- Bottom Footer: Cancel option -->
          <div v-if="!['COMPLETED', 'CANCELLED'].includes(order.status)" class="flex justify-end pt-1">
            <button
              @click="partnerCancel(order.orderId || order.uniqueId || '')"
              class="text-xs text-red-600 hover:underline font-semibold cursor-pointer"
            >
              Cancel / Reject Assignment
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── POPUP: Pause Reason ── -->
    <Popup v-model="pauseModal.open" title="Pause Order Execution" size="sm">
      <div class="space-y-4">
        <p class="text-xs text-slate-600">
          Please explain why you are pausing this job (e.g., waiting for parts, power outage):
        </p>
        <textarea
          v-model="pauseModal.reason"
          rows="3"
          placeholder="Reason for pausing..."
          class="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div class="flex justify-end gap-2">
          <button
            @click="pauseModal.open = false"
            class="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            @click="confirmPause"
            class="px-4 py-1.5 text-xs font-bold bg-orange-600 text-white rounded-lg hover:bg-orange-700 cursor-pointer"
          >
            Confirm Pause
          </button>
        </div>
      </div>
    </Popup>

    <!-- ── POPUP: Extra Charges ── -->
    <Popup v-model="extraChargesModal.open" title="Add Mid-Order Extra Charges" size="md">
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Charge Amount (₹)</label>
            <input
              v-model.number="extraChargesModal.amount"
              type="number"
              min="1"
              class="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @input="calculateChargePreview"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Reason / Description</label>
            <input
              v-model="extraChargesModal.description"
              type="text"
              placeholder="e.g., Replacement capacitor"
              class="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <!-- Live Preview Quote -->
        <div v-if="extraChargesModal.preview" class="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1">
          <p class="font-bold text-amber-900">Preview Breakdown:</p>
          <div class="flex justify-between text-slate-600">
            <span>Customer Added Cost:</span>
            <span class="font-bold">₹{{ extraChargesModal.preview.addedAmount }}</span>
          </div>
          <div class="flex justify-between text-emerald-700">
            <span>Your Added Earnings:</span>
            <span class="font-bold">₹{{ extraChargesModal.preview.addedPartnerAmount }}</span>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            @click="extraChargesModal.open = false"
            class="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            @click="commitExtraCharges"
            :disabled="extraChargesModal.isSubmitting"
            class="px-4 py-1.5 text-xs font-bold bg-amber-600 text-white rounded-lg hover:bg-amber-700 cursor-pointer disabled:opacity-50"
          >
            {{ extraChargesModal.isSubmitting ? 'Adding...' : 'Confirm Charges' }}
          </button>
        </div>
      </div>
    </Popup>

    <!-- ── POPUP: Upload Before/After Proof ── -->
    <Popup v-model="proofModal.open" title="Upload Job Proof" size="md">
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Proof Stage</label>
          <div class="flex gap-2">
            <button
              @click="proofModal.proofType = 'BEFORE'"
              class="flex-1 py-2 text-xs font-bold rounded-xl border cursor-pointer transition-colors"
              :class="proofModal.proofType === 'BEFORE' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300'"
            >
              BEFORE Service
            </button>
            <button
              @click="proofModal.proofType = 'AFTER'"
              class="flex-1 py-2 text-xs font-bold rounded-xl border cursor-pointer transition-colors"
              :class="proofModal.proofType === 'AFTER' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300'"
            >
              AFTER Service
            </button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">Select Photo or Video</label>
          <input
            type="file"
            accept="image/*,video/*"
            class="w-full text-xs p-2 border border-slate-300 rounded-xl"
            @change="handleProofFile"
          />
        </div>

        <div v-if="proofModal.previewUrl" class="border border-slate-200 rounded-xl overflow-hidden max-h-48 flex items-center justify-center bg-black">
          <img :src="proofModal.previewUrl" alt="Proof preview" class="max-h-48 object-contain" />
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            @click="proofModal.open = false"
            class="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Cancel
          </button>
          <button
            @click="uploadProof"
            :disabled="proofModal.isUploading"
            class="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
          >
            {{ proofModal.isUploading ? 'Uploading...' : 'Upload Proof' }}
          </button>
        </div>
      </div>
    </Popup>

    <!-- ── POPUP: Proofs Gallery ── -->
    <Popup v-model="galleryModal.open" title="Order Proofs Gallery" size="lg">
      <div class="space-y-4">
        <div v-if="galleryModal.isLoading" class="p-8 text-center">
          <RefreshCw class="w-6 h-6 animate-spin text-indigo-500 mx-auto" />
          <p class="text-xs text-slate-500 mt-2">Loading proofs...</p>
        </div>
        <div v-else-if="galleryModal.proofs.length === 0" class="p-8 text-center text-xs text-slate-400">
          No proofs have been uploaded for this order yet.
        </div>
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div
            v-for="p in galleryModal.proofs"
            :key="p.uniqueId"
            class="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 text-xs"
          >
            <video
              v-if="p.fileType === 'VIDEO'"
              :src="p.fileUrl"
              controls
              class="w-full h-32 bg-black"
            />
            <a v-else :href="p.fileUrl" target="_blank" rel="noopener noreferrer">
              <img :src="p.fileUrl" :alt="p.proofType" class="w-full h-32 object-cover hover:opacity-90 transition-opacity" />
            </a>
            <div class="p-2 flex items-center justify-between">
              <span class="font-bold text-slate-700 uppercase text-[10px]">{{ p.proofType }}</span>
              <span class="text-[10px] text-slate-400">{{ p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '' }}</span>
            </div>
          </div>
        </div>
      </div>
    </Popup>
  </div>
</template>

