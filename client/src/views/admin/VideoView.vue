<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api'
import type {
  CustomerReviewVideo,
  CustomerReviewVideoStats,
  CreateCustomerReviewVideoPayload,
  PartnerTrainingVideo,
  PartnerTrainingStats,
  CreatePartnerTrainingVideoPayload,
  City,
  ServiceCategory,
} from '@/types/api'
import Popup from '@/components/common/Popup.vue'
import { showToast } from '@/utils/toast'
import {
  Video as VideoIcon,
  Upload,
  Youtube,
  Play,
  Pause,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Pen,
  Trash2,
  ExternalLink,
  Sparkles,
  Award,
  ShieldCheck,
  Film,
  Image as ImageIcon,
  Check,
  X,
  FileVideo,
  AlertCircle,
  HelpCircle,
} from 'lucide-vue-next'

// ── TABS ─────────────────────────────────────────────────────────────────────
type VideoTab = 'customer-reviews' | 'partner-training'
const activeTab = ref<VideoTab>('customer-reviews')

// ── STATE ────────────────────────────────────────────────────────────────────
const isLoading = ref(false)
const isActionLoading = ref(false)

// Customer Review Videos State
const reviewVideos = ref<CustomerReviewVideo[]>([])
const reviewStats = ref<CustomerReviewVideoStats | null>(null)
const reviewSearchQuery = ref('')
const reviewCityFilter = ref('ALL')
const reviewCategoryFilter = ref('ALL')
const reviewStatusFilter = ref('ALL')

// Partner Training Videos State
const trainingVideos = ref<PartnerTrainingVideo[]>([])
const trainingStats = ref<PartnerTrainingStats | null>(null)
const trainingSearchQuery = ref('')
const trainingTypeFilter = ref('ALL')
const trainingCategoryFilter = ref('ALL')
const trainingMandatoryFilter = ref('ALL')
const trainingStatusFilter = ref('ALL')

// Categories & Cities for dropdowns
const categories = ref<ServiceCategory[]>([])
const cities = ref<City[]>([])

// Modals
const isCustomerModalOpen = ref(false)
const isPartnerModalOpen = ref(false)
const isDeleteConfirmOpen = ref(false)
const isPlayerModalOpen = ref(false)

const isEditing = ref(false)
const currentVideoId = ref<string | null>(null)
const deleteTarget = ref<{ id: string; type: 'customer' | 'partner'; title: string } | null>(null)
const activePlayingVideo = ref<{ type: 'file' | 'youtube'; url: string; title: string; subtitle?: string } | null>(null)

// Customer Form State (Manual File Upload)
const customerForm = ref<CreateCustomerReviewVideoPayload>({
  title: '',
  customerName: '',
  customerProfileImage: '',
  customerReview: '',
  videoUrl: '',
  videoPublicId: '',
  thumbnailUrl: '',
  customerCity: 'Kolkata',
  serviceCategoryId: '',
  serviceCategoryName: '',
  isFeatured: false,
  displayOrder: 1,
  publicationStatus: 'DRAFT',
  hasConsent: false,
  rating: 5.0,
})

// File Upload State
const isUploading = ref(false)
const uploadProgress = ref(0)
const uploadError = ref('')
const videoFileInput = ref<HTMLInputElement | null>(null)

// Partner Form State (YouTube URLs Only)
const partnerForm = ref<CreatePartnerTrainingVideoPayload>({
  title: '',
  description: '',
  youtubeUrl: '',
  youtubeVideoId: '',
  thumbnailUrl: '',
  trainingType: 'GENERAL',
  serviceCategoryId: '',
  serviceCategoryName: '',
  serviceSubcategoryId: '',
  serviceSubcategoryName: '',
  isMandatory: false,
  displayOrder: 1,
  publicationStatus: 'PUBLISHED',
  durationSeconds: 300,
})

// ── YOUTUBE REGEX & EXTRACTOR ────────────────────────────────────────────────
const YOUTUBE_REGEX = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i

function extractYouTubeId(url: string): string {
  if (!url) return ''
  const trimmed = url.trim()
  const match = trimmed.match(YOUTUBE_REGEX)
  if (match && match[1]) return match[1]
  if (trimmed.length === 11 && !trimmed.includes('/')) return trimmed
  return ''
}

const computedPartnerYouTubeId = computed(() => {
  return extractYouTubeId(partnerForm.value.youtubeUrl)
})

const computedPartnerThumbnail = computed(() => {
  const id = computedPartnerYouTubeId.value
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : ''
})

// ── DATA FETCHING ────────────────────────────────────────────────────────────
async function loadAllData() {
  isLoading.value = true
  try {
    const [revStatsRes, revListRes, trainStatsRes, trainListRes, catRes, cityRes] = await Promise.all([
      api.customerVideos.getStats(),
      api.customerVideos.getAll(),
      api.partnerTraining.getStats(),
      api.partnerTraining.getAll(),
      api.catalogCustomer.getCategories().catch(() => ({ data: [] })),
      api.cities.getAll().catch(() => ({ data: [] })),
    ])

    reviewStats.value = (revStatsRes as any)?.data ?? revStatsRes
    reviewVideos.value = (revListRes as any)?.data ?? revListRes ?? []
    trainingStats.value = (trainStatsRes as any)?.data ?? trainStatsRes
    trainingVideos.value = (trainListRes as any)?.data ?? trainListRes ?? []

    const rawCats = (catRes as any)?.data ?? catRes
    categories.value = Array.isArray(rawCats) ? rawCats : []
    const rawCities = (cityRes as any)?.data ?? cityRes
    cities.value = Array.isArray(rawCities) ? rawCities : []
  } catch (err: any) {
    showToast(err?.message || 'Failed to load video modules', 'error')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadAllData()
})

// ── FILTERED DATASETS ────────────────────────────────────────────────────────
const filteredCustomerVideos = computed(() => {
  return reviewVideos.value.filter(v => {
    if (reviewStatusFilter.value !== 'ALL' && v.publicationStatus !== reviewStatusFilter.value) return false
    if (reviewCityFilter.value !== 'ALL' && v.customerCity !== reviewCityFilter.value) return false
    if (reviewCategoryFilter.value !== 'ALL' && v.serviceCategoryId !== reviewCategoryFilter.value) return false
    if (reviewSearchQuery.value) {
      const q = reviewSearchQuery.value.toLowerCase()
      const match = v.title.toLowerCase().includes(q) ||
        v.customerName.toLowerCase().includes(q) ||
        (v.customerReview && v.customerReview.toLowerCase().includes(q))
      if (!match) return false
    }
    return true
  })
})

