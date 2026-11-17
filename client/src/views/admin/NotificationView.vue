<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { api } from '@/api'
import type {
  PushNotificationStats,
  NotificationCampaign,
  AudienceTargetingCriteria,
  RecipientEstimation,
  RecipientPreviewItem,
  CreateCampaignPayload,
  PushNotificationAudience,
  PushNotificationType,
  City,
  ServiceType,
  ServiceCategory,
} from '@/types/api'
import Popup from '@/components/common/Popup.vue'
import Toggle from '@/components/common/Toggle.vue'
import { showToast } from '@/utils/toast'
import {
  Bell,
  Send,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Eye,
  Info,
  Check,
  Smartphone,
  Tag,
  Link as LinkIcon,
  HelpCircle,
  RotateCcw,
  Sliders,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
} from 'lucide-vue-next'

// ── View Mode: 'dashboard' | 'create' ─────────────────────────────────
const viewMode = ref<'dashboard' | 'create'>('dashboard')

// ── Dashboard State ───────────────────────────────────────────────────
const stats = ref<PushNotificationStats>({
  totalSent: 0,
  successfullyDelivered: 0,
  failedNotifications: 0,
  totalCustomersTargeted: 0,
  totalPartnersTargeted: 0,
  scheduledNotifications: 0,
})

const campaigns = ref<NotificationCampaign[]>([])
const selectedPeriod = ref<'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'ALL'>('ALL')
const customStartDate = ref('')
const customEndDate = ref('')
const isStatsLoading = ref(false)
const isCampaignsLoading = ref(false)
const campaignSearchQuery = ref('')

// ── Shared Metadata ───────────────────────────────────────────────────
const cities = ref<City[]>([])
const serviceTypes = ref<ServiceType[]>([])
const subcategories = ref<ServiceCategory[]>([])
const isSubcategoriesLoading = ref(false)

// ── Stepper State (5 Steps) ───────────────────────────────────────────
// Step 1: Select Audience
// Step 2: Configure Targeting
// Step 3: Compose Notification
// Step 4: Preview
// Step 5: Schedule or Send
const currentStep = ref<number>(1)

const audienceType = ref<PushNotificationAudience>('CUSTOMERS')

// Step 2: Targeting Fields
const allCities = ref(true)
const selectedCities = ref<string[]>([])

// Customer Booking History Filters
const customerCategory = ref('')
const customerSubcategory = ref('')
const customerBookingDate = ref('ALL_TIME')
const customerCustomBookingStart = ref('')
const customerCustomBookingEnd = ref('')
const customerBookingStatus = ref('COMPLETED')
const customerBookingFrequency = ref('ANY')

// Partner Filters
const partnerCategory = ref('')
const partnerStatus = ref('ACTIVE')
const partnerActivity = ref('ANY')
const partnerAvailability = ref('ANY')

// Match Mode
const matchMode = ref<'ALL' | 'ANY'>('ALL')

// Step 3: Compose Fields
const campaignName = ref('')
const notificationType = ref<PushNotificationType>('PROMOTIONAL')
const notificationTitle = ref('')
const notificationMessage = ref('')
const notificationImage = ref('')
const deepLink = ref('')

// Step 4: Preview State
const previewPerspective = ref<'CUSTOMER' | 'PARTNER'>('CUSTOMER')

// Step 5: Execution Mode
const scheduleLater = ref(false)
const scheduledAt = ref('')
const isSubmitting = ref(false)

// ── Recipient Estimation & Inspection State ───────────────────────────
const isEstimating = ref(false)
const estimation = ref<RecipientEstimation>({
  totalCustomers: 0,
  customersWithToken: 0,
  totalPartners: 0,
  partnersWithToken: 0,
  totalTargeted: 0,
  eligibleWithToken: 0,
  excludedNoToken: 0,
  excludedSuspended: 0,
  selectedCities: ['All Cities'],
  selectedCategory: 'All Categories',
  selectedBookingPeriod: 'All Time',
})

const isRecipientDrawerOpen = ref(false)
const isPreviewRecipientsLoading = ref(false)
const recipientPreviews = ref<RecipientPreviewItem[]>([])

// ── Data Fetching ─────────────────────────────────────────────────────
async function fetchStats() {
  isStatsLoading.value = true
  try {
    const res = await api.pushNotifications.getStats(
      selectedPeriod.value,
      customStartDate.value || undefined,
      customEndDate.value || undefined
    )
    const data = (res as any)?.data ?? res
    if (data) {
      stats.value = {
        totalSent: Number(data.totalSent) || 0,
        successfullyDelivered: Number(data.successfullyDelivered) || 0,
        failedNotifications: Number(data.failedNotifications) || 0,
        totalCustomersTargeted: Number(data.totalCustomersTargeted) || 0,
        totalPartnersTargeted: Number(data.totalPartnersTargeted) || 0,
        scheduledNotifications: Number(data.scheduledNotifications) || 0,
      }
    }
  } catch (err) {
    console.warn('Failed to load push stats', err)
  } finally {
    isStatsLoading.value = false
  }
}

async function fetchCampaigns() {
  isCampaignsLoading.value = true
  try {
    const res = await api.pushNotifications.getCampaigns(selectedPeriod.value)
    const raw = (res as any)?.data ?? res
    campaigns.value = Array.isArray(raw) ? raw : []
  } catch (err: any) {
    showToast(err?.message || 'Failed to fetch campaigns', 'error')
    campaigns.value = []
  } finally {
    isCampaignsLoading.value = false
  }
}

async function fetchMeta() {
  try {
    const [cRes, sRes] = await Promise.allSettled([
      api.cities.getActive(),
      api.services.getAllTypes(),
    ])
    if (cRes.status === 'fulfilled') {
      const c = (cRes.value as any)?.data ?? cRes.value
      cities.value = Array.isArray(c) ? c : []
    }
    if (sRes.status === 'fulfilled') {
      const s = (sRes.value as any)?.data ?? sRes.value
      serviceTypes.value = Array.isArray(s) ? s : []
    }
  } catch (err) {
    console.warn('Failed to load metadata', err)
  }
}

async function loadSubcategories(categoryId: string) {
  if (!categoryId) {
    subcategories.value = []
    customerSubcategory.value = ''
    return
  }
  isSubcategoriesLoading.value = true
  try {
    const res = await api.services.getCategoriesByType(categoryId)
    const raw = (res as any)?.data ?? res
    subcategories.value = Array.isArray(raw) ? raw : []
  } catch (err) {
    subcategories.value = []
  } finally {
    isSubcategoriesLoading.value = false
  }
}

watch(customerCategory, (newCat) => {
  loadSubcategories(newCat)
})

// ── Recipient Estimation Trigger ──────────────────────────────────────
const activeCriteria = computed<AudienceTargetingCriteria>(() => {
  return {
    audienceType: audienceType.value,
    cityNamesOrIds: allCities.value ? [] : selectedCities.value,
    allCities: allCities.value,
    serviceCategoryId: customerCategory.value || undefined,
    subcategoryId: customerSubcategory.value || undefined,
    bookingDateFilter: customerBookingDate.value,
    customStartDate: customerCustomBookingStart.value || undefined,
    customEndDate: customerCustomBookingEnd.value || undefined,
    bookingStatusFilter: customerBookingStatus.value,
    bookingFrequencyFilter: customerBookingFrequency.value,
    partnerStatusFilter: partnerStatus.value,
    partnerActivityFilter: partnerActivity.value,
    workingAvailabilityFilter: partnerAvailability.value,
    matchMode: matchMode.value,
  }
})

