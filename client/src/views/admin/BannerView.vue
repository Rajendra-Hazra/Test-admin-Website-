<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api'
import type {
  HeroBanner,
  BannerStats,
  BannerRedirectType,
  BannerStatus,
  City,
  ServiceType,
} from '@/types/api'
import Popup from '@/components/common/Popup.vue'
import Toggle from '@/components/common/Toggle.vue'
import { showToast } from '@/utils/toast'
import {
  Image as ImageIcon,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  UploadCloud,
  X,
  ExternalLink,
  Smartphone,
  Tablet,
  Calendar,
  Layers,
  MapPin,
  Tag,
  Link as LinkIcon,
  Sparkles,
  ArrowRight,
  Sliders,
  Check,
  ChevronDown,
} from 'lucide-vue-next'

// ── State ─────────────────────────────────────────────────────────────
const banners = ref<HeroBanner[]>([])
const stats = ref<BannerStats>({
  total: 0,
  active: 0,
  scheduled: 0,
  inactive: 0,
})

const cities = ref<City[]>([])
const serviceTypes = ref<ServiceType[]>([])
const isLoading = ref(false)
const isSubmitting = ref(false)

// Filters
const searchQuery = ref('')
const selectedCityFilter = ref<string>('ALL')
const selectedStatusFilter = ref<string>('ALL')

// Form Modal State
const isFormModalOpen = ref(false)
const isEditMode = ref(false)
const currentBannerId = ref<string | null>(null)

// Form Fields
const formTitle = ref('')
const formCampaign = ref('')
const formDescription = ref('')
const formCityId = ref('ALL')
const formRedirectType = ref<BannerRedirectType>('SERVICE_CATEGORY')
const formLink = ref('')
const formSelectedCategoryId = ref('')
const formSelectedScreen = ref('CART')
const formDisplayOrder = ref<number>(1)
const formStartDate = ref('')
const formExpireAt = ref('')
const formIsActive = ref(true)

// Image Upload & Validation State
const imageFile = ref<File | null>(null)
const imagePreviewUrl = ref<string | null>(null)
const existingImageUrl = ref<string | null>(null)
const existingImagePublicId = ref<string | null>(null)
const imageDimensions = ref<{ width: number; height: number; ratio: number } | null>(null)
const imageValidationWarning = ref<string | null>(null)
const isCompressing = ref(false)
const isDragging = ref(false)

// Delete Dialog State
const isDeleteModalOpen = ref(false)
const bannerToDelete = ref<HeroBanner | null>(null)

// Customer App Live Preview Modal State
const isPreviewModalOpen = ref(false)
const previewBanner = ref<HeroBanner | null>(null)
const previewDeviceMode = ref<'mobile' | 'tablet'>('mobile')

// Internal App Screens Options
const internalScreens = [
  { value: 'HOME', label: 'Home Screen' },
  { value: 'CART', label: 'Cart / Checkout Screen' },
  { value: 'WALLET', label: 'My Wallet & Passbook' },
  { value: 'REWARDS', label: 'Scratch Cards & Rewards' },
  { value: 'BOOKINGS', label: 'My Bookings / Orders' },
  { value: 'PROFILE', label: 'User Account Profile' },
  { value: 'HELP', label: 'Help & Customer Support' },
]

// ── Data Fetching ─────────────────────────────────────────────────────
async function fetchStats() {
  try {
    const res = await api.banners.getStats()
    const data = (res as any)?.data?.stats ?? (res as any)?.stats ?? res
    if (data && typeof data === 'object') {
      stats.value = {
        total: Number(data.total) || 0,
        active: Number(data.active) || 0,
        scheduled: Number(data.scheduled) || 0,
        inactive: Number(data.inactive) || 0,
      }
    }
  } catch (err) {
    console.warn('Failed to load banner stats', err)
  }
}

async function fetchBanners() {
  isLoading.value = true
  try {
    const res = await api.banners.getAll({
      cityId: selectedCityFilter.value !== 'ALL' ? selectedCityFilter.value : undefined,
      status: selectedStatusFilter.value !== 'ALL' ? selectedStatusFilter.value : undefined,
    })
    const raw = (res as any)?.data?.banners ?? (res as any)?.banners ?? res
    banners.value = Array.isArray(raw) ? raw : []
  } catch (err: any) {
    showToast(err?.message || 'Failed to fetch hero banners', 'error')
    banners.value = []
  } finally {
    isLoading.value = false
  }
}

async function fetchMeta() {
  try {
    const [citiesRes, typesRes] = await Promise.allSettled([
      api.cities.getActive(),
      api.services.getAllTypes(),
    ])

    if (citiesRes.status === 'fulfilled') {
      const c = (citiesRes.value as any)?.data ?? citiesRes.value
      cities.value = Array.isArray(c) ? c : []
    }
    if (typesRes.status === 'fulfilled') {
      const t = (typesRes.value as any)?.data ?? typesRes.value
      serviceTypes.value = Array.isArray(t) ? t : []
    }
  } catch (err) {
    console.warn('Failed to fetch cities/categories meta', err)
  }
}

async function refreshAll() {
  await Promise.all([fetchStats(), fetchBanners()])
}

// ── Computed Filtered Banners ─────────────────────────────────────────
const filteredBanners = computed(() => {
  return banners.value.filter((b) => {
    // Search query filter
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const titleMatch = b.title?.toLowerCase().includes(q)
      const campaignMatch = b.campaignName?.toLowerCase().includes(q)
      const descMatch = b.description?.toLowerCase().includes(q)
      if (!titleMatch && !campaignMatch && !descMatch) return false
    }

    // City filter
    if (selectedCityFilter.value !== 'ALL') {
      if (b.cityId !== selectedCityFilter.value && b.cityId !== 'ALL') return false
    }

    // Status filter
    if (selectedStatusFilter.value !== 'ALL') {
      if (b.status !== selectedStatusFilter.value) return false
    }

    return true
  })
})