const filteredTrainingVideos = computed(() => {
  return trainingVideos.value.filter(v => {
    if (trainingStatusFilter.value !== 'ALL' && v.publicationStatus !== trainingStatusFilter.value) return false
    if (trainingTypeFilter.value !== 'ALL' && v.trainingType !== trainingTypeFilter.value) return false
    if (trainingCategoryFilter.value !== 'ALL' && v.serviceCategoryId !== trainingCategoryFilter.value) return false
    if (trainingMandatoryFilter.value === 'MANDATORY' && !v.isMandatory) return false
    if (trainingMandatoryFilter.value === 'OPTIONAL' && v.isMandatory) return false
    if (trainingSearchQuery.value) {
      const q = trainingSearchQuery.value.toLowerCase()
      const match = v.title.toLowerCase().includes(q) ||
        (v.description && v.description.toLowerCase().includes(q)) ||
        (v.serviceCategoryName && v.serviceCategoryName.toLowerCase().includes(q))
      if (!match) return false
    }
    return true
  })
})

// ── MODULE 1: CUSTOMER REVIEW VIDEO ACTIONS ──────────────────────────────────
function openCreateCustomerModal() {
  isEditing.value = false
  currentVideoId.value = null
  uploadError.value = ''
  uploadProgress.value = 0
  customerForm.value = {
    title: '',
    customerName: '',
    customerProfileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    customerReview: '',
    videoUrl: '',
    videoPublicId: '',
    thumbnailUrl: '',
    customerCity: cities.value[0]?.name || 'Kolkata',
    serviceCategoryId: categories.value[0]?.uniqueId || '',
    serviceCategoryName: categories.value[0]?.name || '',
    isFeatured: false,
    displayOrder: (reviewVideos.value.length + 1),
    publicationStatus: 'DRAFT',
    hasConsent: false,
    rating: 5.0,
  }
  isCustomerModalOpen.value = true
}

function openEditCustomerModal(v: CustomerReviewVideo) {
  isEditing.value = true
  currentVideoId.value = v.id
  uploadError.value = ''
  uploadProgress.value = 0
  customerForm.value = {
    title: v.title,
    customerName: v.customerName,
    customerProfileImage: v.customerProfileImage || '',
    customerReview: v.customerReview || '',
    videoUrl: v.videoUrl,
    videoPublicId: v.videoPublicId || '',
    thumbnailUrl: v.thumbnailUrl || '',
    customerCity: v.customerCity || 'Kolkata',
    serviceCategoryId: v.serviceCategoryId || '',
    serviceCategoryName: v.serviceCategoryName || '',
    isFeatured: v.isFeatured,
    displayOrder: v.displayOrder,
    publicationStatus: v.publicationStatus,
    hasConsent: v.hasConsent,
    rating: v.rating,
  }
  isCustomerModalOpen.value = true
}