async function triggerEstimation() {
  isEstimating.value = true
  try {
    const res = await api.pushNotifications.estimate(activeCriteria.value)
    const data = (res as any)?.data ?? res
    if (data) {
      estimation.value = {
        totalCustomers: Number(data.totalCustomers) || 0,
        customersWithToken: Number(data.customersWithToken) || 0,
        totalPartners: Number(data.totalPartners) || 0,
        partnersWithToken: Number(data.partnersWithToken) || 0,
        totalTargeted: Number(data.totalTargeted) || 0,
        eligibleWithToken: Number(data.eligibleWithToken) || 0,
        excludedNoToken: Number(data.excludedNoToken) || 0,
        excludedSuspended: Number(data.excludedSuspended) || 0,
        selectedCities: Array.isArray(data.selectedCities) ? data.selectedCities : ['All Cities'],
        selectedCategory: data.selectedCategory || 'All Categories',
        selectedBookingPeriod: data.selectedBookingPeriod || 'All Time',
      }
    }
  } catch (err) {
    console.warn('Estimation failed', err)
  } finally {
    isEstimating.value = false
  }
}

// Watch targeting criteria to debounce estimation
let debounceTimer: any = null
watch(
  activeCriteria,
  () => {
    if (viewMode.value === 'create' && currentStep.value >= 2) {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        triggerEstimation()
      }, 350)
    }
  },
  { deep: true }
)

// ── View Recipients Preview ───────────────────────────────────────────
async function openRecipientPreview() {
  isRecipientDrawerOpen.value = true
  isPreviewRecipientsLoading.value = true
  try {
    const res = await api.pushNotifications.previewRecipients(activeCriteria.value, 30)
    const list = (res as any)?.data ?? res
    recipientPreviews.value = Array.isArray(list) ? list : []
  } catch (err: any) {
    showToast(err?.message || 'Failed to preview recipients', 'error')
    recipientPreviews.value = []
  } finally {
    isPreviewRecipientsLoading.value = false
  }
}

// ── City Multi-Select Helpers ─────────────────────────────────────────
function toggleCity(cityName: string) {
  if (allCities.value) {
    allCities.value = false
    selectedCities.value = [cityName]
  } else {
    const idx = selectedCities.value.indexOf(cityName)
    if (idx >= 0) {
      selectedCities.value.splice(idx, 1)
      if (selectedCities.value.length === 0) {
        allCities.value = true
      }
    } else {
      selectedCities.value.push(cityName)
    }
  }
}

function selectAllCities() {
  allCities.value = true
  selectedCities.value = []
}

// ── Quick Placeholders ────────────────────────────────────────────────
function insertPlaceholder(token: string) {
  notificationMessage.value += ' ' + token
}

// ── Stepper Navigation ────────────────────────────────────────────────
function goToStep(step: number) {
  if (step < 1 || step > 5) return
  if (step > currentStep.value) {
    // Validation before stepping forward
    if (currentStep.value === 3) {
      if (!notificationTitle.value.trim()) {
        showToast('Please enter a notification title', 'error')
        return
      }
      if (!notificationMessage.value.trim()) {
        showToast('Please enter a notification message', 'error')
        return
      }
    }
  }
  currentStep.value = step
  if (step === 2 || step === 5) {
    triggerEstimation()
  }
}

function startCreation() {
  currentStep.value = 1
  viewMode.value = 'create'
  triggerEstimation()
}

function exitCreation() {
  viewMode.value = 'dashboard'
  currentStep.value = 1
  fetchStats()
  fetchCampaigns()
}

function resetFilters() {
  allCities.value = true
  selectedCities.value = []
  customerCategory.value = ''
  customerSubcategory.value = ''
  customerBookingDate.value = 'ALL_TIME'
  customerBookingStatus.value = 'COMPLETED'
  customerBookingFrequency.value = 'ANY'
  partnerCategory.value = ''
  partnerStatus.value = 'ACTIVE'
  partnerActivity.value = 'ANY'
  partnerAvailability.value = 'ANY'
  matchMode.value = 'ALL'
  showToast('Targeting filters reset to default', 'info')
}

// ── Final Send or Schedule ────────────────────────────────────────────
async function handleSendOrSchedule() {
  if (!notificationTitle.value.trim()) {
    showToast('Notification title is required', 'error')
    goToStep(3)
    return
  }
  if (!notificationMessage.value.trim()) {
    showToast('Notification message is required', 'error')
    goToStep(3)
    return
  }

  if (scheduleLater.value && !scheduledAt.value) {
    showToast('Please select a future schedule date and time', 'error')
    return
  }

  isSubmitting.value = true
  try {
    const payload: CreateCampaignPayload = {
      campaignName: campaignName.value.trim() || notificationTitle.value.trim(),
      title: notificationTitle.value.trim(),
      message: notificationMessage.value.trim(),
      imageUrl: notificationImage.value.trim() || undefined,
      deepLink: deepLink.value.trim() || undefined,
      notificationType: notificationType.value,
      targeting: activeCriteria.value,
      scheduleLater: scheduleLater.value,
      scheduledAt: scheduleLater.value ? scheduledAt.value : undefined,
    }

    await api.pushNotifications.send(payload)
    showToast(
      scheduleLater.value
        ? 'Notification campaign scheduled successfully!'
        : 'Push notification campaign dispatched successfully!',
      'success'
    )
    exitCreation()
  } catch (err: any) {
    showToast(err?.message || 'Failed to dispatch notification', 'error')
  } finally {
    isSubmitting.value = false
  }
}

// ── Cancel Scheduled Campaign ─────────────────────────────────────────
async function cancelCampaign(campaign: NotificationCampaign) {
  try {
    await api.pushNotifications.cancel(campaign.id)
    showToast('Scheduled campaign cancelled', 'success')
    await fetchCampaigns()
    await fetchStats()
  } catch (err: any) {
    showToast(err?.message || 'Failed to cancel campaign', 'error')
  }
}

// Format Date Helper
function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

// Computed Filtered Campaigns
const filteredCampaigns = computed(() => {
  if (!campaignSearchQuery.value.trim()) return campaigns.value
  const q = campaignSearchQuery.value.toLowerCase().trim()
  return campaigns.value.filter(
    (c) =>
      c.campaignName?.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q) ||
      c.message?.toLowerCase().includes(q) ||
      c.targetCities?.toLowerCase().includes(q)
  )
})

onMounted(() => {
  fetchStats()
  fetchCampaigns()
  fetchMeta()
})
</script>

