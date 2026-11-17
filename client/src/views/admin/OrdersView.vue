<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api'
import type { AdminOrder, AdminOrderPage, OrderStatusName } from '@/types/api'
import Table, { type Header } from '@/components/common/Table.vue'
import Popup from '@/components/common/Popup.vue'
import { useAuthStore } from '@/stores/auth'
import {
  Phone,
  MapPin,
  Calendar,
  Clock,
  CreditCard,
  Tag,
  AlertCircle,
  AlertTriangle,
  Receipt,
  Star,
  XCircle,
} from 'lucide-vue-next'

const PAGE_SIZE = 20

const tabs: { label: string; value: OrderStatusName | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Assigned', value: 'ASSIGNED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Paused', value: 'PAUSED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Partner Not Found', value: 'PARTNER_NOT_FOUND' },
]

const statusClasses: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  ASSIGNED: 'bg-sky-50 text-sky-700 border-sky-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  PAUSED: 'bg-orange-50 text-orange-700 border-orange-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  PARTNER_NOT_FOUND: 'bg-gray-50 text-gray-700 border-gray-200',
}

const headers: Header[] = [
  { key: 'order', title: 'Order', align: 'left', sortable: false },
  { key: 'customer', title: 'Customer', align: 'left', sortable: false },
  { key: 'partner', title: 'Partner', align: 'left', sortable: false },
  { key: 'status', title: 'Status', align: 'center', sortable: false },
  { key: 'amount', title: 'Amount', align: 'right', sortable: false },
  { key: 'payment', title: 'Payment', align: 'center', sortable: false },
  { key: 'created', title: 'Created', align: 'center', sortable: false },
  { key: 'action', title: 'Action', align: 'center', sortable: false },
]

const selectedStatus = ref<OrderStatusName | ''>('')
const pageIndex = ref(0)
const result = ref<AdminOrderPage | null>(null)
const isLoading = ref(false)
const error = ref('')
const search = ref('')

const selectedOrder = ref<AdminOrder | null>(null)
const isDetailOpen = ref(false)

// A partner sees only the orders assigned to them (GET /orders/partner-orders), not the admin listing
const authStore = useAuthStore()
const isPartner = computed(() => (authStore.user?.role || authStore.role || '').toUpperCase() === 'PARTNER')
const partnerOrders = ref<AdminOrder[]>([])

// Guards against a slow earlier response overwriting a newer tab/page
let requestSeq = 0

async function fetchOrders() {
  const seq = ++requestSeq
  isLoading.value = true
  error.value = ''
  try {
    if (isPartner.value) {
      // One call returns every order assigned to this partner; status filter and paging are applied here
      const res = await api.orders.getPartnerOrders()
      if (seq !== requestSeq) return
      const body = (res as any)?.data ?? res
      const list = body?.data ?? body
      partnerOrders.value = Array.isArray(list) ? list : []
      applyPartnerView()
    } else {
      const res = await api.adminOrders.getAll({
        status: selectedStatus.value,
        page: pageIndex.value,
        size: PAGE_SIZE,
      })
      if (seq !== requestSeq) return
      const body = (res as any)?.data ?? res
      result.value = (body?.data ?? body) as AdminOrderPage
    }
  } catch (e: any) {
    if (seq !== requestSeq) return
    result.value = null
    error.value = e?.message || 'Failed to load orders'
  } finally {
    if (seq === requestSeq) isLoading.value = false
  }
}

// Builds the current page from the partner's full list (already loaded)
function applyPartnerView() {
  const all = partnerOrders.value
  const filtered = selectedStatus.value ? all.filter((o) => o.status === selectedStatus.value) : all
  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1)
  if (pageIndex.value > totalPages - 1) pageIndex.value = totalPages - 1
  const start = pageIndex.value * PAGE_SIZE
  result.value = {
    status: selectedStatus.value || null,
    page: pageIndex.value,
    size: PAGE_SIZE,
    totalElements: filtered.length,
    totalPages,
    orders: filtered.slice(start, start + PAGE_SIZE),
  }
}