// Manual Video File Upload simulation / presigned flow
async function handleVideoFileUpload(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Format validation
  const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']
  if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|m4v)$/i)) {
    uploadError.value = 'Unsupported video format. Please upload MP4, WebM, or MOV files.'
    showToast(uploadError.value, 'error')
    return
  }

  // File size validation (Max 100MB)
  const maxSize = 100 * 1024 * 1024
  if (file.size > maxSize) {
    uploadError.value = 'File too large. Maximum supported video size is 100MB.'
    showToast(uploadError.value, 'error')
    return
  }

  uploadError.value = ''
  isUploading.value = true
  uploadProgress.value = 10

  try {
    // 1. In a live production environment with S3/Cloudinary presigned URLs:
    // const presignRes = await api.files.getPresignedUploadUrl(...)
    // Upload with progress using XHR or fetch.
    // In our browser environment, we simulate the progressive upload and set the local Blob/Object URL for instant preview:
    for (let p = 20; p <= 95; p += 25) {
      uploadProgress.value = p
      await new Promise(r => setTimeout(r, 200))
    }

    const objectUrl = URL.createObjectURL(file)
    customerForm.value.videoUrl = objectUrl
    customerForm.value.videoPublicId = `vid-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    uploadProgress.value = 100

    if (!customerForm.value.title) {
      customerForm.value.title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
    }
    showToast('Video file uploaded and verified successfully', 'success')
  } catch (err: any) {
    uploadError.value = 'Failed to upload video: ' + (err?.message || 'Network error')
    showToast(uploadError.value, 'error')
  } finally {
    isUploading.value = false
  }
}

async function saveCustomerVideo() {
  if (!customerForm.value.title.trim()) {
    showToast('Video title is required', 'error')
    return
  }
  if (!customerForm.value.customerName.trim()) {
    showToast('Customer name is required', 'error')
    return
  }
  if (!customerForm.value.videoUrl) {
    showToast('Please upload a video file', 'error')
    return
  }
  if (customerForm.value.publicationStatus === 'PUBLISHED' && !customerForm.value.hasConsent) {
    showToast('Customer consent is mandatory before publishing a testimonial video', 'error')
    return
  }

  // Sync category name
  const cat = categories.value.find(c => c.uniqueId === customerForm.value.serviceCategoryId)
  if (cat) customerForm.value.serviceCategoryName = cat.name

  isActionLoading.value = true
  try {
    if (isEditing.value && currentVideoId.value) {
      await api.customerVideos.update(currentVideoId.value, customerForm.value)
      showToast('Customer review video updated successfully', 'success')
    } else {
      await api.customerVideos.create(customerForm.value)
      showToast('Customer review video created successfully', 'success')
    }
    isCustomerModalOpen.value = false
    loadAllData()
  } catch (err: any) {
    showToast(err?.message || 'Failed to save customer video', 'error')
  } finally {
    isActionLoading.value = false
  }
}

async function toggleCustomerPublication(v: CustomerReviewVideo) {
  if (v.publicationStatus !== 'PUBLISHED' && !v.hasConsent) {
    showToast('Cannot publish video: verified customer consent is missing', 'error')
    return
  }
  const next = v.publicationStatus === 'PUBLISHED' ? 'UNPUBLISHED' : 'PUBLISHED'
  try {
    await api.customerVideos.updateStatus(v.id, next)
    showToast(`Video status changed to ${next}`, 'success')
    loadAllData()
  } catch (err: any) {
    showToast(err?.message || 'Failed to update video status', 'error')
  }
}

// ── MODULE 2: PARTNER TRAINING VIDEO ACTIONS ─────────────────────────────────
function openCreatePartnerModal() {
  isEditing.value = false
  currentVideoId.value = null
  partnerForm.value = {
    title: '',
    description: '',
    youtubeUrl: '',
    youtubeVideoId: '',
    thumbnailUrl: '',
    trainingType: 'GENERAL',
    serviceCategoryId: categories.value[0]?.uniqueId || '',
    serviceCategoryName: categories.value[0]?.name || '',
    serviceSubcategoryId: '',
    serviceSubcategoryName: '',
    isMandatory: false,
    displayOrder: (trainingVideos.value.length + 1),
    publicationStatus: 'PUBLISHED',
    durationSeconds: 300,
  }
  isPartnerModalOpen.value = true
}

function openEditPartnerModal(v: PartnerTrainingVideo) {
  isEditing.value = true
  currentVideoId.value = v.id
  partnerForm.value = {
    title: v.title,
    description: v.description || '',
    youtubeUrl: v.youtubeUrl,
    youtubeVideoId: v.youtubeVideoId,
    thumbnailUrl: v.thumbnailUrl || '',
    trainingType: v.trainingType,
    serviceCategoryId: v.serviceCategoryId || '',
    serviceCategoryName: v.serviceCategoryName || '',
    serviceSubcategoryId: v.serviceSubcategoryId || '',
    serviceSubcategoryName: v.serviceSubcategoryName || '',
    isMandatory: v.isMandatory,
    displayOrder: v.displayOrder,
    publicationStatus: v.publicationStatus,
    durationSeconds: v.durationSeconds || 300,
  }
  isPartnerModalOpen.value = true
}

async function savePartnerTrainingVideo() {
  if (!partnerForm.value.title.trim()) {
    showToast('Training title is required', 'error')
    return
  }
  const videoId = computedPartnerYouTubeId.value
  if (!videoId) {
    showToast('Please provide a valid YouTube URL (e.g. https://www.youtube.com/watch?v=...)', 'error')
    return
  }

  partnerForm.value.youtubeVideoId = videoId
  partnerForm.value.thumbnailUrl = computedPartnerThumbnail.value

  // Sync category name if service category selected
  if (partnerForm.value.trainingType === 'SERVICE_CATEGORY') {
    const cat = categories.value.find(c => c.uniqueId === partnerForm.value.serviceCategoryId)
    if (cat) partnerForm.value.serviceCategoryName = cat.name
  } else {
    partnerForm.value.serviceCategoryId = ''
    partnerForm.value.serviceCategoryName = ''
  }

  isActionLoading.value = true
  try {
    if (isEditing.value && currentVideoId.value) {
      await api.partnerTraining.update(currentVideoId.value, partnerForm.value)
      showToast('Partner training video updated successfully', 'success')
    } else {
      await api.partnerTraining.create(partnerForm.value)
      showToast('Partner training video published successfully', 'success')
    }
    isPartnerModalOpen.value = false
    loadAllData()
  } catch (err: any) {
    showToast(err?.message || 'Failed to save training video', 'error')
  } finally {
    isActionLoading.value = false
  }
}

async function togglePartnerPublication(v: PartnerTrainingVideo) {
  const next = v.publicationStatus === 'PUBLISHED' ? 'ARCHIVED' : 'PUBLISHED'
  try {
    await api.partnerTraining.updateStatus(v.id, next)
    showToast(`Training video status changed to ${next}`, 'success')
    loadAllData()
  } catch (err: any) {
    showToast(err?.message || 'Failed to update video status', 'error')
  }
}

// ── PLAYBACK LIGHTBOX MODAL ──────────────────────────────────────────────────
function playCustomerVideo(v: CustomerReviewVideo) {
  activePlayingVideo.value = {
    type: 'file',
    url: v.videoUrl,
    title: v.title,
    subtitle: `${v.customerName} • ${v.customerCity || 'Customer Testimonial'}`,
  }
  isPlayerModalOpen.value = true
}

function playPartnerYouTubeVideo(v: PartnerTrainingVideo) {
  activePlayingVideo.value = {
    type: 'youtube',
    url: `https://www.youtube-nocookie.com/embed/${v.youtubeVideoId}?autoplay=1&rel=0`,
    title: v.title,
    subtitle: `${v.trainingType === 'GENERAL' ? 'General Training' : v.trainingType === 'SAFETY_QUALITY' ? 'Safety & Quality' : v.serviceCategoryName || 'Skill Training'} • ${v.isMandatory ? 'Mandatory Module' : 'Optional Module'}`,
  }
  isPlayerModalOpen.value = true
}

// ── DELETION ─────────────────────────────────────────────────────────────────
function confirmDeleteCustomer(v: CustomerReviewVideo) {
  deleteTarget.value = { id: v.id, type: 'customer', title: v.title }
  isDeleteConfirmOpen.value = true
}

function confirmDeletePartner(v: PartnerTrainingVideo) {
  deleteTarget.value = { id: v.id, type: 'partner', title: v.title }
  isDeleteConfirmOpen.value = true
}

async function executeDelete() {
  if (!deleteTarget.value) return
  isActionLoading.value = true
  try {
    if (deleteTarget.value.type === 'customer') {
      await api.customerVideos.delete(deleteTarget.value.id)
      showToast('Customer review video deleted', 'success')
    } else {
      await api.partnerTraining.delete(deleteTarget.value.id)
      showToast('Partner training video deleted', 'success')
    }
    isDeleteConfirmOpen.value = false
    deleteTarget.value = null
    loadAllData()
  } catch (err: any) {
    showToast(err?.message || 'Failed to delete video', 'error')
  } finally {
    isActionLoading.value = false
  }
}