function getCityName(cityId?: string): string {
  if (!cityId || cityId === 'ALL') return 'All Cities'
  const found = cities.value.find((c) => c.uniqueId === cityId)
  return found?.name || cityId
}

// ── Image Handling & 16:9 Aspect Ratio Validation ─────────────────────
function validateAndProcessImage(file: File) {
  // Validate file format
  const validFormats = ['image/jpeg', 'image/png', 'image/webp']
  if (!validFormats.includes(file.type)) {
    showToast('Supported formats: JPG, JPEG, PNG, and WebP', 'error')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = async () => {
      const width = img.naturalWidth
      const height = img.naturalHeight
      const ratio = width / height
      imageDimensions.value = { width, height, ratio }

      // 16:9 ratio check: 16/9 = 1.7777... Tolerance: 1.70 to 1.85
      const idealRatio = 16 / 9
      const isRatioOk = Math.abs(ratio - idealRatio) <= 0.08

      if (!isRatioOk) {
        imageValidationWarning.value = `Uploaded image is ${width}×${height}px (ratio ${ratio.toFixed(2)}:1). Recommended standard is 16:9 (1.78:1, e.g. 1920×1080px). Images deviating from 16:9 will be cropped in the customer mobile carousel.`
      } else {
        imageValidationWarning.value = null
      }

      // Compress large images (> 1.5MB) using canvas
      if (file.size > 1.5 * 1024 * 1024) {
        isCompressing.value = true
        try {
          const compressed = await compressImage(img, file.type)
          imageFile.value = compressed
          imagePreviewUrl.value = URL.createObjectURL(compressed)
          showToast('Image compressed for optimal upload speed', 'info')
        } catch (err) {
          imageFile.value = file
          imagePreviewUrl.value = e.target?.result as string
        } finally {
          isCompressing.value = false
        }
      } else {
        imageFile.value = file
        imagePreviewUrl.value = e.target?.result as string
      }
    }
    img.src = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

function compressImage(img: HTMLImageElement, mimeType: string): Promise<File> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas')
      // Max bounds 1920x1080
      let w = img.naturalWidth
      let h = img.naturalHeight
      const maxW = 1920
      const maxH = 1080

      if (w > maxW || h > maxH) {
        if (w / h > maxW / maxH) {
          h = Math.round((h * maxW) / w)
          w = maxW
        } else {
          w = Math.round((w * maxH) / h)
          h = maxH
        }
      }

      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(new File([], 'image'))
        return
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, w, h)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], 'banner-16-9.webp', { type: 'image/webp' })
            resolve(compressedFile)
          } else {
            reject(new Error('Canvas compression failed'))
          }
        },
        'image/webp',
        0.88
      )
    } catch (err) {
      reject(err)
    }
  })
}

function onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    validateAndProcessImage(input.files[0])
  }
}

function onFileDrop(event: DragEvent) {
  isDragging.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    validateAndProcessImage(event.dataTransfer.files[0])
  }
}

function removeImage() {
  imageFile.value = null
  imagePreviewUrl.value = null
  existingImageUrl.value = null
  existingImagePublicId.value = null
  imageDimensions.value = null
  imageValidationWarning.value = null
}

// ── Open Add / Edit Form ──────────────────────────────────────────────
function openAddModal() {
  isEditMode.value = false
  currentBannerId.value = null

  formTitle.value = ''
  formCampaign.value = ''
  formDescription.value = ''
  formCityId.value = 'ALL'
  formRedirectType.value = 'SERVICE_CATEGORY'
  formLink.value = ''
  formSelectedCategoryId.value = serviceTypes.value[0]?.uniqueId || ''
  formSelectedScreen.value = 'CART'
  formDisplayOrder.value = banners.value.length + 1
  formStartDate.value = ''
  formExpireAt.value = ''
  formIsActive.value = true

  removeImage()
  isFormModalOpen.value = true
}

function openEditModal(banner: HeroBanner) {
  isEditMode.value = true
  currentBannerId.value = banner.id

  formTitle.value = banner.title || ''
  formCampaign.value = banner.campaignName || ''
  formDescription.value = banner.description || ''
  formCityId.value = banner.cityId || 'ALL'
  formRedirectType.value = banner.redirectType || 'CUSTOM_URL'
  formLink.value = banner.link || ''
  formDisplayOrder.value = banner.displayOrder || 1
  formIsActive.value = banner.isActive

  // Formatting dates for datetime-local input (YYYY-MM-DDTHH:mm)
  formStartDate.value = banner.startDate ? banner.startDate.slice(0, 16) : ''
  formExpireAt.value = banner.expireAt ? banner.expireAt.slice(0, 16) : ''

  // Pre-fill redirect dropdown helpers
  if (banner.redirectType === 'SERVICE_CATEGORY') {
    formSelectedCategoryId.value = banner.link || serviceTypes.value[0]?.uniqueId || ''
  } else if (banner.redirectType === 'INTERNAL_SCREEN') {
    formSelectedScreen.value = banner.link || 'CART'
  }

  // Pre-fill existing image
  imageFile.value = null
  imagePreviewUrl.value = banner.imageUrl || null
  existingImageUrl.value = banner.imageUrl || null
  existingImagePublicId.value = banner.imagePublicId || null
  imageDimensions.value = null
  imageValidationWarning.value = null

  isFormModalOpen.value = true
}