function reload() {
  if (isPartner.value) applyPartnerView()
  else fetchOrders()
}

function selectTab(value: OrderStatusName | '') {
  if (value === selectedStatus.value) return
  selectedStatus.value = value
  pageIndex.value = 0
  reload()
}

function goToPage(index: number) {
  const last = Math.max((result.value?.totalPages ?? 1) - 1, 0)
  pageIndex.value = Math.min(Math.max(index, 0), last)
  reload()
}

// Search covers the orders on the current page only
const visibleOrders = computed(() => {
  const orders = result.value?.orders ?? []
  const q = search.value.trim().toLowerCase()
  if (!q) return orders
  return orders.filter((o) =>
    [o.displayOrderId, o.uniqueId, o.customer?.name, o.customer?.mobileNo, o.partner?.name, o.partner?.phone]
      .some((v) => (v || '').toLowerCase().includes(q)),
  )
})

const isLoadingDetail = ref(false)
const detailError = ref('')
let detailSeq = 0

// Shows the list row straight away, then loads the full order from the server and swaps it in
async function openDetail(order: AdminOrder) {
  const seq = ++detailSeq
  selectedOrder.value = order
  detailError.value = ''
  isLoadingDetail.value = true
  isDetailOpen.value = true
  try {
    const res = await (isPartner.value
      ? api.orders.getOrderById(order.uniqueId)
      : api.adminOrders.getById(order.uniqueId))
    if (seq !== detailSeq) return
    const body = (res as any)?.data ?? res
    selectedOrder.value = (body?.data ?? body) as AdminOrder
  } catch (e: any) {
    if (seq !== detailSeq) return
    detailError.value = e?.message || 'Failed to load full order details'
  } finally {
    if (seq === detailSeq) isLoadingDetail.value = false
  }
}