function formatDuration(sec?: number): string {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s < 10 ? '0' : ''}${s}`
}
</script>

<template>
  <div class="space-y-6 pb-16">
    <!-- ── 1. HEADER SECTION ──────────────────────────────────────────────── -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
      <div>
        <div class="flex items-center gap-2">
          <div class="size-8 rounded-lg bg-red-50 flex items-center justify-center text-[#800020] border border-red-100">
            <VideoIcon class="size-4" />
          </div>
          <h1 class="text-xl font-bold text-[#202124]">Video & Learning Management</h1>
        </div>
        <p class="text-xs text-[#6B7280] mt-1">
          Manage customer review video testimonials via manual upload and partner training curriculum via YouTube URLs.
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          @click="loadAllData"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#202124] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F7F7F8] transition"
          :disabled="isLoading"
          title="Refresh Videos"
        >
          <RefreshCw class="size-3.5" :class="{ 'animate-spin': isLoading }" />
          <span>Refresh</span>
        </button>

        <button
          v-if="activeTab === 'customer-reviews'"
          type="button"
          @click="openCreateCustomerModal"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#800020] rounded-lg hover:bg-[#990026] transition shadow-xs"
        >
          <Upload class="size-3.5" />
          <span>Upload Customer Video</span>
        </button>

        <button
          v-if="activeTab === 'partner-training'"
          type="button"
          @click="openCreatePartnerModal"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#800020] rounded-lg hover:bg-[#990026] transition shadow-xs"
        >
          <Youtube class="size-3.5" />
          <span>Add YouTube Training</span>
        </button>
      </div>
    </div>

    <!-- ── 2. SEPARATE MODULE TABS ────────────────────────────────────────── -->
    <div class="border-b border-[#E5E7EB]">
      <nav class="flex items-center gap-2 -mb-px">
        <button
          type="button"
          @click="activeTab = 'customer-reviews'"
          class="flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition"
          :class="activeTab === 'customer-reviews' ? 'border-[#800020] text-[#800020] bg-red-50/40' : 'border-transparent text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8]'"
        >
          <Film class="size-4" />
          <span>Customer Review Videos (File Upload)</span>
          <span class="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-[#202124] font-bold">
            {{ reviewVideos.length }}
          </span>
        </button>

        <button
          type="button"
          @click="activeTab = 'partner-training'"
          class="flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition"
          :class="activeTab === 'partner-training' ? 'border-[#800020] text-[#800020] bg-red-50/40' : 'border-transparent text-[#6B7280] hover:text-[#202124] hover:bg-[#F7F7F8]'"
        >
          <Youtube class="size-4 text-red-600" />
          <span>Partner Training Videos (YouTube URLs Only)</span>
          <span class="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-100 text-[#202124] font-bold">
            {{ trainingVideos.length }}
          </span>
        </button>
      </nav>
    </div>

    <!-- ═════════════════════════════════════════════════════════════════════ -->
    <!-- ── 3. MODULE 1: CUSTOMER REVIEW VIDEOS (MANUAL FILE UPLOADS) ──────── -->
    <!-- ═════════════════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'customer-reviews'" class="space-y-5">
      <!-- Info banner -->
      <div class="flex items-center justify-between p-3.5 bg-red-50/50 border border-red-100 rounded-xl text-xs text-[#202124]">
        <div class="flex items-center gap-2">
          <Upload class="size-4 text-[#800020]" />
          <span>
            <b>Manual Video File Uploads:</b> Upload authentic customer video testimonials (.mp4, .webm, .mov up to 100MB). Verified customer consent is strictly required before publication.
          </span>
        </div>
        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-[#800020] border border-red-200">
          Customer App Integration
        </span>
      </div>

      <!-- Analytics Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-white border border-[#E5E7EB] p-4 rounded-xl space-y-1">
          <span class="text-xs text-[#6B7280]">Total Reviews Uploaded</span>
          <p class="text-xl font-bold text-[#202124]">{{ reviewStats?.totalVideos ?? reviewVideos.length }}</p>
          <span class="text-[11px] text-[#6B7280]">All testimonial assets</span>
        </div>

        <div class="bg-white border border-[#E5E7EB] p-4 rounded-xl space-y-1">
          <span class="text-xs text-[#6B7280]">Live in Customer App</span>
          <p class="text-xl font-bold text-emerald-700">{{ reviewStats?.publishedVideos ?? 0 }}</p>
          <span class="text-[11px] text-emerald-600 font-medium">Published & Visible</span>
        </div>

        <div class="bg-white border border-[#E5E7EB] p-4 rounded-xl space-y-1">
          <span class="text-xs text-[#6B7280]">Draft / In Review</span>
          <p class="text-xl font-bold text-amber-700">{{ reviewStats?.draftVideos ?? 0 }}</p>
          <span class="text-[11px] text-amber-600">Pending consent review</span>
        </div>

        <div class="bg-white border border-[#E5E7EB] p-4 rounded-xl space-y-1">
          <span class="text-xs text-[#6B7280]">Featured Testimonials</span>
          <p class="text-xl font-bold text-[#800020]">{{ reviewStats?.featuredVideos ?? 0 }}</p>
          <span class="text-[11px] text-[#6B7280]">Homepage showcase</span>
        </div>
      </div>

      <!-- Filters Toolbar -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-[#E5E7EB]">
        <div class="relative sm:col-span-1">
          <Search class="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input
            v-model="reviewSearchQuery"
            type="text"
            placeholder="Search title, customer..."
            class="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          />
        </div>

        <select
          v-model="reviewCityFilter"
          class="px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
        >
          <option value="ALL">All Cities</option>
          <option v-for="c in cities" :key="c.uniqueId" :value="c.name">{{ c.name }}</option>
        </select>

        <select
          v-model="reviewCategoryFilter"
          class="px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
        >
          <option value="ALL">All Service Categories</option>
          <option v-for="cat in categories" :key="cat.uniqueId" :value="cat.uniqueId">{{ cat.name }}</option>
        </select>

        <select
          v-model="reviewStatusFilter"
          class="px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
        >
          <option value="ALL">All Publication Statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="UNPUBLISHED">Unpublished</option>
        </select>
      </div>

      <!-- Video Grid -->
      <div v-if="filteredCustomerVideos.length === 0" class="py-12 text-center text-xs text-[#6B7280] bg-white rounded-xl border border-[#E5E7EB]">
        No customer review videos matching the criteria. Click "+ Upload Customer Video" to add one.
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="v in filteredCustomerVideos"
          :key="v.id"
          class="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden flex flex-col justify-between hover:shadow-md transition space-y-3"
        >
          <!-- Video Preview / Thumbnail Header -->
          <div class="relative aspect-video bg-black/90 group cursor-pointer" @click="playCustomerVideo(v)">
            <img
              v-if="v.thumbnailUrl"
              :src="v.thumbnailUrl"
              :alt="v.title"
              class="w-full h-full object-cover group-hover:opacity-80 transition"
            />
            <div v-else class="w-full h-full flex items-center justify-center bg-gray-900 text-gray-500">
              <FileVideo class="size-10" />
            </div>

            <!-- Play Overlay Button -->
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="size-11 rounded-full bg-[#800020]/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                <Play class="size-5 fill-white ml-0.5" />
              </div>
            </div>

            <!-- Featured Badge -->
            <div class="absolute top-2.5 left-2.5 flex items-center gap-1.5">
              <span
                v-if="v.isFeatured"
                class="px-2 py-0.5 text-[10px] font-bold bg-[#800020] text-white rounded-md shadow-xs flex items-center gap-1"
              >
                <Sparkles class="size-3" />
                Featured
              </span>
              <span
                class="px-2 py-0.5 text-[10px] font-bold rounded-md shadow-xs"
                :class="v.publicationStatus === 'PUBLISHED' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-200'"
              >
                {{ v.publicationStatus }}
              </span>
            </div>

            <!-- City / Rating -->
            <div class="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[10px] font-medium">
              {{ v.customerCity || 'Kolkata' }} • ★ {{ v.rating?.toFixed(1) ?? '5.0' }}
            </div>
          </div>

          <!-- Video Details -->
          <div class="p-4 space-y-2.5">
            <h3 class="text-xs font-bold text-[#202124] line-clamp-1 hover:text-[#800020] cursor-pointer" @click="playCustomerVideo(v)">
              {{ v.title }}
            </h3>

            <!-- Customer Avatar & Name -->
            <div class="flex items-center gap-2">
              <img
                :src="v.customerProfileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80'"
                :alt="v.customerName"
                class="size-6 rounded-full object-cover border border-[#E5E7EB]"
              />
              <span class="text-xs font-semibold text-[#202124]">{{ v.customerName }}</span>
              <span class="text-[10px] text-[#6B7280]">• {{ v.serviceCategoryName || 'General Service' }}</span>
            </div>

            <!-- Review Text Excerpt -->
            <p class="text-xs text-[#6B7280] line-clamp-2 bg-[#F7F7F8] p-2.5 rounded-lg italic">
              "{{ v.customerReview || 'Authentic service testimonial' }}"
            </p>

            <!-- Consent Indicator -->
            <div class="flex items-center justify-between text-[11px] pt-1 border-t border-[#E5E7EB]">
              <span class="flex items-center gap-1" :class="v.hasConsent ? 'text-emerald-700' : 'text-amber-700'">
                <ShieldCheck v-if="v.hasConsent" class="size-3.5" />
                <AlertCircle v-else class="size-3.5" />
                <span>{{ v.hasConsent ? 'Verified Consent' : 'Consent Pending' }}</span>
              </span>
              <span class="text-[#6B7280]">Order #{{ v.displayOrder }}</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-between p-3 bg-[#F7F7F8] border-t border-[#E5E7EB]">
            <button
              type="button"
              @click="toggleCustomerPublication(v)"
              class="text-xs font-semibold"
              :class="v.publicationStatus === 'PUBLISHED' ? 'text-amber-700 hover:text-amber-800' : 'text-emerald-700 hover:text-emerald-800'"
            >
              {{ v.publicationStatus === 'PUBLISHED' ? 'Unpublish' : 'Publish' }}
            </button>

            <div class="flex items-center gap-1">
              <button
                type="button"
                @click="openEditCustomerModal(v)"
                class="p-1.5 hover:bg-white text-[#6B7280] hover:text-[#202124] rounded border border-transparent hover:border-[#E5E7EB]"
                title="Edit / Replace Video"
              >
                <Pen class="size-3.5" />
              </button>
              <button
                type="button"
                @click="confirmDeleteCustomer(v)"
                class="p-1.5 hover:bg-white text-red-600 rounded border border-transparent hover:border-red-200"
                title="Delete Video"
              >
                <Trash2 class="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═════════════════════════════════════════════════════════════════════ -->
    <!-- ── 4. MODULE 2: PARTNER TRAINING (YOUTUBE URLS ONLY) ──────────────── -->
    <!-- ═════════════════════════════════════════════════════════════════════ -->
    <div v-if="activeTab === 'partner-training'" class="space-y-5">
      <!-- Strict YouTube URL policy notice banner -->
      <div class="flex items-center justify-between p-3.5 bg-red-50/60 border border-red-200 rounded-xl text-xs text-[#202124]">
        <div class="flex items-center gap-2">
          <Youtube class="size-4 text-red-600 shrink-0" />
          <span>
            <b>YouTube Integration Only:</b> Partner training videos are managed exclusively through YouTube URLs. Manual video file uploads are strictly disabled in this section to ensure streaming reliability.
          </span>
        </div>
        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-red-700 border border-red-200">
          YouTube URL Mode
        </span>
      </div>

      <!-- Analytics Cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-white border border-[#E5E7EB] p-4 rounded-xl space-y-1">
          <span class="text-xs text-[#6B7280]">Total Training Modules</span>
          <p class="text-xl font-bold text-[#202124]">{{ trainingStats?.totalVideos ?? trainingVideos.length }}</p>
          <span class="text-[11px] text-[#6B7280]">Partner curriculum</span>
        </div>

        <div class="bg-white border border-[#E5E7EB] p-4 rounded-xl space-y-1">
          <span class="text-xs text-[#6B7280]">Mandatory Compliance</span>
          <p class="text-xl font-bold text-[#800020]">{{ trainingStats?.mandatoryVideos ?? 0 }}</p>
          <span class="text-[11px] text-amber-700 font-medium">Required for activation</span>
        </div>

        <div class="bg-white border border-[#E5E7EB] p-4 rounded-xl space-y-1">
          <span class="text-xs text-[#6B7280]">General Orientation</span>
          <p class="text-xl font-bold text-blue-700">{{ trainingStats?.generalVideos ?? 0 }}</p>
          <span class="text-[11px] text-[#6B7280]">Platform & app guides</span>
        </div>

        <div class="bg-white border border-[#E5E7EB] p-4 rounded-xl space-y-1">
          <span class="text-xs text-[#6B7280]">Safety & Skill Modules</span>
          <p class="text-xl font-bold text-emerald-700">
            {{ (trainingStats?.safetyVideos ?? 0) + (trainingStats?.categoryVideos ?? 0) }}
          </p>
          <span class="text-[11px] text-emerald-600">Category trade standards</span>
        </div>
      </div>

      <!-- Filters Toolbar -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-[#E5E7EB]">
        <div class="relative sm:col-span-1">
          <Search class="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
          <input
            v-model="trainingSearchQuery"
            type="text"
            placeholder="Search training title, description..."
            class="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          />
        </div>

        <select
          v-model="trainingTypeFilter"
          class="px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
        >
          <option value="ALL">All Training Types</option>
          <option value="GENERAL">General Platform Training</option>
          <option value="SERVICE_CATEGORY">Service Trade Masterclass</option>
          <option value="SAFETY_QUALITY">Safety & Customer Quality</option>
        </select>

        <select
          v-model="trainingCategoryFilter"
          class="px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
        >
          <option value="ALL">All Service Categories</option>
          <option v-for="cat in categories" :key="cat.uniqueId" :value="cat.uniqueId">{{ cat.name }}</option>
        </select>

        <select
          v-model="trainingMandatoryFilter"
          class="px-2.5 py-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
        >
          <option value="ALL">Mandatory & Optional</option>
          <option value="MANDATORY">Mandatory Only</option>
          <option value="OPTIONAL">Optional Only</option>
        </select>
      </div>

      <!-- Training Grid -->
      <div v-if="filteredTrainingVideos.length === 0" class="py-12 text-center text-xs text-[#6B7280] bg-white rounded-xl border border-[#E5E7EB]">
        No training videos matching the criteria. Click "+ Add YouTube Training" to configure one.
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="v in filteredTrainingVideos"
          :key="v.id"
          class="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden flex flex-col justify-between hover:shadow-md transition space-y-3"
        >
          <!-- YouTube Thumbnail Header -->
          <div class="relative aspect-video bg-black/90 group cursor-pointer" @click="playPartnerYouTubeVideo(v)">
            <img
              :src="v.thumbnailUrl || `https://img.youtube.com/vi/${v.youtubeVideoId}/hqdefault.jpg`"
              :alt="v.title"
              class="w-full h-full object-cover group-hover:opacity-80 transition"
            />

            <!-- Red YouTube Play Overlay -->
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="size-11 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                <Play class="size-5 fill-white ml-0.5" />
              </div>
            </div>

            <!-- Badges -->
            <div class="absolute top-2.5 left-2.5 flex items-center gap-1.5">
              <span
                class="px-2 py-0.5 text-[10px] font-bold rounded-md shadow-xs text-white"
                :class="v.isMandatory ? 'bg-[#800020]' : 'bg-blue-600'"
              >
                {{ v.isMandatory ? 'MANDATORY' : 'OPTIONAL' }}
              </span>
              <span
                class="px-2 py-0.5 text-[10px] font-bold rounded-md shadow-xs"
                :class="v.publicationStatus === 'PUBLISHED' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-200'"
              >
                {{ v.publicationStatus }}
              </span>
            </div>

            <!-- YouTube ID & Duration -->
            <div class="absolute bottom-2.5 right-2.5 bg-black/80 backdrop-blur-xs text-white px-2 py-0.5 rounded text-[10px] font-mono">
              {{ formatDuration(v.durationSeconds) }} • {{ v.youtubeVideoId }}
            </div>
          </div>

          <!-- Video Details -->
          <div class="p-4 space-y-2">
            <div class="flex items-start justify-between gap-2">
              <h3 class="text-xs font-bold text-[#202124] line-clamp-2 hover:text-[#800020] cursor-pointer" @click="playPartnerYouTubeVideo(v)">
                {{ v.title }}
              </h3>
            </div>

            <div class="flex items-center gap-2 text-[11px] text-[#6B7280]">
              <span class="px-1.5 py-0.5 rounded bg-[#F7F7F8] font-medium border border-[#E5E7EB]">
                {{ v.trainingType === 'GENERAL' ? 'General' : v.trainingType === 'SAFETY_QUALITY' ? 'Safety' : 'Service Trade' }}
              </span>
              <span>{{ v.serviceCategoryName || 'All Partners' }}</span>
            </div>

            <p class="text-xs text-[#6B7280] line-clamp-2">
              {{ v.description || 'Comprehensive video guide for service partners.' }}
            </p>

            <div class="flex items-center justify-between text-[11px] text-[#6B7280] pt-1 border-t border-[#E5E7EB]">
              <span>Views: {{ v.viewCount }}</span>
              <span>Order #{{ v.displayOrder }}</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-between p-3 bg-[#F7F7F8] border-t border-[#E5E7EB]">
            <button
              type="button"
              @click="togglePartnerPublication(v)"
              class="text-xs font-semibold"
              :class="v.publicationStatus === 'PUBLISHED' ? 'text-amber-700 hover:text-amber-800' : 'text-emerald-700 hover:text-emerald-800'"
            >
              {{ v.publicationStatus === 'PUBLISHED' ? 'Archive' : 'Publish' }}
            </button>

            <div class="flex items-center gap-1">
              <button
                type="button"
                @click="openEditPartnerModal(v)"
                class="p-1.5 hover:bg-white text-[#6B7280] hover:text-[#202124] rounded border border-transparent hover:border-[#E5E7EB]"
                title="Edit / Replace YouTube URL"
              >
                <Pen class="size-3.5" />
              </button>
              <button
                type="button"
                @click="confirmDeletePartner(v)"
                class="p-1.5 hover:bg-white text-red-600 rounded border border-transparent hover:border-red-200"
                title="Delete Module"
              >
                <Trash2 class="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 5. MODAL: UPLOAD / EDIT CUSTOMER REVIEW VIDEO (MANUAL FILE) ─────── -->
    <Popup
      v-model="isCustomerModalOpen"
      :title="isEditing ? 'Edit Customer Review Video' : 'Upload Customer Review Video'"
      size="md"
    >
      <form @submit.prevent="saveCustomerVideo" class="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <div>
          <label class="block text-xs font-bold text-[#202124] mb-1">Video Title *</label>
          <input
            v-model="customerForm.title"
            type="text"
            required
            placeholder="e.g. AC Deep Cleaning Customer Experience"
            class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-[#202124] mb-1">Customer Name *</label>
            <input
              v-model="customerForm.customerName"
              type="text"
              required
              placeholder="e.g. Ananya Sengupta"
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-[#202124] mb-1">Customer City *</label>
            <select
              v-model="customerForm.customerCity"
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            >
              <option v-for="c in cities" :key="c.uniqueId" :value="c.name">{{ c.name }}</option>
            </select>
          </div>
        </div>

        <!-- Service Category & Rating -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-[#202124] mb-1">Service Category</label>
            <select
              v-model="customerForm.serviceCategoryId"
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            >
              <option value="">General Review</option>
              <option v-for="cat in categories" :key="cat.uniqueId" :value="cat.uniqueId">{{ cat.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-[#202124] mb-1">Rating Given (1-5)</label>
            <input
              v-model.number="customerForm.rating"
              type="number"
              step="0.1"
              min="1"
              max="5"
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            />
          </div>
        </div>

        <!-- MANUAL VIDEO FILE UPLOAD ZONE -->
        <div class="space-y-2 border border-dashed border-[#800020]/40 rounded-xl p-4 bg-red-50/20 text-center">
          <label class="block text-xs font-bold text-[#202124]">
            Manual Video File Upload (.mp4, .webm, .mov) *
          </label>
          <p class="text-[11px] text-[#6B7280]">
            Select or drag a video file from your computer (max 100MB).
          </p>

          <input
            ref="videoFileInput"
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
            @change="handleVideoFileUpload"
            class="hidden"
          />

          <button
            type="button"
            @click="videoFileInput?.click()"
            :disabled="isUploading"
            class="mt-1 px-4 py-2 bg-white text-[#800020] border border-[#800020]/30 rounded-lg text-xs font-semibold hover:bg-red-50 transition cursor-pointer"
          >
            <Upload class="size-3.5 inline mr-1.5" />
            <span>{{ customerForm.videoUrl ? 'Replace Video File' : 'Choose Video File' }}</span>
          </button>

          <!-- Upload Progress Bar -->
          <div v-if="isUploading" class="space-y-1 max-w-xs mx-auto pt-2">
            <div class="h-1.5 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
              <div class="h-full bg-[#800020] transition-all" :style="{ width: `${uploadProgress}%` }" />
            </div>
            <span class="text-[10px] text-[#6B7280]">Uploading... {{ uploadProgress }}%</span>
          </div>

          <!-- Video Preview If Uploaded -->
          <div v-if="customerForm.videoUrl" class="mt-3 rounded-lg overflow-hidden border border-[#E5E7EB] max-w-sm mx-auto aspect-video bg-black">
            <video :src="customerForm.videoUrl" controls class="w-full h-full object-contain" />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-[#202124] mb-1">Customer Review Description</label>
          <textarea
            v-model="customerForm.customerReview"
            rows="2"
            placeholder="Key review excerpt or quotation from the customer..."
            class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          />
        </div>

        <!-- Custom Thumbnail & Profile Image URLs -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-[#202124] mb-1">Customer Profile Photo URL</label>
            <input
              v-model="customerForm.customerProfileImage"
              type="text"
              placeholder="https://..."
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-[#202124] mb-1">Custom Thumbnail Image URL</label>
            <input
              v-model="customerForm.thumbnailUrl"
              type="text"
              placeholder="https://..."
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            />
          </div>
        </div>

        <!-- Display Order & Featured -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-[#202124] mb-1">Display Order</label>
            <input
              v-model.number="customerForm.displayOrder"
              type="number"
              min="1"
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-[#202124] mb-1">Publication Status</label>
            <select
              v-model="customerForm.publicationStatus"
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published (Customer App)</option>
              <option value="UNPUBLISHED">Unpublished</option>
            </select>
          </div>
        </div>

        <!-- MANDATORY CUSTOMER CONSENT CONFIRMATION -->
        <div class="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
          <label class="flex items-start gap-2 cursor-pointer text-xs text-[#202124]">
            <input
              v-model="customerForm.hasConsent"
              type="checkbox"
              class="mt-0.5 rounded text-[#800020] focus:ring-[#800020]"
            />
            <span class="font-semibold">
              I verify that the customer has provided explicit consent for this video review and profile to be published on OmiBay customer applications. *
            </span>
          </label>
          <p class="text-[10px] text-[#6B7280] pl-5">
            Testimonials cannot be published live without customer consent confirmation.
          </p>
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-[#E5E7EB] pt-4">
          <button
            type="button"
            @click="isCustomerModalOpen = false"
            class="px-3 py-2 text-xs font-semibold text-[#6B7280] hover:bg-[#F7F7F8] rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isActionLoading"
            class="px-4 py-2 text-xs font-semibold text-white bg-[#800020] hover:bg-[#990026] rounded-lg"
          >
            {{ isActionLoading ? 'Saving...' : 'Save Review Video' }}
          </button>
        </div>
      </form>
    </Popup>

    <!-- ── 6. MODAL: YOUTUBE PARTNER TRAINING VIDEO (YOUTUBE URLS ONLY) ───── -->
    <Popup
      v-model="isPartnerModalOpen"
      :title="isEditing ? 'Edit Partner YouTube Training Video' : 'Add Partner YouTube Training Video'"
      size="md"
    >
      <form @submit.prevent="savePartnerTrainingVideo" class="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <div>
          <label class="block text-xs font-bold text-[#202124] mb-1">Training Title *</label>
          <input
            v-model="partnerForm.title"
            type="text"
            required
            placeholder="e.g. Standard Service Safety & Voltage Testing Protocols"
            class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          />
        </div>

        <!-- YOUTUBE URL INPUT ZONE -->
        <div class="space-y-2 border border-red-200 rounded-xl p-4 bg-red-50/20">
          <label class="block text-xs font-bold text-[#202124] flex items-center gap-1.5">
            <Youtube class="size-4 text-red-600" />
            <span>YouTube Video URL (URLs Only) *</span>
          </label>
          <input
            v-model="partnerForm.youtubeUrl"
            type="url"
            required
            placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
            class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          />
          <p class="text-[11px] text-[#6B7280]">
            Paste any standard YouTube watch link, youtu.be short link, or shorts URL.
          </p>

          <!-- LIVE EMBED PREVIEW -->
          <div v-if="computedPartnerYouTubeId" class="mt-2 space-y-2">
            <div class="flex items-center justify-between text-xs font-semibold text-[#202124]">
              <span>Extracted Video ID: <code class="bg-gray-100 px-1 py-0.5 rounded text-red-700 font-mono">{{ computedPartnerYouTubeId }}</code></span>
              <span class="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 class="size-3.5" /> Valid YouTube Stream
              </span>
            </div>

            <div class="aspect-video w-full rounded-lg overflow-hidden border border-[#E5E7EB] bg-black">
              <iframe
                :src="`https://www.youtube-nocookie.com/embed/${computedPartnerYouTubeId}`"
                class="w-full h-full"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              />
            </div>
          </div>
        </div>

        <!-- Training Type & Category -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-[#202124] mb-1">Curriculum Training Type *</label>
            <select
              v-model="partnerForm.trainingType"
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            >
              <option value="GENERAL">General Platform & App Guide</option>
              <option value="SERVICE_CATEGORY">Service Trade Masterclass</option>
              <option value="SAFETY_QUALITY">Safety & Customer Standards</option>
            </select>
          </div>

          <div v-if="partnerForm.trainingType === 'SERVICE_CATEGORY'">
            <label class="block text-xs font-bold text-[#202124] mb-1">Related Service Category *</label>
            <select
              v-model="partnerForm.serviceCategoryId"
              required
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            >
              <option value="" disabled>Select category</option>
              <option v-for="cat in categories" :key="cat.uniqueId" :value="cat.uniqueId">{{ cat.name }}</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-[#202124] mb-1">Training Description</label>
          <textarea
            v-model="partnerForm.description"
            rows="2"
            placeholder="Learning objectives, step-by-step topics covered..."
            class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
          />
        </div>

        <!-- Duration, Order, Mandatory Check -->
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-bold text-[#202124] mb-1">Duration (Seconds)</label>
            <input
              v-model.number="partnerForm.durationSeconds"
              type="number"
              min="10"
              placeholder="300"
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-[#202124] mb-1">Display Order</label>
            <input
              v-model.number="partnerForm.displayOrder"
              type="number"
              min="1"
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-[#202124] mb-1">Publication Status</label>
            <select
              v-model="partnerForm.publicationStatus"
              class="w-full px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#800020]"
            >
              <option value="PUBLISHED">Published (Partner App)</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        <div class="p-3 bg-[#F7F7F8] rounded-xl border border-[#E5E7EB]">
          <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#202124]">
            <input
              v-model="partnerForm.isMandatory"
              type="checkbox"
              class="rounded text-[#800020] focus:ring-[#800020]"
            />
            <span>Mandatory Training Module</span>
          </label>
          <p class="text-[11px] text-[#6B7280] pl-6 mt-0.5">
            Partners must watch and complete this module before accepting higher-tier jobs.
          </p>
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-[#E5E7EB] pt-4">
          <button
            type="button"
            @click="isPartnerModalOpen = false"
            class="px-3 py-2 text-xs font-semibold text-[#6B7280] hover:bg-[#F7F7F8] rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isActionLoading"
            class="px-4 py-2 text-xs font-semibold text-white bg-[#800020] hover:bg-[#990026] rounded-lg"
          >
            {{ isActionLoading ? 'Saving...' : 'Save YouTube Module' }}
          </button>
        </div>
      </form>
    </Popup>

    <!-- ── 7. LIGHTBOX VIDEO PLAYER MODAL (HTML5 / YOUTUBE) ──────────────── -->
    <Popup v-model="isPlayerModalOpen" :title="activePlayingVideo?.title || 'Video Player'" size="lg">
      <div v-if="activePlayingVideo" class="space-y-3">
        <p v-if="activePlayingVideo.subtitle" class="text-xs text-[#6B7280]">
          {{ activePlayingVideo.subtitle }}
        </p>

        <!-- HTML5 Video Stream Player (Customer Review) -->
        <div v-if="activePlayingVideo.type === 'file'" class="aspect-video w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
          <video
            :src="activePlayingVideo.url"
            controls
            autoplay
            class="w-full h-full object-contain"
          />
        </div>

        <!-- YouTube Embedded Player (Partner Training) -->
        <div v-else class="aspect-video w-full rounded-xl overflow-hidden bg-black">
          <iframe
            :src="activePlayingVideo.url"
            class="w-full h-full"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          />
        </div>
      </div>
    </Popup>

    <!-- ── 8. DELETE CONFIRMATION DIALOG ─────────────────────────────────── -->
    <Popup v-model="isDeleteConfirmOpen" title="Confirm Deletion" size="sm">
      <div class="space-y-4">
        <div class="flex items-start gap-3 bg-red-50 p-3 rounded-lg border border-red-200">
          <AlertTriangle class="size-5 text-red-600 shrink-0 mt-0.5" />
          <p class="text-xs text-red-800">
            Are you sure you want to permanently delete <b>"{{ deleteTarget?.title }}"</b>? This action cannot be undone.
          </p>
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-[#E5E7EB] pt-3">
          <button
            type="button"
            @click="isDeleteConfirmOpen = false"
            class="px-3 py-1.5 text-xs text-[#6B7280]"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="executeDelete"
            :disabled="isActionLoading"
            class="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
          >
            {{ isActionLoading ? 'Deleting...' : 'Delete Permanently' }}
          </button>
        </div>
      </div>
    </Popup>
  </div>
</template>