// ── Submit Add / Edit Form ────────────────────────────────────────────
async function handleFormSubmit() {
  if (!formTitle.value.trim()) {
    showToast('Banner title is required', 'error')
    return
  }

  if (!imagePreviewUrl.value && !imageFile.value) {
    showToast('Please upload a 16:9 banner image', 'error')
    return
  }

  // Assemble the destination target link
  let finalLink = formLink.value.trim()
  if (formRedirectType.value === 'SERVICE_CATEGORY') {
    finalLink = formSelectedCategoryId.value
  } else if (formRedirectType.value === 'INTERNAL_SCREEN') {
    finalLink = formSelectedScreen.value
  }

  isSubmitting.value = true
  try {
    const formData = new FormData()
    formData.append('name', formTitle.value.trim())
    formData.append('campaignName', formCampaign.value.trim())
    formData.append('description', formDescription.value.trim())
    formData.append('cityId', formCityId.value)
    formData.append('redirectType', formRedirectType.value)
    formData.append('link', finalLink)
    formData.append('displayOrder', String(formDisplayOrder.value || 1))
    formData.append('isActive', String(formIsActive.value))

    if (formStartDate.value) {
      formData.append('startDate', formStartDate.value)
    }
    if (formExpireAt.value) {
      formData.append('expireAt', formExpireAt.value)
    }

    if (imageFile.value) {
      formData.append('imageFile', imageFile.value)
    } else if (existingImageUrl.value) {
      formData.append('imageUrl', existingImageUrl.value)
      if (existingImagePublicId.value) {
        formData.append('imagePublicId', existingImagePublicId.value)
      }
    }

    if (isEditMode.value && currentBannerId.value) {
      await api.banners.update(currentBannerId.value, formData)
      showToast('Banner updated successfully', 'success')
    } else {
      await api.banners.create(formData)
      showToast('Hero banner created successfully', 'success')
    }

    isFormModalOpen.value = false
    await refreshAll()
  } catch (err: any) {
    showToast(err?.message || 'Failed to save banner', 'error')
  } finally {
    isSubmitting.value = false
  }
}

// ── Toggle Banner Status ──────────────────────────────────────────────
async function toggleStatus(banner: HeroBanner) {
  const newStatus = !banner.isActive
  try {
    banner.isActive = newStatus
    await api.banners.toggleStatus(banner.id, newStatus)
    showToast(`Banner ${newStatus ? 'activated' : 'deactivated'}`, 'success')
    await fetchStats()
  } catch (err: any) {
    banner.isActive = !newStatus // revert on failure
    showToast(err?.message || 'Failed to update status', 'error')
  }
}

// ── Delete Banner ─────────────────────────────────────────────────────
function promptDelete(banner: HeroBanner) {
  bannerToDelete.value = banner
  isDeleteModalOpen.value = true
}

async function confirmDelete() {
  if (!bannerToDelete.value) return
  isSubmitting.value = true
  try {
    await api.banners.delete(bannerToDelete.value.id)
    showToast('Banner deleted successfully', 'success')
    isDeleteModalOpen.value = false
    bannerToDelete.value = null
    await refreshAll()
  } catch (err: any) {
    showToast(err?.message || 'Failed to delete banner', 'error')
  } finally {
    isSubmitting.value = false
  }
}