<template>
  <div class="space-y-6 pb-12 bg-white text-[#202124]">
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- MODE A: DASHBOARD OVERVIEW                                        -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <template v-if="viewMode === 'dashboard'">
      <!-- Page Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <div class="flex items-center gap-2">
            <div class="w-2.5 h-6 bg-[#800020] rounded-xs"></div>
            <h1 class="text-2xl font-bold tracking-tight text-[#202124]">
              Smart Push Notification Management
            </h1>
          </div>
          <p class="text-sm text-[#6B7280] mt-1 pl-4.5">
            Target, compose, preview, and dispatch FCM push notifications to customers and partners based on city, booking history, and service categories.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="fetchStats(); fetchCampaigns()"
            :disabled="isStatsLoading || isCampaignsLoading"
            class="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-[#E5E7EB] text-[#202124] rounded-lg text-sm font-medium hover:bg-[#F7F7F8] hover:text-[#800020] transition-colors cursor-pointer shadow-2xs"
            title="Refresh Notification Dashboard"
          >
            <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isStatsLoading || isCampaignsLoading }" />
            <span class="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            @click="startCreation"
            class="inline-flex items-center gap-2 px-4 py-2.5 bg-[#800020] text-white rounded-lg text-sm font-semibold hover:bg-[#6b001a] transition-colors cursor-pointer shadow-sm"
          >
            <Plus class="w-4 h-4 stroke-[2.5]" />
            <span>Create Notification</span>
          </button>
        </div>
      </div>

      <!-- Date Filter Controls -->
      <div class="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E5E7EB] shadow-2xs">
        <div class="flex items-center gap-2">
          <Calendar class="w-4 h-4 text-[#800020]" />
          <span class="text-xs font-bold text-[#202124] uppercase tracking-wider">Analytics Period:</span>
        </div>

        <div class="flex items-center gap-1.5 overflow-x-auto">
          <button
            v-for="p in [
              { key: 'TODAY', label: 'Today' },
              { key: 'LAST_7_DAYS', label: 'Last 7 Days' },
              { key: 'LAST_30_DAYS', label: 'Last 30 Days' },
              { key: 'ALL', label: 'All Time' },
            ]"
            :key="p.key"
            type="button"
            @click="selectedPeriod = p.key as any; fetchStats(); fetchCampaigns()"
            class="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            :class="
              selectedPeriod === p.key
                ? 'bg-[#800020] text-white shadow-2xs'
                : 'bg-[#F7F7F8] text-[#6B7280] hover:text-[#202124] hover:bg-gray-100 border border-[#E5E7EB]'
            "
          >
            {{ p.label }}
          </button>
        </div>
      </div>

      <!-- ── 6 Summary Analytics Cards ─────────────────────────────────── -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <!-- 1. Total Sent -->
        <div class="bg-white border border-[#E5E7EB] rounded-xl p-4.5 shadow-2xs hover:border-[#800020]/30 transition-all">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Total Sent</span>
            <div class="p-1.5 rounded-lg bg-[#F7F7F8] text-[#800020]">
              <Send class="w-4 h-4" />
            </div>
          </div>
          <div class="mt-2.5">
            <div class="text-2xl font-extrabold text-[#202124]">{{ stats.totalSent }}</div>
            <p class="text-[11px] text-[#6B7280] mt-0.5">campaign dispatches</p>
          </div>
        </div>

        <!-- 2. Successfully Delivered -->
        <div class="bg-white border border-[#E5E7EB] rounded-xl p-4.5 shadow-2xs hover:border-emerald-300 transition-all">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Delivered</span>
            <div class="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 class="w-4 h-4" />
            </div>
          </div>
          <div class="mt-2.5">
            <div class="text-2xl font-extrabold text-emerald-700">{{ stats.successfullyDelivered }}</div>
            <p class="text-[11px] text-emerald-600 font-medium mt-0.5">FCM devices reached</p>
          </div>
        </div>

        <!-- 3. Failed Notifications -->
        <div class="bg-white border border-[#E5E7EB] rounded-xl p-4.5 shadow-2xs hover:border-red-300 transition-all">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Failed</span>
            <div class="p-1.5 rounded-lg bg-red-50 text-red-700">
              <XCircle class="w-4 h-4" />
            </div>
          </div>
          <div class="mt-2.5">
            <div class="text-2xl font-extrabold text-red-700">{{ stats.failedNotifications }}</div>
            <p class="text-[11px] text-red-600 font-medium mt-0.5">invalid tokens/errors</p>
          </div>
        </div>

        <!-- 4. Total Customers Targeted -->
        <div class="bg-white border border-[#E5E7EB] rounded-xl p-4.5 shadow-2xs hover:border-blue-300 transition-all">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Customers</span>
            <div class="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <Users class="w-4 h-4" />
            </div>
          </div>
          <div class="mt-2.5">
            <div class="text-2xl font-extrabold text-blue-700">{{ stats.totalCustomersTargeted }}</div>
            <p class="text-[11px] text-blue-600 font-medium mt-0.5">consumers targeted</p>
          </div>
        </div>

        <!-- 5. Total Partners Targeted -->
        <div class="bg-white border border-[#E5E7EB] rounded-xl p-4.5 shadow-2xs hover:border-purple-300 transition-all">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Partners</span>
            <div class="p-1.5 rounded-lg bg-purple-50 text-purple-700">
              <Briefcase class="w-4 h-4" />
            </div>
          </div>
          <div class="mt-2.5">
            <div class="text-2xl font-extrabold text-purple-700">{{ stats.totalPartnersTargeted }}</div>
            <p class="text-[11px] text-purple-600 font-medium mt-0.5">technicians reached</p>
          </div>
        </div>

        <!-- 6. Scheduled Notifications -->
        <div class="bg-white border border-[#E5E7EB] rounded-xl p-4.5 shadow-2xs hover:border-amber-300 transition-all">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">Scheduled</span>
            <div class="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Clock class="w-4 h-4" />
            </div>
          </div>
          <div class="mt-2.5">
            <div class="text-2xl font-extrabold text-amber-700">{{ stats.scheduledNotifications }}</div>
            <p class="text-[11px] text-amber-600 font-medium mt-0.5">future campaigns</p>
          </div>
        </div>
      </div>

      <!-- ── Recent Notification Campaigns Listing ─────────────────────── -->
      <div class="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-2xs space-y-4">
        <!-- Table Header & Search -->
        <div class="p-4 border-b border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 class="text-base font-bold text-[#202124]">Notification Campaign History</h3>
            <p class="text-xs text-[#6B7280] mt-0.5">
              Audited log of targeted FCM push dispatches, delivery counts, and scheduling statuses.
            </p>
          </div>

          <div class="relative w-full sm:w-72">
            <Search class="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              v-model="campaignSearchQuery"
              type="text"
              placeholder="Search campaigns..."
              class="w-full pl-9 pr-3 py-1.5 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#800020]"
            />
          </div>
        </div>

        <!-- Table Content -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-[#202124]">
            <thead class="bg-[#F7F7F8] text-[#6B7280] font-bold uppercase tracking-wider border-b border-[#E5E7EB]">
              <tr>
                <th class="px-4 py-3">Campaign & Title</th>
                <th class="px-4 py-3">Audience</th>
                <th class="px-4 py-3">Type</th>
                <th class="px-4 py-3">Targeted Cities</th>
                <th class="px-4 py-3 text-center">Recipients</th>
                <th class="px-4 py-3 text-center">Delivered</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3">Dispatched / Scheduled</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E5E7EB]">
              <tr v-if="isCampaignsLoading">
                <td colspan="9" class="px-4 py-12 text-center text-[#6B7280]">
                  <RefreshCw class="w-6 h-6 text-[#800020] animate-spin mx-auto mb-2" />
                  Loading campaigns...
                </td>
              </tr>
              <tr v-else-if="filteredCampaigns.length === 0">
                <td colspan="9" class="px-4 py-12 text-center text-[#6B7280]">
                  <Bell class="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  No notification campaigns found.
                  <button
                    type="button"
                    @click="startCreation"
                    class="block mx-auto mt-2 text-xs font-bold text-[#800020] hover:underline cursor-pointer"
                  >
                    + Create your first notification campaign
                  </button>
                </td>
              </tr>
              <tr
                v-for="c in filteredCampaigns"
                :key="c.id"
                class="hover:bg-[#F7F7F8] transition-colors"
              >
                <td class="px-4 py-3">
                  <div class="font-bold text-[#202124] line-clamp-1">{{ c.campaignName }}</div>
                  <div class="text-[11px] text-[#6B7280] line-clamp-1 mt-0.5">{{ c.title }}</div>
                </td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold"
                    :class="
                      c.audienceType === 'CUSTOMERS'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : c.audienceType === 'PARTNERS'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    "
                  >
                    {{ c.audienceType }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="text-[11px] font-medium text-[#6B7280]">
                    {{ c.notificationType }}
                  </span>
                </td>
                <td class="px-4 py-3 max-w-xs truncate text-[11px] text-[#6B7280]">
                  {{ c.targetCities || 'All Cities' }}
                </td>
                <td class="px-4 py-3 text-center font-bold">
                  {{ c.totalTargeted || 0 }}
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="font-bold text-emerald-700">{{ c.deliveredCount || 0 }}</span>
                  <span v-if="c.failedCount" class="text-[10px] text-red-500 block">
                    ({{ c.failedCount }} failed)
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span
                    v-if="c.campaignStatus === 'SENT'"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    <CheckCircle2 class="w-3 h-3" />
                    SENT
                  </span>
                  <span
                    v-else-if="c.campaignStatus === 'SCHEDULED'"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                  >
                    <Clock class="w-3 h-3" />
                    SCHEDULED
                  </span>
                  <span
                    v-else-if="c.campaignStatus === 'CANCELLED'"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-300"
                  >
                    <XCircle class="w-3 h-3" />
                    CANCELLED
                  </span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200"
                  >
                    FAILED
                  </span>
                </td>
                <td class="px-4 py-3 text-[11px] text-[#6B7280]">
                  {{ c.scheduledAt ? 'Sched: ' + formatDate(c.scheduledAt) : formatDate(c.sentAt || c.createdAt) }}
                </td>
                <td class="px-4 py-3 text-right">
                  <button
                    v-if="c.campaignStatus === 'SCHEDULED'"
                    type="button"
                    @click="cancelCampaign(c)"
                    class="px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded border border-red-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <span v-else class="text-[11px] text-[#6B7280]">Completed</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- MODE B: 5-STEP NOTIFICATION CREATION WORKFLOW                    -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <template v-else>
      <!-- Wizard Top Header -->
      <div class="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="exitCreation"
            class="p-2 rounded-lg border border-[#E5E7EB] text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8] transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <ChevronLeft class="w-5 h-5" />
          </button>
          <div>
            <h2 class="text-xl font-bold text-[#202124]">Create Targeted Push Notification</h2>
            <p class="text-xs text-[#6B7280] mt-0.5">
              Step {{ currentStep }} of 5:
              <span class="font-semibold text-[#800020]">
                {{
                  currentStep === 1
                    ? 'Select Target Audience'
                    : currentStep === 2
                    ? 'Configure Smart Targeting Rules'
                    : currentStep === 3
                    ? 'Compose Notification Content'
                    : currentStep === 4
                    ? 'Customer & Partner Device Preview'
                    : 'Final Review & Dispatch'
                }}
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="exitCreation"
          class="px-3.5 py-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8] rounded-lg border border-[#E5E7EB] cursor-pointer"
        >
          Cancel
        </button>
      </div>

      <!-- Stepper Progress Navigation -->
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-[#F7F7F8] p-2 rounded-xl border border-[#E5E7EB]">
        <button
          v-for="(st, idx) in [
            { num: 1, label: 'Audience' },
            { num: 2, label: 'Targeting' },
            { num: 3, label: 'Compose' },
            { num: 4, label: 'Preview' },
            { num: 5, label: 'Dispatch' },
          ]"
          :key="st.num"
          type="button"
          @click="goToStep(st.num)"
          class="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer"
          :class="
            currentStep === st.num
              ? 'bg-[#800020] text-white shadow-xs'
              : currentStep > st.num
              ? 'bg-white text-emerald-800 border border-[#E5E7EB]'
              : 'text-[#6B7280] hover:text-[#202124] hover:bg-white/50'
          "
        >
          <span
            class="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
            :class="
              currentStep === st.num
                ? 'bg-white text-[#800020] font-black'
                : currentStep > st.num
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-gray-200 text-[#6B7280]'
            "
          >
            <Check v-if="currentStep > st.num" class="w-3 h-3 stroke-[3]" />
            <span v-else>{{ st.num }}</span>
          </span>
          <span class="hidden md:inline">{{ st.label }}</span>
        </button>
      </div>

      <!-- ── STEP 1: SELECT AUDIENCE ─────────────────────────────────── -->
      <div v-if="currentStep === 1" class="space-y-6">
        <div>
          <h3 class="text-base font-bold text-[#202124]">Who should receive this push notification?</h3>
          <p class="text-xs text-[#6B7280] mt-1">
            Choose the audience sector. Dynamic filters and targeting rules will adjust based on your selection.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <!-- Customers Option -->
          <div
            @click="audienceType = 'CUSTOMERS'"
            class="border-2 rounded-xl p-5 cursor-pointer transition-all flex flex-col justify-between space-y-4"
            :class="
              audienceType === 'CUSTOMERS'
                ? 'border-[#800020] bg-[#800020]/5 shadow-sm'
                : 'border-[#E5E7EB] bg-white hover:border-[#800020]/40'
            "
          >
            <div class="space-y-2">
              <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Users class="w-6 h-6" />
              </div>
              <h4 class="text-base font-bold text-[#202124]">Customers Only</h4>
              <p class="text-xs text-[#6B7280] leading-relaxed">
                Target consumers based on their city, previous booking history, categories (AC, cleaning, electrician), and inactive periods.
              </p>
            </div>
            <div class="flex items-center gap-2 text-xs font-bold text-blue-700">
              <span>Customer-specific targeting rules</span>
              <ArrowRight class="w-4 h-4" />
            </div>
          </div>

          <!-- Partners Option -->
          <div
            @click="audienceType = 'PARTNERS'"
            class="border-2 rounded-xl p-5 cursor-pointer transition-all flex flex-col justify-between space-y-4"
            :class="
              audienceType === 'PARTNERS'
                ? 'border-[#800020] bg-[#800020]/5 shadow-sm'
                : 'border-[#E5E7EB] bg-white hover:border-[#800020]/40'
            "
          >
            <div class="space-y-2">
              <div class="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Briefcase class="w-6 h-6" />
              </div>
              <h4 class="text-base font-bold text-[#202124]">Partners Only</h4>
              <p class="text-xs text-[#6B7280] leading-relaxed">
                Target verified or active service technicians based on availability, completed jobs, city hubs, and booking activity.
              </p>
            </div>
            <div class="flex items-center gap-2 text-xs font-bold text-purple-700">
              <span>Partner-specific operational rules</span>
              <ArrowRight class="w-4 h-4" />
            </div>
          </div>

          <!-- Both Option -->
          <div
            @click="audienceType = 'BOTH'"
            class="border-2 rounded-xl p-5 cursor-pointer transition-all flex flex-col justify-between space-y-4"
            :class="
              audienceType === 'BOTH'
                ? 'border-[#800020] bg-[#800020]/5 shadow-sm'
                : 'border-[#E5E7EB] bg-white hover:border-[#800020]/40'
            "
          >
            <div class="space-y-2">
              <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Layers class="w-6 h-6" />
              </div>
              <h4 class="text-base font-bold text-[#202124]">Both Customers & Partners</h4>
              <p class="text-xs text-[#6B7280] leading-relaxed">
                Cross-audience announcements (city launch, holiday operations, platform policy updates) targeting both recipient groups.
              </p>
            </div>
            <div class="flex items-center gap-2 text-xs font-bold text-indigo-700">
              <span>Combined audience targeting</span>
              <ArrowRight class="w-4 h-4" />
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-4 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="goToStep(2)"
            class="inline-flex items-center gap-2 px-6 py-2.5 bg-[#800020] text-white rounded-lg text-sm font-semibold hover:bg-[#6b001a] transition-colors cursor-pointer"
          >
            <span>Continue to Targeting Rules</span>
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- ── STEP 2: CONFIGURE TARGETING ─────────────────────────────── -->
      <div v-if="currentStep === 2" class="space-y-6">
        <!-- Section Header with Reset & Match Mode -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#F7F7F8] p-4 rounded-xl border border-[#E5E7EB]">
          <div>
            <h3 class="text-sm font-bold text-[#202124] uppercase tracking-wider">
              Smart Targeting Engine
            </h3>
            <p class="text-xs text-[#6B7280] mt-0.5">
              Refine eligible recipients using city, booking history, and partner status.
            </p>
          </div>

          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1.5 text-xs bg-white px-2.5 py-1.5 rounded-lg border border-[#E5E7EB]">
              <span class="font-bold text-[#202124]">Rule Matching:</span>
              <button
                type="button"
                @click="matchMode = 'ALL'"
                class="px-2 py-0.5 rounded font-bold transition-colors cursor-pointer"
                :class="matchMode === 'ALL' ? 'bg-[#800020] text-white' : 'text-[#6B7280]'"
              >
                Match ALL (AND)
              </button>
              <button
                type="button"
                @click="matchMode = 'ANY'"
                class="px-2 py-0.5 rounded font-bold transition-colors cursor-pointer"
                :class="matchMode === 'ANY' ? 'bg-[#800020] text-white' : 'text-[#6B7280]'"
              >
                Match ANY (OR)
              </button>
            </div>

            <button
              type="button"
              @click="resetFilters"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-lg text-xs font-semibold text-[#6B7280] hover:text-[#800020] cursor-pointer"
            >
              <RotateCcw class="w-3.5 h-3.5" />
              Reset Filters
            </button>
          </div>
        </div>

        <!-- 1. City-Based Targeting -->
        <div class="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
            <div class="flex items-center gap-2">
              <MapPin class="w-4 h-4 text-[#800020]" />
              <h4 class="text-sm font-bold text-[#202124]">City-Based Targeting</h4>
            </div>
            <span class="text-xs font-semibold text-[#6B7280]">
              {{ allCities ? 'Targeting: All Nationwide Cities' : `Selected Cities (${selectedCities.length})` }}
            </span>
          </div>

          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <!-- All Cities Chip -->
              <button
                type="button"
                @click="selectAllCities"
                class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border"
                :class="
                  allCities
                    ? 'bg-[#800020] text-white border-[#800020] shadow-2xs'
                    : 'bg-white text-[#202124] border-[#E5E7EB] hover:bg-[#F7F7F8]'
                "
              >
                🌐 All Cities (Nationwide)
              </button>

              <!-- Dynamic Database Cities Chips -->
              <button
                v-for="c in cities"
                :key="c.uniqueId"
                type="button"
                @click="toggleCity(c.name)"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border flex items-center gap-1.5"
                :class="
                  !allCities && selectedCities.includes(c.name)
                    ? 'bg-[#800020] text-white border-[#800020] font-bold shadow-2xs'
                    : 'bg-white text-[#202124] border-[#E5E7EB] hover:bg-[#F7F7F8]'
                "
              >
                <Check v-if="!allCities && selectedCities.includes(c.name)" class="w-3 h-3 stroke-[3]" />
                {{ c.name }}
              </button>
            </div>
            <p class="text-[11px] text-[#6B7280]">
              * Matches recipients by their registered user address and verified operating hub in the database.
            </p>
          </div>
        </div>

        <!-- 2. Customer Historical Booking Filters (if Customers or Both) -->
        <div
          v-if="audienceType === 'CUSTOMERS' || audienceType === 'BOTH'"
          class="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4"
        >
          <div class="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
            <div class="flex items-center gap-2">
              <Users class="w-4 h-4 text-blue-600" />
              <h4 class="text-sm font-bold text-[#202124]">
                Customer Targeting by Previous Bookings
              </h4>
            </div>
            <span class="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              Booking History Intelligence
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Filter A: Service Category -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-[#202124]">
                Service Category
              </label>
              <select
                v-model="customerCategory"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#800020] cursor-pointer"
              >
                <option value="">All Categories</option>
                <option v-for="t in serviceTypes" :key="t.uniqueId" :value="t.uniqueId">
                  {{ t.name }}
                </option>
              </select>
            </div>

            <!-- Filter B: Subcategory -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-[#202124]">
                Subcategory
              </label>
              <select
                v-model="customerSubcategory"
                :disabled="!customerCategory || isSubcategoriesLoading"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#800020] cursor-pointer disabled:bg-gray-100 disabled:text-gray-400"
              >
                <option value="">All Subcategories</option>
                <option v-for="sub in subcategories" :key="sub.uniqueId" :value="sub.uniqueId">
                  {{ sub.name }}
                </option>
              </select>
            </div>

            <!-- Filter C: Booking Date Period -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-[#202124]">
                Previous Booking Period
              </label>
              <select
                v-model="customerBookingDate"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#800020] cursor-pointer"
              >
                <option value="ALL_TIME">All Time</option>
                <option value="TODAY">Booked Today</option>
                <option value="LAST_7_DAYS">Last 7 Days</option>
                <option value="LAST_15_DAYS">Last 15 Days</option>
                <option value="LAST_30_DAYS">Last 30 Days</option>
                <option value="LAST_60_DAYS">Last 60 Days</option>
                <option value="LAST_90_DAYS">Last 90 Days</option>
                <option value="CUSTOM">Custom Date Range</option>
              </select>
            </div>

            <!-- Custom Date Range Inputs -->
            <div v-if="customerBookingDate === 'CUSTOM'" class="md:col-span-2 grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <span class="text-[11px] text-[#6B7280]">Start Date</span>
                <input
                  v-model="customerCustomBookingStart"
                  type="date"
                  class="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#800020]"
                />
              </div>
              <div class="space-y-1">
                <span class="text-[11px] text-[#6B7280]">End Date</span>
                <input
                  v-model="customerCustomBookingEnd"
                  type="date"
                  class="w-full px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#800020]"
                />
              </div>
            </div>

            <!-- Filter D: Booking Status -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-[#202124]">
                Booking Status
              </label>
              <select
                v-model="customerBookingStatus"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#800020] cursor-pointer"
              >
                <option value="COMPLETED">Completed Services Only (Recommended)</option>
                <option value="CONFIRMED">Confirmed / Scheduled Orders</option>
                <option value="CANCELLED">Cancelled Bookings (Win-back campaigns)</option>
                <option value="ANY">Any Order Status</option>
              </select>
            </div>

            <!-- Filter E: Booking Frequency -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-[#202124]">
                Booking Frequency & Inactivity
              </label>
              <select
                v-model="customerBookingFrequency"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#800020] cursor-pointer"
              >
                <option value="ANY">Any Booking Frequency</option>
                <option value="AT_LEAST_ONCE">Booked at least once</option>
                <option value="MULTIPLE_TIMES">Booked multiple times (Repeat customers)</option>
                <option value="NEVER_BOOKED_CATEGORY">Never booked this category (Cross-sell)</option>
                <option value="INACTIVE_30_DAYS">No booking in last 30 days (Re-activation)</option>
                <option value="INACTIVE_60_DAYS">No booking in last 60 days</option>
                <option value="INACTIVE_90_DAYS">No booking in last 90 days</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 3. Partner Targeting Filters (if Partners or Both) -->
        <div
          v-if="audienceType === 'PARTNERS' || audienceType === 'BOTH'"
          class="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4"
        >
          <div class="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
            <div class="flex items-center gap-2">
              <Briefcase class="w-4 h-4 text-purple-600" />
              <h4 class="text-sm font-bold text-[#202124]">
                Partner Targeting & Status Rules
              </h4>
            </div>
            <span class="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
              Operational Filters
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Filter D: Partner Status -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-[#202124]">
                Partner Verification Status
              </label>
              <select
                v-model="partnerStatus"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#800020] cursor-pointer"
              >
                <option value="ACTIVE">Active Partners</option>
                <option value="VERIFIED">Verified Only</option>
                <option value="PENDING_VERIFICATION">Pending KYC Verification</option>
                <option value="INACTIVE">Inactive Partners</option>
                <option value="ALL">All Eligible Statuses</option>
              </select>
            </div>

            <!-- Filter E: Booking Activity -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-[#202124]">
                Partner Booking Activity
              </label>
              <select
                v-model="partnerActivity"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#800020] cursor-pointer"
              >
                <option value="ANY">Any Booking Activity</option>
                <option value="RECEIVED_LAST_7_DAYS">Received a booking in last 7 days</option>
                <option value="RECEIVED_LAST_30_DAYS">Received a booking in last 30 days</option>
                <option value="COMPLETED_LAST_30_DAYS">Completed a job in last 30 days</option>
                <option value="NO_COMPLETIONS_LAST_30_DAYS">No completed jobs in last 30 days</option>
                <option value="NO_BOOKINGS_LAST_60_DAYS">No bookings in last 60 days</option>
              </select>
            </div>

            <!-- Filter F: Working Availability -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-[#202124]">
                Live Availability State
              </label>
              <select
                v-model="partnerAvailability"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#202124] focus:outline-none focus:border-[#800020] cursor-pointer"
              >
                <option value="ANY">Any Availability</option>
                <option value="CURRENTLY_AVAILABLE">Currently Online & Available</option>
                <option value="CURRENTLY_UNAVAILABLE">Currently Offline</option>
                <option value="ACCEPTING_NEW_BOOKINGS">Auto-Accept Enabled</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 4. Real-time Recipient Estimation Callout Banner -->
        <div class="bg-[#F7F7F8] border border-[#E5E7EB] rounded-xl p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span class="text-xs font-bold text-[#202124] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles class="w-4 h-4 text-[#800020]" />
                Live Recipient Population Estimation
              </span>
              <p class="text-xs text-[#6B7280] mt-0.5">
                Calculated directly from the live database according to your active targeting conditions.
              </p>
            </div>

            <button
              type="button"
              @click="openRecipientPreview"
              class="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-[#E5E7EB] rounded-lg text-xs font-bold text-[#800020] hover:bg-[#F7F7F8] transition-colors cursor-pointer shadow-2xs"
            >
              <Eye class="w-3.5 h-3.5" />
              <span>Inspect Sample Recipients</span>
            </button>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div class="bg-white p-3 rounded-lg border border-[#E5E7EB]">
              <span class="text-[11px] text-[#6B7280] block font-medium">Eligible Customers</span>
              <span class="text-xl font-extrabold text-blue-700">
                {{ isEstimating ? '...' : estimation.totalCustomers }}
              </span>
              <span class="text-[10px] text-[#6B7280] block mt-0.5">
                {{ estimation.customersWithToken }} with FCM token
              </span>
            </div>

            <div class="bg-white p-3 rounded-lg border border-[#E5E7EB]">
              <span class="text-[11px] text-[#6B7280] block font-medium">Eligible Partners</span>
              <span class="text-xl font-extrabold text-purple-700">
                {{ isEstimating ? '...' : estimation.totalPartners }}
              </span>
              <span class="text-[10px] text-[#6B7280] block mt-0.5">
                {{ estimation.partnersWithToken }} with FCM token
              </span>
            </div>

            <div class="bg-white p-3 rounded-lg border border-[#E5E7EB]">
              <span class="text-[11px] text-[#6B7280] block font-medium">Ready to Receive Push</span>
              <span class="text-xl font-extrabold text-emerald-700">
                {{ isEstimating ? '...' : estimation.eligibleWithToken }}
              </span>
              <span class="text-[10px] text-emerald-600 block mt-0.5">active mobile tokens</span>
            </div>

            <div class="bg-white p-3 rounded-lg border border-[#E5E7EB]">
              <span class="text-[11px] text-[#6B7280] block font-medium">Excluded (No Token/Suspended)</span>
              <span class="text-xl font-extrabold text-gray-700">
                {{ isEstimating ? '...' : estimation.excludedNoToken + estimation.excludedSuspended }}
              </span>
              <span class="text-[10px] text-gray-500 block mt-0.5">web-only or suspended</span>
            </div>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="flex items-center justify-between pt-4 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="goToStep(1)"
            class="px-5 py-2.5 bg-white border border-[#E5E7EB] text-[#202124] rounded-lg text-sm font-semibold hover:bg-[#F7F7F8] cursor-pointer"
          >
            ← Back to Audience
          </button>

          <button
            type="button"
            @click="goToStep(3)"
            class="inline-flex items-center gap-2 px-6 py-2.5 bg-[#800020] text-white rounded-lg text-sm font-semibold hover:bg-[#6b001a] cursor-pointer"
          >
            <span>Proceed to Notification Composer</span>
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- ── STEP 3: COMPOSE NOTIFICATION ────────────────────────────── -->
      <div v-if="currentStep === 3" class="space-y-6">
        <div>
          <h3 class="text-base font-bold text-[#202124]">Compose Push Notification Content</h3>
          <p class="text-xs text-[#6B7280] mt-1">
            Craft title and message according to FCM push delivery best practices.
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Form Inputs (Left 2 cols) -->
          <div class="lg:col-span-2 space-y-4">
            <!-- Campaign Name & Notification Type -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="block text-xs font-semibold text-[#202124]">
                  Internal Campaign Name
                </label>
                <input
                  v-model="campaignName"
                  type="text"
                  placeholder="e.g., Diwali AC Service Re-engagement"
                  class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#202124] focus:outline-none focus:border-[#800020]"
                />
              </div>

              <div class="space-y-1.5">
                <label class="block text-xs font-semibold text-[#202124]">
                  Notification Type
                </label>
                <select
                  v-model="notificationType"
                  class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#202124] focus:outline-none focus:border-[#800020] cursor-pointer"
                >
                  <option value="PROMOTIONAL">Promotional Offer</option>
                  <option value="SERVICE_REMINDER">Service Reminder</option>
                  <option value="BOOKING_UPDATE">Booking Update</option>
                  <option value="PARTNER_UPDATE">Partner Operational Update</option>
                  <option value="GENERAL_ANNOUNCEMENT">General Announcement</option>
                </select>
              </div>
            </div>

            <!-- Title Input with Character Limit -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-semibold text-[#202124]">
                  Notification Title <span class="text-red-500">*</span>
                </label>
                <span
                  class="text-[11px]"
                  :class="notificationTitle.length > 65 ? 'text-amber-600 font-bold' : 'text-[#6B7280]'"
                >
                  {{ notificationTitle.length }} / 65 characters (recommended)
                </span>
              </div>
              <input
                v-model="notificationTitle"
                type="text"
                maxlength="100"
                placeholder="e.g., Your AC Needs Attention?"
                class="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#202124] font-medium focus:outline-none focus:border-[#800020]"
              />
            </div>

            <!-- Message Input with Placeholders & Character Limit -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-semibold text-[#202124]">
                  Notification Body / Message <span class="text-red-500">*</span>
                </label>
                <span
                  class="text-[11px]"
                  :class="notificationMessage.length > 200 ? 'text-amber-600 font-bold' : 'text-[#6B7280]'"
                >
                  {{ notificationMessage.length }} / 240 characters
                </span>
              </div>

              <!-- Quick Placeholders Bar -->
              <div class="flex items-center gap-1.5 py-1">
                <span class="text-[11px] text-[#6B7280]">Dynamic tags:</span>
                <button
                  type="button"
                  @click="insertPlaceholder('{name}')"
                  class="px-2 py-0.5 rounded bg-[#F7F7F8] border border-[#E5E7EB] text-[11px] font-mono text-[#800020] hover:bg-gray-100 cursor-pointer"
                >
                  {name}
                </button>
                <button
                  type="button"
                  @click="insertPlaceholder('{city}')"
                  class="px-2 py-0.5 rounded bg-[#F7F7F8] border border-[#E5E7EB] text-[11px] font-mono text-[#800020] hover:bg-gray-100 cursor-pointer"
                >
                  {city}
                </button>
              </div>

              <textarea
                v-model="notificationMessage"
                rows="4"
                maxlength="250"
                placeholder="e.g., It's been a while since your last service in {city}. Book your AC inspection today with certified technicians."
                class="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#202124] leading-relaxed focus:outline-none focus:border-[#800020]"
              ></textarea>
            </div>

            <!-- Optional Image URL -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-[#202124]">
                Notification Banner Image URL (Optional)
              </label>
              <input
                v-model="notificationImage"
                type="url"
                placeholder="https://res.cloudinary.com/.../banner.jpg"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#202124] focus:outline-none focus:border-[#800020]"
              />
              <p class="text-[11px] text-[#6B7280]">
                FCM displays rich expandable image banners on Android and iOS devices.
              </p>
            </div>

            <!-- Destination Deep Link -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-[#202124]">
                Destination Screen or Deep Link (Optional)
              </label>
              <input
                v-model="deepLink"
                type="text"
                placeholder="e.g., /cart, /category/ac-services, or COUPON:WELCOME25"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#202124] focus:outline-none focus:border-[#800020]"
              />
            </div>
          </div>

          <!-- Quick Live Preview Column (Right) -->
          <div class="space-y-3">
            <span class="text-xs font-bold text-[#202124] uppercase tracking-wider block">
              Quick Lock Screen Preview
            </span>
            <div class="bg-[#F7F7F8] rounded-2xl p-4 border border-[#E5E7EB] space-y-3">
              <div class="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-md border border-black/5 space-y-2">
                <div class="flex items-center justify-between text-[11px] text-gray-500">
                  <div class="flex items-center gap-1.5 font-bold text-[#800020]">
                    <div class="w-4 h-4 rounded bg-[#800020] text-white flex items-center justify-center text-[9px] font-black">
                      O
                    </div>
                    <span>OMIBAY</span>
                  </div>
                  <span>just now</span>
                </div>
                <div class="text-xs font-bold text-gray-900 leading-snug">
                  {{ notificationTitle || 'Notification Title' }}
                </div>
                <div class="text-[11px] text-gray-700 leading-relaxed">
                  {{ notificationMessage || 'Notification message text will appear here...' }}
                </div>
                <img
                  v-if="notificationImage"
                  :src="notificationImage"
                  alt="Banner"
                  class="rounded-xl w-full h-28 object-cover border border-gray-100 mt-2"
                />
              </div>
              <p class="text-[11px] text-center text-[#6B7280]">
                Simulates real-time push appearance
              </p>
            </div>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="flex items-center justify-between pt-4 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="goToStep(2)"
            class="px-5 py-2.5 bg-white border border-[#E5E7EB] text-[#202124] rounded-lg text-sm font-semibold hover:bg-[#F7F7F8] cursor-pointer"
          >
            ← Back to Targeting
          </button>

          <button
            type="button"
            @click="goToStep(4)"
            class="inline-flex items-center gap-2 px-6 py-2.5 bg-[#800020] text-white rounded-lg text-sm font-semibold hover:bg-[#6b001a] cursor-pointer"
          >
            <span>Proceed to Preview</span>
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- ── STEP 4: PREVIEW NOTIFICATION ────────────────────────────── -->
      <div v-if="currentStep === 4" class="space-y-6">
        <div class="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
          <div>
            <h3 class="text-base font-bold text-[#202124]">Mobile Device Push Notification Preview</h3>
            <p class="text-xs text-[#6B7280] mt-0.5">
              Inspect how the push notification banner appears on recipient smartphones.
            </p>
          </div>

          <div class="flex items-center gap-1 bg-[#F7F7F8] p-1 rounded-lg border border-[#E5E7EB]">
            <button
              type="button"
              @click="previewPerspective = 'CUSTOMER'"
              class="px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer"
              :class="
                previewPerspective === 'CUSTOMER'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-[#6B7280]'
              "
            >
              Customer Device
            </button>
            <button
              type="button"
              @click="previewPerspective = 'PARTNER'"
              class="px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer"
              :class="
                previewPerspective === 'PARTNER'
                  ? 'bg-white text-purple-700 shadow-xs'
                  : 'text-[#6B7280]'
              "
            >
              Partner Device
            </button>
          </div>
        </div>

        <!-- Realistic Device Showcase -->
        <div class="flex justify-center bg-[#F7F7F8] rounded-2xl p-3 sm:p-8 border border-[#E5E7EB]">
          <div class="w-full max-w-[340px] bg-gray-900 rounded-[38px] p-3 shadow-2xl border-4 border-gray-800">
            <!-- Screen Area with Lockscreen Wallpaper -->
            <div class="w-full bg-gradient-to-b from-gray-800 to-gray-900 rounded-[30px] p-4 text-white min-h-[480px] flex flex-col justify-between relative overflow-hidden">
              <!-- Top Status Bar -->
              <div class="flex items-center justify-between text-[11px] font-semibold text-white/90">
                <span>9:41</span>
                <div class="w-16 h-3.5 bg-black rounded-full"></div>
                <span>5G</span>
              </div>

              <!-- Lockscreen Clock -->
              <div class="text-center mt-6 space-y-1">
                <span class="text-xs font-medium text-white/70">Wednesday, 3 November</span>
                <h1 class="text-5xl font-extralight tracking-tight">09:41</h1>
              </div>

              <!-- The FCM Push Notification Banner -->
              <div class="bg-white/90 backdrop-blur-xl rounded-2xl p-4 text-gray-900 shadow-xl space-y-2 mt-4 border border-white/20">
                <div class="flex items-center justify-between text-[11px] text-gray-500">
                  <div class="flex items-center gap-1.5 font-bold text-[#800020]">
                    <div class="w-4 h-4 rounded bg-[#800020] text-white flex items-center justify-center text-[9px] font-black">
                      O
                    </div>
                    <span>OmiBay {{ previewPerspective === 'PARTNER' ? 'Partner' : '' }}</span>
                  </div>
                  <span>now</span>
                </div>
                <div class="text-xs font-bold leading-snug">
                  {{ notificationTitle }}
                </div>
                <div class="text-[11px] text-gray-700 leading-relaxed">
                  {{
                    notificationMessage
                      .replace('{name}', previewPerspective === 'PARTNER' ? 'Rajesh Kumar' : 'Sourav')
                      .replace('{city}', 'Contai')
                  }}
                </div>
                <img
                  v-if="notificationImage"
                  :src="notificationImage"
                  alt="Push Rich Banner"
                  class="rounded-xl w-full h-32 object-cover border border-black/5 mt-1"
                />

                <div v-if="deepLink" class="pt-2 border-t border-gray-200/80 flex items-center justify-between text-[10px] text-gray-500">
                  <span class="flex items-center gap-1">
                    <LinkIcon class="w-3 h-3 text-[#800020]" />
                    Opens: {{ deepLink }}
                  </span>
                  <span class="font-bold text-[#800020]">Tap to open</span>
                </div>
              </div>

              <!-- Bottom Torch & Camera Icons -->
              <div class="flex items-center justify-between px-2 pt-12 pb-2">
                <span class="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-sm">
                  🔦
                </span>
                <span class="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-sm">
                  📷
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="flex items-center justify-between pt-4 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="goToStep(3)"
            class="px-5 py-2.5 bg-white border border-[#E5E7EB] text-[#202124] rounded-lg text-sm font-semibold hover:bg-[#F7F7F8] cursor-pointer"
          >
            ← Back to Compose
          </button>

          <button
            type="button"
            @click="goToStep(5)"
            class="inline-flex items-center gap-2 px-6 py-2.5 bg-[#800020] text-white rounded-lg text-sm font-semibold hover:bg-[#6b001a] cursor-pointer"
          >
            <span>Proceed to Schedule & Send</span>
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- ── STEP 5: SCHEDULE OR SEND ────────────────────────────────── -->
      <div v-if="currentStep === 5" class="space-y-6">
        <div>
          <h3 class="text-base font-bold text-[#202124]">Review Targeting & Confirm Dispatch</h3>
          <p class="text-xs text-[#6B7280] mt-1">
            Revalidating recipient counts and active device tokens immediately before delivery.
          </p>
        </div>

        <!-- Campaign Summary Card -->
        <div class="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div>
              <span class="text-xs text-[#6B7280] block font-medium">Campaign Name</span>
              <h4 class="text-base font-bold text-[#202124]">
                {{ campaignName || notificationTitle }}
              </h4>
            </div>
            <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-[#800020]/10 text-[#800020] border border-[#800020]/20">
              {{ notificationType }}
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div class="bg-[#F7F7F8] p-3 rounded-lg border border-[#E5E7EB]">
              <span class="text-[#6B7280] block">Target Audience:</span>
              <span class="font-bold text-[#202124] text-sm mt-0.5 block">{{ audienceType }}</span>
            </div>

            <div class="bg-[#F7F7F8] p-3 rounded-lg border border-[#E5E7EB]">
              <span class="text-[#6B7280] block">Target Cities:</span>
              <span class="font-bold text-[#202124] text-sm mt-0.5 block truncate">
                {{ allCities ? 'All Cities' : selectedCities.join(', ') }}
              </span>
            </div>

            <div class="bg-[#F7F7F8] p-3 rounded-lg border border-[#E5E7EB]">
              <span class="text-[#6B7280] block">Booking Period:</span>
              <span class="font-bold text-[#202124] text-sm mt-0.5 block">{{ customerBookingDate }}</span>
            </div>

            <div class="bg-[#F7F7F8] p-3 rounded-lg border border-[#E5E7EB]">
              <span class="text-[#6B7280] block">Total Eligible Recipients:</span>
              <span class="font-extrabold text-emerald-700 text-base mt-0.5 block">
                {{ estimation.totalTargeted }} ({{ estimation.eligibleWithToken }} mobile tokens)
              </span>
            </div>
          </div>
        </div>

        <!-- Dispatch Timing Options -->
        <div class="bg-white border border-[#E5E7EB] rounded-xl p-5 space-y-4">
          <h4 class="text-sm font-bold text-[#202124]">Delivery Timing</h4>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              @click="scheduleLater = false"
              class="border-2 rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between"
              :class="!scheduleLater ? 'border-[#800020] bg-[#800020]/5 shadow-xs' : 'border-[#E5E7EB] bg-white'"
            >
              <div>
                <span class="text-sm font-bold text-[#202124] block">Send Immediately</span>
                <span class="text-xs text-[#6B7280]">Dispatch push notifications right now.</span>
              </div>
              <Send class="w-5 h-5 text-[#800020]" />
            </div>

            <div
              @click="scheduleLater = true"
              class="border-2 rounded-xl p-4 cursor-pointer transition-all flex items-center justify-between"
              :class="scheduleLater ? 'border-[#800020] bg-[#800020]/5 shadow-xs' : 'border-[#E5E7EB] bg-white'"
            >
              <div>
                <span class="text-sm font-bold text-[#202124] block">Schedule for Later</span>
                <span class="text-xs text-[#6B7280]">Deliver at a specific date and time.</span>
              </div>
              <Clock class="w-5 h-5 text-[#800020]" />
            </div>
          </div>

          <!-- Schedule Date Time Picker -->
          <div v-if="scheduleLater" class="pt-2 max-w-sm space-y-1.5">
            <label class="block text-xs font-semibold text-[#202124]">
              Select Future Delivery Date & Time
            </label>
            <input
              v-model="scheduledAt"
              type="datetime-local"
              class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#202124] focus:outline-none focus:border-[#800020]"
            />
          </div>
        </div>

        <!-- Action Confirmation Buttons -->
        <div class="flex items-center justify-between pt-4 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="goToStep(4)"
            class="px-5 py-2.5 bg-white border border-[#E5E7EB] text-[#202124] rounded-lg text-sm font-semibold hover:bg-[#F7F7F8] cursor-pointer"
          >
            ← Back to Preview
          </button>

          <button
            type="button"
            @click="handleSendOrSchedule"
            :disabled="isSubmitting"
            class="inline-flex items-center gap-2 px-8 py-3 bg-[#800020] text-white rounded-lg text-sm font-bold hover:bg-[#6b001a] transition-colors cursor-pointer shadow-md disabled:opacity-50"
          >
            <RefreshCw v-if="isSubmitting" class="w-4 h-4 animate-spin" />
            <span>{{ scheduleLater ? 'Confirm & Schedule Notification' : 'Confirm & Dispatch Push Now' }}</span>
          </button>
        </div>
      </div>
    </template>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- VIEW ELIGIBLE RECIPIENTS MODAL                                   -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <Popup
      v-model="isRecipientDrawerOpen"
      title="Eligible Recipients Sample (Privacy Masked)"
      size="lg"
    >
      <div class="space-y-4">
        <p class="text-xs text-[#6B7280]">
          Showing sample recipients qualifying under active targeting filters. Mobile numbers are securely masked to maintain privacy.
        </p>

        <div class="max-h-80 overflow-y-auto border border-[#E5E7EB] rounded-lg">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#F7F7F8] text-[#6B7280] font-bold uppercase tracking-wider sticky top-0 border-b border-[#E5E7EB]">
              <tr>
                <th class="px-3.5 py-2.5">User</th>
                <th class="px-3.5 py-2.5">Role</th>
                <th class="px-3.5 py-2.5">City</th>
                <th class="px-3.5 py-2.5">Masked Mobile</th>
                <th class="px-3.5 py-2.5 text-center">FCM Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E5E7EB]">
              <tr v-if="isPreviewRecipientsLoading">
                <td colspan="5" class="py-8 text-center text-[#6B7280]">
                  <RefreshCw class="w-5 h-5 text-[#800020] animate-spin mx-auto mb-2" />
                  Loading sample recipients...
                </td>
              </tr>
              <tr v-else-if="recipientPreviews.length === 0">
                <td colspan="5" class="py-8 text-center text-[#6B7280]">
                  No recipients found matching these criteria.
                </td>
              </tr>
              <tr v-for="r in recipientPreviews" :key="r.userId" class="hover:bg-[#F7F7F8]">
                <td class="px-3.5 py-2.5 font-bold text-[#202124]">
                  {{ r.name }}
                </td>
                <td class="px-3.5 py-2.5">
                  <span
                    class="px-2 py-0.5 rounded text-[10px] font-bold"
                    :class="r.role === 'CUSTOMER' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'"
                  >
                    {{ r.role }}
                  </span>
                </td>
                <td class="px-3.5 py-2.5 text-[#6B7280]">
                  {{ r.city }}
                </td>
                <td class="px-3.5 py-2.5 font-mono text-[11px] text-[#202124]">
                  {{ r.maskedMobile }}
                </td>
                <td class="px-3.5 py-2.5 text-center">
                  <span
                    v-if="r.hasToken"
                    class="inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px]"
                  >
                    <Check class="w-3 h-3 stroke-[3]" />
                    Token Active
                  </span>
                  <span v-else class="text-gray-400 text-[10px]">No Token</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-end pt-2 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="isRecipientDrawerOpen = false"
            class="px-4 py-2 bg-white border border-[#E5E7EB] text-[#202124] rounded-lg text-xs font-semibold hover:bg-[#F7F7F8] cursor-pointer"
          >
            Close Sample
          </button>
        </div>
      </div>
    </Popup>
  </div>
</template>