function money(v?: number): string {
  return v == null ? '-' : `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function dateTime(v?: string): string {
  if (!v) return '-'
  const d = new Date(v)
  return isNaN(d.getTime())
    ? v
    : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusLabel(s?: string): string {
  return (s || '').replace(/_/g, ' ')
}

function getInitials(name?: string): string {
  if (!name) return 'U'
  return name.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

onMounted(fetchOrders)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-xl font-bold text-[#202124]">Orders</h1>
      <p class="text-sm text-[#6B7280] mt-1">
        {{ isPartner ? 'Orders assigned to you' : 'Browse and track platform service orders by status' }}
      </p>
    </div>

    <!-- Status tabs -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="t in tabs"
        :key="t.label"
        type="button"
        class="px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer"
        :class="selectedStatus === t.value
          ? 'bg-[#800020] text-white border-[#800020]'
          : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:text-[#202124] hover:bg-[#F7F7F8]'"
        @click="selectTab(t.value)"
      >
        {{ t.label }}
      </button>
    </div>

    <div class="flex items-center justify-between gap-3 flex-wrap">
      <input
        v-model="search"
        type="text"
        placeholder="Search this page by order, customer or partner..."
        class="w-80 text-sm px-3 py-2 border border-[#E5E7EB] rounded-lg bg-white text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-[#800020]"
      />
      <p v-if="result" class="text-xs text-[#6B7280]">{{ result.totalElements }} order{{ result.totalElements === 1 ? '' : 's' }}</p>
    </div>

    <div v-if="error" class="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">{{ error }}</div>

    <div class="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
      <Table :headers="headers" :items="visibleOrders" :loading="isLoading" item-key="uniqueId">
        <template #row="{ item }">
          <tr class="hover:bg-[#F7F7F8] transition-colors duration-150 border-b border-[#E5E7EB] last:border-0">
            <td class="py-3 px-4 text-sm text-left">
              <p class="font-semibold text-[#202124]">{{ item.displayOrderId || item.uniqueId.slice(0, 8) }}</p>
              <p v-if="item.isRework" class="text-[10px] font-bold text-amber-600">REWORK</p>
            </td>
            <td class="py-3 px-4 text-xs text-left">
              <p class="font-medium text-[#202124]">{{ item.customer?.name || '-' }}</p>
              <p class="text-[#6B7280]">{{ item.customer?.mobileNo || '' }}</p>
            </td>
            <td class="py-3 px-4 text-xs text-left">
              <template v-if="item.partner">
                <p class="font-medium text-[#202124]">{{ item.partner.name || '-' }}</p>
                <p class="text-[#6B7280]">{{ item.partner.phone || '' }}</p>
              </template>
              <span v-else class="text-[#6B7280]">Not assigned</span>
            </td>
            <td class="py-3 px-4 text-center">
              <span class="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border" :class="statusClasses[item.status] || statusClasses.PARTNER_NOT_FOUND">
                {{ statusLabel(item.status) }}
              </span>
            </td>
            <td class="py-3 px-4 text-xs text-right font-semibold text-[#202124]">{{ money(item.customerPayAmount ?? item.totalAmount) }}</td>
            <td class="py-3 px-4 text-xs text-center text-[#6B7280]">
              <p class="text-[#202124] font-medium">{{ item.paymentMode || '-' }}</p>
              <p class="text-[10px] text-[#6B7280]">{{ item.paymentStatus || '' }}</p>
            </td>
            <td class="py-3 px-4 text-xs text-center text-[#6B7280]">{{ dateTime(item.createdAt) }}</td>
            <td class="py-3 px-4 text-center">
              <button
                type="button"
                class="px-2.5 py-1 text-xs font-semibold text-[#800020] hover:text-[#6B001B] hover:bg-[#FAF0F2] rounded-lg border border-[#E5E7EB] hover:border-[#800020]/30 transition-colors cursor-pointer"
                @click="openDetail(item as AdminOrder)"
              >
                View
              </button>
            </td>
          </tr>
        </template>
      </Table>

      <p v-if="!isLoading && !visibleOrders.length && !error" class="p-8 text-center text-sm text-[#6B7280]">
        No orders found.
      </p>
    </div>

    <!-- Pagination (server side) -->
    <div v-if="result && result.totalPages > 1" class="flex items-center justify-end gap-3 text-sm text-[#6B7280]">
      <button
        type="button"
        :disabled="pageIndex === 0 || isLoading"
        class="px-3 py-1 border border-[#E5E7EB] bg-white text-[#202124] rounded-md hover:bg-[#F7F7F8] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        @click="goToPage(pageIndex - 1)"
      >
        Prev
      </button>
      <span class="whitespace-nowrap text-xs">Page {{ pageIndex + 1 }} of {{ result.totalPages }}</span>
      <button
        type="button"
        :disabled="pageIndex >= result.totalPages - 1 || isLoading"
        class="px-3 py-1 border border-[#E5E7EB] bg-white text-[#202124] rounded-md hover:bg-[#F7F7F8] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        @click="goToPage(pageIndex + 1)"
      >
        Next
      </button>
    </div>

    <!-- Order detail modal -->
    <Popup v-model="isDetailOpen" :title="`Order ${selectedOrder?.displayOrderId || selectedOrder?.uniqueId?.slice(0, 8) || ''}`" size="xl">
      <div v-if="selectedOrder" class="space-y-4 text-sm pb-1">
        <p v-if="isLoadingDetail" class="px-3 py-2 bg-[#FAF0F2] border border-[#800020]/20 text-[#800020] rounded-lg text-xs">
          Loading full order details...
        </p>
        <p v-else-if="detailError" class="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
          {{ detailError }}
        </p>

        <!-- 1. Status & Badges Top Banner -->
        <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-[#E5E7EB] rounded-xl">
          <div class="flex items-center gap-2 flex-wrap">
            <span
              class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border uppercase tracking-wider"
              :class="statusClasses[selectedOrder.status] || statusClasses.PARTNER_NOT_FOUND"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
              {{ statusLabel(selectedOrder.status) }}
            </span>

            <span
              v-if="selectedOrder.isRework"
              class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wide"
            >
              <AlertTriangle class="w-3.5 h-3.5 text-amber-600" />
              Rework
            </span>

            <span
              v-if="selectedOrder.paymentStatus"
              class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border"
              :class="selectedOrder.paymentStatus === 'PAID'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-gray-50 text-gray-700 border-[#E5E7EB]'"
            >
              <CreditCard class="w-3.5 h-3.5" />
              {{ selectedOrder.paymentStatus }} ({{ selectedOrder.paymentMode || 'Online' }})
            </span>
          </div>

          <div v-if="selectedOrder.orderTiming" class="text-xs text-[#6B7280] font-medium flex items-center gap-1">
            <Clock class="w-3.5 h-3.5 text-[#6B7280]" />
            <span>{{ statusLabel(selectedOrder.orderTiming) }}</span>
          </div>
        </div>

        <!-- Status Reason Banner (if present) -->
        <div
          v-if="selectedOrder.statusReason"
          class="px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2"
        >
          <AlertCircle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>{{ selectedOrder.statusReason }}</span>
        </div>

        <!-- 2. Customer, Partner & Location Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Customer Card -->
          <div class="p-3.5 bg-white border border-[#E5E7EB] rounded-xl flex items-start gap-3">
            <img
              v-if="selectedOrder.customer?.profileImageId"
              :src="selectedOrder.customer.profileImageId"
              :alt="selectedOrder.customer.name || 'Customer'"
              class="w-10 h-10 rounded-full object-cover shrink-0 border border-[#E5E7EB]"
            />
            <div v-else class="w-10 h-10 rounded-full bg-[#FAF0F2] text-[#800020] flex items-center justify-center font-bold text-xs shrink-0 border border-[#800020]/20">
              {{ getInitials(selectedOrder.customer?.name) }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Customer</span>
                <span v-if="selectedOrder.customer?.displayId" class="text-[10px] font-mono font-medium text-[#6B7280]">
                  {{ selectedOrder.customer.displayId }}
                </span>
              </div>
              <p class="text-xs font-bold text-[#202124] truncate mt-0.5">
                {{ selectedOrder.customer?.name || 'Unknown Customer' }}
              </p>
              <div v-if="selectedOrder.customer?.mobileNo" class="flex items-center gap-1.5 text-xs text-[#6B7280] mt-1">
                <Phone class="w-3 h-3 text-[#6B7280] shrink-0" />
                <span>{{ selectedOrder.customer.mobileNo }}</span>
              </div>
            </div>
          </div>

          <!-- Partner Card -->
          <div class="p-3.5 bg-white border border-[#E5E7EB] rounded-xl flex items-start gap-3">
            <img
              v-if="selectedOrder.partner?.profileImageId"
              :src="selectedOrder.partner.profileImageId"
              :alt="selectedOrder.partner.name || 'Partner'"
              class="w-10 h-10 rounded-full object-cover shrink-0 border border-[#E5E7EB]"
            />
            <div
              v-else
              class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border"
              :class="selectedOrder.partner ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-[#6B7280] border-[#E5E7EB]'"
            >
              {{ selectedOrder.partner ? getInitials(selectedOrder.partner?.name) : '?' }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Partner</span>
                <span v-if="selectedOrder.partner?.displayId" class="text-[10px] font-mono font-medium text-[#6B7280]">
                  {{ selectedOrder.partner.displayId }}
                </span>
              </div>
              <p class="text-xs font-bold text-[#202124] truncate mt-0.5">
                {{ selectedOrder.partner?.name || 'Not assigned' }}
              </p>
              <div v-if="selectedOrder.partner?.phone" class="flex items-center gap-1.5 text-xs text-[#6B7280] mt-1">
                <Phone class="w-3 h-3 text-[#6B7280] shrink-0" />
                <span>{{ selectedOrder.partner.phone }}</span>
              </div>
              <p v-else-if="!selectedOrder.partner" class="text-xs text-[#6B7280] italic mt-1">
                Pending partner assignment
              </p>

              <div v-if="selectedOrder.partner" class="flex flex-wrap items-center gap-1.5 mt-2">
                <span
                  v-if="selectedOrder.partner.averageRating != null"
                  class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
                >
                  <Star class="w-3 h-3 fill-amber-400 text-amber-400" />
                  {{ selectedOrder.partner.averageRating.toFixed(1) }}
                </span>
                <span
                  v-if="selectedOrder.partner.isOnline != null"
                  class="text-[11px] font-semibold px-1.5 py-0.5 rounded border"
                  :class="selectedOrder.partner.isOnline
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-gray-50 text-gray-700 border-[#E5E7EB]'"
                >
                  {{ selectedOrder.partner.isOnline ? 'Online' : 'Offline' }}
                </span>
                <span
                  v-if="selectedOrder.partner.isBusy"
                  class="text-[11px] font-semibold px-1.5 py-0.5 rounded border bg-orange-50 text-orange-700 border-orange-200"
                >
                  On a job
                </span>
                <span
                  v-if="selectedOrder.partner.userStatus"
                  class="text-[11px] font-semibold px-1.5 py-0.5 rounded border bg-gray-50 text-[#202124] border-[#E5E7EB]"
                >
                  {{ statusLabel(selectedOrder.partner.userStatus) }}
                </span>
                <span
                  v-if="selectedOrder.partner.totalCompletedServices != null"
                  class="text-[11px] font-medium text-[#6B7280]"
                >
                  {{ selectedOrder.partner.totalCompletedServices }} jobs done
                </span>
              </div>
            </div>
          </div>

          <!-- Service Location (Full Width) -->
          <div class="col-span-1 sm:col-span-2 p-3 bg-white border border-[#E5E7EB] rounded-xl flex items-start gap-2.5">
            <div class="p-1.5 rounded-lg bg-[#FAF0F2] text-[#800020] border border-[#800020]/20 shrink-0 mt-0.5">
              <MapPin class="w-4 h-4" />
            </div>
            <div class="min-w-0 flex-1">
              <span class="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Service Location</span>
              <p class="text-xs font-medium text-[#202124] mt-0.5">
                {{ selectedOrder.locationMarker || 'No location marker provided' }}
              </p>
            </div>
          </div>
        </div>

        <!-- 3. Service Items Table -->
        <div class="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
          <div class="px-4 py-2.5 bg-white border-b border-[#E5E7EB] flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Receipt class="w-4 h-4 text-[#800020]" />
              <h3 class="text-xs font-bold text-[#202124] uppercase tracking-wider">Service Line Items</h3>
            </div>
            <span class="text-xs text-[#6B7280] font-medium">
              {{ selectedOrder.items?.length || 0 }} item{{ (selectedOrder.items?.length || 0) === 1 ? '' : 's' }}
            </span>
          </div>

          <div v-if="!selectedOrder.items?.length" class="p-6 text-center text-xs text-[#6B7280]">
            No line items recorded for this order.
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="text-left text-[#6B7280] border-b border-[#E5E7EB] bg-white">
                  <th class="py-2.5 px-4 font-semibold">Service Type</th>
                  <th class="py-2.5 px-4 font-semibold text-center">Qty / Duration</th>
                  <th class="py-2.5 px-4 font-semibold text-right">Unit Price</th>
                  <th class="py-2.5 px-4 font-semibold text-right">Total Price</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#E5E7EB]">
                <tr v-for="i in selectedOrder.items" :key="i.uniqueId" class="hover:bg-[#F7F7F8] transition-colors">
                  <td class="py-2.5 px-4 font-medium text-[#202124]">
                    {{ statusLabel(i.pricingType) || 'Service Item' }}
                  </td>
                  <td class="py-2.5 px-4 text-center text-[#6B7280]">
                    <span v-if="i.quantity != null" class="font-medium text-[#202124]">{{ i.quantity }}</span>
                    <span v-if="i.durationMinutes" class="text-[#6B7280] ml-1">({{ i.durationMinutes }}m)</span>
                    <span v-if="i.quantity == null && !i.durationMinutes">-</span>
                  </td>
                  <td class="py-2.5 px-4 text-right text-[#6B7280]">{{ money(i.unitPrice) }}</td>
                  <td class="py-2.5 px-4 text-right font-bold text-[#202124]">{{ money(i.totalPrice) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 4. Payment & Settlement Summary -->
        <div class="border border-[#E5E7EB] rounded-xl p-4 bg-white">
          <div class="flex items-center gap-2 mb-3">
            <CreditCard class="w-4 h-4 text-[#800020]" />
            <h3 class="text-xs font-bold text-[#202124] uppercase tracking-wider">Payment & Cost Breakdown</h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <!-- Itemized breakdown -->
            <div class="space-y-2 border-b sm:border-b-0 sm:border-r border-[#E5E7EB] pb-3 sm:pb-0 sm:pr-4">
              <div class="flex justify-between items-center text-[#6B7280]">
                <span>Items Subtotal</span>
                <span class="font-medium text-[#202124]">{{ money(selectedOrder.totalAmount) }}</span>
              </div>
              <div v-if="selectedOrder.couponDiscount" class="flex justify-between items-center text-emerald-600">
                <span class="inline-flex items-center gap-1">
                  <Tag class="w-3 h-3" />
                  Coupon Discount
                  <span v-if="selectedOrder.couponCode" class="font-mono text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1 rounded font-bold">
                    {{ selectedOrder.couponCode }}
                  </span>
                </span>
                <span class="font-semibold">-{{ money(selectedOrder.couponDiscount) }}</span>
              </div>
              <div class="flex justify-between items-center text-[#6B7280]">
                <span>Platform Charge</span>
                <span class="font-medium text-[#202124]">{{ money(selectedOrder.platformCharge) }}</span>
              </div>
              <div v-if="selectedOrder.tip" class="flex justify-between items-center text-[#6B7280]">
                <span>Partner Tip</span>
                <span class="font-medium text-[#202124]">{{ money(selectedOrder.tip) }}</span>
              </div>
            </div>

            <!-- Settlement totals -->
            <div class="space-y-2.5 flex flex-col justify-between">
              <div class="flex justify-between items-baseline p-2.5 rounded-lg bg-white border border-[#E5E7EB]">
                <div>
                  <span class="text-[10px] font-bold text-[#800020] uppercase tracking-wider block">Customer Pays</span>
                  <span class="text-[#6B7280] text-[10px]">{{ selectedOrder.paymentMode || 'Online' }}</span>
                </div>
                <span class="text-base font-black text-[#800020]">{{ money(selectedOrder.customerPayAmount) }}</span>
              </div>

              <div class="flex justify-between items-center pt-1 border-t border-[#E5E7EB]">
                <span class="text-[#6B7280] font-medium">Partner Payout:</span>
                <span class="font-bold text-emerald-700 text-sm">{{ money(selectedOrder.partnerPayAmount) }}</span>
              </div>

              <div class="flex justify-between items-center text-[11px] text-[#6B7280]">
                <span>Settlement (Paid / Due):</span>
                <span class="font-semibold font-mono" :class="(selectedOrder.dueAmount ?? 0) > 0 ? 'text-amber-700' : 'text-[#202124]'">
                  {{ money(selectedOrder.clearAmount) }} / {{ money(selectedOrder.dueAmount) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 5. Order Milestones & Lifecycle -->
        <div class="border border-[#E5E7EB] rounded-xl p-4 bg-white">
          <div class="flex items-center gap-2 mb-3">
            <Calendar class="w-4 h-4 text-[#800020]" />
            <h3 class="text-xs font-bold text-[#202124] uppercase tracking-wider">Order Milestones</h3>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            <div class="p-2.5 rounded-lg bg-white border border-[#E5E7EB]">
              <span class="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Created</span>
              <span class="text-[11px] font-semibold text-[#202124] block mt-1 truncate" :title="dateTime(selectedOrder.createdAt)">
                {{ dateTime(selectedOrder.createdAt) }}
              </span>
            </div>
            <div class="p-2.5 rounded-lg bg-white border border-[#E5E7EB]">
              <span class="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Scheduled</span>
              <span class="text-[11px] font-semibold text-[#202124] block mt-1 truncate" :title="dateTime(selectedOrder.scheduleTime)">
                {{ dateTime(selectedOrder.scheduleTime) }}
              </span>
            </div>
            <div class="p-2.5 rounded-lg bg-white border border-[#E5E7EB]">
              <span class="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Accepted</span>
              <span class="text-[11px] font-semibold text-[#202124] block mt-1 truncate" :title="dateTime(selectedOrder.acceptedAt)">
                {{ dateTime(selectedOrder.acceptedAt) }}
              </span>
            </div>
            <div class="p-2.5 rounded-lg bg-white border border-[#E5E7EB]">
              <span class="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Started</span>
              <span class="text-[11px] font-semibold text-[#202124] block mt-1 truncate" :title="dateTime(selectedOrder.serviceStartedAt)">
                {{ dateTime(selectedOrder.serviceStartedAt) }}
              </span>
            </div>
            <div class="p-2.5 rounded-lg bg-white border border-[#E5E7EB] col-span-2 sm:col-span-1">
              <span class="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Completed</span>
              <span class="text-[11px] font-semibold text-[#202124] block mt-1 truncate" :title="dateTime(selectedOrder.orderCompletedAt)">
                {{ dateTime(selectedOrder.orderCompletedAt) }}
              </span>
            </div>
          </div>

          <!-- Cancellation Notice if cancelled -->
          <div
            v-if="selectedOrder.cancelledAt"
            class="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700"
          >
            <div class="flex items-center gap-2">
              <XCircle class="w-4 h-4 text-red-600 shrink-0" />
              <span>Cancelled by <strong>{{ selectedOrder.cancelledBy || 'User' }}</strong></span>
            </div>
            <span class="font-medium text-red-600">{{ dateTime(selectedOrder.cancelledAt) }}</span>
          </div>
        </div>

        <!-- 6. Pauses -->
        <div v-if="selectedOrder.pauses?.length" class="border border-[#E5E7EB] rounded-xl p-4 bg-white">
          <h3 class="text-xs font-bold text-[#202124] uppercase tracking-wider mb-3">Pauses ({{ selectedOrder.pauses.length }})</h3>
          <ul class="space-y-2">
            <li v-for="p in selectedOrder.pauses" :key="p.uniqueId" class="flex items-start justify-between gap-3 text-xs p-2.5 rounded-lg bg-white border border-[#E5E7EB]">
              <span class="text-[#202124]">{{ p.pauseReason || 'No reason given' }}</span>
              <span class="text-[#6B7280] text-right shrink-0">
                {{ dateTime(p.pauseAt) }}
                <span class="block font-semibold" :class="p.resumedAt ? 'text-emerald-600' : 'text-amber-600'">
                  {{ p.resumedAt ? `Resumed ${dateTime(p.resumedAt)}` : 'Still paused' }}
                </span>
              </span>
            </li>
          </ul>
        </div>

        <!-- 7. Proof files uploaded by the partner -->
        <div v-if="selectedOrder.proofs?.length" class="border border-[#E5E7EB] rounded-xl p-4 bg-white">
          <h3 class="text-xs font-bold text-[#202124] uppercase tracking-wider mb-3">Proof files ({{ selectedOrder.proofs.length }})</h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div v-for="pr in selectedOrder.proofs" :key="pr.uniqueId" class="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
              <video
                v-if="pr.fileType === 'VIDEO'"
                :src="pr.fileUrl"
                controls
                preload="metadata"
                class="w-full h-28 bg-black"
              ></video>
              <a v-else-if="pr.fileType === 'IMAGE'" :href="pr.fileUrl" target="_blank" rel="noopener noreferrer">
                <img :src="pr.fileUrl" :alt="pr.fileName || 'proof'" class="w-full h-28 object-cover" loading="lazy" />
              </a>
              <a v-else :href="pr.fileUrl" target="_blank" rel="noopener noreferrer" class="h-28 flex items-center justify-center text-xs text-[#800020] hover:bg-[#F7F7F8]">
                Open file
              </a>
              <div class="p-2 border-t border-[#E5E7EB]">
                <p class="text-[11px] font-semibold text-[#202124]">{{ statusLabel(pr.proofType) || 'Proof' }}</p>
                <p class="text-[10px] text-[#6B7280]">{{ dateTime(pr.createdAt) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Popup>
  </div>
</template>