// ── Live Customer App Preview ─────────────────────────────────────────
function openPreview(banner: HeroBanner) {
  previewBanner.value = banner
  isPreviewModalOpen.value = true
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

// Lifecycle
onMounted(() => {
  fetchStats()
  fetchBanners()
  fetchMeta()
})
</script>

<template>
  <div class="space-y-6 pb-12 bg-white text-[#202124]">
    <!-- ── 1. Page Header ────────────────────────────────────────────── -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E7EB] pb-5">
      <div>
        <div class="flex items-center gap-2">
          <div class="w-2.5 h-6 bg-[#800020] rounded-xs"></div>
          <h1 class="text-2xl font-bold tracking-tight text-[#202124]">Hero Banner Management</h1>
        </div>
        <p class="text-sm text-[#6B7280] mt-1 pl-4.5">
          Manage promotional hero banners displayed on the OmiBay customer application.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="refreshAll"
          :disabled="isLoading"
          class="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white border border-[#E5E7EB] text-[#202124] rounded-lg text-sm font-medium hover:bg-[#F7F7F8] hover:text-[#800020] transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
          title="Refresh Banners"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
          <span class="hidden sm:inline">Refresh</span>
        </button>

        <button
          type="button"
          @click="openAddModal"
          class="inline-flex items-center gap-2 px-4 py-2.5 bg-[#800020] text-white rounded-lg text-sm font-semibold hover:bg-[#6b001a] transition-colors cursor-pointer shadow-sm"
        >
          <Plus class="w-4 h-4 stroke-[2.5]" />
          <span>Add New Banner</span>
        </button>
      </div>
    </div>

    <!-- ── 2. Analytics Overview (4 Summary Cards) ────────────────────── -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Banners -->
      <div class="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-2xs hover:border-[#800020]/30 transition-all">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Total Banners</span>
          <div class="p-2 rounded-lg bg-[#F7F7F8] text-[#800020]">
            <Layers class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-[#202124]">{{ stats.total }}</span>
          <span class="text-xs text-[#6B7280]">configured</span>
        </div>
      </div>

      <!-- Active Banners -->
      <div class="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-2xs hover:border-emerald-300 transition-all">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Active Banners</span>
          <div class="p-2 rounded-lg bg-emerald-50 text-emerald-700">
            <CheckCircle2 class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-emerald-700">{{ stats.active }}</span>
          <span class="text-xs text-emerald-600 font-medium">visible in app</span>
        </div>
      </div>

      <!-- Scheduled Banners -->
      <div class="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-2xs hover:border-blue-300 transition-all">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Scheduled Banners</span>
          <div class="p-2 rounded-lg bg-blue-50 text-blue-700">
            <Clock class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-blue-700">{{ stats.scheduled }}</span>
          <span class="text-xs text-blue-600 font-medium">future campaigns</span>
        </div>
      </div>

      <!-- Inactive Banners -->
      <div class="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-2xs hover:border-gray-300 transition-all">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Inactive / Expired</span>
          <div class="p-2 rounded-lg bg-gray-100 text-gray-700">
            <XCircle class="w-5 h-5" />
          </div>
        </div>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-gray-700">{{ stats.inactive }}</span>
          <span class="text-xs text-[#6B7280]">paused / expired</span>
        </div>
      </div>
    </div>

    <!-- ── 3. Filter Bar & Search ────────────────────────────────────── -->
    <div class="bg-white border border-[#E5E7EB] rounded-xl p-4 shadow-2xs space-y-3">
      <div class="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <!-- Search Input -->
        <div class="relative flex-1">
          <Search class="w-4 h-4 text-[#6B7280] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by banner title, campaign name, or description..."
            class="w-full pl-10 pr-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#202124] placeholder-[#6B7280] focus:outline-none focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#202124]"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- City Filter -->
        <div class="flex items-center gap-2">
          <MapPin class="w-4 h-4 text-[#6B7280] shrink-0" />
          <select
            v-model="selectedCityFilter"
            @change="fetchBanners"
            class="px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#202124] focus:outline-none focus:border-[#800020] cursor-pointer"
          >
            <option value="ALL">All Cities (Nationwide)</option>
            <option v-for="c in cities" :key="c.uniqueId" :value="c.uniqueId">
              {{ c.name }}
            </option>
          </select>
        </div>

        <!-- Status Filter Tabs -->
        <div class="flex items-center gap-1 bg-[#F7F7F8] p-1 rounded-lg border border-[#E5E7EB] overflow-x-auto">
          <button
            v-for="st in [
              { key: 'ALL', label: 'All' },
              { key: 'ACTIVE', label: 'Active' },
              { key: 'SCHEDULED', label: 'Scheduled' },
              { key: 'EXPIRED', label: 'Expired' },
              { key: 'INACTIVE', label: 'Inactive' },
            ]"
            :key="st.key"
            type="button"
            @click="selectedStatusFilter = st.key; fetchBanners()"
            class="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap"
            :class="
              selectedStatusFilter === st.key
                ? 'bg-[#800020] text-white shadow-2xs'
                : 'text-[#6B7280] hover:text-[#202124] hover:bg-white'
            "
          >
            {{ st.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── 4. Banner Listing (Responsive Grid) ────────────────────────── -->
    <div v-if="isLoading && banners.length === 0" class="py-16 text-center">
      <RefreshCw class="w-8 h-8 text-[#800020] animate-spin mx-auto mb-3" />
      <p class="text-sm font-medium text-[#6B7280]">Loading promotional banners...</p>
    </div>

    <div
      v-else-if="filteredBanners.length === 0"
      class="bg-white border border-dashed border-[#E5E7EB] rounded-2xl p-12 text-center space-y-4"
    >
      <div class="w-16 h-16 rounded-full bg-[#F7F7F8] text-[#800020] mx-auto flex items-center justify-center">
        <ImageIcon class="w-8 h-8" />
      </div>
      <div>
        <h3 class="text-lg font-bold text-[#202124]">No Hero Banners Found</h3>
        <p class="text-sm text-[#6B7280] mt-1 max-w-md mx-auto">
          {{
            searchQuery || selectedCityFilter !== 'ALL' || selectedStatusFilter !== 'ALL'
              ? 'No banners match your active filter criteria. Try adjusting your search query or filters.'
              : 'Start promoting your services by creating the first 16:9 hero banner for the OmiBay customer app.'
          }}
        </p>
      </div>
      <button
        type="button"
        @click="openAddModal"
        class="inline-flex items-center gap-2 px-4 py-2 bg-[#800020] text-white text-sm font-semibold rounded-lg hover:bg-[#6b001a] transition-colors cursor-pointer"
      >
        <Plus class="w-4 h-4" />
        <span>Create First Banner</span>
      </button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="banner in filteredBanners"
        :key="banner.id"
        class="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden hover:shadow-md transition-shadow flex flex-col group"
      >
        <!-- 16:9 Banner Image Header -->
        <div class="aspect-video relative overflow-hidden bg-[#F7F7F8] border-b border-[#E5E7EB]">
          <img
            v-if="banner.imageUrl"
            :src="banner.imageUrl"
            :alt="banner.title"
            class="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
            loading="lazy"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-[#6B7280]">
            <ImageIcon class="w-10 h-10 opacity-30" />
          </div>

          <!-- Status Badge -->
          <div class="absolute top-3 left-3 flex items-center gap-1.5">
            <span
              v-if="banner.status === 'ACTIVE'"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              ACTIVE
            </span>
            <span
              v-else-if="banner.status === 'SCHEDULED'"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs"
            >
              <Clock class="w-3 h-3" />
              SCHEDULED
            </span>
            <span
              v-else-if="banner.status === 'EXPIRED'"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs"
            >
              <AlertTriangle class="w-3 h-3" />
              EXPIRED
            </span>
            <span
              v-else
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300 shadow-2xs"
            >
              <XCircle class="w-3 h-3" />
              INACTIVE
            </span>
          </div>

          <!-- Priority & City Badges -->
          <div class="absolute top-3 right-3 flex flex-col items-end gap-1.5">
            <span
              class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-white/95 text-[#202124] border border-[#E5E7EB] shadow-2xs backdrop-blur-xs"
            >
              #{{ banner.displayOrder || 1 }} Priority
            </span>
            <span
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-black/60 text-white backdrop-blur-xs"
            >
              <MapPin class="w-2.5 h-2.5" />
              {{ getCityName(banner.cityId) }}
            </span>
          </div>

          <!-- Quick Preview Overlay Trigger -->
          <div
            class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
          >
            <button
              type="button"
              @click="openPreview(banner)"
              class="px-3.5 py-1.5 bg-white text-[#202124] rounded-lg text-xs font-bold shadow-md hover:bg-[#F7F7F8] hover:text-[#800020] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Eye class="w-3.5 h-3.5" />
              Customer App Preview
            </button>
          </div>
        </div>

        <!-- Banner Card Body -->
        <div class="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div class="space-y-2">
            <!-- Campaign Tag -->
            <div v-if="banner.campaignName" class="flex items-center gap-1.5">
              <span
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#800020]/10 text-[#800020] border border-[#800020]/20"
              >
                <Tag class="w-3 h-3" />
                {{ banner.campaignName }}
              </span>
            </div>

            <!-- Title -->
            <h3 class="text-base font-bold text-[#202124] leading-snug line-clamp-1" :title="banner.title">
              {{ banner.title }}
            </h3>

            <!-- Description -->
            <p v-if="banner.description" class="text-xs text-[#6B7280] line-clamp-2 leading-relaxed">
              {{ banner.description }}
            </p>
          </div>

          <!-- Details & Scheduling Metadata -->
          <div class="bg-[#F7F7F8] rounded-lg p-3 text-xs space-y-1.5 border border-[#E5E7EB]">
            <div class="flex items-center justify-between text-[#6B7280]">
              <span class="flex items-center gap-1">
                <LinkIcon class="w-3 h-3 text-[#800020]" />
                Target:
              </span>
              <span class="font-semibold text-[#202124] max-w-[65%] truncate text-right">
                {{ banner.redirectType }}: {{ banner.link || 'None' }}
              </span>
            </div>

            <div class="flex items-center justify-between text-[#6B7280]">
              <span class="flex items-center gap-1">
                <Calendar class="w-3 h-3 text-[#6B7280]" />
                Timeline:
              </span>
              <span class="font-medium text-[#202124] text-right truncate">
                {{ banner.startDate ? formatDate(banner.startDate) : 'Immediate' }} →
                {{ banner.expireAt ? formatDate(banner.expireAt) : 'No expiry' }}
              </span>
            </div>

            <div v-if="banner.updatedAt" class="flex items-center justify-between text-[#6B7280] pt-1 border-t border-[#E5E7EB]">
              <span>Last Updated:</span>
              <span class="text-[#6B7280]">{{ formatDate(banner.updatedAt) }}</span>
            </div>
          </div>

          <!-- Card Actions Toolbar -->
          <div class="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
            <!-- Status Toggle Switch -->
            <div class="flex items-center gap-2">
              <Toggle
                :modelValue="banner.isActive"
                @update:modelValue="toggleStatus(banner)"
              />
              <span class="text-xs font-medium text-[#6B7280]">
                {{ banner.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-1">
              <button
                type="button"
                @click="openPreview(banner)"
                class="p-2 text-[#6B7280] hover:text-[#800020] hover:bg-[#F7F7F8] rounded-lg transition-colors cursor-pointer"
                title="Customer App Preview"
              >
                <Eye class="w-4 h-4" />
              </button>

              <button
                type="button"
                @click="openEditModal(banner)"
                class="p-2 text-[#6B7280] hover:text-[#800020] hover:bg-[#F7F7F8] rounded-lg transition-colors cursor-pointer"
                title="Edit Banner"
              >
                <Edit class="w-4 h-4" />
              </button>

              <button
                type="button"
                @click="promptDelete(banner)"
                class="p-2 text-[#6B7280] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Delete Banner"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 5. Add / Edit Banner Form (Popup Modal) ────────────────────── -->
    <Popup
      v-model="isFormModalOpen"
      :title="isEditMode ? 'Edit Hero Banner' : 'Create New Hero Banner'"
      size="xl"
    >
      <form @submit.prevent="handleFormSubmit" class="space-y-6">
        <!-- Section 1: Basic Information -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-[#E5E7EB]">
            <span class="w-2 h-2 rounded-full bg-[#800020]"></span>
            <h4 class="text-xs font-bold uppercase tracking-wider text-[#202124]">
              01. Basic Information
            </h4>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Banner Title -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-[#202124]">
                Banner Title <span class="text-red-500">*</span>
              </label>
              <input
                v-model="formTitle"
                type="text"
                required
                placeholder="e.g., Summer AC Deep Cleaning Festival"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#202124] focus:outline-none focus:border-[#800020]"
              />
            </div>

            <!-- Campaign Name -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-[#202124]">
                Campaign Name
              </label>
              <input
                v-model="formCampaign"
                type="text"
                placeholder="e.g., Summer Cooling Mega Fest 2026"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#202124] focus:outline-none focus:border-[#800020]"
              />
            </div>

            <!-- Target City -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-[#202124]">
                Target City
              </label>
              <select
                v-model="formCityId"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#202124] focus:outline-none focus:border-[#800020] cursor-pointer"
              >
                <option value="ALL">All Cities (Nationwide)</option>
                <option v-for="c in cities" :key="c.uniqueId" :value="c.uniqueId">
                  {{ c.name }}
                </option>
              </select>
            </div>

            <!-- Display Priority / Order -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-[#202124]">
                Display Order / Priority (1 is first)
              </label>
              <input
                v-model.number="formDisplayOrder"
                type="number"
                min="1"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#202124] focus:outline-none focus:border-[#800020]"
              />
            </div>

            <!-- Description -->
            <div class="space-y-1.5 md:col-span-2">
              <label class="block text-xs font-semibold text-[#202124]">
                Banner Description (Optional)
              </label>
              <textarea
                v-model="formDescription"
                rows="2"
                placeholder="Provide internal notes or marketing subtitle..."
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#202124] focus:outline-none focus:border-[#800020]"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Section 2: 16:9 Image Upload & Specifications -->
        <div class="space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-[#800020]"></span>
              <h4 class="text-xs font-bold uppercase tracking-wider text-[#202124]">
                02. 16:9 Hero Image Upload
              </h4>
            </div>
            <span class="text-xs font-semibold text-[#800020] bg-[#800020]/10 px-2 py-0.5 rounded">
              Mandatory 16:9 Ratio
            </span>
          </div>

          <!-- Drag & Drop / Upload Zone -->
          <div
            v-if="!imagePreviewUrl"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onFileDrop"
            class="border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer relative"
            :class="
              isDragging
                ? 'border-[#800020] bg-[#800020]/5'
                : 'border-[#E5E7EB] hover:border-[#800020]/50 bg-[#F7F7F8]/50'
            "
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              @change="onFileSelect"
              class="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div class="space-y-2 pointer-events-none">
              <div class="w-12 h-12 rounded-full bg-white border border-[#E5E7EB] text-[#800020] mx-auto flex items-center justify-center shadow-2xs">
                <UploadCloud class="w-6 h-6" />
              </div>
              <div>
                <p class="text-sm font-bold text-[#202124]">
                  Click to upload or drag & drop banner image
                </p>
                <p class="text-xs text-[#6B7280] mt-1">
                  Mandatory aspect ratio: <strong>16:9</strong> | Recommended: <strong>1920 × 1080 px</strong>
                </p>
                <p class="text-[11px] text-[#6B7280]">
                  Supported: JPG, JPEG, PNG, WebP (Images > 1.5MB automatically compressed)
                </p>
              </div>
            </div>
          </div>

          <!-- Image Preview & Validation Information -->
          <div v-else class="space-y-3">
            <div class="aspect-video relative rounded-xl overflow-hidden border border-[#E5E7EB] bg-[#F7F7F8] shadow-inner group">
              <img
                :src="imagePreviewUrl"
                alt="Banner Preview"
                class="w-full h-full object-cover"
              />
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <label
                  class="px-3.5 py-1.5 bg-white text-[#202124] rounded-lg text-xs font-bold hover:bg-[#F7F7F8] hover:text-[#800020] transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <UploadCloud class="w-3.5 h-3.5" />
                  Replace Image
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    @change="onFileSelect"
                    class="hidden"
                  />
                </label>
                <button
                  type="button"
                  @click="removeImage"
                  class="px-3.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                  Remove
                </button>
              </div>
            </div>

            <!-- Dimension / Aspect Ratio Feedback -->
            <div
              v-if="imageDimensions"
              class="flex items-center justify-between text-xs px-3 py-2 bg-[#F7F7F8] rounded-lg border border-[#E5E7EB]"
            >
              <span class="text-[#6B7280]">
                Dimensions: <strong>{{ imageDimensions.width }} × {{ imageDimensions.height }} px</strong>
                (Aspect: <strong>{{ imageDimensions.ratio.toFixed(2) }}:1</strong>)
              </span>
              <span
                v-if="!imageValidationWarning"
                class="inline-flex items-center gap-1 text-emerald-700 font-semibold"
              >
                <Check class="w-3.5 h-3.5 stroke-[3]" />
                Optimal 16:9 Ratio
              </span>
            </div>

            <!-- Informative Warning Alert if not 16:9 -->
            <div
              v-if="imageValidationWarning"
              class="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs"
            >
              <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span class="font-bold">Aspect Ratio Alert:</span>
                <p class="mt-0.5">{{ imageValidationWarning }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 3: Destination / Redirect Navigation -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-[#E5E7EB]">
            <span class="w-2 h-2 rounded-full bg-[#800020]"></span>
            <h4 class="text-xs font-bold uppercase tracking-wider text-[#202124]">
              03. Destination & Tap Redirection
            </h4>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Redirect Type Selector -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-[#202124]">
                Destination Type
              </label>
              <select
                v-model="formRedirectType"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#202124] focus:outline-none focus:border-[#800020] cursor-pointer"
              >
                <option value="SERVICE_CATEGORY">Service Category</option>
                <option value="SERVICE_SUBCATEGORY">Service Subcategory</option>
                <option value="SERVICE_PROBLEM">Specific Service / Problem</option>
                <option value="OFFER_COUPON">Promotional Coupon / Offer</option>
                <option value="INTERNAL_SCREEN">Internal Customer App Screen</option>
                <option value="CUSTOM_URL">Custom URL / External Link</option>
              </select>
            </div>

            <!-- Conditional Destination Inputs -->
            <!-- Service Category Picker -->
            <div v-if="formRedirectType === 'SERVICE_CATEGORY'" class="space-y-1.5">
              <label class="block text-xs font-semibold text-[#202124]">
                Select Category
              </label>
              <select
                v-model="formSelectedCategoryId"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#202124] focus:outline-none focus:border-[#800020] cursor-pointer"
              >
                <option v-for="t in serviceTypes" :key="t.uniqueId" :value="t.uniqueId">
                  {{ t.name }}
                </option>
              </select>
            </div>

            <!-- Internal Screen Picker -->
            <div v-else-if="formRedirectType === 'INTERNAL_SCREEN'" class="space-y-1.5">
              <label class="block text-xs font-semibold text-[#202124]">
                Select Target App Screen
              </label>
              <select
                v-model="formSelectedScreen"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#202124] focus:outline-none focus:border-[#800020] cursor-pointer"
              >
                <option v-for="s in internalScreens" :key="s.value" :value="s.value">
                  {{ s.label }}
                </option>
              </select>
            </div>

            <!-- Generic Link / Code / URL Input -->
            <div v-else class="space-y-1.5">
              <label class="block text-xs font-semibold text-[#202124]">
                {{
                  formRedirectType === 'OFFER_COUPON'
                    ? 'Coupon Code (e.g., WELCOME50)'
                    : formRedirectType === 'CUSTOM_URL'
                    ? 'Target URL (e.g., https://...)'
                    : 'Target Identifier / Deep Link'
                }}
              </label>
              <input
                v-model="formLink"
                type="text"
                placeholder="Enter destination value..."
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#202124] focus:outline-none focus:border-[#800020]"
              />
            </div>
          </div>
        </div>

        <!-- Section 4: Display Scheduling & Active Status -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-[#E5E7EB]">
            <span class="w-2 h-2 rounded-full bg-[#800020]"></span>
            <h4 class="text-xs font-bold uppercase tracking-wider text-[#202124]">
              04. Display Scheduling & Lifecycle
            </h4>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Start Date & Time -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-[#202124]">
                Start Date & Time (Leave blank for immediate)
              </label>
              <input
                v-model="formStartDate"
                type="datetime-local"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#202124] focus:outline-none focus:border-[#800020]"
              />
            </div>

            <!-- End Date & Time (Expire At) -->
            <div class="space-y-1.5">
              <label class="block text-xs font-semibold text-[#202124]">
                End Date & Time (Leave blank for no expiration)
              </label>
              <input
                v-model="formExpireAt"
                type="datetime-local"
                class="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm text-[#202124] focus:outline-none focus:border-[#800020]"
              />
            </div>

            <!-- Active Status Toggle -->
            <div class="md:col-span-2 flex items-center justify-between p-3 rounded-lg bg-[#F7F7F8] border border-[#E5E7EB]">
              <div>
                <span class="text-xs font-bold text-[#202124] block">Activate Banner</span>
                <span class="text-xs text-[#6B7280]">
                  When enabled and within valid date range, banner will appear on the customer app.
                </span>
              </div>
              <Toggle v-model="formIsActive" />
            </div>
          </div>
        </div>

        <!-- Section 5: Real-time Live Preview Inside Form -->
        <div v-if="imagePreviewUrl" class="space-y-3 pt-2 border-t border-[#E5E7EB]">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-[#202124] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles class="w-3.5 h-3.5 text-[#800020]" />
              Real-time In-App Live Appearance
            </span>
            <span class="text-[11px] text-[#6B7280]">Customer mobile perspective</span>
          </div>

          <div class="max-w-md mx-auto bg-white rounded-2xl border border-[#E5E7EB] p-4 shadow-sm space-y-3">
            <div class="aspect-video relative rounded-2xl overflow-hidden shadow-sm border border-black/5">
              <img :src="imagePreviewUrl" alt="Live Preview" class="w-full h-full object-cover" />
              <div v-if="formCampaign" class="absolute top-2.5 left-2.5">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#800020] text-white shadow-xs">
                  {{ formCampaign }}
                </span>
              </div>
              <div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                <span class="w-4 h-1.5 rounded-full bg-[#800020]"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-white/70"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-white/70"></span>
              </div>
            </div>
            <div class="text-center">
              <p class="text-xs font-bold text-[#202124]">{{ formTitle || 'Banner Title' }}</p>
              <p class="text-[11px] text-[#6B7280] mt-0.5">
                Tapping redirects to: {{ formRedirectType }}
              </p>
            </div>
          </div>
        </div>

        <!-- Form Action Buttons -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
          <button
            type="button"
            @click="isFormModalOpen = false"
            class="px-4 py-2 bg-white border border-[#E5E7EB] text-[#202124] rounded-lg text-sm font-medium hover:bg-[#F7F7F8] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isSubmitting || isCompressing"
            class="inline-flex items-center gap-2 px-5 py-2 bg-[#800020] text-white rounded-lg text-sm font-semibold hover:bg-[#6b001a] transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw v-if="isSubmitting" class="w-4 h-4 animate-spin" />
            <span>{{ isEditMode ? 'Update Banner' : 'Publish Banner' }}</span>
          </button>
        </div>
      </form>
    </Popup>

    <!-- ── 6. Full Customer App Live Preview Modal ────────────────────── -->
    <Popup
      v-model="isPreviewModalOpen"
      title="Customer App Live Preview"
      size="xl"
    >
      <div v-if="previewBanner" class="space-y-6">
        <!-- Device Frame Selector -->
        <div class="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
          <div>
            <h4 class="text-sm font-bold text-[#202124]">{{ previewBanner.title }}</h4>
            <p class="text-xs text-[#6B7280]">
              Showing how this banner displays to customers on the OmiBay home screen.
            </p>
          </div>

          <div class="flex items-center gap-1 bg-[#F7F7F8] p-1 rounded-lg border border-[#E5E7EB]">
            <button
              type="button"
              @click="previewDeviceMode = 'mobile'"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer"
              :class="
                previewDeviceMode === 'mobile'
                  ? 'bg-white text-[#800020] shadow-xs'
                  : 'text-[#6B7280] hover:text-[#202124]'
              "
            >
              <Smartphone class="w-3.5 h-3.5" />
              Mobile (iPhone)
            </button>
            <button
              type="button"
              @click="previewDeviceMode = 'tablet'"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer"
              :class="
                previewDeviceMode === 'tablet'
                  ? 'bg-white text-[#800020] shadow-xs'
                  : 'text-[#6B7280] hover:text-[#202124]'
              "
            >
              <Tablet class="w-3.5 h-3.5" />
              Tablet (iPad)
            </button>
          </div>
        </div>

        <!-- Realistic Device Viewframe -->
        <div class="flex justify-center bg-[#F7F7F8] rounded-2xl p-6 border border-[#E5E7EB] overflow-x-auto">
          <div
            class="bg-white rounded-[36px] shadow-2xl border-4 border-gray-900 overflow-hidden flex flex-col transition-all duration-300 relative"
            :class="previewDeviceMode === 'mobile' ? 'w-[360px] min-h-[640px]' : 'w-[520px] min-h-[680px]'"
          >
            <!-- Top Mobile Status Bar -->
            <div class="px-6 pt-3 pb-2 flex items-center justify-between text-[11px] font-semibold text-gray-900">
              <span>9:41</span>
              <!-- Dynamic Island Pill -->
              <div class="w-20 h-4 bg-gray-900 rounded-full mx-auto"></div>
              <div class="flex items-center gap-1.5 text-gray-800">
                <span class="text-[10px]">5G</span>
                <span class="w-4 h-2.5 border border-gray-900 rounded-xs relative inline-block">
                  <span class="absolute inset-0.5 bg-gray-900"></span>
                </span>
              </div>
            </div>

            <!-- Customer App Top Header Bar -->
            <div class="px-4 py-2 flex items-center justify-between border-b border-gray-100">
              <div class="flex items-center gap-2">
                <span class="text-sm font-extrabold text-[#800020] tracking-tight">OMIBAY</span>
                <div class="flex items-center gap-1 text-[11px] text-gray-600 font-medium">
                  <MapPin class="w-3 h-3 text-[#800020]" />
                  <span>{{ getCityName(previewBanner.cityId) }}</span>
                  <ChevronDown class="w-3 h-3 text-gray-400" />
                </div>
              </div>
              <div class="flex items-center gap-2.5">
                <span class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 text-xs">
                  🔔
                </span>
                <span class="w-7 h-7 rounded-full bg-[#800020]/10 text-[#800020] flex items-center justify-center text-xs font-bold">
                  🛒
                </span>
              </div>
            </div>

            <!-- Customer App Search Bar -->
            <div class="px-4 py-2.5">
              <div class="bg-gray-100/80 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-gray-500">
                <Search class="w-3.5 h-3.5 text-gray-400" />
                <span>Search for AC repair, deep cleaning...</span>
              </div>
            </div>

            <!-- ── HERO BANNER CAROUSEL PLACEMENT (16:9) ── -->
            <div class="px-4 py-1.5">
              <div class="aspect-video relative rounded-2xl overflow-hidden shadow-md border border-black/5 bg-gray-100 group">
                <img
                  v-if="previewBanner.imageUrl"
                  :src="previewBanner.imageUrl"
                  :alt="previewBanner.title"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                  <ImageIcon class="w-10 h-10 opacity-30" />
                </div>

                <!-- Campaign Badge Overlay -->
                <div v-if="previewBanner.campaignName" class="absolute top-3 left-3">
                  <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#800020] text-white shadow-xs">
                    {{ previewBanner.campaignName }}
                  </span>
                </div>

                <!-- Carousel Dots Indicator (active in maroon) -->
                <div class="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/30 backdrop-blur-xs px-2 py-1 rounded-full">
                  <span class="w-4 h-1.5 rounded-full bg-[#800020]"></span>
                  <span class="w-1.5 h-1.5 rounded-full bg-white/70"></span>
                  <span class="w-1.5 h-1.5 rounded-full bg-white/70"></span>
                  <span class="w-1.5 h-1.5 rounded-full bg-white/70"></span>
                </div>
              </div>
            </div>

            <!-- Simulated Quick Categories Below Banner -->
            <div class="px-4 py-3 space-y-2">
              <div class="flex items-center justify-between text-xs font-bold text-gray-900">
                <span>Popular Services</span>
                <span class="text-[11px] text-[#800020] font-semibold">View All</span>
              </div>
              <div class="grid grid-cols-4 gap-2 text-center text-[10px] text-gray-700">
                <div class="p-2 rounded-xl bg-gray-50 flex flex-col items-center gap-1">
                  <span class="text-base">❄️</span>
                  <span>AC Repair</span>
                </div>
                <div class="p-2 rounded-xl bg-gray-50 flex flex-col items-center gap-1">
                  <span class="text-base">⚡</span>
                  <span>Electrician</span>
                </div>
                <div class="p-2 rounded-xl bg-gray-50 flex flex-col items-center gap-1">
                  <span class="text-base">🧹</span>
                  <span>Cleaning</span>
                </div>
                <div class="p-2 rounded-xl bg-gray-50 flex flex-col items-center gap-1">
                  <span class="text-base">🎨</span>
                  <span>Painting</span>
                </div>
              </div>
            </div>

            <!-- Simulated Bottom Navigation Bar -->
            <div class="mt-auto border-t border-gray-100 px-4 py-2.5 bg-white flex items-center justify-around text-[10px] text-gray-500 font-medium">
              <div class="flex flex-col items-center text-[#800020] font-bold">
                <span>🏠</span>
                <span>Home</span>
              </div>
              <div class="flex flex-col items-center">
                <span>📋</span>
                <span>Bookings</span>
              </div>
              <div class="flex flex-col items-center">
                <span>👛</span>
                <span>Wallet</span>
              </div>
              <div class="flex flex-col items-center">
                <span>🎁</span>
                <span>Rewards</span>
              </div>
              <div class="flex flex-col items-center">
                <span>👤</span>
                <span>Account</span>
              </div>
            </div>

            <!-- iPhone Home Indicator Bar -->
            <div class="pb-1.5 flex justify-center bg-white">
              <div class="w-32 h-1 bg-gray-900 rounded-full"></div>
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <button
            type="button"
            @click="isPreviewModalOpen = false"
            class="px-4 py-2 bg-white border border-[#E5E7EB] text-[#202124] rounded-lg text-sm font-medium hover:bg-[#F7F7F8] transition-colors cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </Popup>

    <!-- ── 7. Delete Confirmation Dialog ─────────────────────────────── -->
    <Popup
      v-model="isDeleteModalOpen"
      title="Delete Hero Banner"
      size="sm"
    >
      <div v-if="bannerToDelete" class="space-y-4">
        <div class="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <Trash2 class="w-6 h-6" />
        </div>
        <div class="text-center">
          <h4 class="text-base font-bold text-[#202124]">
            Delete "{{ bannerToDelete.title }}"?
          </h4>
          <p class="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
            This action will permanently delete the hero banner from the catalog and purge its image from Cloudinary storage. Customers will no longer see this promotional card.
          </p>
        </div>

        <div class="flex items-center justify-center gap-3 pt-3">
          <button
            type="button"
            @click="isDeleteModalOpen = false"
            class="px-4 py-2 bg-white border border-[#E5E7EB] text-[#202124] rounded-lg text-sm font-medium hover:bg-[#F7F7F8] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="confirmDelete"
            :disabled="isSubmitting"
            class="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw v-if="isSubmitting" class="w-4 h-4 animate-spin" />
            <span>Confirm Delete</span>
          </button>
        </div>
      </div>
    </Popup>
  </div>
</template>
